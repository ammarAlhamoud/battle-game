/** Original, consistent 24px interface icons. Decorative SVGs retain adjacent text labels. */
const paths = {
  campaign:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v16m6-14v16"/>',
  tree:'<path d="M12 3v9m-6 4v-4h12v4"/><rect x="9" y="2" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/>',
  guide:'<path d="M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v15h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3V4Zm9 2v15M6 9h3m6 0h3"/>',
  settings:'<path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 1 3h4l1-3 3-1 3-3-2-2 1-3-3-2-1-3H9Z"/><circle cx="11" cy="11" r="3"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',check:'<path d="m5 12 4 4L19 6"/>',
  supplies:'<path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10v9M3 8l9 5 9-5M8 5l9 5v4"/>',army:'<circle cx="12" cy="7" r="3"/><path d="M6 21v-5a6 6 0 0 1 12 0v5M3 8a2 2 0 0 0 1 4m17-4a2 2 0 0 1-1 4M2 20v-4m20 4v-4"/>',
  score:'<path d="m12 3 3 6 6 1-4 5 1 7-6-3-6 3 1-7-4-5 6-1 3-6Z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',play:'<path d="m8 4 12 8-12 8V4Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',
  home:'<path d="m3 10 9-7 9 7M5 9v12h14V9m-10 12v-7h6v7"/>',select:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5m-7-13 8 6-4 1-2 4-2-11Z"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',expand:'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',
  globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',flag:'<path d="M5 22V3m0 0c5-4 9 4 15 0v11c-6 4-10-4-15 0"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  frontline:'<path d="m7 20 10-15m-6 1 7-3v8M4 16l6 4m-7 2 5-6"/>',ranged:'<path d="M6 3c14 5 14 13 0 18l4-9L6 3Zm4 9h12m-4-4 4 4-4 4"/>',guard:'<path d="m12 2 8 4v7c0 5-8 9-8 9s-8-4-8-9V6l8-4Zm0 5v10m-4-5h8"/>',
  scout:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/><circle cx="12" cy="12" r="2"/>',stealth:'<path d="M3 14c1-8 4-12 9-12s8 4 9 12l-5 7H8l-5-7Zm4-2 5-3 5 3-5 2-5-2Zm1 5h8"/>',siege:'<path d="M4 15h16l-2-6H6l-2 6Zm8-6 6-6 3 3-6 6M4 15v5m16-5v5M2 20h5m10 0h5"/>',engineer:'<path d="m4 21 9-9m-2-8 5-2 6 6-2 5-9-9ZM3 17l4 4M4 3l6 6m-6 1 6-6"/>',
};
export type IconName = keyof typeof paths;
export function icon(name: IconName, className=''): SVGSVGElement {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(key,value);
  svg.classList.add('ui-icon');if(className)svg.classList.add(className);svg.innerHTML=paths[name];return svg;
}
