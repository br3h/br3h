import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { ROOT, config } from './github.ts';
import { palettes, pulseSVG, activitySVG } from './render.ts';
import type { Pulse, Activity } from './render.ts';
import { visualAssets } from './generate-visuals.ts';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function walk(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap(e => ['.git', '.qa', 'node_modules'].includes(e.name) ? [] : e.isDirectory() ? walk(join(path, e.name)) : [join(path, e.name)]);
}
const files = walk(ROOT);
config();
let json = 0, svg = 0, references = 0;
for (const path of files) {
  const source = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) { JSON.parse(source); json++; }
  if (path.endsWith('.svg')) {
    assert(source.includes('xmlns="http://www.w3.org/2000/svg"') && source.includes('<title') && source.trim().endsWith('</svg>'), `Invalid SVG structure: ${relative(ROOT, path)}`);
    assert(!/<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|<animate\b|<set\b|\bon\w+\s*=|\b(?:href|src)\s*=|@import|https?:\/\/|url\((?!#[A-Za-z][\w-]*\))/i.test(source.replace('http://www.w3.org/2000/svg', '')), `Unsafe or external SVG content: ${relative(ROOT, path)}`);
    const fonts = [...source.matchAll(/font-size="([\d.]+)"/g)].map(m => Number(m[1]));
    assert(fonts.every(n => n >= 18), `Small SVG text: ${relative(ROOT, path)}`);
    if (source.includes('@keyframes')) {
      assert(source.includes('@media(prefers-reduced-motion:reduce)') && source.includes('animation:none!important'), `Missing reduced-motion override: ${relative(ROOT, path)}`);
      assert(source.includes('viewBox="0 0 1200 ') && source.includes('class="compact"'), `Missing wide/compact composition: ${relative(ROOT, path)}`);
      assert(source.includes('prefers-reduced-motion:no-preference'), 'Motion must be opt-in to the no-preference media condition.');
      assert(source.includes('id="static"') && source.includes('#static:target *'), 'Missing native static-fragment fallback.');
    }
    svg++;
  }
}
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const anchors = [...readme.matchAll(/<a name="([^"]+)"/g)].map(m => m[1]);
assert(new Set(anchors).size === anchors.length, 'Duplicate README anchor.');
for (const m of readme.matchAll(/(?:src|srcset|href)="([^"]+)"|\]\(([^)]+)\)/g)) {
  const link = m[1] ?? m[2];
  if (/^https:\/\//.test(link)) continue;
  if (link.startsWith('#')) { assert(anchors.includes(link.slice(1)), `Broken internal README link: ${link}`); continue; }
  assert(!/^(?:[a-z]+:|\/)/i.test(link), `Unsupported README URL: ${link}`);
  const target = resolve(ROOT, link.split('#')[0]);
  assert(!relative(ROOT, target).startsWith('..') && existsSync(target), `Broken local README reference: ${link}`);
  references++;
}
assert([...readme.matchAll(/<!-- (\d{2}) \/ /g)].map(m => m[1]).join(',') === '00,01,02,03,04,05,06,07,08,09', 'Unexpected README section order.');
assert(readme.includes('<!-- 00 / HERO -->') && readme.includes('<!-- EOF -->'), 'Missing hero or EOF.');
assert((readme.match(/<details>/g) ?? []).length === 2, 'Expected two details blocks.');
assert(!/^\|/m.test(readme) && !/width="600"/.test(readme), 'Narrow/table layout returned.');
assert([...readme.matchAll(/<img\b[^>]*>/g)].every(m => m[0].includes('width="100%"') && /alt="[^\"]{20,}"/.test(m[0])), 'Images need full-width composition and meaningful alt text.');
assert([...readme.matchAll(/<picture>[\s\S]*?<\/picture>/g)].every(m => (m[0].match(/prefers-reduced-motion: reduce/g) ?? []).length === 2 && (m[0].match(/\.svg#static/g) ?? []).length === 2), 'Each picture needs native dark/light reduced-motion sources.');
const pulse = JSON.parse(readFileSync(join(ROOT, 'generated/pulse.json'), 'utf8')) as Pulse;
const activity = JSON.parse(readFileSync(join(ROOT, 'generated/activity.json'), 'utf8')) as Activity;
for (const theme of ['dark', 'light'] as const) {
  const suffix = theme === 'dark' ? '' : '-light';
  assert(pulseSVG(pulse, theme) === readFileSync(join(ROOT, `generated/pulse${suffix}.svg`), 'utf8'), `Pulse differs from its verified input snapshot: ${theme}.`);
  assert(activitySVG(activity, theme) === readFileSync(join(ROOT, `generated/activity${suffix}.svg`), 'utf8'), `Activity differs from its verified input snapshot: ${theme}.`);
}
for (const [name, output] of Object.entries(visualAssets())) assert(readFileSync(join(ROOT, name), 'utf8') === output, `Artwork does not match manifest/schedule source: ${name}.`);
assert(!/student developer|student systems builder|headshot|visitor counter|shields\.io|readme-stats|streak-stats|troph(y|ies)|spotify|wakatime/i.test(readme), 'Disallowed profile identity or widget.');
function luminance(hex: string): number {
  const c = hex.slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}
for (const [theme, p] of Object.entries(palettes)) for (const foreground of ['ink', 'muted', 'signal'] as const) for (const background of ['background', 'panel'] as const) {
  const a = luminance(p[foreground]), b = luminance(p[background]);
  assert((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, `${theme} contrast below 4.5:1 for ${foreground}.`);
}
console.log(`Verified ${json} JSON files, ${svg} safe SVGs, ${references} local README references, deterministic snapshot rendering, section order and text contrast.`);
