const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const startup = fs.readFileSync('src/components/StartupExperience.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const ux = fs.readFileSync('src/components/MapUxFoundations.tsx', 'utf8');
const css = fs.readFileSync('src/components/map-ux-foundations.css', 'utf8');
const baseCss = fs.readFileSync('src/command-interface.css', 'utf8');
const roadmap = fs.readFileSync('docs/roadmap/R3-WP3.9-MAP-TIGHTENING.md', 'utf8');

test('BEGIN CAMPAIGN now exposes the existing campaign on the command map without mutating campaign state', () => {
  assert.match(app, /useState<CommandView>\('map'\)/);
  assert.match(startup, /const openCampaignMap = useCallback\(\(\) => \{[\s\S]*openCommandView\('map'\)/);
  assert.match(startup, /setIntroDestination\('campaign-map'\)/);
  assert.match(startup, /introDestination === 'campaign-map'\) openCampaignMap\(\)/);
  assert.doesNotMatch(startup, /openCampaignSetup/);
  assert.doesNotMatch(startup, /openCampaignMap[\s\S]{0,500}findButton\('New campaign'\)/);
});

test('right command sidebar collapse is session-only and preserves game selection state', () => {
  assert.match(startup, /<MapUxFoundations active=\{mode === 'game'\}/);
  assert.match(ux, /const \[collapsed, setCollapsed\] = useState\(false\)/);
  assert.doesNotMatch(ux, /localStorage|sessionStorage|writeCampaignSlot|saveGame/);
  assert.doesNotMatch(ux, /selectTaskGroup|selectTerritory|setState\(/);
  assert.match(ux, /workspace\.classList\.toggle\('wp39a-sidebar-collapsed', shouldCollapse\)/);
  assert.match(ux, /panel\.classList\.toggle\('wp39a-sidebar-collapsed', shouldCollapse\)/);
});

test('collapse returns sidebar width to the map and explicitly resizes the accelerated renderer', () => {
  assert.match(baseCss, /\.command-map-workspace\s*\{\s*grid-template-columns:\s*minmax\(700px, 1fr\) 360px;/s);
  assert.match(css, /\.command-map-workspace\.wp39a-sidebar-collapsed\s*\{[^}]*grid-template-columns:\s*minmax\(700px, 1fr\) 42px;/s);
  assert.match(css, /@media \(max-width: 1250px\)[\s\S]*minmax\(620px, 1fr\) 42px/);
  assert.match(ux, /__r3TerrainMap\?\.resize\(\)/);
  assert.match(ux, /requestAnimationFrame\(resize\)/);
  assert.match(ux, /RESIZE_SETTLE_MS = 190/);
});

test('sidebar control exposes keyboard/accessibility state while keeping its in-header expand control operable', () => {
  assert.match(ux, /createPortal/);
  assert.match(ux, /querySelector<HTMLElement>\('\.quick-command-heading'\)/);
  assert.match(ux, /aria-controls=\{PANEL_ID\}/);
  assert.match(ux, /aria-expanded=\{expanded\}/);
  assert.match(ux, /Collapse command sidebar/);
  assert.match(ux, /Expand command sidebar/);
  assert.match(ux, /panel\.inert = false/);
  assert.doesNotMatch(ux, /panel\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(css, /\.map-ux-sidebar-toggle:focus-visible\s*\{[^}]*outline:/s);
});

test('compact and reduced-motion layouts retain the existing interaction model', () => {
  assert.match(ux, /const DESKTOP_QUERY = '\(min-width: 901px\)'/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.map-ux-sidebar-toggle\s*\{[\s\S]*display:\s*none;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition:\s*none;/);
});

test('implementation remains inside the approved WP3.9A presentation-only boundary', () => {
  assert.match(roadmap, /R3-WP3\.9A - Map UX Foundations/);
  assert.match(roadmap, /Campaign starts on the map/);
  assert.match(roadmap, /Collapsible right command sidebar/);
  assert.match(roadmap, /save-game meaning or deterministic campaign outcomes/);
  assert.match(roadmap, /\?terrain=0/);
});
