import type { SkillEffect } from '../contracts.js';

/** Original engraved emblems. No text is baked into the artwork. */
const emblems: Record<SkillEffect, string> = {
  capacity: `<path d="M28 64V42l10-8 10 8v22M43 64V31l10-8 10 8v33M59 64V43l9-7 8 7v21" fill="GOLD" stroke="DARK" stroke-width="2"/><path d="M32 46h5m-5 7h5m11-15h10m-10 8h10m-10 8h10m6-6h6m-6 7h6" stroke="IVORY" stroke-width="2"/><path d="M23 66h55M25 70h51" stroke="GOLD" stroke-width="3"/><path d="m35 24 4 4 8-9" fill="none" stroke="TEAL" stroke-width="3"/>`,
  reserve: `<path d="m23 39 25-13 25 13-25 13-25-13Z" fill="IVORY" stroke="DARK" stroke-width="2"/><path d="m23 39 25 13v24L23 63V39Z" fill="GOLD" stroke="DARK" stroke-width="2"/><path d="m48 52 25-13v24L48 76V52Z" fill="#54766c" stroke="DARK" stroke-width="2"/><path d="m34 33 26 13v11l-8 4V50L27 37" fill="GOLD" stroke="DARK" stroke-width="1.5"/><path d="m29 51 9 5m-9 3 9 5m17 1 11-6" stroke="IVORY" stroke-width="2"/><circle cx="71" cy="29" r="10" fill="TEAL" stroke="DARK" stroke-width="2"/><path d="M71 24v10m-5-5h10" stroke="IVORY" stroke-width="2"/>`,
  lines: `<path d="M23 28h50v12H23zM23 57h50v12H23z" fill="GOLD" stroke="DARK" stroke-width="2"/><path d="M28 32h40m-40 29h40" stroke="IVORY" stroke-width="2"/><path d="m29 45 7 5-7 5m38-10-7 5 7 5" fill="none" stroke="TEAL" stroke-width="3"/><path d="M43 24v20m11-20v20M43 53v20m11-20v20" stroke="DARK" stroke-width="3"/><circle cx="31" cy="34" r="2" fill="DARK"/><circle cx="65" cy="63" r="2" fill="DARK"/>`,
  training: `<path d="M32 24h32M32 73h32M36 25c0 14 4 16 12 23-8 7-12 10-12 24m24-47c0 14-4 16-12 23 8 7 12 10 12 24" fill="none" stroke="GOLD" stroke-width="4"/><path d="m39 34 9 10 9-10H39Zm9 19-10 15h20L48 53Z" fill="IVORY"/><path d="M35 29h26m-26 40h26" stroke="DARK" stroke-width="2"/><path d="m64 43 9 5-9 5m7-10 8 5-8 5" fill="none" stroke="TEAL" stroke-width="2.5"/>`,
  damage: `<path d="m35 68 7-9 9-30 18-12-3 22-22 22-9 7Z" fill="IVORY" stroke="DARK" stroke-width="2"/><path d="m45 57 18-32-8 30-10 2Z" fill="GOLD"/><path d="m29 56 18 13M29 71l9-12" stroke="GOLD" stroke-width="5"/><path d="m26 75 6-6m0 7 5-7" stroke="DARK" stroke-width="3"/><path d="m20 28 10 10m-2-18 5 10m-14 7 11 6m36 12 10 2m-13 5 7 6" stroke="TEAL" stroke-width="2.5"/>`,
  armor: `<path d="m48 20 25 10-2 25c-2 11-13 18-23 23-10-5-21-12-23-23l-2-25 25-10Z" fill="GOLD" stroke="DARK" stroke-width="2"/><path d="m48 27 18 8-2 19c-1 7-9 13-16 17-7-4-15-10-16-17l-2-19 18-8Z" fill="#244c49" stroke="IVORY" stroke-width="1.5"/><path d="m48 32 12 6-1 14c-1 5-6 9-11 12V32Z" fill="TEAL" fill-opacity=".42"/><path d="M48 31v33m-10-20h20" stroke="IVORY" stroke-width="3"/><circle cx="29" cy="34" r="2" fill="DARK"/><circle cx="67" cy="34" r="2" fill="DARK"/>`,
  vision: `<path d="M17 48s12-19 31-19 31 19 31 19-12 19-31 19S17 48 17 48Z" fill="GOLD" stroke="DARK" stroke-width="2"/><path d="M24 48s9-13 24-13 24 13 24 13-9 13-24 13S24 48 24 48Z" fill="IVORY"/><circle cx="48" cy="48" r="13" fill="TEAL" stroke="DARK" stroke-width="2"/><circle cx="48" cy="48" r="7" fill="DARK"/><circle cx="44" cy="44" r="3" fill="IVORY"/><path d="M48 19v6m-19-1 4 6m34-6-4 6m-15 41v6" stroke="GOLD" stroke-width="2"/>`,
  capture: `<path d="M32 76V22" stroke="GOLD" stroke-width="4"/><path d="M34 25c14-11 24 11 39 0v28c-15 11-25-11-39 0V25Z" fill="GOLD" stroke="DARK" stroke-width="2"/><path d="M37 30c12-6 21 9 32 1v16c-11 7-20-7-32-1V30Z" fill="#397568"/><path d="m52 31 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1 3-7Z" fill="IVORY"/><path d="M23 76h26" stroke="IVORY" stroke-width="3"/><circle cx="32" cy="20" r="4" fill="IVORY" stroke="DARK" stroke-width="1.5"/>`,
  engineer: `<path d="m28 73 34-36 7 7-35 35-6-6Z" fill="GOLD" stroke="DARK" stroke-width="2"/><path d="M52 22c-10-1-15 5-13 14l22 22c9 2 16-4 14-14l-9 7-12-12 7-9-9-8Z" fill="IVORY" stroke="DARK" stroke-width="2"/><path d="m27 28 40 39-7 7-40-40 7-6Z" fill="#6a8c7c" stroke="DARK" stroke-width="2"/><path d="m23 22 7-5 12 12-7 8-12-15Z" fill="GOLD" stroke="DARK" stroke-width="2"/><path d="m30 27 7 7m19 27 7 7" stroke="IVORY" stroke-width="2"/>`,
  stealth: `<path d="M22 57c3-26 12-38 26-38s23 12 26 38L61 77H35L22 57Z" fill="#244942" stroke="GOLD" stroke-width="2"/><path d="m48 25-13 9-7 21 12-8 8-22Z" fill="TEAL" fill-opacity=".55"/><path d="m29 56 19-12 19 12-19 16-19-16Z" fill="DARK" stroke="IVORY" stroke-width="1.5"/><path d="m36 55 8 3m16-3-8 3" stroke="GOLD" stroke-width="3"/><path d="m39 68-5 7m23-7 5 7" stroke="GOLD" stroke-width="1.5"/><path d="M47 35h2" stroke="IVORY" stroke-width="2"/>`,
  siege: `<path d="M25 59h47l-6-12H32l-7 12Z" fill="GOLD" stroke="DARK" stroke-width="2"/><path d="m41 47 22-26 10 9-25 26-7-9Z" fill="IVORY" stroke="DARK" stroke-width="2"/><path d="m49 44 17-18m-12 23 17-18" stroke="#6a8c7c" stroke-width="3"/><path d="m58 22 8-5 12 11-5 8-15-14Z" fill="GOLD" stroke="DARK" stroke-width="2"/><circle cx="33" cy="65" r="9" fill="DARK" stroke="GOLD" stroke-width="3"/><circle cx="66" cy="65" r="9" fill="DARK" stroke="GOLD" stroke-width="3"/><circle cx="33" cy="65" r="2" fill="IVORY"/><circle cx="66" cy="65" r="2" fill="IVORY"/>`,
  formations: `<path d="m48 20 13 8-13 8-13-8 13-8Zm-16 20 12 8-12 8-12-8 12-8Zm32 0 12 8-12 8-12-8 12-8ZM48 60l13 8-13 8-13-8 13-8Z" fill="GOLD" stroke="DARK" stroke-width="2"/><path d="m48 25 6 3-6 4-6-4 6-3ZM32 45l5 3-5 4-5-4 5-3Zm32 0 5 3-5 4-5-4 5-3ZM48 65l6 3-6 4-6-4 6-3Z" fill="IVORY"/><path d="M48 37v20m-11-9h22" stroke="TEAL" stroke-width="2"/>`,
  rally: `<path d="m25 43 31-15v35L25 49v-6Z" fill="GOLD" stroke="DARK" stroke-width="2"/><path d="M57 23h8v46h-8z" fill="IVORY" stroke="DARK" stroke-width="2"/><path d="m32 51 7 21h11l-6-16" fill="#527c69" stroke="GOLD" stroke-width="2"/><path d="M21 41v12m49-18 8-6m-8 18h10m-10 12 8 6" stroke="TEAL" stroke-width="3"/><path d="m31 42 19-8v18l-19-8" fill="IVORY" fill-opacity=".45"/>`,
  recon: `<circle cx="48" cy="48" r="26" fill="#244942" stroke="GOLD" stroke-width="2"/><circle cx="48" cy="48" r="17" fill="none" stroke="TEAL" stroke-width="1.5"/><circle cx="48" cy="48" r="8" fill="none" stroke="TEAL" stroke-width="1"/><path d="M48 22v26l21 15c8-12 5-28-7-36-4-3-9-5-14-5Z" fill="TEAL" fill-opacity=".24"/><path d="M48 48 67 30" stroke="IVORY" stroke-width="3"/><path d="M48 16v8m0 48v8M16 48h8m48 0h8" stroke="IVORY" stroke-width="2"/><circle cx="57" cy="58" r="3" fill="GOLD"/><circle cx="35" cy="39" r="2.5" fill="IVORY"/><circle cx="48" cy="48" r="3" fill="GOLD"/>`,
  volley: `<path d="m27 72 8-44m-2 11 4-15 5 12M46 76l8-51m-3 11 5-16 5 13M65 72l7-33m-3 11 4-15 5 12" fill="none" stroke="IVORY" stroke-width="3"/><path d="m28 63 4-5 3 6m12 3 4-5 3 6m11-8 4-4 3 5" fill="none" stroke="GOLD" stroke-width="2"/><path d="M24 40c-4 6-6 12-6 19m24-37c-4 4-6 8-7 12m46 14c-1 7-4 13-8 18" fill="none" stroke="TEAL" stroke-width="2"/>`,
  construction: `<path d="M23 73V39h10V27h12v12h8V27h12v12h10v34H23Z" fill="GOLD" stroke="DARK" stroke-width="2"/><path d="M28 44h42v24H28V44Z" fill="#365d53"/><path d="M43 73V58a6 6 0 0 1 12 0v15" fill="DARK" stroke="IVORY" stroke-width="2"/><path d="M25 52h15m16 0h17M24 62h15m18 0h17M36 40v12m25-12v12" stroke="IVORY" stroke-width="1.5"/><path d="m28 19 7 7m32-7-7 7" stroke="TEAL" stroke-width="2"/>`,
};

let artSequence = 0;

/** Rich decorative artwork; keep the skill's accessible name in adjacent HTML. */
export function skillArt(effect: SkillEffect): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const prefix = `skill-emblem-${++artSequence}`;
  svg.setAttribute('viewBox', '0 0 96 96');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('skill-art');
  svg.dataset.effect = effect;
  const fill = (source: string) => source.replaceAll('GOLD', `url(#${prefix}-gold)`).replaceAll('IVORY', `url(#${prefix}-ivory)`).replaceAll('TEAL', '#8adbc0').replaceAll('DARK', '#112c2e');
  const notches = Array.from({ length: 24 }, (_, i) => `<path d="M48 5.8v${i % 3 === 0 ? 3.4 : 1.7}" transform="rotate(${i * 15} 48 48)" stroke="${i % 3 === 0 ? '#f3db9a' : '#76684a'}" stroke-width="${i % 3 === 0 ? 1.4 : .8}"/>`).join('');
  svg.innerHTML = `<defs>
    <linearGradient id="${prefix}-gold" x1=".15" y1="0" x2=".8" y2="1"><stop stop-color="#fff0bb"/><stop offset=".28" stop-color="#dbc087"/><stop offset=".5" stop-color="#9c804a"/><stop offset=".69" stop-color="#e7ca88"/><stop offset="1" stop-color="#8f7240"/></linearGradient>
    <linearGradient id="${prefix}-ivory" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#fffaf0"/><stop offset=".5" stop-color="#e0e5cf"/><stop offset="1" stop-color="#91b09d"/></linearGradient>
    <radialGradient id="${prefix}-well" cx=".36" cy=".22" r=".85"><stop stop-color="#34554e"/><stop offset=".65" stop-color="#17363b"/><stop offset="1" stop-color="#10242e"/></radialGradient>
    <linearGradient id="${prefix}-bevel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d4bf88"/><stop offset=".4" stop-color="#726347"/><stop offset=".6" stop-color="#b6a16b"/><stop offset="1" stop-color="#433f34"/></linearGradient>
  </defs>
  <circle cx="48" cy="49.5" r="45.5" fill="#060f15" opacity=".8"/>
  <circle cx="48" cy="48" r="44.5" fill="url(#${prefix}-bevel)" stroke="#c7b483" stroke-width=".8"/>
  <circle cx="48" cy="48" r="41.7" fill="#172f35" stroke="#0c1d24" stroke-width="1.2"/>
  ${notches}
  <circle cx="48" cy="48" r="37.7" fill="url(#${prefix}-well)" stroke="#c7ae74" stroke-width="1.1"/>
  <circle cx="48" cy="48" r="35.8" fill="none" stroke="#7b9d87" stroke-opacity=".4" stroke-width=".6"/>
  <path d="M23 27c9-9 25-13 38-7" fill="none" stroke="#deebc3" stroke-opacity=".16" stroke-width="9"/>
  <g stroke-linecap="round" stroke-linejoin="round">${fill(emblems[effect] ?? emblems.capacity)}</g>
  <g fill="url(#${prefix}-gold)" stroke="#33443a" stroke-width=".8"><circle cx="48" cy="5" r="2"/><circle cx="91" cy="48" r="2"/><circle cx="48" cy="91" r="2"/><circle cx="5" cy="48" r="2"/></g>
  <path d="M17 17a44 44 0 0 1 62 0" fill="none" stroke="#fff0bc" stroke-opacity=".6" stroke-width=".7"/>
  <path d="M18 79a44 44 0 0 0 60 0" fill="none" stroke="#050e14" stroke-opacity=".8" stroke-width="1.2"/>`;
  return svg;
}
