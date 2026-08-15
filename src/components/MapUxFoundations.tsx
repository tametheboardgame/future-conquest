import { useCallback, useEffect, useRef, useState } from 'react';
import './map-ux-foundations.css';

interface Props {
  active: boolean;
}

interface TerrainResizeHandle {
  resize: () => void;
}

type TerrainWindow = Window & { __r3TerrainMap?: TerrainResizeHandle };

type TogglePosition = { top: number; left: number };

const PANEL_ID = 'command-map-context-panel';
const DESKTOP_QUERY = '(min-width: 901px)';
const RESIZE_SETTLE_MS = 190;

function mapWorkspace(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.command-map-workspace');
}

function mapContextPanel(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.map-context-panel');
}

function samePosition(current: TogglePosition | null, next: TogglePosition): boolean {
  return Boolean(current && Math.abs(current.top - next.top) < 0.5 && Math.abs(current.left - next.left) < 0.5);
}

function clearAppliedLayout() {
  mapWorkspace()?.classList.remove('wp39a-sidebar-collapsed');
  const panel = mapContextPanel();
  if (!panel) return;
  panel.classList.remove('wp39a-sidebar-collapsed');
  panel.inert = false;
  panel.removeAttribute('aria-hidden');
}

export function MapUxFoundations({ active }: Props) {
  // Deliberately session-only: leaving/re-entering views retains the player's
  // preference, while a fresh browser session starts with the command panel open.
  const [collapsed, setCollapsed] = useState(false);
  const [available, setAvailable] = useState(false);
  const [togglePosition, setTogglePosition] = useState<TogglePosition | null>(null);
  const settleTimerRef = useRef<number>();

  const resizeRenderedMap = useCallback(() => {
    const resize = () => {
      (window as TerrainWindow).__r3TerrainMap?.resize();
      // The SVG/DOM fallback and any future responsive map host can use the same
      // ordinary resize signal without depending on MapLibre diagnostics.
      window.dispatchEvent(new Event('resize'));
    };
    window.requestAnimationFrame(resize);
    if (settleTimerRef.current !== undefined) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(resize, RESIZE_SETTLE_MS);
  }, []);

  const reconcileLayout = useCallback(() => {
    const workspace = mapWorkspace();
    const panel = mapContextPanel();
    const desktop = window.matchMedia(DESKTOP_QUERY).matches;
    const canControl = Boolean(active && workspace && panel && desktop);

    setAvailable(current => current === canControl ? current : canControl);

    if (!workspace || !panel) {
      setTogglePosition(null);
      return;
    }

    panel.id = PANEL_ID;
    const shouldCollapse = Boolean(active && desktop && collapsed);
    workspace.classList.toggle('wp39a-sidebar-collapsed', shouldCollapse);
    panel.classList.toggle('wp39a-sidebar-collapsed', shouldCollapse);
    panel.inert = shouldCollapse;
    if (shouldCollapse) panel.setAttribute('aria-hidden', 'true');
    else panel.removeAttribute('aria-hidden');

    if (!canControl) {
      setTogglePosition(null);
      return;
    }

    const rect = panel.getBoundingClientRect();
    const next = {
      top: Math.max(8, Math.round(rect.top + 18)),
      left: Math.max(14, Math.round(rect.left))
    };
    setTogglePosition(current => samePosition(current, next) ? current : next);
  }, [active, collapsed]);

  useEffect(() => {
    reconcileLayout();
    const mutations = new MutationObserver(reconcileLayout);
    mutations.observe(document.body, { childList: true, subtree: true });
    const media = window.matchMedia(DESKTOP_QUERY);
    const onViewportChange = () => {
      reconcileLayout();
      resizeRenderedMap();
    };
    media.addEventListener('change', onViewportChange);
    window.addEventListener('resize', reconcileLayout);

    return () => {
      mutations.disconnect();
      media.removeEventListener('change', onViewportChange);
      window.removeEventListener('resize', reconcileLayout);
      if (settleTimerRef.current !== undefined) window.clearTimeout(settleTimerRef.current);
      clearAppliedLayout();
    };
  }, [reconcileLayout, resizeRenderedMap]);

  useEffect(() => {
    if (!active) return;
    reconcileLayout();
    resizeRenderedMap();
  }, [active, collapsed, reconcileLayout, resizeRenderedMap]);

  if (!available || !togglePosition) return null;

  const expanded = !collapsed;
  return <button
    type="button"
    className="map-ux-sidebar-toggle"
    data-map-sidebar-toggle
    style={{ top: togglePosition.top, left: togglePosition.left }}
    aria-controls={PANEL_ID}
    aria-expanded={expanded}
    aria-label={expanded ? 'Collapse command sidebar' : 'Expand command sidebar'}
    title={expanded ? 'Collapse command sidebar' : 'Expand command sidebar'}
    onClick={() => setCollapsed(current => !current)}
  >
    <span aria-hidden="true">{expanded ? '›' : '‹'}</span>
  </button>;
}
