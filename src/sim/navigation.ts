import type { Formation, Side, Structure, Terrain, Vec } from '../contracts.js';

/** Cells are centred on integer coordinates, matching authoritative simulation positions. */
export function terrainAt(map: string[], x: number, y: number): Terrain {
  return (map[Math.round(y)]?.[Math.round(x)] ?? '#') as Terrain;
}

/** Gates are permanently open passages. Friendly barriers have a usable wicket. */
export function isWalkable(map: string[], x: number, y: number, structures: Structure[] = [], side?: Side): boolean {
  const terrain = terrainAt(map, x, y);
  if (terrain === '~' || terrain === '#') return false;
  const cx = Math.round(x), cy = Math.round(y);
  return !structures.some(s => s.hp > 0 && s.built >= 1 && Math.round(s.x) === cx && Math.round(s.y) === cy
    && (s.kind === 'tower' || side === undefined || s.owner !== side));
}

export function terrainModifiers(terrain: Terrain): { speed: number; cover: number; vision: number; range: number } {
  switch (terrain) {
    case 'f': return { speed: .78, cover: .22, vision: .72, range: -.3 };
    case '^': return { speed: .88, cover: .08, vision: 1.18, range: .5 };
    case '=': return { speed: .88, cover: .06, vision: 1, range: 0 };
    case 'g': return { speed: .88, cover: .12, vision: 1, range: 0 };
    case 'c': return { speed: .92, cover: .28, vision: .92, range: 0 };
    case '~': case '#': return { speed: 0, cover: 0, vision: 0, range: 0 };
    default: return { speed: 1, cover: 0, vision: 1, range: 0 };
  }
}

interface Node { id: number; f: number; g: number; serial: number }
class MinHeap {
  private values: Node[] = [];
  get length(): number { return this.values.length; }
  private before(a: Node, b: Node): boolean { return a.f < b.f || (a.f === b.f && (a.g > b.g || (a.g === b.g && a.serial < b.serial))); }
  push(n: Node): void {
    const a = this.values; a.push(n);
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (!this.before(n, a[p]!)) break; a[i] = a[p]!; i = p; }
    a[i] = n;
  }
  pop(): Node | undefined {
    const a = this.values, root = a[0], tail = a.pop();
    if (a.length && tail) {
      let i = 0;
      while (true) {
        let c = i * 2 + 1;
        if (c >= a.length) break;
        if (c + 1 < a.length && this.before(a[c + 1]!, a[c]!)) c++;
        if (!this.before(a[c]!, tail)) break;
        a[i] = a[c]!; i = c;
      }
      a[i] = tail;
    }
    return root;
  }
}
const SQRT2 = Math.SQRT2;
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
const heuristic = (x: number, y: number, tx: number, ty: number): number => {
  const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
  return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
};

/** Weighted strategic A*, with deterministic ties, no diagonal corner cuts, and safe inaccessible-goal recovery.
 * Returns waypoints after the start cell. An unreachable target resolves to the closest reachable cell,
 * so units can still occupy a capture zone instead of repeatedly requesting an impossible route.
 */
export function findPath(map: string[], from: Vec, to: Vec, structures: Structure[] = [], side?: Side): Vec[] {
  const height = map.length, width = map[0]?.length ?? 0;
  if (!width || !height || !Number.isFinite(from.x + from.y + to.x + to.y)) return [];
  const sx = Math.max(0, Math.min(width - 1, Math.round(from.x)));
  const sy = Math.max(0, Math.min(height - 1, Math.round(from.y)));
  const tx = Math.max(0, Math.min(width - 1, Math.round(to.x)));
  const ty = Math.max(0, Math.min(height - 1, Math.round(to.y)));
  const start = sy * width + sx, target = ty * width + tx, size = width * height;
  if (start === target) return [];
  const blocked = new Uint8Array(size);
  const costs = new Float32Array(size);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const mods = terrainModifiers((map[y]?.[x] ?? '#') as Terrain), id = y * width + x;
    blocked[id] = mods.speed ? 0 : 1;
    costs[id] = mods.speed ? 1 / mods.speed : 1000;
  }
  for (const s of structures) {
    if (s.hp <= 0 || s.built < 1 || (s.kind === 'barrier' && s.owner === side)) continue;
    const x = Math.round(s.x), y = Math.round(s.y);
    if (x >= 0 && x < width && y >= 0 && y < height) blocked[y * width + x] = 1;
  }
  blocked[start] = 0; // A completed structure must never imprison a unit already standing in that cell.
  const scores = new Float64Array(size); scores.fill(Infinity); scores[start] = 0;
  const previous = new Int32Array(size); previous.fill(-1);
  const closed = new Uint8Array(size), heap = new MinHeap();
  let serial = 0, best = start, bestDistance = heuristic(sx, sy, tx, ty);
  heap.push({ id: start, f: bestDistance, g: 0, serial: serial++ });
  while (heap.length) {
    const current = heap.pop()!;
    if (closed[current.id] || current.g !== scores[current.id]) continue;
    closed[current.id] = 1;
    const x = current.id % width, y = Math.floor(current.id / width), h = heuristic(x, y, tx, ty);
    if (h < bestDistance || (h === bestDistance && current.g < scores[best]!)) { best = current.id; bestDistance = h; }
    if (current.id === target) { best = target; break; }
    for (const [dx, dy] of DIRECTIONS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const id = ny * width + nx;
      if (blocked[id] || closed[id]) continue;
      if (dx && dy && (blocked[y * width + nx] || blocked[ny * width + x])) continue;
      const g = current.g + (dx && dy ? SQRT2 : 1) * costs[id]!;
      if (g + 1e-8 >= scores[id]!) continue;
      scores[id] = g; previous[id] = current.id;
      heap.push({ id, g, f: g + heuristic(nx, ny, tx, ty), serial: serial++ });
    }
  }
  const path: Vec[] = [];
  for (let id = best, guard = 0; id !== start && id >= 0 && guard < size; id = previous[id]!, guard++) {
    path.push({ x: id % width, y: Math.floor(id / width) });
  }
  return path.reverse();
}

/** Forward points along +y; callers rotate this local offset to the direction of the group order. */
export function formationOffset(index: number, count: number, formation: Formation): Vec {
  if (count <= 1) return { x: 0, y: 0 };
  const i = Math.max(0, Math.min(count - 1, Math.floor(index)));
  if (formation === 'line') {
    const columns = Math.min(6, count), rows = Math.ceil(count / columns);
    const row = Math.floor(i / columns), inRow = Math.min(columns, count - row * columns);
    return { x: (i % columns - (inRow - 1) / 2) * .8, y: (row - (rows - 1) / 2) * .72 };
  }
  if (formation === 'column') {
    const columns = count > 4 ? 2 : 1, rows = Math.ceil(count / columns);
    return { x: (i % columns - (columns - 1) / 2) * .64, y: (Math.floor(i / columns) - (rows - 1) / 2) * .73 };
  }
  if (formation === 'wedge') {
    if (i === 0) return { x: 0, y: -.4 };
    const rank = Math.ceil(i / 2), sign = i % 2 ? -1 : 1;
    return { x: rank * .62 * sign, y: rank * .56 - .4 };
  }
  if (formation === 'shield') {
    const columns = Math.min(4, Math.ceil(Math.sqrt(count * 1.5))), rows = Math.ceil(count / columns);
    const row = Math.floor(i / columns), inRow = Math.min(columns, count - row * columns);
    return { x: (i % columns - (inRow - 1) / 2) * .54, y: (row - (rows - 1) / 2) * .54 };
  }
  const columns = Math.ceil(Math.sqrt(count)), rows = Math.ceil(count / columns);
  const row = Math.floor(i / columns), inRow = Math.min(columns, count - row * columns);
  return { x: (i % columns - (inRow - 1) / 2) * 1.28, y: (row - (rows - 1) / 2) * 1.18 };
}

export function formationModifiers(formation: Formation): { speed: number; armor: number; damage: number; splash: number } {
  switch (formation) {
    case 'column': return { speed: 1.08, armor: 0, damage: 1, splash: 1.2 };
    case 'wedge': return { speed: 1.03, armor: 0, damage: 1.12, splash: 1.05 };
    case 'spread': return { speed: .96, armor: 0, damage: .96, splash: .55 };
    case 'shield': return { speed: .74, armor: 3, damage: .9, splash: .82 };
    default: return { speed: 1, armor: 0, damage: 1, splash: 1 };
  }
}

/** Relax formation before a one-cell passage, then let the formation offsets naturally restore it. */
export function isNarrow(map: string[], x: number, y: number, structures: Structure[] = [], side?: Side): boolean {
  const cx = Math.round(x), cy = Math.round(y);
  const left = !isWalkable(map, cx - 1, cy, structures, side), right = !isWalkable(map, cx + 1, cy, structures, side);
  const up = !isWalkable(map, cx, cy - 1, structures, side), down = !isWalkable(map, cx, cy + 1, structures, side);
  return (left && right) || (up && down) || [left, right, up, down].filter(Boolean).length >= 3;
}

/** Continuous short-range separation. A tangential bias breaks symmetric head-on congestion deterministically. */
export function localAvoidance(position: Vec, desiredVelocity: Vec, neighbors: readonly Vec[], radius = .34): Vec {
  const magnitude = Math.hypot(desiredVelocity.x, desiredVelocity.y);
  if (!magnitude) return { x: 0, y: 0 };
  const forward = { x: desiredVelocity.x / magnitude, y: desiredVelocity.y / magnitude };
  let x = desiredVelocity.x, y = desiredVelocity.y;
  for (const other of neighbors) {
    const dx = position.x - other.x, dy = position.y - other.y, distance = Math.hypot(dx, dy), min = radius * 2;
    if (distance >= min || distance < 1e-7) continue;
    const pressure = (min - distance) / min;
    x += dx / distance * magnitude * pressure * .9;
    y += dy / distance * magnitude * pressure * .9;
    if ((-dx * forward.x - dy * forward.y) / distance > .65) {
      x += -forward.y * magnitude * pressure * .65;
      y += forward.x * magnitude * pressure * .65;
    }
  }
  const speed = Math.hypot(x, y), limit = magnitude * 1.1;
  if (speed > limit) { x *= limit / speed; y *= limit / speed; }
  // Do not let separation reverse progress through a corridor.
  const progress = x * forward.x + y * forward.y;
  if (progress < magnitude * .2) { x += forward.x * (magnitude * .2 - progress); y += forward.y * (magnitude * .2 - progress); }
  return { x, y };
}
