import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, GitHub, config, clock, utcDate, sha, replaceRegion, writeBatch } from './github.ts';
import type { Commit, Config, Project } from './github.ts';
import { pulseSVG } from './render.ts';
import type { Pulse } from './render.ts';
import { escapeXML } from './svg.ts';

export async function collectPulse(api: GitHub, settings: Config, projects: Project[], now: Date): Promise<Pulse> {
  const repos = await api.repositories();
  for (const p of projects) if (!repos.some(r => r.full_name === p.repository && !r.private)) throw new Error('Selected project is not verified public.');
  const since = new Date(now.getTime() - settings.recentDays * 86400000).toISOString();
  const updates: Pulse['latestRepository'][] = [], authors: NonNullable<Pulse['latestActivity']>[] = [];
  const recent = new Map<string, string>();
  const eligible = repos.filter(r => !r.fork && !r.archived && r.size > 0 && !settings.excludeActivityRepositories.includes(r.name));
  for (const repo of eligible.sort((a, b) => a.name.localeCompare(b.name))) {
    const { data: head } = await api.request(`/repos/${repo.full_name}/commits?sha=${encodeURIComponent(repo.default_branch)}&per_page=1`);
    if (!Array.isArray(head) || !head.length) throw new Error('A populated public repository returned no default-branch head.');
    const c = head[0] as Commit;
    updates.push({ repository: repo.full_name, date: utcDate(c.commit?.committer?.date), sha: sha(c.sha), timestamp: new Date(c.commit.committer.date).toISOString() });
    const commits = await api.list<Commit>(`/repos/${repo.full_name}/commits?sha=${encodeURIComponent(repo.default_branch)}&author=br3h&since=${since}`);
    for (const c of commits) {
      if (c.author?.login === settings.account) {
        const timestamp = new Date(c.commit?.committer?.date).toISOString();
        const key = sha(c.sha);
        if (timestamp < since || timestamp > now.toISOString()) continue;
        recent.set(key, timestamp);
        authors.push({ repository: repo.full_name, date: utcDate(c.commit?.author?.date), sha: key, timestamp: new Date(c.commit.author.date).toISOString() });
      }
    }
  }
  const descending = (a: { timestamp: string; repository: string; sha: string }, b: { timestamp: string; repository: string; sha: string }) => b.timestamp.localeCompare(a.timestamp) || a.repository.localeCompare(b.repository) || a.sha.localeCompare(b.sha);
  updates.sort(descending); authors.sort(descending);
  if (!updates.length) throw new Error('No eligible public project exists; prior pulse retained.');
  const languageBytes = new Map<string, number>();
  const languageScope: string[] = [], ci: Pulse['ci'] = [];
  const releases: NonNullable<Pulse['release']>[] = [];
  for (const project of projects) {
    const repo = repos.find(r => r.full_name === project.repository)!;
    if (updates.some(u => u.repository === repo.full_name && u.timestamp >= since)) {
      const { data } = await api.request(`/repos/${repo.full_name}/languages`);
      if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('Invalid language data.');
      for (const [name, bytes] of Object.entries(data)) {
        if (!/^[A-Za-z0-9#+. -]{1,24}$/.test(name) || typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) throw new Error('Invalid language entry.');
        languageBytes.set(name, (languageBytes.get(name) ?? 0) + bytes);
      }
      languageScope.push(repo.full_name);
    }
    const releaseRows = await api.list<{ draft: boolean; prerelease: boolean; tag_name: string; published_at: string }>(`/repos/${repo.full_name}/releases`);
    if (releaseRows.some(r => typeof r.draft !== 'boolean' || typeof r.prerelease !== 'boolean')) throw new Error('Invalid release visibility data.');
    for (const r of releaseRows.filter(r => !r.draft && !r.prerelease)) {
      if (!/^[\w.+/-]{1,24}$/.test(r.tag_name)) throw new Error('Invalid release tag.');
      releases.push({ repository: repo.full_name, tag: r.tag_name, date: utcDate(r.published_at) });
    }
    const { data } = await api.request(`/repos/${repo.full_name}/actions/workflows/${project.ciWorkflow}/runs?branch=${encodeURIComponent(repo.default_branch)}&event=push&per_page=1`);
    const runs = (data as { workflow_runs?: unknown[] })?.workflow_runs;
    if (!Array.isArray(runs)) throw new Error('Invalid CI response.');
    if (runs.length) {
      const run = runs[0] as { status: string; conclusion: string | null; created_at: string; head_sha: string };
      if (!['queued', 'in_progress', 'completed', 'waiting', 'pending', 'requested'].includes(run.status) ||
          (run.conclusion !== null && !['success', 'failure', 'cancelled', 'skipped', 'timed_out', 'neutral', 'action_required', 'stale', 'startup_failure'].includes(run.conclusion))) throw new Error('Unknown CI state.');
      ci.push({ repository: repo.full_name, branch: repo.default_branch, status: run.status, conclusion: run.conclusion, date: utcDate(run.created_at), sha: sha(run.head_sha) });
    }
  }
  releases.sort((a, b) => b.date.localeCompare(a.date) || a.repository.localeCompare(b.repository) || a.tag.localeCompare(b.tag));
  const recentSeries = Array.from({ length: Math.ceil(settings.recentDays / 7) }, (_, i) => ({ start: new Date(new Date(since).getTime() + i * 7 * 86400000).toISOString().slice(0, 10), commits: 0 }));
  for (const timestamp of recent.values()) {
    const index = Math.min(recentSeries.length - 1, Math.floor((new Date(timestamp).getTime() - new Date(since).getTime()) / (7 * 86400000)));
    recentSeries[index].commits++;
  }
  return { syncedAt: now.toISOString(), publicRepositories: repos.length, latestRepository: updates[0], latestActivity: authors[0] ?? null,
    recentCommits: recent.size, recentDays: settings.recentDays, commitWindowStart: since, recentSeries,
    languages: [...languageBytes].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name), languageScope, ci, release: releases[0] ?? null };
}

export async function generatePulse(api = new GitHub(), now = clock(), root = ROOT): Promise<void> {
  const { settings, projects } = config(root);
  const snapshot = await collectPulse(api, settings, projects, now);
  const operations = projects.map(p => `<sub>${escapeXML(p.id)} / <a href="https://github.com/${p.repository}">${escapeXML(p.name)}</a> / ${escapeXML(p.status)} — manifest-selected source, not a maintenance or deployment claim.</sub>`).join('\n');
  const latest = snapshot.latestRepository;
  const alt = escapeXML(`${snapshot.publicRepositories} public repositories. ${snapshot.recentCommits} unique public default-branch br3h-attributed commits in ${settings.recentDays} days. Latest default-branch update ${latest.repository}, ${latest.date}. Detected languages: ${snapshot.languages.join(', ') || 'not reported'}. Synced ${snapshot.syncedAt}.`);
  const summary = `<picture>\n  <source media="(prefers-reduced-motion: reduce) and (prefers-color-scheme: dark)" srcset="generated/pulse.svg#static">\n  <source media="(prefers-reduced-motion: reduce)" srcset="generated/pulse-light.svg#static">\n  <source media="(prefers-color-scheme: dark)" srcset="generated/pulse.svg">\n  <img src="generated/pulse-light.svg" width="100%" alt="${alt}">\n</picture>\n\n<sub><a href="https://github.com/${latest.repository}/commit/${latest.sha}">Latest update / ${latest.date}</a> · ${snapshot.recentCommits} scoped commits / ${settings.recentDays} days · <a href="generated/pulse.json">Full dated snapshot</a>${snapshot.release ? ` · Release ${escapeXML(snapshot.release.tag)} / ${snapshot.release.date}` : ''}</sub>`;
  let readme = readFileSync(join(root, 'README.md'), 'utf8');
  readme = replaceRegion(readme, 'OPERATIONS', operations);
  readme = replaceRegion(readme, 'PULSE', summary);
  writeBatch({ 'generated/pulse.svg': pulseSVG(snapshot, 'dark'), 'generated/pulse-light.svg': pulseSVG(snapshot, 'light'), 'generated/pulse.json': JSON.stringify(snapshot, null, 2) + '\n', 'README.md': readme }, root);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await generatePulse(); console.log('Pulse updated from public GitHub data.'); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Pulse generation failed; prior outputs retained.'); process.exitCode = 1; }
}
