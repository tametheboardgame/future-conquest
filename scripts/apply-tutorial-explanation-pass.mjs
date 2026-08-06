import { appendFile, readFile, writeFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const write = (path, content) => writeFile(path, content);

function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing expected source block: ${label}`);
  return source.replace(search, replacement);
}

function replacePattern(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`Missing expected source pattern: ${label}`);
  return source.replace(pattern, replacement);
}

// Tutorial state gains a sequence marker so old seven-step saves can migrate safely.
{
  const path = 'src/game/types.ts';
  let source = await read(path);
  source = replaceOnce(source,
`export interface TutorialState {
  enabled: boolean;
  step: number;
  completed: boolean;
  startedTurn: number;
}`,
`export interface TutorialState {
  enabled: boolean;
  step: number;
  completed: boolean;
  startedTurn: number;
  sequenceVersion: number;
}`,
  'TutorialState sequence version');
  await write(path, source);
}

// Replace the seven-step tutorial with action and explanation phases.
{
  const path = 'src/game/operational-clarity.ts';
  let source = await read(path);
  source = replaceOnce(source,
`export type TutorialTrigger =
  | 'select-formation'
  | 'issue-move'
  | 'begin-operation'
  | 'set-garrison'
  | 'open-logistics'
  | 'review-intelligence'
  | 'open-engineering';`,
`export type TutorialTrigger =
  | 'select-formation'
  | 'issue-move'
  | 'begin-operation'
  | 'set-garrison'
  | 'open-logistics'
  | 'review-intelligence'
  | 'open-engineering'
  | 'continue';`,
  'TutorialTrigger continue');

  source = replaceOnce(source,
`export interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  target: 'forces' | 'map' | 'operations' | 'logistics' | 'intelligence' | 'engineering';
  trigger: TutorialTrigger;
}`,
`export interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  target: 'forces' | 'map' | 'operations' | 'logistics' | 'intelligence' | 'engineering';
  trigger: TutorialTrigger;
  mode: 'action' | 'explanation';
  focusSelector?: string;
  hint?: string;
}`,
  'TutorialStep presentation fields');

  const tutorialSteps = `export const TUTORIAL_SEQUENCE_VERSION = 2;

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'formation',
    title: 'Inspect a formation',
    instruction: 'Select any friendly formation and review its personnel, armour, morale and logistics condition.',
    target: 'forces',
    trigger: 'select-formation',
    mode: 'action'
  },
  {
    id: 'operation',
    title: 'Begin the first offensive',
    instruction: 'On the map, select an adjacent enemy territory marked ATTACK, review the corridor and begin an operation.',
    target: 'map',
    trigger: 'begin-operation',
    mode: 'action'
  },
  {
    id: 'occupation',
    title: 'Secure captured ground',
    instruction: 'Resolve campaign days until the territory is captured, then select a formation there and assign it to garrison duty.',
    target: 'map',
    trigger: 'set-garrison',
    mode: 'action'
  },
  {
    id: 'movement',
    title: 'Reinforce the new position',
    instruction: 'Select another ready formation, choose the captured controlled territory marked MOVE and issue a movement order.',
    target: 'map',
    trigger: 'issue-move',
    mode: 'action'
  },
  {
    id: 'logistics-open',
    title: 'Open logistics command',
    instruction: 'Open Logistics. The next phases explain what the network is reporting before you are asked to make any changes.',
    target: 'logistics',
    trigger: 'open-logistics',
    mode: 'action'
  },
  {
    id: 'logistics-network',
    title: 'Read network health',
    instruction: 'Demand served compares required throughput with what actually arrived. Source use shows pressure on the portal, while diagnostics identify disconnected territory, starved formations and damaged or saturated routes.',
    target: 'logistics',
    trigger: 'continue',
    mode: 'explanation',
    focusSelector: '.logistics-command-stack',
    hint: 'Read the summary and diagnostics together: a high headline percentage can still conceal a local failure.'
  },
  {
    id: 'logistics-priorities',
    title: 'Understand supply priorities',
    instruction: 'Critical requests are supplied first, followed by High, Standard and Restricted. Automatic priorities normally make attacks Critical; movement, recovery, engineering and interdiction High; ready formations Standard; and stable administration Restricted.',
    target: 'logistics',
    trigger: 'continue',
    mode: 'explanation',
    focusSelector: '.logistics-doctrine-panel',
    hint: 'Manual overrides are optional. Use them only when scarce throughput requires a deliberate trade-off.'
  },
  {
    id: 'logistics-consequences',
    title: 'Recognise supply consequences',
    instruction: 'Compare requested and delivered throughput for each formation. Severe shortages reduce movement and combat effectiveness, block recovery and armour repair, damage morale and can undermine territorial administration.',
    target: 'logistics',
    trigger: 'continue',
    mode: 'explanation',
    focusSelector: '.formation-priority-panel',
    hint: 'You do not need to change a priority to continue. The lesson is to recognise which formations are at risk.'
  },
  {
    id: 'intelligence-open',
    title: 'Open intelligence command',
    instruction: 'Open Intelligence. The next phases explain escalation, enemy intent and the uncertainty built into reconnaissance.',
    target: 'intelligence',
    trigger: 'review-intelligence',
    mode: 'action'
  },
  {
    id: 'intelligence-situation',
    title: 'Read the strategic situation',
    instruction: 'Escalation shows how strongly the present-day world is responding. Mobilisation reserve and pending formations indicate future enemy growth, while theatre command describes the enemy doctrine and current operational focus.',
    target: 'intelligence',
    trigger: 'continue',
    mode: 'explanation',
    focusSelector: '.escalation-panel',
    hint: 'Escalation is not just a score: crossing thresholds changes the scale and coordination of the response.'
  },
  {
    id: 'intelligence-confidence',
    title: 'Interpret reconnaissance confidence',
    instruction: 'Confirmed contacts are recent and relatively precise. Estimated contacts use wider strength ranges. Activity reports indicate something is present without a reliable identity, while stale contacts may no longer describe the current position.',
    target: 'intelligence',
    trigger: 'continue',
    mode: 'explanation',
    focusSelector: '.enemy-contact-table',
    hint: 'Enemy strength is intentionally expressed as confidence and ranges rather than universal exact values.'
  },
  {
    id: 'intelligence-decisions',
    title: 'Turn intelligence into orders',
    instruction: 'Use frontline threats, enemy intent and mobilisation timings to decide where to attack, reinforce or garrison. Protect supply corridors when enemy pressure or interdiction threatens the route network.',
    target: 'intelligence',
    trigger: 'continue',
    mode: 'explanation',
    focusSelector: '.frontline-panel',
    hint: 'Intelligence supports decisions; it does not issue orders automatically.'
  },
  {
    id: 'engineering',
    title: 'Protect the network',
    instruction: 'Open Infrastructure to review route damage, repair projects and interdiction options. The guided campaign then ends.',
    target: 'engineering',
    trigger: 'open-engineering',
    mode: 'action'
  }
];`;

  source = replacePattern(source,
    /export const TUTORIAL_STEPS: TutorialStep\[\] = \[[\s\S]*?\n\];/,
    tutorialSteps,
    'TUTORIAL_STEPS array');

  source = replaceOnce(source,
`export function createTutorialState(enabled = true, turn = 1): TutorialState {
  return {
    enabled,
    step: 0,
    completed: false,
    startedTurn: turn
  };
}`,
`export function createTutorialState(enabled = true, turn = 1): TutorialState {
  return {
    enabled,
    step: 0,
    completed: false,
    startedTurn: turn,
    sequenceVersion: TUTORIAL_SEQUENCE_VERSION
  };
}`,
  'createTutorialState sequence version');

  source = replacePattern(source,
`export function normaliseTutorialState\([\s\S]*?\n}\n\nexport function getTutorialStep`,
`export function normaliseTutorialState(value: Partial<TutorialState> | undefined, turn: number): TutorialState {
  if (!value) return createTutorialState(false, turn);
  const oldStep = typeof value.step === 'number' && Number.isFinite(value.step)
    ? Math.max(0, Math.round(value.step))
    : 0;
  const sourceVersion = typeof value.sequenceVersion === 'number' && Number.isFinite(value.sequenceVersion)
    ? Math.max(1, Math.round(value.sequenceVersion))
    : 1;
  const migratedStep = sourceVersion >= TUTORIAL_SEQUENCE_VERSION
    ? oldStep
    : oldStep <= 4
      ? oldStep
      : oldStep === 5
        ? 8
        : 12;
  const step = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, migratedStep));
  return {
    enabled: Boolean(value.enabled) && !Boolean(value.completed),
    step,
    completed: Boolean(value.completed),
    startedTurn: typeof value.startedTurn === 'number' && Number.isFinite(value.startedTurn)
      ? Math.max(1, Math.round(value.startedTurn))
      : turn,
    sequenceVersion: TUTORIAL_SEQUENCE_VERSION
  };
}

export function getTutorialStep`,
  'normaliseTutorialState migration');

  source = replaceOnce(source,
`export function skipTutorial(state: GameState): GameState {
  return { ...state, tutorial: { ...state.tutorial, enabled: false } };
}`,
`export function regressTutorial(state: GameState): GameState {
  if (!state.tutorial.enabled || state.tutorial.completed || state.tutorial.step <= 0) return state;
  return {
    ...state,
    tutorial: {
      ...state.tutorial,
      step: state.tutorial.step - 1,
      sequenceVersion: TUTORIAL_SEQUENCE_VERSION
    }
  };
}

export function skipTutorial(state: GameState): GameState {
  return { ...state, tutorial: { ...state.tutorial, enabled: false, sequenceVersion: TUTORIAL_SEQUENCE_VERSION } };
}`,
  'regressTutorial');

  await write(path, source);
}

// The overlay distinguishes action steps from readable page-explanation phases.
{
  const path = 'src/components/TutorialOverlay.tsx';
  let source = await read(path);
  source = replaceOnce(source,
`  anchorSelector?: string;
  onSkip: () => void;`,
`  anchorSelector?: string;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;`,
  'TutorialOverlay props');
  source = replaceOnce(source,
`export function TutorialOverlay({ step, stepNumber, totalSteps, anchorSelector, onSkip }: Props) {`,
`export function TutorialOverlay({ step, stepNumber, totalSteps, anchorSelector, onContinue, onBack, onSkip }: Props) {`,
  'TutorialOverlay arguments');
  source = replaceOnce(source,
`  const findTarget = useCallback(() => (
    anchorSelector ? document.querySelector<HTMLElement>(anchorSelector) : null
  ), [anchorSelector]);`,
`  const resolvedSelector = step?.focusSelector ?? anchorSelector;
  const findTarget = useCallback(() => (
    resolvedSelector ? document.querySelector<HTMLElement>(resolvedSelector) : null
  ), [resolvedSelector]);`,
  'resolved tutorial selector');
  source = replaceOnce(source,
`  }, [anchorSelector, findTarget, step?.id, updatePosition]);`,
`  }, [resolvedSelector, findTarget, step?.id, stepNumber, updatePosition]);`,
  'tutorial reposition dependency');
  source = replaceOnce(source,
`  }, [anchorSelector, findTarget, step, updatePosition]);`,
`  }, [resolvedSelector, findTarget, step, updatePosition]);`,
  'tutorial resize dependency');
  source = replaceOnce(source,
`  if (!step) return null;

  const focusControl = () => {`,
`  if (!step) return null;

  const isExplanation = step.mode === 'explanation';

  const focusControl = () => {`,
  'tutorial explanation mode');
  source = replaceOnce(source,
`  return <div className="tutorial-guide" aria-live="polite" aria-label="Guided campaign tutorial">`,
`  return <div className={\`tutorial-guide \${step.mode}\`} aria-live="polite" aria-label="Guided campaign tutorial">`,
  'tutorial guide mode class');
  source = replaceOnce(source,
`      className="tutorial-spotlight"`,
`      className={\`tutorial-spotlight \${step.mode}\`}`,
  'tutorial spotlight mode class');
  source = replaceOnce(source,
`      data-placement={position.placement}
      style={{ top: position.top, left: position.left, visibility: position.ready ? 'visible' : 'hidden' }}`,
`      data-placement={position.placement}
      data-mode={step.mode}
      style={{ top: position.top, left: position.left, visibility: position.ready ? 'visible' : 'hidden' }}`,
  'tutorial overlay mode attribute');
  source = replaceOnce(source,
`      <div className="tutorial-hint"><span aria-hidden="true">◎</span><strong>The highlighted control is your next action.</strong></div>
      <div className="tutorial-actions">
        <button type="button" className="primary" onClick={focusControl}>Show control</button>
        <button type="button" onClick={onSkip}>Skip tutorial</button>
      </div>`,
`      <div className="tutorial-hint"><span aria-hidden="true">◎</span><strong>{step.hint ?? (isExplanation ? 'Review the highlighted information, then continue when ready.' : 'The highlighted control is your next action.')}</strong></div>
      <div className="tutorial-actions">
        {stepNumber > 1 && <button type="button" onClick={onBack}>Back</button>}
        {isExplanation
          ? <button type="button" className="primary" onClick={onContinue}>Continue</button>
          : <button type="button" className="primary" onClick={focusControl}>Find highlighted control</button>}
        <button type="button" onClick={onSkip}>Skip tutorial</button>
      </div>`,
  'tutorial action buttons');
  await write(path, source);
}

// Wire Continue/Back into campaign state and keep page opening separate from explanation completion.
{
  const path = 'src/App.tsx';
  let source = await read(path);
  source = replaceOnce(source,
`  progressTutorial,
  requiresSupplyAcknowledgement,
  restartTutorial,`,
`  progressTutorial,
  regressTutorial,
  requiresSupplyAcknowledgement,
  restartTutorial,`,
  'App regressTutorial import');
  source = replaceOnce(source,
`  const tutorialAnchorSelector = (() => {
    if (!tutorialStep) return undefined;`,
`  const tutorialAnchorSelector = (() => {
    if (!tutorialStep) return undefined;
    if (tutorialStep.focusSelector) return tutorialStep.focusSelector;`,
  'App focusSelector priority');
  source = replaceOnce(source,
`    if (tutorialStep.id === 'logistics') return '[data-command-view="logistics"]';
    if (tutorialStep.id === 'intelligence') return '[data-command-view="intelligence"]';`,
`    if (tutorialStep.id === 'logistics-open') return '[data-command-view="logistics"]';
    if (tutorialStep.id === 'intelligence-open') return '[data-command-view="intelligence"]';`,
  'App tutorial open step IDs');
  source = replaceOnce(source,
`  const openThreatOnMap = (territoryId: string) => {
    setState(current => selectTerritory(progressTutorial(current, 'review-intelligence'), territoryId));
    setCurrentView('map');
  };`,
`  const openThreatOnMap = (territoryId: string) => {
    setState(current => selectTerritory(current, territoryId));
    setCurrentView('map');
  };`,
  'threat click no longer completes intelligence tutorial');
  source = replaceOnce(source,
`    <TutorialOverlay step={tutorialStep} stepNumber={state.tutorial.step + 1} totalSteps={TUTORIAL_STEPS.length} anchorSelector={tutorialAnchorSelector} onSkip={() => setState(skipTutorial)} />`,
`    <TutorialOverlay
      step={tutorialStep}
      stepNumber={state.tutorial.step + 1}
      totalSteps={TUTORIAL_STEPS.length}
      anchorSelector={tutorialAnchorSelector}
      onContinue={() => setState(current => progressTutorial(current, 'continue'))}
      onBack={() => setState(regressTutorial)}
      onSkip={() => setState(skipTutorial)}
    />`,
  'TutorialOverlay state controls');
  await write(path, source);
}

// Explanation phases keep the page readable rather than greyed out.
{
  const path = 'src/operational-clarity.css';
  let source = await read(path);
  const addition = `

/* Tutorial explanation phases retain the full command page and use a local focus ring. */
.tutorial-guide.explanation .tutorial-spotlight {
  border-width: 2px;
  border-color: #8adfff;
  box-shadow: 0 0 0 1px rgba(138,223,255,.18), 0 0 28px rgba(74,185,255,.48);
  animation: tutorialExplanationPulse 1.8s ease-in-out infinite;
}
@keyframes tutorialExplanationPulse {
  50% {
    border-color: #d9f7ff;
    box-shadow: 0 0 0 2px rgba(138,223,255,.2), 0 0 38px rgba(74,185,255,.62);
  }
}
.tutorial-overlay[data-mode='explanation'] {
  background: rgba(9,20,31,.96);
  border-color: rgba(138,223,255,.6);
}
.tutorial-overlay[data-mode='explanation'] .tutorial-hint {
  color: #c4eefa;
}
@media (max-width: 760px) {
  .tutorial-overlay[data-mode='explanation'] { max-height: 46vh; }
}
`;
  if (!source.includes('tutorial-guide.explanation')) source += addition;
  await write(path, source);
}

// Update existing regression expectations and add coverage for the expanded sequence.
{
  const path = 'tests/operational-clarity-viii-d.test.cjs';
  let source = await read(path);
  source = replaceOnce(source,
`  progressTutorial,
  requiresSupplyAcknowledgement,`,
`  normaliseTutorialState,
  progressTutorial,
  regressTutorial,
  requiresSupplyAcknowledgement,`,
  'operational test imports');
  source = replaceOnce(source,
`  assert.equal(TUTORIAL_STEPS.length, 7);`,
`  assert.equal(TUTORIAL_STEPS.length, 13);
  assert.equal(state.tutorial.sequenceVersion, 2);`,
  'tutorial step count');
  source = replaceOnce(source,
`test('tutorial advances only when the requested real action is completed', () => {
  let state = newGame(405, 'standard', true);
  state = progressTutorial(state, 'open-logistics');
  assert.equal(state.tutorial.step, 0);
  assert.deepEqual(TUTORIAL_STEPS.slice(1, 4).map(step => step.id), ['operation', 'occupation', 'movement']);
  for (const trigger of ['select-formation', 'begin-operation', 'set-garrison', 'issue-move', 'open-logistics', 'review-intelligence', 'open-engineering']) state = progressTutorial(state, trigger);
  assert.equal(state.tutorial.completed, true);
  assert.equal(state.tutorial.enabled, false);
});`,
`test('tutorial separates page opening from readable logistics and intelligence phases', () => {
  let state = newGame(405, 'standard', true);
  state = progressTutorial(state, 'open-logistics');
  assert.equal(state.tutorial.step, 0);
  assert.deepEqual(TUTORIAL_STEPS.slice(1, 4).map(step => step.id), ['operation', 'occupation', 'movement']);

  for (const trigger of ['select-formation', 'begin-operation', 'set-garrison', 'issue-move']) state = progressTutorial(state, trigger);
  assert.equal(TUTORIAL_STEPS[state.tutorial.step].id, 'logistics-open');
  state = progressTutorial(state, 'open-logistics');
  assert.equal(TUTORIAL_STEPS[state.tutorial.step].id, 'logistics-network');
  const unchanged = progressTutorial(state, 'open-logistics');
  assert.equal(unchanged.tutorial.step, state.tutorial.step);

  for (const trigger of ['continue', 'continue', 'continue']) state = progressTutorial(state, trigger);
  assert.equal(TUTORIAL_STEPS[state.tutorial.step].id, 'intelligence-open');
  state = progressTutorial(state, 'review-intelligence');
  assert.equal(TUTORIAL_STEPS[state.tutorial.step].id, 'intelligence-situation');
  for (const trigger of ['continue', 'continue', 'continue', 'open-engineering']) state = progressTutorial(state, trigger);
  assert.equal(state.tutorial.completed, true);
  assert.equal(state.tutorial.enabled, false);
});

test('tutorial supports Back and migrates old seven-step progress safely', () => {
  let state = newGame(408, 'standard', true);
  state = progressTutorial(state, 'select-formation');
  state = regressTutorial(state);
  assert.equal(state.tutorial.step, 0);

  const oldIntelligence = normaliseTutorialState({ enabled: true, step: 5, completed: false, startedTurn: 1 }, 4);
  assert.equal(oldIntelligence.step, 8);
  assert.equal(oldIntelligence.sequenceVersion, 2);
  const oldEngineering = normaliseTutorialState({ enabled: true, step: 6, completed: false, startedTurn: 1 }, 4);
  assert.equal(oldEngineering.step, 12);
});`,
  'operational tutorial progression test');
  await write(path, source);
}

{
  const path = 'tests/dynamic-tutorial.test.cjs';
  let source = await read(path);
  source = replaceOnce(source,
`  assert.match(overlay, /visualViewport/);`,
`  assert.match(overlay, /visualViewport/);
  assert.match(overlay, /Find highlighted control/);
  assert.match(overlay, /onContinue/);
  assert.match(overlay, /onBack/);`,
  'dynamic tutorial controls');
  source += `

test('logistics and intelligence explanation phases do not grey out the command page', () => {
  const clarity = fs.readFileSync('src/game/operational-clarity.ts', 'utf8');
  const overlay = fs.readFileSync('src/components/TutorialOverlay.tsx', 'utf8');
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const css = fs.readFileSync('src/operational-clarity.css', 'utf8');

  assert.match(clarity, /id: 'logistics-network'[\\s\\S]*mode: 'explanation'/);
  assert.match(clarity, /id: 'intelligence-confidence'[\\s\\S]*focusSelector: '\\.enemy-contact-table'/);
  assert.match(app, /if \\(tutorialStep\\.focusSelector\\) return tutorialStep\\.focusSelector/);
  assert.match(app, /progressTutorial\\(current, 'continue'\\)/);
  assert.doesNotMatch(app, /selectTerritory\\(progressTutorial\\(current, 'review-intelligence'\\)/);
  assert.match(overlay, /tutorial-guide \\${step\\.mode}/);
  assert.match(css, /\\.tutorial-guide\\.explanation \\.tutorial-spotlight[\\s\\S]*box-shadow: 0 0 0 1px/);
  assert.doesNotMatch(css.match(/\\.tutorial-guide\\.explanation \\.tutorial-spotlight[\\s\\S]*?\\}/)?.[0] ?? '', /9999px/);
});
`;
  await write(path, source);
}

// Record the usability correction in the existing phase design note.
{
  const path = 'docs/design/phase-08d-operational-clarity-onboarding.md';
  const source = await read(path);
  if (!source.includes('Tutorial explanation-phase refinement')) {
    await appendFile(path, `

## Tutorial explanation-phase refinement

External playtesting showed that opening Logistics or Intelligence immediately completed the old single-step lesson, leaving no time to understand either workspace. The guided campaign now separates navigation from explanation. Logistics covers network health, priority doctrine and operational consequences; Intelligence covers strategic response, reconnaissance confidence and decision use. Explanation phases retain a readable, scrollable command page with a local focus ring rather than the action-step dimming mask. Continue and Back controls permit deliberate reading, while automatic navigation cannot complete an explanation phase.
`);
  }
}

console.log('Applied expanded Logistics and Intelligence tutorial explanation pass.');
