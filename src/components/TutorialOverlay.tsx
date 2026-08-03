import type { CommandView } from './CommandNavigation';
import type { TutorialStep } from '../game/operational-clarity';

interface Props {
  step?: TutorialStep;
  stepNumber: number;
  totalSteps: number;
  onSkip: () => void;
  onOpenView: (view: CommandView) => void;
}

const targetView: Record<TutorialStep['target'], CommandView> = {
  forces: 'forces',
  map: 'map',
  operations: 'operations',
  logistics: 'logistics',
  intelligence: 'intelligence',
  engineering: 'engineering'
};

export function TutorialOverlay({ step, stepNumber, totalSteps, onSkip, onOpenView }: Props) {
  if (!step) return null;
  return <aside className={`tutorial-overlay tutorial-target-${step.target}`} aria-live="polite" aria-label="Guided campaign tutorial">
    <div className="tutorial-progress"><span>GUIDED CAMPAIGN</span><strong>{stepNumber} / {totalSteps}</strong></div>
    <h2>{step.title}</h2>
    <p>{step.instruction}</p>
    <div className="tutorial-actions">
      <button type="button" className="primary" onClick={() => onOpenView(targetView[step.target])}>Open {step.target}</button>
      <button type="button" onClick={onSkip}>Skip tutorial</button>
    </div>
  </aside>;
}
