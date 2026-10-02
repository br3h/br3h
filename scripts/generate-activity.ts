import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, GitHub, config, clock, activityData, replaceRegion, writeBatch } from './github.ts';
import { activitySVG } from './render.ts';
import { escapeXML } from './svg.ts';

export async function generateActivity(api = new GitHub(), now = clock(), root = ROOT): Promise<void> {
  const { settings } = config(root);
  const repos = await api.repositories();
  const snapshot = { syncedAt: now.toISOString(), ...await activityData(api, settings, repos, now) };
  const total = snapshot.weeks.reduce((sum, w) => sum + w.commits, 0);
  const alt = escapeXML(`${total} unique br3h-authored commits in twelve complete UTC weeks from ${snapshot.start} to ${snapshot.endExclusive}, end exclusive. Weekly counts oldest first: ${snapshot.weeks.map(w => w.commits).join(', ')}. Public owned default branches only; forks, archived repositories and the profile excluded. Not the complete GitHub contribution calendar. Synced ${snapshot.syncedAt}.`);
  const summary = `<picture>\n  <source media="(prefers-reduced-motion: reduce) and (prefers-color-scheme: dark)" srcset="generated/activity.svg#static">\n  <source media="(prefers-reduced-motion: reduce)" srcset="generated/activity-light.svg#static">\n  <source media="(prefers-color-scheme: dark)" srcset="generated/activity.svg">\n  <img src="generated/activity-light.svg" width="100%" alt="${alt}">\n</picture>\n\n<sub>Complete UTC weeks · partial week excluded · public default branches / unique SHAs · <a href="generated/activity.json">Scope + weekly data</a></sub>`;
  const readme = replaceRegion(readFileSync(join(root, 'README.md'), 'utf8'), 'ACTIVITY', summary);
  writeBatch({ 'generated/activity.svg': activitySVG(snapshot, 'dark'), 'generated/activity-light.svg': activitySVG(snapshot, 'light'), 'generated/activity.json': JSON.stringify(snapshot, null, 2) + '\n', 'README.md': readme }, root);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await generateActivity(); console.log('Activity updated from public GitHub commit data.'); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Activity generation failed; prior outputs retained.'); process.exitCode = 1; }
}
