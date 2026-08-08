from pathlib import Path

path = Path('src/components/MapView.tsx')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    "properties?: { name?: string; territory_id?: string; label_anchor?: [number, number] };",
    "properties?: { name?: string; territory_id?: string; centre?: [number, number]; label_anchor?: [number, number] };",
    'geo feature centre typing'
)

replace_once(
"""const anchors = Object.fromEntries(activeFeatures.flatMap(active => {
  const id = active.properties?.territory_id;
  const source = active.properties?.label_anchor;
  const projected = source ? projection(source) : null;
  return id && projected ? [[id, projected]] : [];
})) as Record<string, [number, number]>;""",
"""const DISPLAY_ANCHOR_OVERRIDES: Record<string, [number, number]> = {
  // Brussels is geographically close to the Wallonia boundary. Keep real route
  // geometry at Brussels while placing command labels/counters safely inside
  // the Flanders/Brussels display area.
  'BE-01': [4.45, 51.05],
  // Give Wallonia its own visual centre so adjacent Belgian marker stacks do not
  // overlap at tactical zoom.
  'BE-02': [4.95, 50.35]
};

const projectTerritoryAnchors = (sourceFor: (active: GeoFeature) => [number, number] | undefined) => Object.fromEntries(
  activeFeatures.flatMap(active => {
    const id = active.properties?.territory_id;
    const source = sourceFor(active);
    const projected = source ? projection(source) : null;
    return id && projected ? [[id, projected]] : [];
  })
) as Record<string, [number, number]>;

const geographicAnchors = projectTerritoryAnchors(active => active.properties?.centre ?? active.properties?.label_anchor);
const displayAnchors = projectTerritoryAnchors(active => {
  const id = active.properties?.territory_id;
  return (id ? DISPLAY_ANCHOR_OVERRIDES[id] : undefined) ?? active.properties?.label_anchor ?? active.properties?.centre;
});""",
    'separate geographic and display anchors'
)

replace_once(
    "const selectedAnchor = state.selectedTerritory ? anchors[state.selectedTerritory] : undefined;",
    "const selectedAnchor = state.selectedTerritory ? displayAnchors[state.selectedTerritory] : undefined;",
    'selection display anchor'
)
replace_once(
    "const operationConfirmationAnchor = operationConfirmation ? anchors[operationConfirmation.territoryId] : undefined;",
    "const operationConfirmationAnchor = operationConfirmation ? displayAnchors[operationConfirmation.territoryId] : undefined;",
    'confirmation display anchor'
)
replace_once(
    "if (selectedAnchor) setView(focusMapView({ x: selectedAnchor[0], y: selectedAnchor[1] }, 7));",
    "if (selectedAnchor) setView(focusMapView({ x: selectedAnchor[0], y: selectedAnchor[1] }, 25));",
    'selected tactical focus'
)

replace_once(
"""          if (!originId || !anchors[originId] || !anchors[operation.target]) return null;
          const [x1, y1] = anchors[originId];
          const [x2, y2] = anchors[operation.target];""",
"""          if (!originId || !geographicAnchors[originId] || !geographicAnchors[operation.target]) return null;
          const [x1, y1] = geographicAnchors[originId];
          const [x2, y2] = geographicAnchors[operation.target];""",
    'operation geographic anchors'
)
replace_once(
"""          const origin = order.origin ? anchors[order.origin] : undefined;
          const target = anchors[order.target];""",
"""          const origin = order.origin ? geographicAnchors[order.origin] : undefined;
          const target = geographicAnchors[order.target];""",
    'enemy movement geographic anchors'
)

# Labels, hit areas, local markers and threats deliberately use display anchors.
text = text.replace('const anchor = anchors[id];', 'const anchor = displayAnchors[id];')
text = text.replace('const anchor = anchors[operation.target];', 'const anchor = displayAnchors[operation.target];')
text = text.replace('const anchor = anchors[contact.territoryId];', 'const anchor = displayAnchors[contact.territoryId];')
text = text.replace('const anchor = anchors[threat.territoryId];', 'const anchor = displayAnchors[threat.territoryId];')
text = text.replace('const anchor = anchors[territoryId];', 'const anchor = displayAnchors[territoryId];')
text = text.replace('state.portalTerritory && anchors[state.portalTerritory]', 'state.portalTerritory && geographicAnchors[state.portalTerritory]')
text = text.replace('const [x, y] = anchors[state.portalTerritory];', 'const [x, y] = geographicAnchors[state.portalTerritory];')

replace_once(
"""            transform={`translate(${x + 29 * overlayScale} ${y - 28 * overlayScale}) scale(${overlayScale})`} """,
"""            transform={`translate(${x + 40 * overlayScale} ${y - 40 * overlayScale}) scale(${overlayScale})`} """,
    'enemy marker displacement'
)
replace_once(
"""            <path className="contact-body" d="M0 -15 L15 11 L-15 11 Z" />
            <text x="0" y="4">{symbol}</text>
            <text className="contact-confidence" x="0" y="20">{contactConfidenceLabel(contact.confidence)}</text>
            {showMarkerDetails && <text className="contact-strength" x="0" y="30">{assessedStrength}</text>}""",
"""            <path className="contact-body" d="M0 -21 L20 15 L-20 15 Z" />
            <text x="0" y="5">{symbol}</text>
            <text className="contact-confidence" x="0" y="30">{contactConfidenceLabel(contact.confidence)}</text>
            {showMarkerDetails && <text className="contact-strength" x="0" y="45">{assessedStrength}</text>}""",
    'enemy marker size'
)

replace_once(
    "transform={`translate(${x} ${y - 47 * overlayScale}) scale(${overlayScale})`}",
    "transform={`translate(${x} ${y - 64 * overlayScale}) scale(${overlayScale})`}",
    'threat displacement'
)
replace_once(
"""            <circle cx="0" cy="0" r="15" />
            <text x="0" y="4">!</text>
            {showMarkerDetails && threat.stage !== 'recent-combat' && <text className="threat-timing" x="0" y="25">D{threat.executeTurn}</text>}""",
"""            <circle cx="0" cy="0" r="20" />
            <text x="0" y="5">!</text>
            {showMarkerDetails && threat.stage !== 'recent-combat' && <text className="threat-timing" x="0" y="34">D{threat.executeTurn}</text>}""",
    'threat marker size'
)

replace_once(
"""          const columns = territoryGroups.length <= 2 ? Math.max(1, territoryGroups.length) : 3;
          return markerEntries.map(({ group, index }) => {
            const dx = ((index % columns) - (columns - 1) / 2) * 39 * overlayScale;
            const dy = (30 + Math.floor(index / columns) * 31) * overlayScale;""",
"""          const columns = territoryGroups.length <= 4 ? Math.min(2, territoryGroups.length) : 3;
          return markerEntries.map(({ group, index }) => {
            const dx = ((index % columns) - (columns - 1) / 2) * 72 * overlayScale;
            const dy = (46 + Math.floor(index / columns) * 58) * overlayScale;""",
    'friendly marker spacing'
)
replace_once(
"""            >
              <rect x="-18" y="-13" width="36" height="26" rx="4" />
              <text className="marker-id" x="0" y="-1">{group.id.replace('TG-', '')}</text>
              {showMarkerDetails && <text className="marker-strength" x="0" y="10">{compactStrength(group.personnel)}</text>}
              {showMarkerStatus && group.status !== 'ready' && <text className="marker-status" x="0" y="22">{group.status.toUpperCase()}</text>}""",
"""            >
              {selected && <rect className="marker-selection-halo" x="-36" y="-29" width="72" height="58" rx="7" />}
              <rect className="marker-body" x="-30" y="-22" width="60" height="44" rx="6" />
              <text className="marker-id" x="0" y="-5">TG {group.id.replace('TG-', '')}</text>
              {showMarkerDetails && <text className="marker-strength" x="0" y="13">{compactStrength(group.personnel)}</text>}
              {showMarkerStatus && group.status !== 'ready' && <text className="marker-status" x="0" y="34">{group.status.toUpperCase()}</text>}""",
    'friendly marker dimensions'
)

path.write_text(text, encoding='utf-8')
print('R2-WP1 tactical MapView patch applied')
