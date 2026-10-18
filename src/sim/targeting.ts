import type { BattleState, GameContent, TacticalTarget, Vec } from '../contracts.js';
import { RULES } from './engine.js';
import { isWalkable } from './navigation.js';

export interface TargetCheck { valid: boolean; reason: string; cost: number; radius: number; point: Vec }
/** Shared preview and input validation. Only legally observed obstacles affect the preview. */
export function checkTarget(state: BattleState, content: GameContent, target: TacticalTarget, position: Vec): TargetCheck {
  const mission = content.missions.find(m => m.id === state.missionId)!;
  const building = target.kind === 'barrier' || target.kind === 'tower';
  const ability = target.kind === 'rally' || target.kind === 'recon' || target.kind === 'volley' ? target.kind : null;
  const point = building ? { x: Math.round(position.x), y: Math.round(position.y) } : { ...position };
  const faction = state.factions[0];
  const skills = content.skills.filter(s => faction.skills.includes(s.id) && (s.era === null || s.era === mission.era));
  const discount = Math.max(.5, 1 - skills.filter(s => s.effect === 'construction').reduce((sum, s) => sum + s.value, 0));
  const cost = ability ? RULES.abilityCosts[ability] : building ? Math.round((target.kind === 'tower' ? RULES.towerCost : RULES.barrierCost) * discount) : 0;
  const radius = target.kind === 'recon' ? 9 : target.kind === 'rally' ? 4 : target.kind === 'volley' ? 2.4 : 0;
  const result = (reason = ''): TargetCheck => ({ valid: !reason, reason, cost, radius, point });
  if (state.ended) return result('This battle has ended.');
  if (target.kind === 'attack' && !state.units.some(u => u.owner === 0 && u.hp > 0 && target.ids.includes(u.id))) return result('Select soldiers before issuing an order.');
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.y < 0 || point.x >= mission.map[0]!.length || point.y >= mission.map.length) return result('Choose a point inside the battlefield.');
  if (ability) {
    if (!skills.some(s => s.effect === ability)) return result('Unlock this tactical ability in the civilization tree.');
    if ((faction.cooldowns[ability] ?? 0) > 0) return result('This ability is cooling down.');
  }
  if (faction.resources < cost) return result('Not enough supplies.');
  const width = mission.map[0]!.length;
  const visible = (p: Vec) => !!state.fog[0].visible[Math.round(p.y) * width + Math.round(p.x)];
  if ((ability && ability !== 'recon' || building) && !visible(point)) return result('Choose a target within your current vision.');
  if (building) {
    const engineers = state.units.filter(u => u.owner === 0 && u.hp > 0 && target.ids.includes(u.id) && content.eras[mission.era]!.units.some(d => d.id === u.defId && d.role === 'engineer'));
    if (!engineers.length) return result('Select an engineer to build.');
    const observed = state.structures.filter(s => s.owner === 0 || visible(s));
    if (!isWalkable(mission.map, point.x, point.y, observed, 0) || observed.some(s => Math.hypot(s.x - point.x, s.y - point.y) < 1)) return result('This cell is blocked.');
    if (mission.strongholds.some(s => Math.hypot(s.x - point.x, s.y - point.y) < 2.4)) return result('Keep construction clear of strongholds.');
  }
  return result();
}
