import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, GitHub, config, activityData, writeBatch, replaceRegion } from '../scripts/github.ts';
import type { Repository, Commit, Fetcher } from '../scripts/github.ts';
import { escapeXML, activitySVG, pulseSVG } from '../scripts/render.ts';
import { collectPulse, generatePulse } from '../scripts/generate-pulse.ts';
import { generateActivity } from '../scripts/generate-activity.ts';
import { visualAssets } from '../scripts/generate-visuals.ts';

// Synthetic API responses are isolated test fixtures; production generators never consume them.
const now = new Date('2026-10-02T12:00:00Z');
const repo = (name: string, overrides = {}): Repository => ({ name, full_name: `br3h/${name}`, private: false, fork: false, archived: false, size: 1, default_branch: 'main', ...overrides });
const commit = (digit: string, date: string, author = 'br3h'): Commit => ({ sha: digit.repeat(40), author: { login: author }, commit: { author: { date }, committer: { date } } });
const response = (value: unknown, more = false) => new Response(JSON.stringify(value), { status: 200, headers: more ? { link: '<https://api.github.com/example?page=2>; rel="next"' } : {} });
const client = (fn: (path: string) => Response | Promise<Response>) => new GitHub(((url: string | URL | Request) => fn(new URL(String(url)).pathname + new URL(String(url)).search)) as Fetcher);
function scratch() {
  mkdirSync(join(ROOT, '.qa'), { recursive: true });
  const root = mkdtempSync(join(ROOT, '.qa/profile-test-'));
  mkdirSync(join(root, 'data')); mkdirSync(join(root, 'generated'));
  for (const name of ['projects', 'status']) writeFileSync(join(root, `data/${name}.json`), readFileSync(join(ROOT, `data/${name}.json`)));
  const readme = '<!-- OPERATIONS:START -->\nprevious operations\n<!-- OPERATIONS:END -->\n<!-- PULSE:START -->\nprevious pulse\n<!-- PULSE:END -->\n<!-- ACTIVITY:START -->\nprevious activity\n<!-- ACTIVITY:END -->\n';
  writeFileSync(join(root, 'README.md'), readme);
  for (const name of ['pulse.svg', 'pulse-light.svg', 'pulse.json', 'activity.svg', 'activity-light.svg', 'activity.json']) writeFileSync(join(root, 'generated', name), 'previous output');
  return { root, cleanup: () => rmSync(root, { recursive: true }) };
}

test('API strings are escaped as XML, not embedded as markup', () => {
  assert.equal(escapeXML('<script a="x">&\''), '&lt;script a=&quot;x&quot;&gt;&amp;&apos;');
});
test('pagination follows next links and does not assume a full first page', async () => {
  let calls = 0;
  const api = client(() => response([++calls], calls === 1));
  assert.deepEqual(await api.list('/users/br3h/repos?type=owner'), [1, 2]);
});
test('private repository responses are rejected', async () => {
  await assert.rejects(client(() => response([repo('toolgraph', { private: true })])).repositories(), /could not be verified/);
});
test('arbitrary API hosts and account paths are not accepted', async () => {
  await assert.rejects(client(() => response([])).request('/users/another-account/repos'), /outside public profile scope/);
  await assert.rejects(client(() => response([])).request('/repos/br3h/toolgraph/actions/secrets'), /outside public profile scope/);
});
test('a partial activity collection failure leaves all prior outputs byte-identical', async () => {
  const task = scratch();
  try {
    const before = readFileSync(join(task.root, 'README.md'), 'utf8');
    const api = client(path => {
      if (path.startsWith('/users/')) return response([repo('ngn-hacks'), repo('toolgraph')]);
      if (path.includes('ngn-hacks')) return response([commit('a', '2026-09-08T12:00:00Z')]);
      return new Response('Unavailable', { status: 503 });
    });
    await assert.rejects(generateActivity(api, now, task.root), /HTTP 503/);
    assert.equal(readFileSync(join(task.root, 'README.md'), 'utf8'), before);
    for (const name of ['activity.svg', 'activity-light.svg', 'activity.json']) assert.equal(readFileSync(join(task.root, 'generated', name), 'utf8'), 'previous output');
  } finally { task.cleanup(); }
});
test('pulse API failure retains its SVG, snapshot and README', async () => {
  const task = scratch();
  try {
    const before = readFileSync(join(task.root, 'README.md'), 'utf8');
    await assert.rejects(generatePulse(client(() => { throw new Error('Network failure'); }), now, task.root), /unavailable/);
    assert.equal(readFileSync(join(task.root, 'README.md'), 'utf8'), before);
    for (const name of ['pulse.svg', 'pulse-light.svg', 'pulse.json']) assert.equal(readFileSync(join(task.root, 'generated', name), 'utf8'), 'previous output');
  } finally { task.cleanup(); }
});
test('activity excludes forks, profiles, other authors, duplicates and partial-week commits', async () => {
  const { settings } = config();
  const requested: string[] = [];
  const api = client(path => {
    requested.push(path);
    return response([commit('a', '2026-09-08T12:00:00Z'), commit('b', '2026-09-08T12:00:00Z', 'github-actions[bot]'), commit('c', '2026-10-01T12:00:00Z')]);
  });
  const data = await activityData(api, settings, [repo('toolgraph'), repo('ngn-hacks'), repo('br3h'), repo('marshall-py-fork', { fork: true })], now);
  assert.equal(data.commits.length, 1);
  assert.equal(data.weeks.reduce((sum, w) => sum + w.commits, 0), 1);
  assert.equal(data.endExclusive, '2026-09-28');
  assert.equal(requested.length, 2);
  assert.ok(requested.every(p => p.includes('author=br3h') && p.includes('sha=main')));
});
test('pulse uses actual head timestamps and scoped CI, not pushed_at or PR runs', async () => {
  const { settings, projects } = config();
  const api = client(path => {
    if (path.startsWith('/users/')) return response([repo('toolgraph'), repo('ngn-hacks'), repo('br3h')]);
    if (path.includes('/languages')) return response({ TypeScript: 100, CSS: 10 });
    if (path.includes('/releases')) return response([]);
    if (path.includes('/actions/')) {
      assert.ok(path.includes('branch=main') && path.includes('event=push'));
      return response({ workflow_runs: [{ status: 'completed', conclusion: 'failure', created_at: '2026-09-08T12:00:00Z', head_sha: 'a'.repeat(40) }] });
    }
    const date = path.includes('toolgraph') ? '2026-09-08T20:00:00Z' : '2026-09-08T10:00:00Z';
    return response([commit('a', date)]);
  });
  const data = await collectPulse(api, settings, projects, now);
  assert.equal(data.latestRepository.repository, 'br3h/toolgraph');
  assert.equal(data.ci[0].conclusion, 'failure');
  assert.equal(data.release, null);
  assert.equal(data.publicRepositories, 3);
  assert.equal(pulseSVG(data, 'dark'), pulseSVG(data, 'dark'));
  assert.ok(!pulseSVG(data, 'dark').includes('LATEST PUBLIC RELEASE'));
});
test('an API-confirmed quiet window does not fail or fabricate recent languages', async () => {
  const { settings, projects } = config();
  const api = client(path => {
    if (path.startsWith('/users/')) return response([repo('toolgraph')]);
    if (path.includes('/actions/')) return response({ workflow_runs: [] });
    if (path.includes('/releases') || path.includes('author=br3h')) return response([]);
    if (path.includes('/languages')) throw new Error('Languages should not be requested for an old update.');
    return response([commit('a', '2025-01-01T12:00:00Z')]);
  });
  const data = await collectPulse(api, settings, projects, now);
  assert.deepEqual(data.languages, []);
  assert.equal(data.latestActivity, null);
  assert.equal(data.latestRepository.date, '2025-01-01');
});
test('empty activity is displayed only after successful verified collection', async () => {
  const { settings } = config();
  const data = await activityData(client(() => response([])), settings, [repo('toolgraph')], now);
  assert.deepEqual(data.weeks.map(w => w.commits), Array(12).fill(0));
  assert.match(activitySVG({ syncedAt: now.toISOString(), ...data }, 'light'), /0 unique br3h-authored commits/);
});
test('weekly grouping uses UTC committer dates even when author dates differ', async () => {
  const { settings } = config();
  const value = commit('a', '2026-09-08T12:00:00Z');
  value.commit.author.date = '2025-01-01T12:00:00Z';
  const data = await activityData(client(() => response([value])), settings, [repo('toolgraph')], now);
  assert.equal(data.commits.length, 1);
  assert.equal(data.commits[0].date, '2026-09-08');
});
test('output traversal and symlink destinations are refused', () => {
  const task = scratch();
  try {
    assert.throws(() => writeBatch({ '../outside.svg': 'invalid' }, task.root), /outside profile scope/);
    symlinkSync(join(task.root, 'README.md'), join(task.root, 'generated/link.svg'));
    assert.throws(() => writeBatch({ 'generated/link.svg': 'invalid' }, task.root), /symlink/);
  } finally { task.cleanup(); }
});
test('README updates are bounded and duplicate markers fail closed', () => {
  assert.equal(replaceRegion('before<!-- A:START -->old<!-- A:END -->after', 'A', 'new'), 'before<!-- A:START -->\nnew\n<!-- A:END -->after');
  assert.throws(() => replaceRegion('<!-- A:START --><!-- A:START --><!-- A:END -->', 'A', 'new'), /Invalid README region/);
});

test('recent telemetry deduplicates public commits, uses committer windows and excludes future/bot observations', async () => {
  const { settings, projects } = config();
  const oldAuthor = commit('a', '2026-09-02T12:00:00Z');
  oldAuthor.commit.author.date = '2025-01-01T12:00:00Z';
  const api = client(path => {
    if (path.startsWith('/users/')) return response([repo('toolgraph'), repo('ngn-hacks')]);
    if (path.includes('/languages')) return response({ TypeScript: 100 });
    if (path.includes('/releases')) return response([]);
    if (path.includes('/actions/')) return response({ workflow_runs: [] });
    if (path.includes('author=br3h')) return response([oldAuthor, oldAuthor, commit('b', '2026-09-02T12:00:00Z', 'bot'), commit('c', '2027-01-01T12:00:00Z')]);
    return response([commit('d', '2026-09-02T12:00:00Z')]);
  });
  const data = await collectPulse(api, settings, projects, now);
  assert.equal(data.recentCommits, 1);
  assert.equal(data.recentSeries.reduce((n, w) => n + w.commits, 0), 1);
  assert.equal(data.recentDays, 90);
});
test('all original animated assets include wide/compact layouts, safe final defaults and reduced motion', () => {
  const assets = visualAssets();
  assert.equal(Object.keys(assets).length, 14);
  for (const svg of Object.values(assets)) {
    assert.match(svg, /viewBox="0 0 1200 /);
    assert.match(svg, /class="compact"/);
    assert.match(svg, /prefers-reduced-motion:reduce/);
    assert.match(svg, /animation:none!important/);
    assert.match(svg, /id="static"/);
    assert.match(svg, /#static:target \*/);
    assert.doesNotMatch(svg, /<script|<foreignObject|<animate|@import/);
    assert.match(svg, /\.reveal\{opacity:1\}/);
  }
  assert.deepEqual(assets, visualAssets());
});
test('activity rendering has exact zero-height bars for zero weeks and a truthful cumulative explanation', () => {
  const data = { syncedAt: now.toISOString(), start: '2026-07-06', endExclusive: '2026-09-28', weeks: Array.from({ length: 12 }, () => ({ start: '2026-07-06', commits: 0 })) };
  const svg = activitySVG(data, 'dark');
  assert.equal((svg.match(/height="0" class="signal bars"/g) || []).length, 12);
  assert.match(svg, /Mobile cells contain weekly counts, not daily contribution counts/);
});

test('successful generators retain native reduced-motion picture sources in bounded README regions', async () => {
  const task = scratch();
  const api = client(path => {
    if (path.startsWith('/users/')) return response([repo('toolgraph')]);
    if (path.includes('/languages')) return response({ TypeScript: 1 });
    if (path.includes('/releases')) return response([]);
    if (path.includes('/actions/')) return response({ workflow_runs: [] });
    return response([commit('a', '2026-09-02T12:00:00Z')]);
  });
  try {
    await generatePulse(api, now, task.root);
    await generateActivity(api, now, task.root);
    const readme = readFileSync(join(task.root, 'README.md'), 'utf8');
    for (const kind of ['pulse', 'activity']) {
      assert.ok(readme.includes(`srcset="generated/${kind}.svg#static"`));
      assert.ok(readme.includes(`srcset="generated/${kind}-light.svg#static"`));
    }
    assert.equal((readme.match(/prefers-reduced-motion: reduce/g) ?? []).length, 4);
  } finally { task.cleanup(); }
});
