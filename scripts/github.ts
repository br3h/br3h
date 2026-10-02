import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync, lstatSync } from 'node:fs';
import { dirname, resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export type Fetcher = typeof fetch;
export interface Project {
  id: string; name: string; repository: string; status: string; summary: string;
  focus: string; ciWorkflow: string; evidence: string[];
}
export interface Config {
  account: string; mode: string; channel: string; activityWeeks: number;
  recentDays: number; excludeActivityRepositories: string[];
}
export interface Repository {
  name: string; full_name: string; private: boolean; fork: boolean; archived: boolean;
  size: number; default_branch: string;
}
export interface Commit {
  sha: string; author: { login: string } | null;
  commit: { author: { date: string }; committer: { date: string } };
}

export function config(root = ROOT): { settings: Config; projects: Project[] } {
  const settings = JSON.parse(readFileSync(join(root, 'data/status.json'), 'utf8')) as Config;
  const projects = JSON.parse(readFileSync(join(root, 'data/projects.json'), 'utf8')).projects as Project[];
  if (settings.account !== 'br3h' || settings.mode !== 'BUILDING' || settings.channel !== 'GITHUB' ||
      !Number.isInteger(settings.activityWeeks) || settings.activityWeeks < 1 || settings.activityWeeks > 52 ||
      !Number.isInteger(settings.recentDays) || settings.recentDays < 1 || settings.recentDays > 365 ||
      !Array.isArray(settings.excludeActivityRepositories) ||
      settings.excludeActivityRepositories.some(x => typeof x !== 'string' || !/^[\w.-]+$/.test(x))) {
    throw new Error('Invalid profile configuration.');
  }
  if (!Array.isArray(projects) || projects.length === 0 || projects.length > 4) throw new Error('Invalid project manifest.');
  const seen = new Set<string>();
  for (const p of projects) {
    if (!p || !/^br3h\/[\w.-]+$/.test(p.repository) || seen.has(p.repository) ||
        !/^[A-Z0-9-]{1,16}$/.test(p.id) || p.status !== 'PUBLIC SOURCE' ||
        !/^[\w.-]+\.ya?ml$/.test(p.ciWorkflow) ||
        [p.name, p.summary, p.focus].some(x => typeof x !== 'string' || !x.trim() || x.length > 180 || /[\r\n<>|\[\]]/.test(x)) ||
        !Array.isArray(p.evidence) || p.evidence.some(x => typeof x !== 'string' || !/^[\w./-]+$/.test(x) || x.includes('..'))) {
      throw new Error('Invalid project entry.');
    }
    seen.add(p.repository);
  }
  return { settings, projects };
}

export function clock(args = process.argv.slice(2)): Date {
  if (args.length !== 0 && (args.length !== 2 || args[0] !== '--now')) throw new Error('Usage: --now <ISO UTC timestamp>');
  const now = args.length ? new Date(args[1]) : new Date();
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid sync timestamp.');
  return now;
}

export function utcDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid API timestamp.');
  return date.toISOString().slice(0, 10);
}

export class GitHub {
  constructor(privateFetch: Fetcher = fetch) { this.fetcher = privateFetch; }
  private fetcher: Fetcher;
  async request(path: string): Promise<{ data: unknown; more: boolean }> {
    if (!/^\/(?:users\/br3h\/repos|repos\/br3h\/[\w.-]+\/(?:commits|languages|releases|actions\/workflows\/[\w.-]+\.ya?ml\/runs))(?:\?|$)/.test(path)) throw new Error('API path outside public profile scope.');
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'br3h-profile' };
    // Read only the ephemeral Actions token. Never consult local gh credentials or a PAT.
    if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    let response: Response;
    try { response = await this.fetcher(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(15000), redirect: 'error' }); }
    catch { throw new Error('GitHub API unavailable; previous outputs retained.'); }
    if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status}; previous outputs retained.`);
    const raw = await response.text();
    if (raw.length > 5_000_000) throw new Error('API response exceeds the data limit.');
    let data: unknown;
    try { data = JSON.parse(raw); } catch { throw new Error('Invalid API JSON; previous outputs retained.'); }
    return { data, more: /rel="next"/.test(response.headers.get('link') ?? '') };
  }
  async list<T>(path: string): Promise<T[]> {
    const rows: T[] = [];
    for (let page = 1; page <= 30; page++) {
      const r = await this.request(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      if (!Array.isArray(r.data)) throw new Error('Unexpected API collection.');
      rows.push(...r.data);
      if (!r.more) return rows;
    }
    throw new Error('Pagination limit reached; incomplete data was not published.');
  }
  async repositories(): Promise<Repository[]> {
    const repos = await this.list<Repository>('/users/br3h/repos?type=owner');
    if (repos.length === 0 || repos.some(r => !r || r.private !== false || !/^br3h\/[\w.-]+$/.test(r.full_name) || !/^[\w.-]+$/.test(r.name) || typeof r.default_branch !== 'string' || !/^[\w./-]{1,128}$/.test(r.default_branch) || typeof r.size !== 'number' || !Number.isFinite(r.size) || r.size < 0 || typeof r.fork !== 'boolean' || typeof r.archived !== 'boolean')) {
      throw new Error('Public repository response could not be verified.');
    }
    return repos;
  }
}

export function sha(value: string): string {
  if (!/^[a-f0-9]{40}$/.test(value)) throw new Error('Invalid commit SHA.');
  return value;
}

export async function activityData(api: GitHub, settings: Config, repos: Repository[], now: Date) {
  // Twelve complete UTC weeks; the current partial week is deliberately excluded.
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = end.getUTCDay();
  end.setUTCDate(end.getUTCDate() - ((day + 6) % 7));
  const start = new Date(end.getTime() - settings.activityWeeks * 7 * 86400000);
  const eligible = repos.filter(r => !r.fork && !r.archived && r.size > 0 && !settings.excludeActivityRepositories.includes(r.name));
  const weeks = Array.from({ length: settings.activityWeeks }, (_, i) => ({ start: utcDate(new Date(start.getTime() + i * 7 * 86400000).toISOString()), commits: 0 }));
  const observed: { repository: string; sha: string; date: string }[] = [];
  const seen = new Set<string>();
  // Sequential requests respect GitHub's rate limits and avoid a burst per repo.
  for (const repo of eligible.sort((a, b) => a.name.localeCompare(b.name))) {
    const commits = await api.list<Commit>(`/repos/${repo.full_name}/commits?sha=${encodeURIComponent(repo.default_branch)}&author=br3h&since=${start.toISOString()}&until=${new Date(end.getTime() - 1).toISOString()}`);
    for (const c of commits) {
      if (c.author?.login !== settings.account) continue;
      const date = utcDate(c.commit?.committer?.date);
      const timestamp = new Date(`${date}T00:00:00Z`).getTime();
      if (timestamp < start.getTime() || timestamp >= end.getTime()) continue;
      const key = sha(c.sha); // Shared commits are counted once across eligible repositories.
      if (seen.has(key)) continue;
      seen.add(key);
      const i = Math.floor((timestamp - start.getTime()) / (7 * 86400000));
      weeks[i].commits++;
      observed.push({ repository: repo.full_name, sha: key, date });
    }
  }
  observed.sort((a, b) => a.date.localeCompare(b.date) || a.repository.localeCompare(b.repository) || a.sha.localeCompare(b.sha));
  return { scope: 'br3h-attributed author commits on owned public default branches; forks, archived repos and profile excluded; unique SHAs; committer dates in UTC', start: utcDate(start.toISOString()), endExclusive: utcDate(end.toISOString()), repositories: eligible.map(r => r.full_name), weeks, commits: observed };
}

export function replaceRegion(readme: string, name: string, content: string): string {
  const start = `<!-- ${name}:START -->`, end = `<!-- ${name}:END -->`;
  const a = readme.indexOf(start), b = readme.indexOf(end);
  if (a < 0 || b < a || readme.indexOf(start, a + 1) >= 0 || readme.indexOf(end, b + 1) >= 0) throw new Error(`Invalid README region: ${name}`);
  return `${readme.slice(0, a + start.length)}\n${content}\n${readme.slice(b)}`;
}

export function writeBatch(files: Record<string, string>, root = ROOT): void {
  if (!existsSync(root) || lstatSync(root).isSymbolicLink() || !lstatSync(root).isDirectory()) throw new Error('Invalid profile output root.');
  const staged: { target: string; temp: string }[] = [];
  try {
    for (const [name, contents] of Object.entries(files)) {
      if (!contents.trim()) throw new Error('Refusing empty output.');
      const target = resolve(root, name);
      if (!relative(root, target) || relative(root, target).startsWith('..') || (!name.startsWith('generated/') && name !== 'README.md')) throw new Error('Output outside profile scope.');
      for (let p = target; p !== root; p = dirname(p)) if (existsSync(p) && lstatSync(p).isSymbolicLink()) throw new Error('Refusing a symlink output.');
      if (existsSync(target) && readFileSync(target, 'utf8') === contents) continue;
      const temp = `${target}.${process.pid}.tmp`;
      staged.push({ target, temp });
      writeFileSync(temp, contents, { encoding: 'utf8', flag: 'wx' });
    }
    for (const f of staged) renameSync(f.temp, f.target);
  } finally {
    for (const f of staged) if (existsSync(f.temp)) unlinkSync(f.temp);
  }
}
