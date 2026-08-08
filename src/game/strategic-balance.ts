import type { Difficulty } from './types';

export interface StrategicBalanceProfile {
  mobilisationScale: number;
  mobilisationDelay: number;
  escalationTurnGrowth: number;
  escalationDailyBase: number;
  strategicCaptureDailyPressure: number;
  unsecuredDailyPressure: number;
}

// Selected from the deterministic campaign tuning sweep; Hard preserves baseline strategic pressure.
export const STRATEGIC_BALANCE: Record<Difficulty, StrategicBalanceProfile> = {
  story: {
    mobilisationScale: 0.76,
    mobilisationDelay: 4,
    escalationTurnGrowth: 0.16,
    escalationDailyBase: 0.06,
    strategicCaptureDailyPressure: 0.025,
    unsecuredDailyPressure: 0.04
  },
  standard: {
    mobilisationScale: 0.92,
    mobilisationDelay: 2,
    escalationTurnGrowth: 0.25,
    escalationDailyBase: 0.11,
    strategicCaptureDailyPressure: 0.05,
    unsecuredDailyPressure: 0.05
  },
  hard: {
    mobilisationScale: 1.18,
    mobilisationDelay: -1,
    escalationTurnGrowth: 0.42,
    escalationDailyBase: 0.22,
    strategicCaptureDailyPressure: 0.08,
    unsecuredDailyPressure: 0.06
  }
};

export function strategicBalanceFor(difficulty: Difficulty): StrategicBalanceProfile {
  return STRATEGIC_BALANCE[difficulty];
}
