import type { Difficulty } from '../contracts.js';

export interface DifficultyProfile {
  preparationSeconds: number;
  livePreparationSeconds: number;
  reactionSeconds: number;
  recruitSeconds: number;
  armyCapacityRatio: number;
  scouting: boolean;
  flanking: boolean;
  construction: boolean;
  globalAbilities: boolean;
  unitAbilitiesPerDecision: number;
}

/** These policies change decisions and tempo, never combat values or resources. */
export const DIFFICULTIES: Readonly<Record<Difficulty, Readonly<DifficultyProfile>>> = {
  relaxed: {
    preparationSeconds: 90, livePreparationSeconds: 45, reactionSeconds: 3,
    recruitSeconds: 12, armyCapacityRatio: .55, scouting: false, flanking: false,
    construction: false, globalAbilities: false, unitAbilitiesPerDecision: 0,
  },
  standard: {
    preparationSeconds: 30, livePreparationSeconds: 20, reactionSeconds: 2,
    recruitSeconds: 4, armyCapacityRatio: .8, scouting: true, flanking: false,
    construction: true, globalAbilities: true, unitAbilitiesPerDecision: 1,
  },
  veteran: {
    preparationSeconds: 0, livePreparationSeconds: 0, reactionSeconds: 1,
    recruitSeconds: 1, armyCapacityRatio: 1, scouting: true, flanking: true,
    construction: true, globalAbilities: true, unitAbilitiesPerDecision: Infinity,
  },
};

/** Missing configuration preserves the original deterministic headless opponent. */
export function difficultyProfile(mode?: Difficulty): Readonly<DifficultyProfile> {
  return DIFFICULTIES[mode ?? 'veteran'] ?? DIFFICULTIES.veteran;
}
