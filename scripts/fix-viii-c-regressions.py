from pathlib import Path
import re

# Older phase tests intentionally retain their feature-specific assertions, but the
# shared release marker and current schema version must follow the latest release.
for path in Path('tests').glob('*.test.cjs'):
    content = path.read_text()
    content = content.replace(
        r'PHASE VIII-B4D \/ LOGISTICS PRIORITIES',
        r'PHASE VIII-C \/ ENEMY STRATEGY AND CAMPAIGN BALANCE'
    )
    content = content.replace(
        'PHASE VIII-B4D / LOGISTICS PRIORITIES',
        'PHASE VIII-C / ENEMY STRATEGY AND CAMPAIGN BALANCE'
    )
    content = re.sub(
        r"assert\.equal\(([^;\n]*?\.version), 12\);",
        r"assert.equal(\1, 13);",
        content
    )
    content = content.replace('saveVersion: 12,', 'saveVersion: 13,')
    content = content.replace('a current version 12 save', 'a current version 13 save')
    path.write_text(content)

persistence_test = Path('tests/persistence.test.cjs')
content = persistence_test.read_text()
content = content.replace("assert.equal(result.source, 'v12');", "assert.equal(result.source, 'v13');", 1)
persistence_test.write_text(content)

# Build a deterministic two-formation counterattack fixture instead of depending
# on the initial scenario's geographic formation distribution.
strategy_test = Path('tests/enemy-strategy-viii-c.test.cjs')
content = strategy_test.read_text()
old = """  const adjacent = Object.values(state.enemyFormations).filter(formation => require('../.test-dist/data.js').TERRITORIES[target].neighbours.includes(formation.location));
  assert.ok(adjacent.length >= 2);
"""
new = """  const enemyNeighbour = require('../.test-dist/data.js').TERRITORIES[target].neighbours.find(id => state.territories[id].controller === 'enemy');
  assert.ok(enemyNeighbour);
  const adjacent = Object.values(state.enemyFormations).slice(0, 2);
  assert.equal(adjacent.length, 2);
  for (const formation of adjacent) formation.location = enemyNeighbour;
"""
if old not in content:
    raise RuntimeError('coordinated counterattack fixture was not found')
strategy_test.write_text(content.replace(old, new, 1))

# Retain the established event wording as a substring while adding coordination detail.
engine = Path('src/game/engine.ts')
content = engine.read_text()
old = "`${TERRITORIES[target].centre} repelled a coordinated enemy counterattack. The attacking force lost roughly ${totalLosses} personnel.`"
new = "`${TERRITORIES[target].centre} repelled an enemy counterattack coordinated by ${attackers.length} formation${attackers.length === 1 ? '' : 's'}. The attacking force lost roughly ${totalLosses} personnel.`"
if old not in content:
    raise RuntimeError('coordinated counterattack event wording was not found')
engine.write_text(content.replace(old, new, 1))
