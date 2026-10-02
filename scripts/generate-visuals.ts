import { readFileSync, mkdirSync, writeFileSync, renameSync, existsSync, lstatSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, config } from './github.ts';
import { heroSVG, systemMapSVG, operationsSVG, toolgraphSVG, securitySVG, stackSVG, architectureSVG } from './visuals.ts';

export function visualAssets(root = ROOT): Record<string, string> {
  const { projects } = config(root);
  const project = projects.find(p => p.repository === 'br3h/toolgraph');
  if (!project) throw new Error('ToolGraph is required for this source-backed flagship composition.');
  function schedule(file: string, weekly = false): string {
    const source = readFileSync(join(root, '.github/workflows', file), 'utf8');
    const cron = source.match(/cron:\s*'([^']+)'/)?.[1]?.split(' ');
    if (!cron || cron.length !== 5 || !/^\d+$/.test(cron[0]) || !/^\d+$/.test(cron[1]) || cron[2] !== '*' || cron[3] !== '*' || cron[4] !== (weekly ? '1' : '*')) throw new Error('Unrecognized workflow schedule; artwork must not invent a schedule.');
    return `${weekly ? 'MON ' : ''}${cron[1].padStart(2, '0')}:${cron[0].padStart(2, '0')} UTC`;
  }
  const assets: Record<string, string> = {};
  for (const theme of ['dark', 'light'] as const) {
    assets[`assets/brand/hero-${theme}.svg`] = heroSVG(theme);
    assets[`assets/sections/system-map-${theme}.svg`] = systemMapSVG(theme);
    assets[`assets/sections/operations-${theme}.svg`] = operationsSVG(project, theme);
    assets[`assets/sections/toolgraph-${theme}.svg`] = toolgraphSVG(theme);
    assets[`assets/sections/security-lab-${theme}.svg`] = securitySVG(theme);
    assets[`assets/sections/stack-${theme}.svg`] = stackSVG(theme);
    assets[`assets/sections/profile-architecture-${theme}.svg`] = architectureSVG(theme, schedule('pulse.yml'), schedule('activity.yml', true));
  }
  return assets;
}
export function generateVisuals(root = ROOT): void {
  const outputs = visualAssets(root);
  for (const [name, source] of Object.entries(outputs)) {
    const target = join(root, name), parent = join(root, name.slice(0, name.lastIndexOf('/')));
    if (lstatSync(join(root, 'assets')).isSymbolicLink() || lstatSync(join(root, 'assets/brand')).isSymbolicLink()) throw new Error('Refusing symlink artwork directory.');
    mkdirSync(parent, { recursive: true });
    if (lstatSync(parent).isSymbolicLink() || (existsSync(target) && lstatSync(target).isSymbolicLink())) throw new Error('Refusing symlink artwork destination.');
    if (existsSync(target) && readFileSync(target, 'utf8') === source) continue;
    const temp = `${target}.${process.pid}.tmp`;
    try { writeFileSync(temp, source, { flag: 'wx' }); renameSync(temp, target); }
    finally { if (existsSync(temp)) unlinkSync(temp); }
  }
  console.log(`Rendered ${Object.keys(outputs).length} original dark/light SVGs from manifests and workflow schedules.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) generateVisuals();
