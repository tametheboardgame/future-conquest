from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    content = file.read_text()
    if old not in content:
        raise RuntimeError(f'Pattern not found in {path}: {old[:160]!r}')
    file.write_text(content.replace(old, new, count))


replace(
    'src/game/engine.ts',
    "      next.selectedTerritory = operation.target;\n      victories.push({ target: operation.target, enemyFormationIds: [...operation.enemyFormationIds] });",
    "      next.selectedTerritory = operation.target;\n      next.targetTerritory = null;\n      victories.push({ target: operation.target, enemyFormationIds: [...operation.enemyFormationIds] });"
)

replace(
    'tests/engine.test.cjs',
    "  assert.equal(state.taskGroups['TG-1'].location, target);\n  assert.equal(Object.keys(state.operations).length, 0);",
    "  assert.equal(state.taskGroups['TG-1'].location, target);\n  assert.equal(state.targetTerritory, null);\n  assert.equal(Object.keys(state.operations).length, 0);",
    1
)
