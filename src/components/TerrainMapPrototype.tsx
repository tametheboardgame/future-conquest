import { useEffect, useState } from 'react';
import {
  chooseTerrainPresentationProfile,
  type TerrainPresentationProfile
} from '../presentation/r3-terrain-config';
import {
  TerrainMapPrototypeImpl,
  prewarmTerrainRuntime,
  type TerrainMapPrototypeProps
} from './TerrainMapPrototypeImpl';

function browserTerrainProfile(): TerrainPresentationProfile {
  if (typeof window === 'undefined') return 'full';
  return chooseTerrainPresentationProfile({
    viewportWidth: window.innerWidth,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches
  });
}

/**
 * WP2B-D host policy around the MapLibre implementation. The wrapper owns only
 * presentation/fallback choice; authoritative selection and game state remain
 * in the existing callback/state path.
 */
export function TerrainMapPrototype(props: TerrainMapPrototypeProps) {
  const [profile, setProfile] = useState<TerrainPresentationProfile>(browserTerrainProfile);
  const { onFallback } = props;

  useEffect(() => {
    const refreshProfile = () => setProfile(browserTerrainProfile());
    window.addEventListener('resize', refreshProfile);
    return () => window.removeEventListener('resize', refreshProfile);
  }, []);

  useEffect(() => {
    if (profile === 'svg-fallback') {
      onFallback('Compact touch display selected the stable SVG command map.');
    }
  }, [profile, onFallback]);

  if (profile === 'svg-fallback') {
    return <div className="r3-terrain-compact-fallback" role="status">Loading compact 2D command map…</div>;
  }

  return <div className="r3-terrain-prototype-shell" data-terrain-profile={profile}>
    <button
      type="button"
      className="r3-terrain-use-svg"
      onClick={() => onFallback('Player selected the stable SVG command map.')}
    >
      2D accessible map
    </button>
    <TerrainMapPrototypeImpl key={profile} {...props} presentationProfile={profile} />
  </div>;
}

export type { TerrainMapPrototypeProps };
export { prewarmTerrainRuntime };
