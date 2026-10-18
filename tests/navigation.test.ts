import test from 'node:test';
import assert from 'node:assert/strict';
import { findPath, formationModifiers, formationOffset, isNarrow, isWalkable, localAvoidance, terrainModifiers } from '../src/sim/navigation.js';
import type { Formation, Structure } from '../src/contracts.js';

const barrier: Structure = { id: 'b', owner: 1, kind: 'barrier', x: 2, y: 1, hp: 100, maxHp: 100, built: 1 };

test('A* uses the only bridge without cutting river corners', () => {
  const map = ['...~...', '...~...', '...=...', '...~...', '...~...'];
  const route = findPath(map, { x: 1, y: 0 }, { x: 5, y: 0 });
  assert.deepEqual(route.at(-1), { x: 5, y: 0 });
  assert.ok(route.some(p => p.x === 3 && p.y === 2));
  assert.ok(route.every(p => isWalkable(map, p.x, p.y)));
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1]!, b = route[i]!;
    if (a.x !== b.x && a.y !== b.y) {
      assert.ok(isWalkable(map, a.x, b.y)); assert.ok(isWalkable(map, b.x, a.y));
    }
  }
  assert.deepEqual(findPath(map, { x: 1, y: 0 }, { x: 5, y: 0 }), route);
});

test('blocked goals and disconnected objectives resolve safely to nearest reachable land', () => {
  const map = ['..#..', '..#..', '..#..'];
  const route = findPath(map, { x: 0, y: 1 }, { x: 4, y: 1 });
  assert.deepEqual(route.at(-1), { x: 1, y: 1 });
  assert.deepEqual(findPath(['.'], { x: 0, y: 0 }, { x: 0, y: 0 }), []);
  assert.deepEqual(findPath([], { x: 0, y: 0 }, { x: 0, y: 0 }), []);
  assert.deepEqual(findPath(['.#', '#.'], { x: 0, y: 0 }, { x: 1, y: 1 }), []);
});

test('friendly wickets pass, enemy barriers block, destroyed or unfinished structures do not block', () => {
  const map = ['#####', '..g..', '#####'];
  assert.equal(isWalkable(map, 2, 1, [barrier], 0), false);
  assert.equal(isWalkable(map, 2, 1, [barrier], 1), true);
  assert.deepEqual(findPath(map, { x: 0, y: 1 }, { x: 4, y: 1 }, [barrier], 0).at(-1), { x: 1, y: 1 });
  assert.deepEqual(findPath(map, { x: 0, y: 1 }, { x: 4, y: 1 }, [barrier], 1).at(-1), { x: 4, y: 1 });
  assert.equal(isWalkable(map, 2, 1, [{ ...barrier, built: .8 }], 0), true);
  assert.equal(isWalkable(map, 2, 1, [{ ...barrier, hp: 0 }], 0), true);
  assert.equal(isWalkable(map, 2, 1, [{ ...barrier, kind: 'tower' }], 1), false);
  assert.equal(isNarrow(map, 2, 1), true);
});

test('a dynamically finished structure does not trap a unit already inside its cell', () => {
  const map = ['.....', '.....', '.....'];
  const tower = { ...barrier, kind: 'tower' as const };
  assert.deepEqual(findPath(map, { x: 2, y: 1 }, { x: 4, y: 1 }, [tower], 0).at(-1), { x: 4, y: 1 });
});

test('formations provide distinct slots and gameplay consequences', () => {
  for (const formation of ['line', 'column', 'wedge', 'spread', 'shield'] as Formation[]) {
    const positions = Array.from({ length: 12 }, (_, index) => formationOffset(index, 12, formation));
    assert.equal(new Set(positions.map(p => `${p.x},${p.y}`)).size, 12);
    assert.ok(positions.every(p => Number.isFinite(p.x + p.y)));
  }
  assert.ok(formationModifiers('shield').armor > formationModifiers('line').armor);
  assert.ok(formationModifiers('spread').splash < formationModifiers('line').splash);
  assert.ok(formationModifiers('column').speed > formationModifiers('shield').speed);
  assert.ok(terrainModifiers('f').cover > terrainModifiers('.').cover);
  assert.ok(terrainModifiers('^').range > terrainModifiers('.').range);
});

test('local avoidance makes deterministic forward progress under head-on congestion', () => {
  const position = { x: 1, y: 1 }, velocity = { x: 1, y: 0 }, neighbors = [{ x: 1.25, y: 1 }, { x: 1, y: 1.3 }];
  const next = localAvoidance(position, velocity, neighbors);
  assert.ok(next.x >= .2 - 1e-9);
  assert.ok(Number.isFinite(next.x + next.y));
  assert.deepEqual(localAvoidance(position, velocity, neighbors), next);
});
