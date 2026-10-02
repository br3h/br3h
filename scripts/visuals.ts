import { frame, txt, group, wire, flow, rule, box, node } from './svg.ts';
import type { Theme } from './svg.ts';
import type { Project } from './github.ts';
import { heading } from './svg.ts';

const dot = (x: number, y: number, pulse = false) => `<circle cx="${x}" cy="${y}" r="4" class="signal ${pulse ? 'pulse' : ''}"/>`;
const focus = ['SECURITY', 'SOFTWARE', 'SYSTEMS', 'AUTOMATION'];
function rotatingFocus(x: number, y: number): string {
  return txt(x, y, 'FOCUS /', 20, 'muted') + `<g class="focus-cycle" aria-hidden="true">${focus.map((f, i) => `<g class="state" style="--phase:${i === 0 ? 0 : -(focus.length - i) * 6}s">${txt(x + 112, y, f, 22, 'signal')}</g>`).join('')}</g>` + `<g class="focus-static">${txt(x + 112, y, 'SECURITY / SOFTWARE', 20, 'signal')}${txt(x + 112, y + 28, 'SYSTEMS / AUTOMATION', 20, 'signal')}</g>`;
}
export function heroSVG(theme: Theme): string {
  let wide = group(txt(40, 42, '00 / BR3H — SYSTEM IDENTITY', 20, 'muted') + txt(1160, 42, 'PROFILE INTERFACE / GITHUB', 18, 'muted', 'text-anchor="end"'), .1);
  wide += group(txt(34, 214, 'br3h', 154, 'ink', 'font-weight="600" letter-spacing="-8"'), .2);
  wide += group(txt(40, 278, 'SECURITY / SOFTWARE / SYSTEMS', 28, 'ink', 'font-weight="600"'), .5);
  wide += group(rotatingFocus(40, 332), 1.1);
  const metadata = [['NODE', 'BR3H'], ['STATUS', 'ONLINE'], ['MODE', 'BUILDING'], ['CHANNEL', 'GITHUB']];
  metadata.forEach(([label, value], i) => { const x = 40 + i * 145; wide += group(txt(x, 406, label, 18, 'muted') + txt(x, 438, value, 22, i === 1 ? 'signal' : 'ink'), 1.8 + i * .06); });
  wide += dot(173, 431, true);
  const routes = ['M858 222V112H720', 'M938 222H1060V142', 'M858 272V352H732', 'M938 272H1042V350', 'M898 292V403H1070'];
  routes.forEach((d, i) => { wide += wire(d, .9 + i * .1, i === 0); if (i === 0 || i === 4) wide += flow(d); });
  wide += group(box(820, 202, 156, 90) + txt(838, 238, 'BR3H.SYS', 23, 'signal', 'font-weight="600"') + txt(838, 272, 'CORE / 00', 19, 'muted'), .7);
  const ends = [[678, 99, '01 / SECURITY', 720, 112], [1015, 112, '02 / SOFTWARE', 1060, 142], [636, 333, '03 / AUTOMATION', 732, 352], [980, 331, '04 / SYSTEMS', 1042, 350], [982, 437, '05 / INFRA', 1070, 403]] as const;
  ends.forEach(([x, y, label, dx, dy], i) => { wide += group(txt(x, y, label, 20, 'ink') + dot(dx, dy), 1.2 + i * .09); });
  wide += rule('M648 70V455') + group(txt(664, 190, 'INPUT / FOCUS', 18, 'muted') + txt(988, 210, '+ 00.01', 18, 'muted'), 1.9);
  let compact = group(txt(24, 31, '00 / BR3H', 24, 'muted'), .1) + group(txt(20, 115, 'br3h', 79, 'ink', 'font-weight="600" letter-spacing="-4"'), .2);
  compact += group(txt(24, 166, 'SECURITY / SOFTWARE / SYSTEMS', 29, 'ink', 'font-weight="600"'), .5);
  compact += wire('M405 56H490V94H570M490 56V26M490 94V119H410', .9, true) + flow('M405 56H490V94H570');
  compact += group(dot(490, 56) + dot(490, 94) + box(420, 70, 112, 18), 1.2);
  compact += group(txt(24, 199, 'MODE / BUILDING', 25, 'muted') + txt(330, 199, 'CHANNEL / GITHUB', 25, 'muted') + dot(28, 225, true) + txt(44, 232, 'ONLINE / PROFILE INTERFACE', 25, 'signal'), 1.8);
  return frame('br3h — SECURITY / SOFTWARE / SYSTEMS', 'Standalone developer identity br3h. Focus: cybersecurity, software engineering, AI and automation, infrastructure, systems and developer tooling. ONLINE and BUILDING are aesthetic profile-interface labels, not service health or literal live work states. Topology is a focus schematic.', wide, compact, 480, theme);
}

export function systemMapSVG(theme: Theme): string {
  const areas = [
    [48, 155, '01 / SECURITY', 'App / web / network'],
    [48, 340, '02 / SOFTWARE', 'Backend / full-stack'],
    [440, 119, '03 / AUTOMATION', 'Repeatable workflows'],
    [440, 467, '04 / INFRASTRUCTURE', 'Systems / delivery'],
    [855, 155, '05 / AI', 'Integration direction'],
    [855, 340, '06 / DEVELOPER TOOLS', 'Compose / validate']
  ] as const;
  let wide = heading('01', 'SYSTEM MAP', 'Published systems and focus directions / source-backed topology');
  const routes = ['M343 198H386V293H470', 'M343 383H414V336H470', 'M588 205V266', 'M620 382V467', 'M855 198H806V293H730', 'M855 383H800V336H730'];
  routes.forEach((d, i) => wide += wire(d, .35 + i * .13, i === 0));
  wide += flow('M730 336H800V383H855');
  wide += group(box(470, 266, 260, 116) + txt(499, 311, 'BR3H.SYS', 39, 'ink', 'font-weight="600"') + txt(499, 351, 'FOCUS ROUTER / 00', 21, 'signal'), .35);
  areas.forEach(([x, y, label, sub], i) => wide += node(x, y, 295, label, sub, true, .85 + i * .12, 86, label.length > 18 ? 20 : 23));
  wide += wire('M1002 426V520H1010', 1.4, true) + node(820, 520, 330, 'TG-01 / TOOLGRAPH', 'PUBLISHED SOURCE', false, 1.6, 90, 28);
  wide += group(rule('M48 629H1152') + txt(48, 655, 'SOLID / PUBLISHED SYSTEM', 20, 'signal') + txt(485, 655, 'DASHED / FOCUS DIRECTION', 20, 'muted'), 1.8);
  let compact = heading('01', 'SYSTEM MAP', '', true) + group(txt(24, 91, 'BR3H.SYS / FOCUS ROUTER', 28, 'signal'), .35);
  const names = ['SECURITY', 'SOFTWARE', 'AUTOMATION', 'INFRASTRUCTURE', 'AI', 'DEVELOPER TOOLS'];
  names.forEach((name, i) => { const x = i % 2 ? 313 : 24, y = 110 + Math.floor(i / 2) * 50; compact += group(box(x, y, 263, 40, 'stroke-dasharray="4 5"') + txt(x + 12, y + 28, name, 26), .85 + i * .12); });
  compact += wire('M295 103V257', .3) + group(box(24, 266, 552, 39) + txt(38, 294, 'TG-01 / TOOLGRAPH — PUBLIC SOURCE', 26, 'signal'), 1.6);
  compact += group(txt(24, 331, 'SOLID: SOURCE   DASHED: FOCUS', 25, 'muted'), 1.8);
  return frame('br3h system map', 'BR3H.SYS connects six focus areas: security, software, automation, infrastructure, AI and developer tooling. Dashed boxes are interests and directions; the solid ToolGraph node is an existing public repository. No other completed project is implied.', wide, compact, 680, theme);
}

export function operationsSVG(project: Project, theme: Theme): string {
  let wide = heading('02', 'CURRENT OPERATIONS', 'Selected public source / curated project manifest');
  wide += group(txt(40, 169, `${project.id} / ${project.name.toUpperCase()}`, 45, 'ink', 'font-weight="600"'), .3);
  const rows = [['STATE', project.status], ['CLASS', 'DEVELOPER TOOLING'], ['LANGUAGE', 'TYPESCRIPT'], ['EXPORT', 'TYPESCRIPT / PYTHON']];
  rows.forEach(([k, v], i) => wide += group(txt(40 + (i % 2) * 380, 224 + Math.floor(i / 2) * 76, k, 20, 'muted') + txt(40 + (i % 2) * 380, 256 + Math.floor(i / 2) * 76, v, 26, i === 0 ? 'signal' : 'ink'), .55 + i * .12));
  wide += rule('M824 120V332') + wire('M872 189H928V154H988V224H1050V181H1156', .65, true) + group(txt(872, 285, 'SCHEMA → GRAPH → EXPORT', 20, 'muted') + txt(872, 316, 'CONCEPTUAL SIGNAL PATH', 18, 'muted'), 1.4);
  let compact = heading('02', 'CURRENT OPERATIONS', '', true) + group(txt(24, 94, `${project.id} / ${project.name.toUpperCase()}`, 33, 'ink', 'font-weight="600"'), .3);
  compact += group(txt(24, 129, project.status, 27, 'signal') + txt(313, 129, 'DEV TOOLING / TS', 26), .6);
  compact += group(txt(24, 164, 'EXPORT / TYPESCRIPT + PYTHON', 27, 'muted'), .8);
  return frame('br3h current operations — ToolGraph', `${project.name}, ${project.id}. State: ${project.status}. Developer tooling. TypeScript source, TypeScript and Python export. The signal path illustrates software flow; it is not runtime telemetry or a maintenance/deployment claim. Sourced from data/projects.json and verified ToolGraph code.`, wide, compact, 360, theme);
}

export function toolgraphSVG(theme: Theme): string {
  let wide = heading('03', 'FLAGSHIP / TOOLGRAPH', 'Visual MCP composition. Check schema assignability as edges are drawn.');
  wide += group(txt(40, 149, 'DISCOVER', 23, 'muted') + txt(354, 149, 'COMPOSE / CHECK', 23, 'muted') + txt(942, 149, 'EXPORT', 23, 'muted'), .35);
  const routes = ['M168 276V376', 'M298 418H354', 'M482 376V276', 'M610 234H666', 'M610 248H635V418H666', 'M776 276V376', 'M886 418H919V310H946', 'M919 418V458H946'];
  routes.forEach((d, i) => wide += wire(d, .45 + i * .13, i === 3 || i > 5));
  wide += node(40, 190, 258, 'MCP TOOLS', 'Tool JSON Schemas', false, .7, 86, 27);
  wide += node(40, 376, 258, 'MCP CLIENT', 'Guarded transports', false, .9, 86, 27);
  wide += node(354, 376, 256, 'FASTIFY ENGINE', 'Introspect / execute', false, 1, 86, 25);
  wide += node(354, 190, 256, 'CANVAS / GRAPH', 'Next.js / React Flow', false, .8, 86, 26);
  wide += node(666, 190, 220, 'SCHEMA CORE', 'Schema checks', false, 1.15, 86, 24);
  wide += node(666, 376, 220, 'CODE GENERATION', 'Validated graph', false, 1.25, 86, 20);
  wide += node(946, 267, 214, 'TYPESCRIPT', 'Generated code', false, 1.65, 86, 25);
  wide += node(946, 415, 214, 'PYTHON', 'Generated code', false, 1.8, 86, 28);
  wide += `<rect x="662" y="186" width="228" height="94" class="signal-line check-once"/>`;
  wide += group(txt(44, 325, 'TOOL DISCOVERY', 19, 'muted') + txt(650, 328, 'JSON SCHEMA / CHECKS', 19, 'muted'), 1.4);
  wide += group(rule('M40 544H1160') + txt(40, 580, 'MCP CLIENT → ENGINE → CANVAS', 22, 'muted') + txt(40, 617, 'apps/web · apps/engine · schema-core · codegen', 22, 'ink') + txt(40, 664, 'PACKAGE BOUNDARIES / DATA FLOW / SOURCE-BACKED SCHEMATIC', 18, 'muted'), 1.95);
  let compact = heading('03', 'FLAGSHIP / TOOLGRAPH', '', true);
  const rows = [['MCP TOOLS', 'JSON SCHEMAS'], ['MCP CLIENT', 'FASTIFY ENGINE'], ['NEXT.JS CANVAS', 'SCHEMA CHECKS'], ['CODE GENERATION', 'TS + PY EXPORT']];
  rows.forEach(([a, b], i) => {
    const y = 78 + i * 59;
    compact += group(box(24, y, 552, 46) + txt(38, y + 32, a, 25, 'ink') + txt(565, y + 32, b, 25, 'signal', 'text-anchor="end"'), .7 + i * .3);
    if (i < 3) compact += wire(`M300 ${y + 46}V${y + 59}`, .8 + i * .3, true);
  });
  compact += group(txt(24, 337, 'COMPOSITION / VALIDATION / EXPORT', 26, 'muted'), 1.95);
  return frame('ToolGraph architecture', 'ToolGraph visual MCP composition. MCP tools advertise schemas; mcp-client provides guarded transports for the Fastify introspection/execution engine. The Next.js React Flow canvas uses schema-core compatibility checking; codegen produces standalone TypeScript and Python. These are verified repository package relationships, simplified as a schematic rather than every runtime request.', wide, compact, 700, theme);
}

export function securitySVG(theme: Theme): string {
  let wide = heading('04', 'SECURITY LAB', 'Research directions / source-backed security controls');
  wide += `<circle cx="600" cy="310" r="157" class="rule"/><circle cx="600" cy="310" r="118" class="rule" stroke-dasharray="3 8"/><circle cx="600" cy="310" r="82" class="signal-line ring" aria-hidden="true"/>`;
  wide += wire('M443 310H757M600 153V467', .5) + `<path d="M452 310H748" class="signal-line scan" aria-hidden="true"/>`;
  wide += group(box(491, 266, 218, 87) + txt(511, 301, 'SECURITY LAB', 26, 'ink', 'font-weight="600"') + txt(511, 334, 'FOCUS / RESEARCH', 20, 'signal'), .7);
  const areas = ['WEB SECURITY', 'NETWORK / PROTOCOLS', 'SECURITY AUTOMATION', 'APPLICATION SECURITY', 'SYSTEM HARDENING', 'RESEARCH / LABS'];
  areas.forEach((label, i) => {
    const left = i < 3, row = i % 3, x = left ? 40 : 848, y = 135 + row * 118;
    wide += wire(left ? `M352 ${y + 39}H410V310H491` : `M709 310H790V${y + 39}H848`, .5 + i * .1);
    wide += node(x, y, 312, label, 'LAB DIRECTION', true, .95 + i * .12, 78, label.length > 18 ? 23 : 26);
  });
  wide += group(rule('M40 509H1160') + txt(40, 548, 'VERIFIED CODE REFERENCES / TOOLGRAPH', 23, 'signal') + txt(40, 588, 'SSRF adversarial regression tests', 28) + txt(645, 588, 'Database RLS isolation tests', 28) + txt(40, 641, 'DASHED / LAB DIRECTIONS     CODE REFERENCES / TOOLGRAPH', 18, 'muted'), 1.9);
  let compact = heading('04', 'SECURITY LAB', '', true) + group(txt(24, 88, 'FOCUS / RESEARCH DIRECTIONS', 26, 'signal'), .6);
  const compactNames = ['WEB SECURITY', 'NET / PROTOCOLS', 'SECURITY / AUTO', 'APP SECURITY', 'SYS HARDENING', 'RESEARCH / LABS'];
  compactNames.forEach((name, i) => { const x = i % 2 ? 313 : 24, y = 105 + Math.floor(i / 2) * 51; compact += group(box(x, y, 263, 40, 'stroke-dasharray="4 5"') + txt(x + 11, y + 27, name, 26), .95 + i * .12); });
  compact += `<path d="M295 110V247" class="signal-line scan" aria-hidden="true"/>`;
  compact += group(txt(24, 279, 'CODE / SSRF REGRESSION TESTS', 26, 'signal') + txt(24, 314, 'CODE / RLS ISOLATION TESTS', 26, 'signal') + txt(24, 343, 'LAB DIRECTIONS + VERIFIED CODE', 22, 'muted'), 1.9);
  return frame('br3h security lab', 'Focus directions, not claimed accomplishments: web security, network and protocols, security automation, application security, system hardening, research and labs. Existing source references: ToolGraph SSRF adversarial regression tests and database row-level-security isolation tests. These are not professional pentesting, CVEs, bug bounties or certifications. Scanner movement is illustrative only.', wide, compact, 700, theme);
}

export const stackGroups = [
  ['LANGUAGES', ['TypeScript / JavaScript', 'Python / SQL']],
  ['APPLICATION', ['React / Next.js', 'React Flow']],
  ['BACKEND', ['Node.js / Fastify', 'FastAPI']],
  ['DATA', ['Postgres / Supabase', 'MongoDB']],
  ['AI / AUTOMATION', ['MCP / JSON Schema', 'Code generation']],
  ['INFRASTRUCTURE', ['GitHub Actions', 'Vercel / Render config']],
  ['SECURITY / TESTING', ['SSRF guards / RLS tests', 'Vitest / Playwright']],
  ['TOOLING', ['Git / pnpm / Node.js', 'Gitleaks']]
] as const;
export function stackSVG(theme: Theme): string {
  let wide = heading('07', 'SYSTEM STACK', 'Repository-backed technology / application, data and infrastructure bus');
  wide += wire('M600 120V825', .2, true);
  stackGroups.forEach(([label, values], i) => {
    const x = i % 2 ? 635 : 40, y = 132 + Math.floor(i / 2) * 168;
    wide += wire(i % 2 ? `M600 ${y + 65}H635` : `M565 ${y + 65}H600`, .35 + i * .08);
    wide += group(box(x, y, 525, 132) + txt(x + 20, y + 34, label, 25, 'signal', 'font-weight="600"') + txt(x + 20, y + 75, values[0], 26) + txt(x + 20, y + 110, values[1], 26), .7 + i * .09);
  });
  wide += group(txt(40, 840, 'SOURCE BOUNDARIES / TOOLGRAPH + VERIFIED WAITLIST BACKEND', 22, 'muted'), 1.65);
  let compact = heading('07', 'SYSTEM STACK', '', true);
  const compactValues = [
    ['TypeScript / JS', 'Python / SQL'], ['React / Next.js', 'React Flow'],
    ['Node.js / Fastify', 'FastAPI'], ['Postgres', 'Supabase / MongoDB'],
    ['MCP / JSON Schema', 'Code generation'], ['GitHub Actions', 'Vercel / Render'],
    ['SSRF / RLS tests', 'Vitest / Playwright'], ['Git / pnpm / Node', 'Gitleaks']
  ];
  stackGroups.forEach(([label, values], i) => {
    const x = i % 2 ? 313 : 24, y = 70 + Math.floor(i / 2) * 93;
    const compactLabel = i === 5 ? 'INFRA / CONFIG' : label;
    compact += group(txt(x, y + 17, compactLabel, 24, 'signal', 'font-weight="600"') + txt(x, y + 49, compactValues[i][0], 25) + txt(x, y + 80, compactValues[i][1], 25), .7 + i * .09);
  });
  // The mobile bus uses larger type and extra vertical room inside the same SVG.
  return frame('br3h verified system stack', stackGroups.map(([name, values]) => `${name}: ${values.join(', ')}`).join('. ') + '. Repository evidence establishes presence, not proficiency. Vercel and Render are configuration, not live deployment claims.', wide, compact, 880, theme);
}

export function architectureSVG(theme: Theme, daily: string, weekly: string): string {
  let wide = heading('08', 'PROFILE ARCHITECTURE', 'Public data → validated snapshots → original SVG render → README');
  const stages = [['GITHUB API', 'Public GET'], ['VALIDATE', 'Account / UTC'], ['SNAPSHOT', 'Public JSON'], ['SVG RENDER', 'Theme / motion'], ['README', 'Native links']] as const;
  stages.forEach(([label, sub], i) => {
    const x = 40 + i * 225;
    wide += node(x, 151, 205, label, sub, false, .55 + i * .2, 86, 20);
    if (i < stages.length - 1) wide += wire(`M${x + 205} 194H${x + 225}`, .65 + i * .2, true);
  });
  wide += wire('M40 323H1160M142 237V323M817 237V323M1042 237V323', 1.1);
  wide += group(txt(40, 290, `DAILY / PULSE / ${daily}`, 21, 'signal') + txt(585, 290, `WEEKLY / ACTIVITY / ${weekly}`, 21, 'signal'), 1.4);
  wide += group(txt(40, 359, 'GITHUB ACTIONS / SERIALIZED WRITES / EPHEMERAL TOKEN', 22) + txt(40, 398, 'CURATED PROJECT DATA + LOCAL ARTWORK GENERATOR', 22, 'muted') + txt(40, 441, 'API FAILURE → RETAIN PREVIOUS ASSETS     /     WORKFLOWS NOT ACTIVATED LOCALLY', 18, 'muted'), 1.75);
  let compact = heading('08', 'PROFILE ARCHITECTURE', '', true);
  const names = ['PUBLIC API → VALIDATE → SNAPSHOT', 'SVG RENDER → LIGHT / DARK README', 'PROJECT MANIFEST → ORIGINAL ART'];
  names.forEach((name, i) => compact += group(txt(24, 94 + i * 36, name, 25, i === 1 ? 'signal' : 'ink'), .55 + i * .3));
  compact += group(txt(24, 205, `PULSE DAILY / ${daily}`, 25, 'muted') + txt(24, 239, `ACTIVITY MON / ${weekly.replace('MON ', '')}`, 25, 'muted'), 1.6);
  return frame('br3h profile automation architecture', `Public GitHub API data is scoped and validated, stored as minimal JSON snapshots, rendered into original animated dark and light SVGs, and assembled through README pictures, anchors and details. Curated project data supplies operations artwork. Pulse is scheduled daily ${daily}; activity weekly ${weekly}. Actions use serialized writes and an ephemeral GITHUB_TOKEN. API failures retain previous files. Workflows are local and not activated.`, wide, compact, 500, theme);
}
