from pathlib import Path

path = Path('src/game/engine.ts')
text = path.read_text(encoding='utf-8')

old = "const deployableArmour = (state: GameState, group: TaskGroup) => Math.min(group.functionalArmour, engineeringOperationalPersonnel(state, group));"
new = "const deployableArmour = (group: TaskGroup) => Math.min(group.functionalArmour, group.personnel);\nconst operationalDeployableArmour = (state: GameState, group: TaskGroup) => Math.min(deployableArmour(group), engineeringOperationalPersonnel(state, group));"
if text.count(old) != 1:
    raise SystemExit(f'deployable helper: expected one match, found {text.count(old)}')
text = text.replace(old, new, 1)

text = text.replace('deployableArmour(next, group)', 'operationalDeployableArmour(next, group)')
text = text.replace('deployableArmour(state, group)', 'operationalDeployableArmour(state, group)')

path.write_text(text, encoding='utf-8')
print('R2-WP2 operational armour helper fixed')
