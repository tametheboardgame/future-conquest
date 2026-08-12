import fs from 'node:fs';

const componentPath = 'src/components/TerrainMapPrototypeImpl.tsx';
const cssPath = 'src/r3-terrain-prototype.css';

let component = fs.readFileSync(componentPath, 'utf8');
const replacements = [
  [
    "function browserSupportsTerrain(): boolean {\n",
    "function terrainViewportPadding(\n  toolbar: HTMLElement | null,\n  presentationProfile: Exclude<TerrainPresentationProfile, 'svg-fallback'>\n) {\n  const measuredToolbarHeight = toolbar?.getBoundingClientRect().height ?? 0;\n  const minimumToolbarHeight = presentationProfile === 'compact' ? 72 : 52;\n  return {\n    top: Math.ceil(Math.max(measuredToolbarHeight, minimumToolbarHeight) + 24),\n    right: presentationProfile === 'compact' ? 52 : 72,\n    bottom: 40,\n    left: 18\n  };\n}\n\nfunction browserSupportsTerrain(): boolean {\n"
  ],
  [
    "  const containerRef = useRef<HTMLDivElement | null>(null);\n  const mapRef = useRef<Map | null>(null);\n",
    "  const containerRef = useRef<HTMLDivElement | null>(null);\n  const toolbarRef = useRef<HTMLDivElement | null>(null);\n  const mapRef = useRef<Map | null>(null);\n"
  ],
  [
    "    let disposed = false;\n    let ownedMap: Map | null = null;\n",
    "    let disposed = false;\n    let ownedMap: Map | null = null;\n    let toolbarResizeObserver: ResizeObserver | null = null;\n"
  ],
  [
    "      map.addControl(new NavigationControl({ visualizePitch: presentationProfile === 'full' }), 'top-right');\n\n      const updateOverlayLod = () => {\n",
    "      map.addControl(new NavigationControl({ visualizePitch: presentationProfile === 'full' }), 'top-right');\n\n      const applySafePadding = () => {\n        map.setPadding(terrainViewportPadding(toolbarRef.current, presentationProfile));\n      };\n      applySafePadding();\n      if (typeof ResizeObserver !== 'undefined' && toolbarRef.current) {\n        toolbarResizeObserver = new ResizeObserver(applySafePadding);\n        toolbarResizeObserver.observe(toolbarRef.current);\n      }\n\n      const updateOverlayLod = () => {\n"
  ],
  [
    "      operationalMarkersRef.current = [];\n      mapRef.current = null;\n      ownedMap?.remove();\n",
    "      operationalMarkersRef.current = [];\n      toolbarResizeObserver?.disconnect();\n      mapRef.current = null;\n      ownedMap?.remove();\n"
  ],
  [
    "      bearing: profiled.bearing,\n      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850\n",
    "      bearing: profiled.bearing,\n      padding: terrainViewportPadding(toolbarRef.current, presentationProfile),\n      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850\n"
  ],
  [
    "    <div className=\"r3-terrain-prototype-toolbar\" aria-label=\"Experimental terrain camera controls\">\n",
    "    <div ref={toolbarRef} className=\"r3-terrain-prototype-toolbar\" aria-label=\"Experimental terrain camera controls\">\n"
  ]
];

for (const [before, after] of replacements) {
  if (!component.includes(before)) throw new Error(`Component patch anchor missing: ${before.slice(0, 90)}`);
  component = component.replace(before, after);
}
fs.writeFileSync(componentPath, component);

let css = fs.readFileSync(cssPath, 'utf8');
const toolbarAnchor = ".r3-terrain-prototype-toolbar {\n  position: absolute;\n  z-index: 6;";
if (!css.includes(toolbarAnchor)) throw new Error('Toolbar z-index patch anchor missing');
css = css.replace(
  toolbarAnchor,
  ".r3-terrain-prototype-toolbar {\n  position: absolute;\n  /* WP2D safe-area HUD must always occlude operational markers rather than\n     allowing counters/contacts to paint through the persistent map controls. */\n  z-index: 30;"
);
fs.writeFileSync(cssPath, css);

console.log('Applied R3-WP2D terrain safe-area and HUD stacking changes.');
