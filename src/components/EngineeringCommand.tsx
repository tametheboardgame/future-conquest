import type { GameState } from '../game/types';
import { InfrastructureCommand } from './InfrastructureCommand';

interface Props {
  state: GameState;
  onChange: (state: GameState | ((current: GameState) => GameState)) => void;
  onOpenTerritory: (territoryId: string) => void;
}

/**
 * Compatibility wrapper for older imports. The active command surface is the
 * unified Infrastructure workspace, which owns repair, upgrade and
 * interdiction controls.
 */
export function EngineeringCommand(props: Props) {
  return <InfrastructureCommand {...props} />;
}
