import type { UnitDef } from '../contracts';
import { drawUnit, UNIT_SIZE } from '../render/unit-art';
import { drawArchitecture, ARCHITECTURE_SIZE } from '../render/architecture-art';

const sources = new Map<string, string>();
function portrait(key:string,size:number,paint:(ctx:CanvasRenderingContext2D)=>void,className:string):HTMLSpanElement {
  let source=sources.get(key);
  if(!source){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;paint(canvas.getContext('2d')!);source=canvas.toDataURL('image/png');sources.set(key,source);}
  const frame=document.createElement('span');frame.className=className;frame.setAttribute('aria-hidden','true');
  const image=document.createElement('img');image.src=source;image.alt='';image.draggable=false;image.width=image.height=size;frame.append(image);return frame;
}
/** The roster portrait is the actual battlefield asset, not an unrelated stock image. */
export function unitPortrait(unit:UnitDef):HTMLSpanElement {
  return portrait(`unit:${unit.id}`,UNIT_SIZE,ctx=>drawUnit(ctx,unit.era,unit.role,0,0),`unit-portrait role-${unit.role}`);
}
export function buildingPortrait(era:number,kind:number):HTMLSpanElement {
  return portrait(`building:${era}:${kind}`,ARCHITECTURE_SIZE,ctx=>drawArchitecture(ctx,era,kind),'building-portrait');
}
