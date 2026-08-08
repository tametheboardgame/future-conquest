from pathlib import Path

path = Path('src/App.tsx')
source = path.read_text()

old = '''        {currentView === 'logistics' && <div className="logistics-command-stack">
          <section className={`view-panel supply-diagnostics-panel ${supplyClarity.severity}`}>
            <div className="view-panel-heading"><p className="panel-label">NETWORK DIAGNOSTICS · {supplyClarity.trend.toUpperCase()}</p><strong>{state.logistics.networkEfficiency}%</strong></div>
            {supplyClarity.diagnostics.length ? <div className="supply-diagnostic-list">{supplyClarity.diagnostics.map(item => <article key={item.id} className={item.severity}>
              <div><strong>{item.title}</strong><p>{item.detail}</p></div>
              {item.groupId ? <button type="button" onClick={() => openGroupOnMap(item.groupId!)}>Open formation</button> : item.territoryId ? <button type="button" onClick={() => openTerritoryOnMap(item.territoryId!)}>Open territory</button> : null}
            </article>)}</div> : <p className="empty-state">No active supply faults. The network is meeting current formation and administration demand.</p>}
          </section>
          <LogisticsCommand state={state} onChange={setState} onOpenGroup={openGroupOnMap} onOpenTerritory={openTerritoryOnMap} />
        </div>}'''

new = '''        {currentView === 'logistics' && <LogisticsCommand
          state={state}
          onChange={setState}
          onOpenGroup={openGroupOnMap}
          onOpenTerritory={openTerritoryOnMap}
          onOpenInfrastructure={() => changeView('engineering')}
        />}'''

if old not in source:
    raise RuntimeError('Expected legacy Logistics workspace block not found in App.tsx')
source = source.replace(old, new, 1)

marker = 'PHASE VIII-D / OPERATIONAL CLARITY AND ONBOARDING · PLAYTEST 1 / WP4 DEFENCE AND THREAT CLARITY · WP5 COMBAT REPORTING'
replacement = marker + ' · WP6 LOGISTICS UI'
if marker not in source:
    raise RuntimeError('Expected release marker not found in App.tsx')
source = source.replace(marker, replacement, 1)

path.write_text(source)
print('WP6 Logistics workspace integration applied.')
