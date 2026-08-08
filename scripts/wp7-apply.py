from pathlib import Path

path = Path('src/App.tsx')
source = path.read_text()

old_imports = "import { EngineeringCommand } from './components/EngineeringCommand';\nimport { InterdictionCommand } from './components/InterdictionCommand';"
new_import = "import { InfrastructureCommand } from './components/InfrastructureCommand';"
if old_imports not in source:
    raise RuntimeError('Expected engineering/interdiction imports not found')
source = source.replace(old_imports, new_import, 1)

old_workspace = """        {currentView === 'engineering' && <div className=\"infrastructure-command-stack\">\n          <EngineeringCommand state={state} onChange={setState} onOpenTerritory={openTerritoryOnMap} />\n          <InterdictionCommand state={state} onChange={setState} onOpenTerritory={openTerritoryOnMap} />\n        </div>}"""
new_workspace = """        {currentView === 'engineering' && <InfrastructureCommand\n          state={state}\n          onChange={setState}\n          onOpenTerritory={openTerritoryOnMap}\n        />}"""
if old_workspace not in source:
    raise RuntimeError('Expected stacked infrastructure workspace not found')
source = source.replace(old_workspace, new_workspace, 1)

old_marker = 'PHASE VIII-D / OPERATIONAL CLARITY AND ONBOARDING · PLAYTEST 1 / WP4 DEFENCE AND THREAT CLARITY · WP5 COMBAT REPORTING · WP6 LOGISTICS UI'
new_marker = old_marker + ' · WP7 INFRASTRUCTURE CLARITY'
if old_marker not in source:
    raise RuntimeError('Expected release marker not found')
source = source.replace(old_marker, new_marker, 1)

path.write_text(source)
print('WP7 Infrastructure workspace integration applied.')
