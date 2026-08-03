from pathlib import Path

for path in ('tests/command-interface-vii-a.test.cjs', 'tests/route-movement-viii-b2.test.cjs'):
    file = Path(path)
    text = file.read_text()
    old = r'PHASE VIII-B2 \/ ROUTE MOVEMENT'
    new = r'PHASE VIII-B3 \/ SUPPLY THROUGHPUT'
    if old not in text:
        raise RuntimeError(f'{path}: escaped phase assertion not found')
    file.write_text(text.replace(old, new))

print('Escaped Phase VIII-B3 assertions corrected.')
