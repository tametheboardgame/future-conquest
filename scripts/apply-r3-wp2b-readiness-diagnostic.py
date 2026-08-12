from pathlib import Path

path = Path('src/components/TerrainMapPrototypeImpl.tsx')
text = path.read_text()
needle = """      map.on('load', () => {
        loadedRef.current = true;
        setStatus('ready');
        setMessage(`${terrainSource.label} · ${presentationProfile === 'compact' ? 'compact terrain' : 'continuous relief'} · operational overlays projected from campaign state`);
      });

      map.on('error', event => {"""
replacement = """      map.on('load', () => {
        loadedRef.current = true;
        setStatus('ready');
        setMessage(`${terrainSource.label} · ${presentationProfile === 'compact' ? 'compact terrain' : 'continuous relief'} · operational overlays projected from campaign state`);
      });

      window.setTimeout(() => {
        if (disposed || loadedRef.current) return;
        const sourceIds = [
          'r3-wp2b-land',
          'r3-wp2b-terrain-dem',
          'r3-wp2b-relief-dem',
          'r3-wp2b-hillshade-dem',
          'campaign-territories',
          'campaign-fronts',
          'campaign-strategic-routes',
          'campaign-strategic-nodes'
        ];
        const sourceLoaded = Object.fromEntries(sourceIds.map(id => [id, map.getSource(id)?.loaded() ?? null]));
        console.info('R3 terrain readiness diagnostic', JSON.stringify({
          mapLoaded: map.loaded(),
          styleLoaded: map.isStyleLoaded(),
          tilesLoaded: map.areTilesLoaded(),
          sourceLoaded
        }));
      }, 3000);

      map.on('error', event => {"""
if needle not in text:
    raise SystemExit('Expected load/error block not found')
path.write_text(text.replace(needle, replacement, 1))
