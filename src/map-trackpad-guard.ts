const MAP_SELECTOR = '.europe-map-frame';
const guardWindow = window as Window & { __futureConquestTrackpadGuard?: boolean };

export function installMapTrackpadGuard() {
  if (guardWindow.__futureConquestTrackpadGuard) return;

  const handleWheel = (event: WheelEvent) => {
    if (!event.ctrlKey) return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(MAP_SELECTOR)) return;
    event.preventDefault();
  };

  document.addEventListener('wheel', handleWheel, { capture: true, passive: false });
  guardWindow.__futureConquestTrackpadGuard = true;
}
