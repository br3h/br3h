// Original br3h drawing primitives. No external fonts, scripts or widget services.
export const palettes = {
  dark: { background: '#090D12', panel: '#111820', ink: '#F0F4F8', muted: '#A6B2C0', border: '#334250', signal: '#84DDF2', low: '#1E3440' },
  light: { background: '#F6F8FB', panel: '#FFFFFF', ink: '#131D28', muted: '#516171', border: '#B9C7D3', signal: '#086B83', low: '#D9E9EF' }
};
export type Theme = keyof typeof palettes;
export function escapeXML(value: string | number): string {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
}
export const motion = { reveal: .65, trace: 1.25, chart: 1.1, flow: 7, pulse: 5.5, scan: 12, state: 24 };
export const txt = (x: number, y: number, value: string | number, size = 24, colour = 'ink', extra = '') => {
  if (String(value).length > 180 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(String(value))) throw new Error('Invalid SVG text.');
  return `<text x="${x}" y="${y}" class="${colour}" font-size="${size}" ${extra}>${escapeXML(value)}</text>`;
};
export const group = (body: string, delay = 0, extra = '') => `<g class="reveal" style="--delay:${delay}s" ${extra}>${body}</g>`;
export const wire = (d: string, delay = .25, signal = false) => `<path d="${d}" class="trace ${signal ? 'signal-line' : 'rule'}" pathLength="1" style="--delay:${delay}s"/>`;
export const flow = (d: string, delay = 1.5) => `<path d="${d}" class="flow" style="--delay:${delay}s" aria-hidden="true"/>`;
export const rule = (d: string, extra = '') => `<path d="${d}" class="rule" ${extra}/>`;
export const box = (x: number, y: number, w: number, h: number, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="panel" ${extra}/>`;
export function node(x: number, y: number, w: number, label: string, sub = '', direction = false, delay = .8, h = 86, size = 25): string {
  return group(box(x, y, w, h, direction ? 'stroke-dasharray="5 7"' : '') + txt(x + 18, y + 34, label, size, direction ? 'ink' : 'signal', 'font-weight="600"') + (sub ? txt(x + 18, y + 64, sub, 19, 'muted') : ''), delay);
}
export function heading(id: string, title: string, subtitle: string, compact = false): string {
  const w = compact ? 600 : 1200, pad = compact ? 24 : 40;
  return group(txt(pad, 38, `${id} / ${title}`, compact ? 27 : 24, 'ink', 'font-weight="600"') + (compact ? '' : txt(w - pad, 38, 'BR3H.SYS', 18, 'muted', 'text-anchor="end"')) + rule(`M${pad} 55H${w - pad}`), .1) + (subtitle ? group(txt(pad, 87, subtitle, compact ? 24 : 21, 'muted'), .3) : '');
}
const styles = (theme: Theme) => {
  const p = palettes[theme];
  return `:root{--bg:${p.background};--panel:${p.panel};--ink:${p.ink};--muted:${p.muted};--rule:${p.border};--signal:${p.signal};--low:${p.low};--ease:cubic-bezier(.22,.75,.2,1)}
text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}.ink{fill:var(--ink)}.muted{fill:var(--muted)}.signal{fill:var(--signal)}.rule{fill:none;stroke:var(--rule);stroke-width:1.5}.signal-line{fill:none;stroke:var(--signal);stroke-width:2}.panel{fill:var(--panel);stroke:var(--rule);stroke-width:1.5}.low{fill:var(--low)}.wide{display:block}.compact{display:none}
/* Base properties are final/readable even if a renderer disables CSS motion. */
.reveal{opacity:1}.trace{stroke-dashoffset:0}.flow{fill:none;stroke:var(--signal);stroke-width:2;stroke-dasharray:3 140;opacity:.45}.pulse{opacity:1}.scan{opacity:.22}.bars{transform-box:fill-box;transform-origin:center bottom}.ring{transform-box:fill-box;transform-origin:center}.focus-static{display:block}.focus-cycle{display:none}
@media(prefers-reduced-motion:no-preference){
.reveal{animation:assemble ${motion.reveal}s var(--ease) var(--delay,0s) both}.trace{animation:route ${motion.trace}s var(--ease) var(--delay,0s) both}.flow{animation:transmit ${motion.flow}s linear var(--delay,1.5s) infinite}.pulse{animation:beacon ${motion.pulse}s ease-in-out 2s infinite}.scan{animation:inspect ${motion.scan}s ease-in-out 2s infinite}.bars{animation:bars ${motion.chart}s var(--ease) var(--delay,.6s) both}.ring{animation:ring 6s ease-out 1.8s infinite}.check-once{animation:check 2s ease 1.5s both}.sweep-once{animation:sweep 1.8s ease-out 1.8s both}.focus-static{display:none}.focus-cycle{display:block}.state{opacity:0;animation:state ${motion.state}s linear infinite;animation-delay:var(--phase,0s)}
}
@keyframes assemble{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
@keyframes route{from{stroke-dasharray:1;stroke-dashoffset:1}to{stroke-dasharray:1;stroke-dashoffset:0}}
@keyframes transmit{to{stroke-dashoffset:-286}}
@keyframes beacon{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes inspect{0%,100%{transform:translateY(-50px);opacity:.08}50%{transform:translateY(50px);opacity:.3}}
@keyframes bars{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes ring{0%{transform:scale(.8);opacity:.3}80%,100%{transform:scale(1.22);opacity:0}}
@keyframes check{0%,100%{opacity:.3}50%{opacity:1}}
@keyframes sweep{0%{transform:translateX(0);opacity:0}15%,65%{opacity:.7}100%{transform:translateX(900px);opacity:0}}
@keyframes state{0%,23%{opacity:1}25%,100%{opacity:0}}
@media(max-width:640px){.wide{display:none}.compact{display:block}.flow{stroke-width:1.5}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.reveal,.pulse{opacity:1!important;transform:none!important}.trace{stroke-dasharray:none!important;stroke-dashoffset:0!important}.bars{transform:none!important}.flow{opacity:.2!important}.scan{transform:none!important;opacity:.12!important}.ring,.sweep-once{opacity:0!important}.focus-cycle{display:none!important}.focus-static{display:block!important}}
/* Native picture sources can select #static when an image renderer does not
   propagate the embedding page's reduced-motion preference to SVG CSS. */
#static:target *,#static:target *::before,#static:target *::after{animation:none!important;transition:none!important}#static:target .reveal,#static:target .pulse{opacity:1!important;transform:none!important}#static:target .trace{stroke-dasharray:none!important;stroke-dashoffset:0!important}#static:target .bars{transform:none!important}#static:target .flow{opacity:.2!important}#static:target .scan{transform:none!important;opacity:.12!important}#static:target .ring,#static:target .sweep-once{opacity:0!important}#static:target .focus-cycle{display:none!important}#static:target .focus-static{display:block!important}
`;
};
export function frame(title: string, desc: string, wide: string, compact: string, height: number, theme: Theme): string {
  return `<svg id="static" xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" role="img" aria-labelledby="title desc">\n<title id="title">${escapeXML(title)}</title>\n<desc id="desc">${escapeXML(desc)}</desc>\n<style>${styles(theme)}</style>\n<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" class="rule" opacity=".12"/></pattern><clipPath id="canvas"><rect x="1" y="1" width="1198" height="${height - 2}"/></clipPath></defs>\n<g clip-path="url(#canvas)"><rect width="1200" height="${height}" fill="var(--bg)"/><rect width="1200" height="${height}" fill="url(#grid)"/><rect x="1" y="1" width="1198" height="${height - 2}" class="rule"/>${wire(`M1 32V1H48M1152 1H1199V32M1199 ${height - 32}V${height - 1}H1152M48 ${height - 1}H1V${height - 32}`, 0, true)}<g class="wide">${wide}</g><svg class="compact" width="1200" height="${height}" viewBox="0 0 600 ${height / 2}">${compact}</svg></g>\n</svg>\n`;
}
