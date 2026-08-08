from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    source = file_path.read_text()
    if old not in source:
        raise RuntimeError(f'Expected text not found in {path}: {old[:90]!r}')
    file_path.write_text(source.replace(old, new, 1))


# 1. Make each action step explain both purpose and completion instead of only naming a control.
path = Path('src/game/operational-clarity.ts')
source = path.read_text()
old_interface = """export interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  target: 'forces' | 'map' | 'operations' | 'logistics' | 'intelligence' | 'engineering';
  trigger: TutorialTrigger;
}"""
new_interface = """export interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  why: string;
  completion: string;
  target: 'forces' | 'map' | 'operations' | 'logistics' | 'intelligence' | 'engineering';
  trigger: TutorialTrigger;
}"""
if old_interface not in source:
    raise RuntimeError('TutorialStep interface has changed unexpectedly')
source = source.replace(old_interface, new_interface, 1)

start = source.index('export const TUTORIAL_STEPS: TutorialStep[] = [')
end = source.index('\n\nconst severityRank', start)
new_steps = """export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'formation',
    title: 'Inspect a formation',
    instruction: 'Open Forces and select any friendly formation. Read its personnel, powered armour, morale, carried supply stock and current logistics condition.',
    why: 'Every movement, attack, garrison and specialist task is assigned to a formation. Its current state determines what it can safely do next.',
    completion: 'The tutorial advances when a friendly formation is selected.',
    target: 'forces',
    trigger: 'select-formation'
  },
  {
    id: 'operation',
    title: 'Begin the first offensive',
    instruction: 'Return to the command map, select an adjacent enemy territory marked ATTACK, review the route and defender estimate, then begin an operation.',
    why: 'Territories are taken through route-connected multi-day operations. Defender estimates are intelligence ranges, not guaranteed exact strength.',
    completion: 'The tutorial advances when an attack operation is successfully launched.',
    target: 'map',
    trigger: 'begin-operation'
  },
  {
    id: 'occupation',
    title: 'Secure captured ground',
    instruction: 'Resolve campaign days until the operation captures its target. Then use the local formation’s Assign as garrison action.',
    why: 'Taking a province and controlling it are different problems. Unsecured ground threatens administration, resistance control and the wider supply network.',
    completion: 'The tutorial advances after a formation in the captured territory enters garrison duty.',
    target: 'map',
    trigger: 'set-garrison'
  },
  {
    id: 'movement',
    title: 'Reinforce the new position',
    instruction: 'Select another ready formation, choose a route-connected controlled territory marked MOVE and issue a movement order.',
    why: 'Formations act independently. Repositioning reserves is how you reinforce threatened ground without cancelling other simultaneous orders.',
    completion: 'The tutorial advances when a valid movement order is issued.',
    target: 'map',
    trigger: 'issue-move'
  },
  {
    id: 'logistics',
    title: 'Read the supply network',
    instruction: 'Open Logistics. A short guided walkthrough will explain distributed sources, route delivery, carried stocks and priority doctrine before you continue.',
    why: 'A strong formation can still become ineffective if the network cannot replenish it. Diagnosing the cause matters more than blindly raising priority.',
    completion: 'Opening Logistics starts its guided walkthrough; no supply setting has to be changed.',
    target: 'logistics',
    trigger: 'open-logistics'
  },
  {
    id: 'intelligence',
    title: 'Review enemy activity',
    instruction: 'Open Intelligence. The walkthrough will cover escalation, reconnaissance confidence, frontline pressure and how those signals should influence orders.',
    why: 'Enemy information is deliberately incomplete. Good decisions depend on recognising the difference between confirmed, estimated, activity and stale contacts.',
    completion: 'Opening Intelligence starts its guided walkthrough; no order is issued automatically.',
    target: 'intelligence',
    trigger: 'review-intelligence'
  },
  {
    id: 'engineering',
    title: 'Understand Infrastructure',
    instruction: 'Open Infrastructure. The final walkthrough will explain friendly-route repair, enemy-route interdiction and the eligibility rules for both.',
    why: 'Strategic routes are physical assets. Damage, bottlenecks and enemy interdiction can change which plans are sustainable even when your formations remain strong.',
    completion: 'Opening Infrastructure starts the final walkthrough. The tutorial completes after that walkthrough, not merely when the page opens.',
    target: 'engineering',
    trigger: 'open-engineering'
  }
];"""
source = source[:start] + new_steps + source[end:]
path.write_text(source)

# 2. Add stable tutorial anchors to the already-redesigned specialist screens.
replace_once(
    'src/components/LogisticsCommand.tsx',
    '<section className="view-panel logistics-flow-explainer">',
    '<section className="view-panel logistics-flow-explainer" data-tutorial="logistics-flow">'
)
replace_once(
    'src/components/LogisticsCommand.tsx',
    '<section className="view-panel logistics-doctrine-panel">',
    '<section className="view-panel logistics-doctrine-panel" data-tutorial="logistics-doctrine">'
)
replace_once(
    'src/components/LogisticsCommand.tsx',
    '<section className="view-panel logistics-reserve-panel">',
    '<section className="view-panel logistics-reserve-panel" data-tutorial="logistics-reserves">'
)
replace_once(
    'src/components/InfrastructureCommand.tsx',
    '<section className="view-panel infrastructure-choice-card repair-choice">',
    '<section className="view-panel infrastructure-choice-card repair-choice" data-tutorial="infrastructure-repair">'
)
replace_once(
    'src/components/InfrastructureCommand.tsx',
    '<section className="view-panel infrastructure-choice-card interdict-choice">',
    '<section className="view-panel infrastructure-choice-card interdict-choice" data-tutorial="infrastructure-interdict">'
)
replace_once(
    'src/components/InfrastructureCommand.tsx',
    '<section className="view-panel infrastructure-rules-panel">',
    '<section className="view-panel infrastructure-rules-panel" data-tutorial="infrastructure-rules">'
)

# 3. Give the operation explanation a stable map-side anchor and record WP8 in the build marker.
replace_once(
    'src/App.tsx',
    'const renderOrdersPanel = () => <section className="operation-card">',
    'const renderOrdersPanel = () => <section className="operation-card" data-tutorial="formation-orders">'
)
replace_once(
    'src/App.tsx',
    'PLAYTEST 1 / WP4 DEFENCE AND THREAT CLARITY · WP5 COMBAT REPORTING · WP6 LOGISTICS UI · WP7 INFRASTRUCTURE CLARITY',
    'PLAYTEST 1 / WP4 DEFENCE AND THREAT CLARITY · WP5 COMBAT REPORTING · WP6 LOGISTICS UI · WP7 INFRASTRUCTURE CLARITY · WP8 GUIDED HELP'
)

# 4. Existing tutorial regressions now reflect the expanded current-system curriculum/cache format.
replace_once(
    'tests/tutorial-explanation-phases.test.cjs',
    'assert.match(overlay, /EXPANDED_TOTAL_STEPS = 14/);',
    'assert.match(overlay, /EXPANDED_TOTAL_STEPS = 19/);'
)
replace_once(
    'tests/tutorial-explanation-phases.test.cjs',
    'assert.match(overlay, /future-conquest-tutorial-explanation-v1/);',
    'assert.match(overlay, /future-conquest-tutorial-explanation-v2/);'
)
replace_once(
    'tests/tutorial-explanation-phases.test.cjs',
    r'assert.match(overlay, />Continue<\/button>/);',
    r"assert.match(overlay, /'Finish tutorial' : 'Continue'/);"
)

print('WP8 guided-help integration applied.')
