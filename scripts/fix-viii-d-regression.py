from pathlib import Path

path = Path('tests/map-interface-refinements.test.cjs')
content = path.read_text()
old = "assert.match(map, /layers\\.enemyUnits && Object\\.entries\\(enemyCounts\\)/);"
new = "assert.match(map, /layers\\.enemyUnits && enemyContacts\\.map/);"
if old not in content:
    raise RuntimeError('stale enemy marker source assertion was not found')
path.write_text(content.replace(old, new, 1))
