/** Original engraved-outline 24px icons; adjacent HTML retains the accessible label. */
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
  frontline:'<path d="m8 18 5-6 2-7 6-3-2 7-6 6-5 3Z" fill="currentColor" fill-opacity=".16"/><path d="m8 18 5-6 2-7 6-3-2 7-6 6-5 3ZM5 15l7 6m-9 1 6-6m7-9-4 7"/><path d="m4 4 3 3m-4 3 4 1" opacity=".65"/>',
  ranged:'<path d="M5 3c13 4 14 14 0 18l4-9-4-9Z" fill="currentColor" fill-opacity=".13"/><path d="M5 3c13 4 14 14 0 18l4-9-4-9Zm4 9h13m-4-4 4 4-4 4M4 3l5 9-5 9"/><path d="m12 5 2-3m1 18 2 2" opacity=".55"/>',
  guard:'<path d="m12 2 8 3-1 9c-1 4-7 8-7 8s-6-4-7-8L4 5l8-3Z" fill="currentColor" fill-opacity=".14"/><path d="m12 2 8 3-1 9c-1 4-7 8-7 8s-6-4-7-8L4 5l8-3Zm0 4 5 2-.5 6c-.5 2-4.5 5-4.5 5s-4-3-4.5-5L7 8l5-2Zm0 2v8m-3-5h6"/>',
  scout:'<circle cx="12" cy="12" r="9"/><path d="m15 6-1 8-8 4 4-8 5-4Z" fill="currentColor" fill-opacity=".22"/><path d="m15 6-1 8-8 4 4-8 5-4Zm-5 4 4 4M12 1v3m0 16v3M1 12h3m16 0h3"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  stealth:'<path d="M3 14C4 6 7 2 12 2s8 4 9 12l-5 7H8l-5-7Z" fill="currentColor" fill-opacity=".12"/><path d="M3 14C4 6 7 2 12 2s8 4 9 12l-5 7H8l-5-7Zm4-1 5-4 5 4-5 4-5-4Zm1 6h8m-4-15-3 5"/><path d="m8 13 2 1m6-1-2 1" stroke-width="2"/>',
  siege:'<path d="m5 15 3-5h10l2 5H5Zm5-5 6-7 5 4-7 7" fill="currentColor" fill-opacity=".15"/><path d="m5 15 3-5h10l2 5H5Zm5-5 6-7 5 4-7 7m1-9 5 4M4 17h17"/><circle cx="7" cy="19" r="3"/><circle cx="18" cy="19" r="3"/><circle cx="7" cy="19" r=".7" fill="currentColor"/><circle cx="18" cy="19" r=".7" fill="currentColor"/>',
  engineer:'<path d="m4 19 9-9 3 3-9 9-3-3Zm7-15 4-2 7 7-2 4-9-9Z" fill="currentColor" fill-opacity=".17"/><path d="m4 19 9-9 3 3-9 9-3-3Zm7-15 4-2 7 7-2 4-9-9ZM3 3l15 15m-2-1 4-1 2 4-3 2-3-3M4 3l2-1 4 4-2 2-4-5Z"/>',
  attack:'<path d="m6 19 4-6 2-6 8-5-3 9-7 5-4 3Z" fill="currentColor" fill-opacity=".15"/><path d="m6 19 4-6 2-6 8-5-3 9-7 5-4 3ZM3 15l7 6m-7 1 5-5m7-9 3-3"/>',
  defend:'<path d="m12 3 8 3-1 9-7 7-7-7-1-9 8-3Z" fill="currentColor" fill-opacity=".15"/><path d="m12 3 8 3-1 9-7 7-7-7-1-9 8-3ZM8 12h8m-4-4v8"/>',
  capture:'<path d="M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/><path d="M7 6c4-2 7 2 11 0v6c-4 2-7-2-11 0V6Z" fill="currentColor" fill-opacity=".2" stroke="none"/><path d="M2 22h7"/>',
  rally:'<path d="m3 10 12-6v13L3 12v-2Zm12-8h4v17h-4V2ZM6 13l3 8h4l-2-6" fill="currentColor" fill-opacity=".15"/><path d="m3 10 12-6v13L3 12v-2Zm12-8h4v17h-4V2ZM6 13l3 8h4l-2-6m10-9 2-2m-2 8h2m-2 6 2 2"/>',
  recon:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12V4a8 8 0 0 1 7 12l-7-4Z" fill="currentColor" fill-opacity=".19"/><path d="m12 12 6-6M12 1v3m0 16v3M1 12h3m16 0h3"/><circle cx="9" cy="15" r="1" fill="currentColor"/>',
  volley:'<path d="m5 21 3-16m-2 3 3-5 2 5m0 14 3-18m-2 3 3-5 2 5m0 14 3-13m-2 3 3-5 2 5M4 17l2-2 2 2m3 0 2-2 2 2m2 0 2-2 2 2"/>',
  barrier:'<path d="M3 5h4v14H3zM10 3h4v16h-4zM17 5h4v14h-4z" fill="currentColor" fill-opacity=".17"/><path d="M3 5h4v14H3zM10 3h4v16h-4zM17 5h4v14h-4zM1 11h22M2 22h20"/>',
  tower:'<path d="M5 21V9H3V3h5v3h2V3h4v3h2V3h5v6h-2v12H5Z" fill="currentColor" fill-opacity=".16"/><path d="M5 21V9H3V3h5v3h2V3h4v3h2V3h5v6h-2v12H5Zm4 0v-5a3 3 0 0 1 6 0v5M5 10h14"/>',
  formation:'<path d="m12 2 4 3-4 3-4-3 4-3ZM5 9l4 3-4 3-4-3 4-3Zm14 0 4 3-4 3-4-3 4-3Zm-7 7 4 3-4 3-4-3 4-3Z" fill="currentColor" fill-opacity=".18"/><path d="m12 2 4 3-4 3-4-3 4-3ZM5 9l4 3-4 3-4-3 4-3Zm14 0 4 3-4 3-4-3 4-3Zm-7 7 4 3-4 3-4-3 4-3Z"/>',
};
export type IconName = keyof typeof paths;
export function icon(name: IconName, className=''): SVGSVGElement {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.5','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(key,value);
  svg.classList.add('ui-icon');if(className)svg.classList.add(className);svg.dataset.icon=name;svg.innerHTML=paths[name];return svg;
}
