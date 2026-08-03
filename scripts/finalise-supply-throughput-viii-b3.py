from pathlib import Path

for path in ('tests/command-interface-vii-a.test.cjs', 'tests/route-movement-viii-b2.test.cjs'):
    file = Path(path)
    text = file.read_text()
    old = r'PHASE VIII-B2 \/ ROUTE MOVEMENT'
    new = r'PHASE VIII-B3 \/ SUPPLY THROUGHPUT'
    if old not in text:
        raise RuntimeError(f'{path}: escaped phase assertion not found')
    file.write_text(text.replace(old, new))

route_test = Path('tests/route-movement-viii-b2.test.cjs')
text = route_test.read_text()
old = r'saveVersion:\s*7'
new = r'saveVersion:\s*8'
if old not in text:
    raise RuntimeError('route movement test: version 7 persistence assertion not found')
route_test.write_text(text.replace(old, new))

print('Escaped Phase VIII-B3 and version 8 assertions corrected.')
