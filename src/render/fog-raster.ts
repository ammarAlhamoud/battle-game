import type { Fog, Vec } from '../contracts';

export interface FogRasterOptions {
  columns: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  scale: number;
  space: boolean;
  world(point: Vec): Vec;
}
export interface FogRasterStats { hiddenTiles: number; runs: number; featherEdges: number }

/**
 * Bake only public fog flags. Unknown cells keep their full cover; the feather is
 * painted inward into an already-visible cell, so softness never reveals a hidden cell.
 * Equal-state isometric row runs prevent dark seams between individual diamonds.
 */
export function paintFogRaster(context: CanvasRenderingContext2D, fog: Pick<Fog, 'visible' | 'explored'>, options: FogRasterOptions): FogRasterStats {
  const { columns, rows, tileWidth, tileHeight, scale, space, world } = options;
  const halfW = tileWidth / 2, halfH = tileHeight / 2;
  const rgb = space ? '23,40,49' : '37,55,47';
  const state = (x: number, y: number): number => {
    if (x < 0 || y < 0 || x >= columns || y >= rows) return 2;
    const i = y * columns + x; return fog.visible[i] ? 0 : fog.explored[i] ? 1 : 2;
  };
  const stats: FogRasterStats = { hiddenTiles: 0, runs: 0, featherEdges: 0 };
  context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.scale(scale, scale);
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns;) {
    const value = state(x, y); if (value === 0) { x++; continue; }
    const start = x; while (x + 1 < columns && state(x + 1, y) === value) x++;
    const first = world({ x: start, y }), last = world({ x, y });
    context.beginPath();
    context.moveTo(first.x, first.y - halfH - .65); context.lineTo(last.x + halfW + .65, last.y);
    context.lineTo(last.x, last.y + halfH + .65); context.lineTo(first.x - halfW - .65, first.y);
    context.closePath(); context.fillStyle = `rgba(${rgb},${value === 1 ? .65 : .985})`; context.fill();
    stats.hiddenTiles += x - start + 1; stats.runs++; x++;
  }
  // Only the inside edge of a visible diamond receives this six-pixel veil.
  const neighbors = [
    { x: 1, y: 0, a: [halfW, 0], b: [0, halfH] },
    { x: -1, y: 0, a: [-halfW, 0], b: [0, -halfH] },
    { x: 0, y: 1, a: [0, halfH], b: [-halfW, 0] },
    { x: 0, y: -1, a: [0, -halfH], b: [halfW, 0] },
  ];
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    if (state(x, y) !== 0) continue;
    const center = world({ x, y });
    for (const neighbor of neighbors) {
      const value = state(x + neighbor.x, y + neighbor.y); if (!value) continue;
      const a = { x: center.x + neighbor.a[0], y: center.y + neighbor.a[1] };
      const b = { x: center.x + neighbor.b[0], y: center.y + neighbor.b[1] };
      const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const length = Math.hypot(center.x - middle.x, center.y - middle.y);
      const inset = { x: (center.x - middle.x) / length * 6, y: (center.y - middle.y) / length * 6 };
      const shade = context.createLinearGradient(middle.x, middle.y, middle.x + inset.x, middle.y + inset.y);
      shade.addColorStop(0, `rgba(${rgb},${value === 2 ? .7 : .43})`); shade.addColorStop(1, `rgba(${rgb},0)`);
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y);
      context.lineTo(b.x + inset.x, b.y + inset.y); context.lineTo(a.x + inset.x, a.y + inset.y);
      context.closePath(); context.fillStyle = shade; context.fill(); stats.featherEdges++;
    }
  }
  context.restore(); return stats;
}
