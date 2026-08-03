from pathlib import Path

path = Path('src/components/MapView.tsx')
text = path.read_text()
block = '''        {operationConfirmation && operationConfirmationAnchor && <g
          className="map-operation-confirmation"
          transform={`translate(${operationConfirmationAnchor[0]} ${operationConfirmationAnchor[1]}) scale(${overlayScale})`}
          role="button"
          tabIndex={0}
          aria-label={operationConfirmation.label}
          onPointerDown={event => event.stopPropagation()}
          onClick={event => {
            event.stopPropagation();
            operationConfirmation.onConfirm();
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              operationConfirmation.onConfirm();
            }
          }}
        >
          <rect x="-67" y="-52" width="134" height="32" rx="4" />
          <text x="0" y="-32">{operationConfirmation.label}</text>
        </g>}

'''
if text.count(block) != 1:
    raise RuntimeError(f'Expected exactly one confirmation block, found {text.count(block)}')
text = text.replace(block, '', 1)
anchor = '''        {state.portalTerritory && anchors[state.portalTerritory] && (() => {
          const [x, y] = anchors[state.portalTerritory];
          return <g className="portal" transform={`translate(${x} ${y}) scale(${overlayScale})`} filter="url(#glow)"><circle cx="0" cy="-8" r="12" /><circle cx="0" cy="-8" r="5" /></g>;
        })()}
'''
if text.count(anchor) != 1:
    raise RuntimeError(f'Expected portal anchor once, found {text.count(anchor)}')
text = text.replace(anchor, anchor + '\n' + block.rstrip() + '\n', 1)
path.write_text(text)

test_path = Path('tests/desktop-command-fit.test.cjs')
test = test_path.read_text()
old = """  assert.match(map, /className=\"map-operation-confirmation\"/);
  assert.match(map, /translate\\(\\$\\{operationConfirmationAnchor\\[0\\]\\}/);"""
new = """  assert.match(map, /className=\"map-operation-confirmation\"/);
  assert.match(map, /translate\\(\\$\\{operationConfirmationAnchor\\[0\\]\\}/);
  assert.ok(map.indexOf('className=\"map-operation-confirmation\"') > map.indexOf('task-group-marker'), 'confirmation must render above all map selection layers');"""
if test.count(old) != 1:
    raise RuntimeError(f'Expected test anchor once, found {test.count(old)}')
test_path.write_text(test.replace(old, new, 1))

print('Compact confirmation moved to the final interactive map layer.')
