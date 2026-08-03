from pathlib import Path
import re


def replace(path: str, old: str, new: str, count: int = 1):
    file = Path(path)
    content = file.read_text()
    if old not in content:
        raise RuntimeError(f'Pattern not found in {path}: {old[:120]!r}')
    file.write_text(content.replace(old, new, count))


# The tutorial only accepts assigning a garrison outside the portal, rather than
# allowing the player to complete the occupation lesson without capturing ground.
replace(
    'src/game/engine.ts',
    "  return progressTutorial(addEvent({ ...state, taskGroups }, `${group.name} ${next.status === 'garrison' ? 'assigned to occupation and defensive duties' : 'released from garrison duty'} in ${TERRITORIES[group.location].centre}.`, 'neutral'), 'set-garrison');",
    "  const updated = addEvent({ ...state, taskGroups }, `${group.name} ${next.status === 'garrison' ? 'assigned to occupation and defensive duties' : 'released from garrison duty'} in ${TERRITORIES[group.location].centre}.`, 'neutral');\n  return next.status === 'garrison' && group.location !== state.portalTerritory\n    ? progressTutorial(updated, 'set-garrison')\n    : updated;"
)

# Frontline intelligence follows the same confidence model as the map and other
# enemy-strength screens rather than leaking the simulation's exact state.
app = Path('src/App.tsx')
content = app.read_text().replace('  enemyStrengthAt,\n', '')
frontline_pattern = re.compile(
    r'''(?P<indent>\s*)\{frontlineTerritories\.length \? <div className="intelligence-list">\{frontlineTerritories\.map\(territory => \{\s*const strength = enemyStrengthAt\(state, territory\.id\);\s*return <button key=\{territory\.id\} onClick=\{\(\) => openTerritoryOnMap\(territory\.id\)\}><span><strong>\{territory\.name\}</strong><small>\{territory\.centre\} · \{TERRAIN_LABELS\[territory\.terrain\]\}</small></span><b>\{strength\.formations\} / \{formatNumber\(strength\.personnel\)\}</b></button>;\s*\}\)\}</div> : <p className="empty-state">No enemy-held province currently borders controlled territory\.</p>\}''',
    re.S
)
match = frontline_pattern.search(content)
if not match:
    raise RuntimeError('exact frontline strength block was not found')
indent = match.group('indent')
new_frontline = f'''{indent}{{frontlineTerritories.length ? <div className="intelligence-list">{{frontlineTerritories.map(territory => {{
{indent}  const contact = enemyContacts.find(item => item.territoryId === territory.id);
{indent}  return <button key={{territory.id}} onClick={{() => openTerritoryOnMap(territory.id)}}><span><strong>{{territory.name}}</strong><small>{{territory.centre}} · {{TERRAIN_LABELS[territory.terrain]}} · {{contact?.confidence ?? 'contact uncertain'}}</small></span><b>{{contact ? `${{formatNumber(contact.estimatedMin)}}–${{formatNumber(contact.estimatedMax)}}` : 'UNKNOWN'}}</b></button>;
{indent}}})}}</div> : <p className="empty-state">No enemy-held province currently borders controlled territory.</p>}}'''
content = frontline_pattern.sub(new_frontline, content, count=1)
content = content.replace('<div><dt>Enemy personnel known</dt><dd>{formatNumber(enemyPersonnel)}</dd></div>', '<div><dt>Assessed enemy personnel</dt><dd>~{formatNumber(enemyPersonnel)}</dd></div>')
app.write_text(content)

# Focused source assertions protect both changes.
test = Path('tests/operational-clarity-viii-d.test.cjs')
content = test.read_text()
content = content.replace(
    "  assert.match(app, /ASSESSED ENEMY STRENGTH/);",
    "  assert.match(app, /ASSESSED ENEMY STRENGTH/);\n  assert.doesNotMatch(app, /const strength = enemyStrengthAt/);\n  assert.match(app, /contact\\?\\.confidence/);"
)
test.write_text(content)

engine_test = Path('tests/engine.test.cjs')
content = engine_test.read_text()
addition = """

test('the occupation tutorial cannot be completed by garrisoning the portal', () => {
  const state = newGame(119, 'standard', true);
  state.tutorial.step = 2;
  const garrisoned = setGarrison(state);
  assert.equal(garrisoned.taskGroups[garrisoned.selectedTaskGroupId].status, 'garrison');
  assert.equal(garrisoned.tutorial.step, 2);
});
"""
if "the occupation tutorial cannot be completed by garrisoning the portal" not in content:
    engine_test.write_text(content.rstrip() + addition)
