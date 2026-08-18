import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './map-ux-foundations.css';

interface Props {
  active: boolean;
}

type TerrainMapWindow = Window & {
  __r3TerrainMap?: { resize?: () => void };
};

export function MapUxFoundations({ active }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [available, setAvailable] = useState(false);
  const [toggleHost, setToggleHost] = useState<HTMLElement | null>(null);

  const syncShell = useCallback(() => {
    if (!active) {
      setAvailable(false);
      setToggleHost(null);
      return;
    }
    const workspace = document.querySelector<HTMLElement>('.command-map-workspace');
    const panel = workspace?.querySelector<HTMLElement>('.map-context-panel') ?? null;
    const host = panel?.querySelector<HTMLElement>('.quick-command-heading') ?? null;
    if (panel) panel.id = 'map-context-panel';
    setAvailable(Boolean(workspace && panel && host));
    setToggleHost(host);
  }, [active]);

  useEffect(() => {
    syncShell();
    const observer = new MutationObserver(syncShell);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', syncShell);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncShell);
    };
  }, [syncShell]);

  useEffect(() => {
    if (!active) return;
    const workspace = document.querySelector<HTMLElement>('.command-map-workspace');
    const panel = workspace?.querySelector<HTMLElement>('.map-context-panel') ?? null;
    if (!workspace || !panel) return;
    workspace.classList.toggle('wp39a-sidebar-collapsed', collapsed);
    panel.classList.toggle('wp39a-sidebar-collapsed', collapsed);
    panel.dataset.sidebarCollapsed = String(collapsed);

    const resizeMap = () => {
      (window as TerrainMapWindow).__r3TerrainMap?.resize?.();
      window.dispatchEvent(new Event('resize'));
    };
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(resizeMap));
    return () => {
      window.cancelAnimationFrame(frame);
      workspace.classList.remove('wp39a-sidebar-collapsed');
      panel.classList.remove('wp39a-sidebar-collapsed');
      delete panel.dataset.sidebarCollapsed;
    };
  }, [active, collapsed, toggleHost]);

  if (!active || !available || !toggleHost) return null;
  const expanded = !collapsed;
  return createPortal(<button
    type="button"
    className="map-ux-sidebar-toggle"
    onClick={() => setCollapsed(value => !value)}
    aria-controls="map-context-panel"
    aria-expanded={expanded}
    aria-label={expanded ? 'Collapse context sidebar' : 'Expand context sidebar'}
    title={expanded ? 'Collapse context sidebar' : 'Expand context sidebar'}
  ><span aria-hidden="true">{expanded ? '›' : '‹'}</span></button>, toggleHost);
}
