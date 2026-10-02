import { frame, txt, group, wire, rule, box, heading } from './svg.ts';
import type { Theme } from './svg.ts';
export { palettes, escapeXML } from './svg.ts';

export interface Pulse {
  syncedAt: string; publicRepositories: number;
  latestRepository: { repository: string; date: string; sha: string; timestamp: string };
  languages: string[];
  latestActivity: { repository: string; date: string; sha: string; timestamp: string } | null;
  ci: { repository: string; branch: string; status: string; conclusion: string | null; date: string; sha: string }[];
  release: { repository: string; tag: string; date: string } | null;
  languageScope: string[];
  recentCommits: number; recentDays: number; commitWindowStart: string;
  recentSeries: { start: string; commits: number }[];
}
const sum = (rows: { commits: number }[]) => rows.reduce((total, w) => total + w.commits, 0);
const short = (name: string) => name.replace(/^br3h\//, '');
// Full values remain in alt/desc and the snapshot; bounded labels keep future
// long repository/language names inside fixed dashboard panels.
const label = (value: string, limit: number) => Array.from(value).length > limit ? Array.from(value).slice(0, limit - 1).join('') + '…' : value;
const countSize = (value: number, preferred: number, width: number) => Math.min(preferred, Math.floor(width / (String(value).length * .61)));
function chart(rows: { start: string; commits: number }[], x: number, y: number, w: number, h: number, numbers = true): string {
  const max = Math.max(1, ...rows.map(r => r.commits));
  const spacing = w / Math.max(1, rows.length - 1);
  const path = rows.map((r, i) => `${i ? 'L' : 'M'}${(x + i * spacing).toFixed(2)} ${(y + h - r.commits / max * h).toFixed(2)}`).join('');
  let body = rule(`M${x} ${y}V${y + h}H${x + w}`) + wire(path, .6, true);
  if (numbers) rows.forEach((r, i) => { if (r.commits) body += group(txt(x + i * spacing, y + h - r.commits / max * h - 12, r.commits, 23, 'signal', 'text-anchor="middle"'), .8 + i * .06); });
  return body;
}
export function pulseSVG(data: Pulse, theme: Theme): string {
  if (!Number.isInteger(data.recentCommits) || data.recentCommits < 0 || sum(data.recentSeries) !== data.recentCommits) throw new Error('Invalid recent commit series.');
  let wide = heading('05', 'DEVELOPMENT TELEMETRY', `Public GitHub observations / ${data.recentDays}-day commit window / scoped default branches`);
  wide += box(40, 117, 335, 356) + box(415, 117, 370, 356) + box(825, 117, 335, 356);
  wide += group(txt(61, 156, 'DEFAULT-BRANCH UPDATE', 20, 'muted') + txt(61, 206, label(short(data.latestRepository.repository), 14), 34, 'ink', 'font-weight="600"') + txt(61, 243, data.latestRepository.date, 26, 'signal') + txt(61, 280, 'DETECTED LANGUAGES', 21, 'muted'), .4);
  data.languages.slice(0, 5).forEach((l, i) => { wide += group(txt(61, 316 + i * 31, label(l, 18), 23) + `<rect x="328" y="${302 + i * 31}" width="18" height="18" class="low bars" style="--delay:${.7 + i * .12}s"/>`, .65 + i * .12); });
  if (!data.languages.length) wide += group(txt(61, 321, 'Not reported', 24, 'muted'), .7);
  wide += `<circle cx="348" cy="236" r="4" class="signal pulse" aria-hidden="true"/>`;
  wide += group(txt(437, 156, 'PUBLIC AUTHOR COMMITS', 21, 'muted') + txt(437, 193, '7D BINS / FINAL BIN PARTIAL', 19, 'muted'), .45);
  wide += chart(data.recentSeries, 449, 239, 300, 133);
  wide += group(txt(437, 421, `${data.commitWindowStart.slice(5, 10)} → ${data.syncedAt.slice(5, 10)} UTC`, 23, 'muted'), 1.7);
  wide += group(txt(847, 157, 'PUBLIC REPOS', 22, 'muted') + txt(846, 252, data.publicRepositories, countSize(data.publicRepositories, 88, 292), 'ink', 'font-weight="600"'), .6);
  wide += group(txt(847, 309, 'SCOPED RECENT COMMITS', 20, 'muted') + txt(846, 397, data.recentCommits, countSize(data.recentCommits, 80, 292), 'signal', 'font-weight="600"') + txt(847, 442, `${data.recentDays} DAYS / DEDUPLICATED`, 20, 'muted'), .85);
  wide += group(rule('M40 515H1160') + txt(40, 550, `LAST SYNC / ${data.syncedAt.slice(0, 16).replace('T', ' ')} UTC`, 25) + txt(1160, 550, 'OBSERVED / NOT LIVE HEALTH', 19, 'muted', 'text-anchor="end"'), 1.6);
  wide += `<path d="M40 515H120" class="signal-line sweep-once" aria-hidden="true"/>`;
  let compact = heading('05', 'DEVELOPMENT TELEMETRY', '', true);
  compact += group(txt(24, 102, `${data.publicRepositories}`, 50, 'ink', 'font-weight="600"') + txt(102, 102, 'PUBLIC REPOS', 25, 'muted') + txt(313, 102, `${data.recentCommits} / ${data.recentDays}D COMMITS`, 26, 'signal'), .6);
  compact += group(txt(24, 143, label(`UPDATED / ${short(data.latestRepository.repository)}`, 30), 30) + txt(24, 178, `${data.latestRepository.date} / DEFAULT BRANCH`, 25, 'muted'), .4);
  compact += group(txt(24, 220, label(data.languages.slice(0, 3).join(' / ') || 'Not reported', 36), 25), 1);
  compact += group(txt(24, 264, `SYNC / ${data.syncedAt.slice(0, 16).replace('T', ' ')} UTC`, 25, 'muted'), 1.6);
  return frame('br3h development telemetry', `${data.publicRepositories} public repositories. Latest default-branch update: ${data.latestRepository.repository}, ${data.latestRepository.date}. ${data.recentCommits} unique br3h-attributed public default-branch commits in ${data.recentDays} days from ${data.commitWindowStart}; UTC committer timestamps. Seven-day bins, final bin partial: ${data.recentSeries.map(w => w.commits).join(', ')}. Detected languages: ${data.languages.join(', ') || 'not reported'}; scoped to ${data.languageScope.join(', ') || 'no recent selected repository'}. Last sync ${data.syncedAt}.`, wide, compact, 580, theme);
}
export interface Activity {
  syncedAt: string; start: string; endExclusive: string;
  weeks: { start: string; commits: number }[];
}
export function activitySVG(data: Activity, theme: Theme): string {
  if (data.weeks.length !== 12 || data.weeks.some(w => !Number.isInteger(w.commits) || w.commits < 0)) throw new Error('Activity layout expects twelve verified weeks.');
  const total = sum(data.weeks), max = Math.max(1, ...data.weeks.map(w => w.commits));
  let wide = heading('06', 'PUBLIC ACTIVITY / 12 WEEKS', 'Complete UTC weeks / owned public default branches / unique author-attributed commit SHAs');
  wide += group(txt(40, 208, total, countSize(total, 92, 255), 'ink', 'font-weight="600"') + txt(40, 260, 'SCOPED COMMITS', 22, 'muted') + txt(40, 300, `${data.start}`, 23, 'muted') + txt(40, 334, `→ ${data.endExclusive}`, 23, 'muted'), .4);
  wide += wire('M321 326H1150', .3);
  data.weeks.forEach((r, i) => {
    const x = 326 + i * 70, h = r.commits / max * 145;
    wide += `<rect x="${x}" y="${326 - h}" width="30" height="${h}" class="signal bars" style="--delay:${.5 + i * .09}s"><title>${r.start}: ${r.commits} commits</title></rect>`;
    wide += group(txt(x + 15, 363, r.commits, 25, r.commits ? 'signal' : 'muted', 'text-anchor="middle"') + txt(x + 15, 393, r.start.slice(5), 18, 'muted', 'text-anchor="middle"'), .7 + i * .09);
  });
  let cumulative = 0;
  const accumulated = data.weeks.map(w => ({ start: w.start, commits: cumulative += w.commits }));
  wide += txt(40, 450, 'CUMULATIVE', 20, 'muted') + chart(accumulated, 326, 431, 800, 55, false);
  wide += group(txt(40, 530, 'NO PRIVATE DATA / PARTIAL WEEK EXCLUDED / NOT THE COMPLETE GITHUB CONTRIBUTION CALENDAR', 18, 'muted'), 1.8);
  wide += `<circle cx="1150" cy="326" r="4" class="signal pulse"/>` + txt(1150, 147, 'WINDOW END', 18, 'muted', 'text-anchor="end"');
  let compact = heading('06', 'PUBLIC ACTIVITY / 12 WEEKS', '', true) + group(txt(24, 100, `${total} SCOPED COMMITS`, 32, 'ink', 'font-weight="600"'), .4);
  data.weeks.forEach((r, i) => {
    const x = 24 + (i % 6) * 92, y = 117 + Math.floor(i / 6) * 57;
    compact += group(box(x, y, 84, 47) + txt(x + 42, y + 33, r.commits, 29, r.commits ? 'signal' : 'muted', 'text-anchor="middle"'), .7 + i * .09);
  });
  compact += group(txt(24, 247, `${data.start} → ${data.endExclusive}`, 25, 'muted') + txt(24, 274, 'UTC / COMPLETE WEEKS / UNIQUE SHAS', 24, 'muted'), 1.8);
  return frame('br3h public activity', `${total} unique br3h-authored commits across twelve complete UTC weeks, from ${data.start} up to but excluding ${data.endExclusive}. Owned public default branches only; forks, archived repositories and the profile repository excluded. Weekly counts, oldest first: ${data.weeks.map(w => w.commits).join(', ')}. Bars have a linear weekly scale; the cumulative line is the sum of those weeks on a separate scale. Mobile cells contain weekly counts, not daily contribution counts. Synced ${data.syncedAt}.`, wide, compact, 560, theme);
}
