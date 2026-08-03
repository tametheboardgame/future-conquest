from pathlib import Path

path = Path('tests/command-interface-vii-a.test.cjs')
content = path.read_text()
old = '  assert.match(app, /enemyFormations/);'
new = '  assert.match(app, /enemyContacts/);'
if old not in content:
    raise RuntimeError('stale exact enemy formation assertion was not found')
path.write_text(content.replace(old, new, 1))
