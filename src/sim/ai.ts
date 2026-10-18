import type { AIPlan, Command, Formation, GameContent, Memory, ObservedState, Order, Role, Stronghold, Unit, UnitDef, Vec } from '../contracts.js';
import { findPath, isWalkable, terrainAt } from './navigation.js';

const distance = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
interface Objective { target: Stronghold; mode: AIPlan['mode']; utility: number }

/** The only AI entry point deliberately accepts a fog-filtered observation, never BattleState.
 * Four layers: utility strategy -> force allocation -> finite-budget economy -> ordinary unit commands.
 * Its saved state belongs to the side; all enemy knowledge comes from visible units or dated memories.
 */
export function decideAI(observation: ObservedState, content: GameContent): Command[] {
  const o = observation, commands: Command[] = [], defs = content.eras[o.mission.era]!.units;
  const byId = new Map(defs.map(d => [d.id, d]));
  const ownMain = o.strongholds.find(s => s.kind === 'main' && s.owner === o.side);
  const enemyMain = o.strongholds.find(s => s.kind === 'main' && s.owner !== o.side);
  if (!ownMain || !enemyMain) return commands;
  const skills = new Set(o.faction.skills);
  const hasEffect = (effect: string): boolean => content.skills.some(s => skills.has(s.id) && (s.era === null || s.era === o.mission.era) && s.effect === effect);
  const effectValue = (effect: string): number => content.skills.reduce((n, s) => n + (skills.has(s.id) && (s.era === null || s.era === o.mission.era) && s.effect === effect ? s.value : 0), 0);
  const advancedFormation = hasEffect('formations');
  const strength = (unit: Unit): number => {
    const def = byId.get(unit.defId);
    return def ? (unit.hp / def.hp) * (def.hp * .13 + def.damage / def.attackTime * 1.4 + def.range * 2 + def.armor * 1.5) : 0;
  };
  const ownPower = o.own.reduce((sum, u) => sum + strength(u), 0);
  const knownPower = o.enemies.reduce((sum, u) => sum + strength(u), 0);
  const hpRatio = o.own.reduce((sum, u) => sum + u.hp / (byId.get(u.defId)?.hp ?? u.hp), 0) / Math.max(1, o.own.length);
  const threatUnits = o.enemies.filter(u => distance(u, ownMain) < 8);
  const homeThreat = threatUnits.reduce((sum, u) => sum + strength(u), 0);
  const contest = o.strongholds.filter(s => s.owner === o.side && s.capturing !== null && s.capturing !== o.side);
  const nearbyPower = (position: Vec, radius: number): number => o.enemies.reduce((sum, u) => sum + (distance(u, position) < radius ? strength(u) : 0), 0);
  const objectiveOrigin = o.own.length ? {
    x: o.own.reduce((sum, u) => sum + u.x, 0) / o.own.length,
    y: o.own.reduce((sum, u) => sum + u.y, 0) / o.own.length,
  } : ownMain;

  // Remember only information the observation legally supplied. Stale contacts cease to affect combat estimates.
  const memory: Record<string, Memory> = {};
  for (const [id, m] of Object.entries(o.enemyMemory)) if (o.time - m.seen <= 90) memory[id] = { ...m };
  o.plan.lastKnown = memory;
  const candidates: Objective[] = [];
  if (homeThreat > 0 || ownMain.capturing !== null) {
    candidates.push({ target: ownMain, mode: 'defend', utility: 1.15 + o.mission.ai.defense * .35 + homeThreat / Math.max(35, ownPower) });
  }
  for (const s of contest) candidates.push({ target: s, mode: 'defend', utility: .9 + o.mission.ai.defense * .35 + s.progress * .006 - distance(objectiveOrigin, s) * .012 });
  for (const s of o.strongholds) {
    if (s.kind === 'main' || s.owner === o.side) continue;
    const danger = nearbyPower(s, 5) / Math.max(25, ownPower);
    const neutral = s.owner === null;
    candidates.push({ target: s, mode: 'expand', utility: .68 + o.mission.ai.expansion * .42 + (neutral ? .18 : .06)
      + s.capacity * .012 + s.reward * .0012 - distance(objectiveOrigin, s) * .018 - danger * .44 });
  }
  const advantage = ownPower / Math.max(30, knownPower);
  const unconquered = candidates.filter(c => c.mode === 'expand').length;
  const canRecover = o.faction.resources >= Math.min(...defs.filter(d => o.mission.roster.includes(d.role)).map(d => d.cost));
  candidates.push({ target: enemyMain, mode: 'attack', utility: .24 + o.mission.ai.aggression * .4
    + clamp(advantage - 1, -.6, 1.2) * .35 + (unconquered ? 0 : .5) + Math.min(.3, o.time / 1500)
    - (homeThreat > 0 ? .8 : 0) + (!canRecover && o.time > 150 ? .2 : 0) });
  const canReinforce = o.own.reduce((n, u) => n + (byId.get(u.defId)?.capacity ?? 1), 0) < o.faction.baseCapacity + effectValue('capacity')
    + o.strongholds.reduce((n, s) => n + (s.owner === o.side && s.kind !== 'main' ? s.capacity : 0), 0)
    || o.faction.lines.some(l => l.queue.length > 0) || o.faction.reserves.length > 0;
  if (hpRatio < .57 && knownPower > ownPower && canRecover && canReinforce && homeThreat === 0) {
    candidates.push({ target: ownMain, mode: 'recover', utility: .78 + (1 - hpRatio) * .55 });
  }
  // Hysteresis prevents units abandoning an almost-complete capture whenever a utility fluctuates slightly.
  for (const candidate of candidates) if (candidate.target.id === o.plan.objective && candidate.mode === o.plan.mode) candidate.utility += .13;
  candidates.sort((a, b) => b.utility - a.utility || a.target.id.localeCompare(b.target.id));
  const objective = candidates[0]!;
  const changed = o.plan.objective !== objective.target.id || o.plan.mode !== objective.mode;
  o.plan.objective = objective.target.id; o.plan.mode = objective.mode;
  o.plan.decisions++; o.plan.nextDecision = o.time + 1;

  // Economy considers pending jobs and reserves, then emits exactly the same commands used by the player.
  let budget = o.faction.resources;
  if (!o.faction.autoDeploy) commands.push({ type: 'autoDeploy', side: o.side, value: true });
  if (o.faction.reserves.length) commands.push({ type: 'deploy', side: o.side });
  const available = defs.filter(d => o.mission.roster.includes(d.role) && (!d.skill || skills.has(d.skill)));
  const roleCount = new Map<Role, number>();
  const addRole = (id: string): void => { const role = byId.get(id)?.role; if (role) roleCount.set(role, (roleCount.get(role) ?? 0) + 1); };
  for (const unit of o.own) addRole(unit.defId);
  for (const reserve of o.faction.reserves) addRole(reserve.unitId);
  for (const line of o.faction.lines) for (const job of line.queue) addRole(job.unitId);
  const observedRoles = new Map<Role, number>();
  for (const enemy of o.enemies) { const role = byId.get(enemy.defId)?.role; if (role) observedRoles.set(role, (observedRoles.get(role) ?? 0) + 1); }
  for (const m of Object.values(memory)) {
    if (o.enemies.some(e => e.id === m.id)) continue;
    const role = byId.get(m.defId)?.role;
    if (role) observedRoles.set(role, (observedRoles.get(role) ?? 0) + .3);
  }
  const scoreRecruit = (d: UnitDef): number => {
    const count = roleCount.get(d.role) ?? 0;
    let counter = 0;
    for (const [role, number] of observedRoles) counter += ((d.counters[role] ?? 1) - 1) * number * .7;
    const core = d.role === 'frontline' ? 1.25 : d.role === 'ranged' ? 1.1 : d.role === 'guard' ? .8 : .55;
    const preference = o.mission.ai.preferred.includes(d.role) ? .32 : 0;
    let need = objective.mode === 'defend' && d.role === 'guard' ? .5 : 0;
    if (d.role === 'scout') need += count === 0 && o.time < 180 ? .65 * o.mission.ai.scout : -.5 * count;
    if (d.role === 'engineer') need += hasEffect('engineer') && count === 0 && budget > 110 ? .35 : -.4 * count;
    if (d.role === 'siege') need += objective.mode === 'attack' ? .5 : -.2;
    if (d.role === 'stealth') need += o.enemies.some(e => byId.get(e.defId)?.role === 'ranged') ? .35 : 0;
    return (core + preference + need + counter) / (1 + count * .55) + d.hp / d.cost * .035;
  };
  const queued = o.faction.lines.reduce((n, l) => n + l.queue.length, 0);
  const deployedCapacity = o.own.reduce((n, u) => n + (byId.get(u.defId)?.capacity ?? 1), 0);
  const capacity = o.faction.baseCapacity + effectValue('capacity') + o.strongholds.reduce((n, s) => n + (s.owner === o.side && s.kind !== 'main' ? s.capacity : 0), 0);
  const reserveRoom = o.faction.reserveCapacity - o.faction.reserves.length;
  // Avoid turning the entire finite treasury into unusable blocked training queues.
  if (deployedCapacity < capacity || reserveRoom > queued) {
    for (let lineIndex = 0; lineIndex < o.faction.lines.length; lineIndex++) {
      const line = o.faction.lines[lineIndex]!;
      if (line.blocked || line.queue.length >= 2) continue;
      const recruit = available.filter(d => d.cost <= budget).sort((a, b) => scoreRecruit(b) - scoreRecruit(a) || a.id.localeCompare(b.id))[0];
      if (!recruit) break;
      commands.push({ type: 'recruit', side: o.side, unitId: recruit.id, line: lineIndex });
      budget -= recruit.cost; addRole(recruit.id);
    }
  }

  const enemyRanged = o.enemies.filter(e => { const r = byId.get(e.defId)?.role; return r === 'ranged' || r === 'siege'; }).length;
  let formation: Formation = 'line';
  if (terrainAt(o.map, objective.target.x, objective.target.y) === '=' || distance(objectiveOrigin, objective.target) > 13) formation = 'column';
  if (advancedFormation) formation = enemyRanged > o.enemies.length * .4 && enemyRanged > 1 ? 'spread' : objective.mode === 'defend' ? 'shield' : objective.mode === 'attack' ? 'wedge' : formation;
  const eligible = o.own.filter(u => u.hp > 0);
  const assigned = new Set<string>();
  const issue = (units: Unit[], order: Order, desiredFormation: Formation = formation, force = false): void => {
    if (!units.length) return;
    const formationIds = units.filter(u => u.formation !== desiredFormation).map(u => u.id);
    if (formationIds.length) commands.push({ type: 'formation', side: o.side, ids: formationIds, formation: desiredFormation });
    const ids = units.filter(u => {
      assigned.add(u.id);
      const last = u.orders.at(-1);
      return force || !last || last.target !== order.target || last.kind !== order.kind || distance(last, order) > 1.2;
    }).map(u => u.id);
    if (ids.length) commands.push({ type: 'order', side: o.side, ids, order });
  };
  const safeCell = (target: Vec): Vec => {
    const x = clamp(Math.round(target.x), 1, o.map[0]!.length - 2), y = clamp(Math.round(target.y), 1, o.map.length - 2);
    if (isWalkable(o.map, x, y, o.structures, o.side)) return { x, y };
    for (let radius = 1; radius <= 4; radius++) for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) === radius && isWalkable(o.map, x + dx, y + dy, o.structures, o.side)) return { x: x + dx, y: y + dy };
    }
    return { x: ownMain.x, y: ownMain.y };
  };

  // Scouting is assigned to a small detachment; most troops retain a coherent capture objective.
  if (homeThreat === 0 && eligible.length >= 5) {
    const scouts = eligible.filter(u => byId.get(u.defId)?.role === 'scout').slice(0, Math.max(1, Math.floor(eligible.length / 8)));
    const scoutTarget = o.strongholds.filter(s => s.owner !== o.side && s.kind !== 'main' && s.id !== objective.target.id)
      .sort((a, b) => distance(objectiveOrigin, a) - distance(objectiveOrigin, b) || a.id.localeCompare(b.id))[0];
    if (scoutTarget) issue(scouts, { kind: 'capture', x: scoutTarget.x, y: scoutTarget.y, target: scoutTarget.id }, 'column');
    else if (scouts.length && o.enemies.length === 0 && objective.mode !== 'attack') {
      const lastContact = Object.values(memory).sort((a, b) => b.seen - a.seen || a.id.localeCompare(b.id))[0];
      const point = safeCell(lastContact ?? { x: enemyMain.x + (o.side ? 3 : -3), y: enemyMain.y + 3 });
      issue(scouts, { kind: 'move', ...point }, 'column');
    }
  }

  // Engineers build only when the treasury can afford it after recruitment; structures cannot seal a one-cell bridge.
  for (const unit of eligible) if (byId.get(unit.defId)?.role === 'engineer' && unit.orders[0]?.kind === 'build') assigned.add(unit.id);
  const engineers = eligible.filter(u => byId.get(u.defId)?.role === 'engineer' && !assigned.has(u.id));
  const maxStructures = objective.mode === 'defend' ? 3 : 2;
  if (hasEffect('engineer') && engineers.length && budget >= 65 && o.structures.filter(s => s.owner === o.side).length < maxStructures) {
    const anchor = objective.mode === 'defend' ? ownMain : o.strongholds.filter(s => s.owner === o.side && s.kind !== 'main')
      .sort((a, b) => distance(a, enemyMain) - distance(b, enemyMain))[0];
    if (anchor) {
      const direction = { x: enemyMain.x - anchor.x, y: enemyMain.y - anchor.y }, length = Math.hypot(direction.x, direction.y) || 1;
      const position = safeCell({ x: anchor.x + direction.x / length * 3.2, y: anchor.y + direction.y / length * 3.2 });
      const terrain = terrainAt(o.map, position.x, position.y);
      const structureNear = o.structures.some(s => distance(s, position) < 3);
      const close = engineers.find(e => distance(e, position) < 6);
      if (close && !structureNear && !o.strongholds.some(s => distance(s, position) < 2.5) && terrain !== '=' && terrain !== 'g' && findPath(o.map, close, position, o.structures, o.side).length > 0) {
        commands.push({ type: 'build', side: o.side, ids: [close.id], kind: 'tower', ...position });
        assigned.add(close.id); budget -= 65;
      }
    }
  }

  // A flanking element responds to an observed ranged concentration; it never obtains hidden positions.
  if (objective.mode === 'attack' && eligible.length >= 7 && enemyRanged > 0) {
    const flankers = eligible.filter(u => !assigned.has(u.id) && ['stealth', 'scout'].includes(byId.get(u.defId)?.role ?? '')).slice(0, 3);
    const visibleRanged = o.enemies.filter(e => ['ranged', 'siege'].includes(byId.get(e.defId)?.role ?? ''))
      .sort((a, b) => distance(a, objective.target) - distance(b, objective.target) || a.id.localeCompare(b.id))[0];
    if (visibleRanged && flankers.length) {
      const dx = visibleRanged.x - objectiveOrigin.x, dy = visibleRanged.y - objectiveOrigin.y, length = Math.hypot(dx, dy) || 1;
      const flank = safeCell({ x: visibleRanged.x - dy / length * 3, y: visibleRanged.y + dx / length * 3 });
      for (const unit of flankers) {
        assigned.add(unit.id);
        const end = unit.orders.at(-1);
        if (changed || !end || end.target !== visibleRanged.id) commands.push({ type: 'editOrders', side: o.side, ids: [unit.id], orders: [
          { kind: 'move', ...flank }, { kind: 'attack', x: visibleRanged.x, y: visibleRanged.y, target: visibleRanged.id },
        ] });
      }
    }
  }
  const army = eligible.filter(u => !assigned.has(u.id));
  issue(army, { kind: objective.mode === 'defend' || objective.mode === 'recover' ? 'defend' : 'capture', x: objective.target.x, y: objective.target.y, target: objective.target.id }, formation);

  // Tactical abilities use legal visible targets, finite costs, and the faction's actual cooldown ledger.
  const cooldownReady = (name: string): boolean => (o.faction.cooldowns[name] ?? 0) <= 0;
  const wounded = eligible.filter(u => u.hp < (byId.get(u.defId)?.hp ?? u.hp) * .68);
  if (hasEffect('rally') && wounded.length >= 2 && budget >= 30 && cooldownReady('rally')) {
    const center = wounded.reduce((best, u) => wounded.filter(n => distance(n, u) < 3).length > wounded.filter(n => distance(n, best) < 3).length ? u : best);
    commands.push({ type: 'ability', side: o.side, ability: 'rally', x: center.x, y: center.y }); budget -= 30;
  }
  if (hasEffect('volley') && budget >= 45 && cooldownReady('volley') && o.enemies.length >= 3) {
    const target = [...o.enemies].sort((a, b) => o.enemies.filter(n => distance(n, b) < 2.4).length - o.enemies.filter(n => distance(n, a) < 2.4).length || a.id.localeCompare(b.id))[0]!;
    if (o.enemies.filter(n => distance(n, target) < 2.4).length >= 3) {
      commands.push({ type: 'ability', side: o.side, ability: 'volley', x: target.x, y: target.y }); budget -= 45;
    }
  }
  if (hasEffect('recon') && budget >= 25 && cooldownReady('recon') && o.enemies.length === 0 && objective.mode === 'attack') {
    commands.push({ type: 'ability', side: o.side, ability: 'recon', x: objective.target.x, y: objective.target.y }); budget -= 25;
  }
  const activated = eligible.filter(u => u.abilityCooldown <= 0 && o.enemies.some(e => distance(e, u) <= Math.max(3, byId.get(u.defId)?.range ?? 1)));
  const count = Math.min(activated.length, Math.floor(budget / 4));
  if (count) commands.push({ type: 'unitAbility', side: o.side, ids: activated.slice(0, count).map(u => u.id) });
  return commands;
}
