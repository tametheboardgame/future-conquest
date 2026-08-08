from pathlib import Path

path = Path('src/components/MapView.tsx')
text = path.read_text(encoding='utf-8')

replacements = []

def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    text = text.replace(old, new, 1)
    replacements.append(label)

replace_once(
"""const responsiveOverlayBoost = () => {
  if (typeof window === 'undefined') return 1;
  if (window.matchMedia('(max-width: 540px)').matches) return 2.7;
  if (window.matchMedia('(max-width: 900px)').matches) return 1.5;
  return 1;
};""",
"""const responsiveOverlayBoost = () => {
  if (typeof window === 'undefined') return 1;
  if (window.matchMedia('(max-width: 540px)').matches) return 2.4;
  if (window.matchMedia('(max-width: 900px)').matches) return 1.7;
  if (window.matchMedia('(max-width: 1180px)').matches) return 1.35;
  if (window.matchMedia('(max-width: 1450px)').matches) return 1.15;
  return 1;
};""",
'overlay boost'
)

replace_once(
"""const DEFAULT_MAP_LAYERS: MapLayers = {
  countries: true,
  territories: true,
  orderPrompts: true,
  friendlyUnits: true,
  enemyUnits: true,
  operations: true,
  routes: true,
  supply: true,
  cities: true,
  ports: true,
  airports: true
};""",
"""const DEFAULT_MAP_LAYERS: MapLayers = {
  countries: true,
  territories: true,
  orderPrompts: true,
  friendlyUnits: true,
  enemyUnits: true,
  operations: true,
  routes: false,
  supply: false,
  cities: false,
  ports: false,
  airports: false
};""",
'operational default layers'
)

replace_once(
"""const distance = (first: PointerPosition, second: PointerPosition) => Math.hypot(second.x - first.x, second.y - first.y);

export function MapView""",
"""const distance = (first: PointerPosition, second: PointerPosition) => Math.hypot(second.x - first.x, second.y - first.y);

const compactStrength = (value: number) => {
  const rounded = Math.max(0, Math.round(value));
  if (rounded >= 10000) return `${Math.round(rounded / 1000)}k`;
  if (rounded >= 1000) return `${(rounded / 1000).toFixed(1).replace('.0', '')}k`;
  return String(rounded);
};

const assessedStrengthLabel = (minimum: number, maximum: number) => `${compactStrength(minimum)}–${compactStrength(maximum)}`;

const contactConfidenceLabel = (confidence: string) => {
  if (confidence === 'confirmed') return 'CONF';
  if (confidence === 'estimated') return 'EST';
  if (confidence === 'activity') return 'ACT';
  return 'STALE';
};

export function MapView""",
'marker label helpers'
)

replace_once(
"""  const zoomPercent = mapZoomPercent(view);
  const overlayScale = view.width / MAP_WIDTH * overlayBoost;
  const showTerritoryLabels = zoomPercent >= 135;
  const showTerritoryNames = zoomPercent >= 285;""",
"""  const zoomPercent = mapZoomPercent(view);
  const overlayScale = view.width / MAP_WIDTH * overlayBoost;
  const detailTier = zoomPercent >= 600 ? 'tactical' : zoomPercent >= 285 ? 'local' : zoomPercent >= 135 ? 'regional' : 'theatre';
  const showMarkerDetails = zoomPercent >= 220;
  const showMarkerStatus = zoomPercent >= 600;
  const showTerritoryLabels = zoomPercent >= 135;
  const showTerritoryNames = zoomPercent >= 285;""",
'zoom detail hierarchy'
)

replace_once(
"""        <div className=\"map-layer-options\">
          <p>Map labels and markers</p>""",
"""        <div className=\"map-layer-options\">
          <p>Operational layers default · enable network detail as needed</p>""",
'layer menu guidance'
)

replace_once(
"""      className={`map europe-map ${panning ? 'panning' : ''}`}""",
"""      className={`map europe-map map-detail-${detailTier} ${panning ? 'panning' : ''}`}""",
'detail tier class'
)

replace_once(
"""        {layers.countries && <g className=\"future-theatre-labels\" aria-hidden=\"true\">""",
"""        {layers.countries && <g className={`future-theatre-labels ${zoomPercent >= 220 ? 'faded' : ''}`} aria-hidden=\"true\">""",
'country label fade'
)

replace_once(
"""          return <g key={`${operation.id}-marker`} className=\"operation-marker\" transform={`translate(${x - 25 * overlayScale} ${y - 31 * overlayScale}) scale(${overlayScale})`}><rect x=\"-15\" y=\"-8\" width=\"30\" height=\"16\" rx=\"3\" /><text x=\"0\" y=\"4\">{operation.participantGroupIds.length}×</text></g>;""",
"""          return <g key={`${operation.id}-marker`} className=\"operation-marker\" transform={`translate(${x - 28 * overlayScale} ${y - 34 * overlayScale}) scale(${overlayScale})`}><rect x=\"-20\" y=\"-9\" width=\"40\" height=\"18\" rx=\"3\" /><text x=\"0\" y=\"3\">OP {operation.participantGroupIds.length}×</text></g>;""",
'operation marker'
)

replace_once(
"""          const symbol = contact.confidence === 'confirmed' ? String(contact.formationCount ?? 1) : contact.confidence === 'estimated' ? '~' : contact.confidence === 'stale' ? 'S' : '?';
          return <g key={`enemy-${contact.territoryId}`} className={`enemy-contact-marker ${contact.confidence}`} transform={`translate(${x + 24 * overlayScale} ${y - 24 * overlayScale}) scale(${overlayScale})`} onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); selectTerritory(contact.territoryId); }}>
            <path className=\"contact-body\" d=\"M0 -12 L12 9 L-12 9 Z\" /><text x=\"0\" y=\"4\">{symbol}</text><text className=\"contact-confidence\" x=\"0\" y=\"18\">{contact.confidence.slice(0, 3).toUpperCase()}</text>
            <title>{contact.label} · {TERRITORIES[contact.territoryId].centre} · estimated {contact.estimatedMin}–{contact.estimatedMax} personnel</title>
          </g>;""",
"""          const symbol = contact.confidence === 'confirmed' ? String(contact.formationCount ?? 1) : contact.confidence === 'estimated' ? '~' : contact.confidence === 'stale' ? 'S' : '?';
          const assessedStrength = assessedStrengthLabel(contact.estimatedMin, contact.estimatedMax);
          const activateContact = () => selectTerritory(contact.territoryId);
          return <g
            key={`enemy-${contact.territoryId}`}
            className={`enemy-contact-marker ${contact.confidence}`}
            transform={`translate(${x + 29 * overlayScale} ${y - 28 * overlayScale}) scale(${overlayScale})`}
            role=\"button\"
            tabIndex={0}
            aria-label={`${contact.label}, ${contactConfidenceLabel(contact.confidence)} confidence, assessed ${contact.estimatedMin} to ${contact.estimatedMax} personnel`}
            onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); activateContact(); }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                activateContact();
              }
            }}
          >
            <path className=\"contact-body\" d=\"M0 -15 L15 11 L-15 11 Z\" />
            <text x=\"0\" y=\"4\">{symbol}</text>
            <text className=\"contact-confidence\" x=\"0\" y=\"20\">{contactConfidenceLabel(contact.confidence)}</text>
            {showMarkerDetails && <text className=\"contact-strength\" x=\"0\" y=\"30\">{assessedStrength}</text>}
            <title>{contact.label} · {TERRITORIES[contact.territoryId].centre} · estimated {contact.estimatedMin}–{contact.estimatedMax} personnel</title>
          </g>;""",
'enemy contact marker'
)

replace_once(
"""          return <g key={`threat-${threat.territoryId}`} className={`threat-marker ${threat.stage}`} transform={`translate(${x} ${y - 42 * overlayScale}) scale(${overlayScale})`} onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); selectTerritory(threat.territoryId); }}><circle cx=\"0\" cy=\"0\" r=\"13\" /><text x=\"0\" y=\"3\">!</text><title>{threat.summary} · expected day {threat.executeTurn}</title></g>;""",
"""          const activateThreat = () => selectTerritory(threat.territoryId);
          return <g
            key={`threat-${threat.territoryId}`}
            className={`threat-marker ${threat.stage}`}
            transform={`translate(${x} ${y - 47 * overlayScale}) scale(${overlayScale})`}
            role=\"button\"
            tabIndex={0}
            aria-label={threat.summary}
            onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); activateThreat(); }}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                activateThreat();
              }
            }}
          >
            <circle cx=\"0\" cy=\"0\" r=\"15\" />
            <text x=\"0\" y=\"4\">!</text>
            {showMarkerDetails && threat.stage !== 'recent-combat' && <text className=\"threat-timing\" x=\"0\" y=\"25\">D{threat.executeTurn}</text>}
            <title>{threat.summary} · expected day {threat.executeTurn}</title>
          </g>;""",
'threat marker'
)

replace_once(
"""          return territoryGroups.map((group, index) => {
            const dx = (-28 + (index % 2) * 29) * overlayScale;
            const dy = (23 + Math.floor(index / 2) * 24) * overlayScale;
            const selected = group.id === state.selectedTaskGroupId;
            return <g key={group.id} className={`task-group-marker ${selected ? 'selected' : ''} ${group.status}`} transform={`translate(${x + dx} ${y + dy}) scale(${overlayScale})`} onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); if (!suppressClick.current) onSelectGroup(group.id); }}>
              <rect x=\"-12\" y=\"-9\" width=\"24\" height=\"18\" rx=\"3\" />
              <text x=\"0\" y=\"4\">{group.id.replace('TG-', '')}</text>
            </g>;
          });""",
"""          const markerEntries = territoryGroups
            .map((group, index) => ({ group, index }))
            .sort((a, b) => Number(a.group.id === state.selectedTaskGroupId) - Number(b.group.id === state.selectedTaskGroupId));
          const columns = territoryGroups.length <= 2 ? Math.max(1, territoryGroups.length) : 3;
          return markerEntries.map(({ group, index }) => {
            const dx = ((index % columns) - (columns - 1) / 2) * 39 * overlayScale;
            const dy = (30 + Math.floor(index / columns) * 31) * overlayScale;
            const selected = group.id === state.selectedTaskGroupId;
            const activateGroup = () => { if (!suppressClick.current) onSelectGroup(group.id); };
            return <g
              key={group.id}
              className={`task-group-marker ${selected ? 'selected' : ''} ${group.status}`}
              transform={`translate(${x + dx} ${y + dy}) scale(${overlayScale})`}
              role=\"button\"
              tabIndex={0}
              aria-label={`${group.name}, ${group.personnel} active personnel, ${group.status}`}
              onClick={(event: ReactMouseEvent<SVGGElement>) => { event.stopPropagation(); activateGroup(); }}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  activateGroup();
                }
              }}
            >
              <rect x=\"-18\" y=\"-13\" width=\"36\" height=\"26\" rx=\"4\" />
              <text className=\"marker-id\" x=\"0\" y=\"-1\">{group.id.replace('TG-', '')}</text>
              {showMarkerDetails && <text className=\"marker-strength\" x=\"0\" y=\"10\">{compactStrength(group.personnel)}</text>}
              {showMarkerStatus && group.status !== 'ready' && <text className=\"marker-status\" x=\"0\" y=\"22\">{group.status.toUpperCase()}</text>}
              <title>{group.name} · {group.personnel} active personnel · {group.status}</title>
            </g>;
          });""",
'friendly marker layout'
)

path.write_text(text, encoding='utf-8')
print('Applied WP10 MapView patches:', ', '.join(replacements))
