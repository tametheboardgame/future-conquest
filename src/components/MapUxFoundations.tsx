import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './map-ux-foundations.css';

interface Props {
  active: boolean;
}

interface TerrainResizeHandle {
  resize: () => void;
}

type TerrainWindow = Window & { __r3TerrainMap?: TerrainResizeHandle };

const PANEL_ID = 'command-map-context-panel';
const DESKTOP_QUERY = '(min-width: 901px)';
const RESIZE_SETTLE_MS = 190;

function mapWorkspace(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.command-map-workspace');
}

function mapContextPanel(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.map-context-panel');
}

export function MapUxFoundations({ active }: Props) {
  // Deliberately session-only: a fresh browser session starts expanded and this
  // presentation preference never becomes campaign/save state.
  const [collapsed, setCollapsed] = useState(false);
  const [available, setAvailable] = useState(false);
  const [toggleHost, setToggleHost] = useState<HTMLElement | null>(null);
  const settleTimerRef = useRef<number | undefined>(undefined);

  const resizeRenderedMap = useCallback(() => {
    const resize = () => {
      (window as TerrainWindow).__r3TerrainMap?.resize();
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
    const host = panel?.querySelector<HTMLElement>('.quick-command-heading') ?? null;
    const canControl = Boolean(active && workspace && panel && host && desktop);

    setAvailable(current => current === canControl ? current : canControl);

    if (!workspace || !panel) {
      setToggleHost(null);
      return;
    }

    panel.id = PANEL_ID;
    const shouldCollapse = Boolean(active && desktop && collapsed);
    workspace.classList.toggle('wp39a-sidebar-collapsed', shouldCollapse);
    panel.classList.toggle('wp39a-sidebar-collapsed', shouldCollapse);
    panel.dataset.sidebarCollapsed = String(shouldCollapse);

    // WP6.6 keeps the collapse control inside the panel header. The historical
    // WP3.9A whole-panel inert/aria-hidden treatment cannot be used here because
    // it would also disable the in-header control needed to expand the panel.
    panel.inert = false;
    panel.removeAttribute('aria-hidden');
    setToggleHost(canControl ? host : null);
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
    };
  }, [reconcileLayout, resizeRenderedMap]);

  useEffect(() => {
    reconcileLayout();
    if (active) resizeRenderedMap();
  }, [active, collapsed, reconcileLayout, resizeRenderedMap]);

  if (!available || !toggleHost) return null;

  const expanded = !collapsed;
  return createPortal(<button
    type="button"
    className="map-ux-sidebar-toggle"
    data-map-sidebar-toggle
    aria-controls={PANEL_ID}
    aria-expanded={expanded}
    aria-label={expanded ? 'Collapse command sidebar' : 'Expand command sidebar'}
    title={expanded ? 'Collapse command sidebar' : 'Expand command sidebar'}
    onClick={() => setCollapsed(current => !current)}
  >
    <span aria-hidden="true">{expanded ? '›' : '‹'}</span>
  </button>, toggleHost);
}
