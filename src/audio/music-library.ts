import { DEFAULT_MUSIC_TRACK_ID } from '../game/global-settings';

export interface MusicTrack {
  id: string;
  label: string;
  src: string;
  loop: boolean;
  gain: number;
}

const discoveredUrls = import.meta.glob('../assets/music/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

const slugFromPath = (filePath: string) => {
  const fileName = filePath.split('/').pop() ?? filePath;
  return fileName
    .replace(/\.mp3$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const labelFromSlug = (slug: string) => slug
  .split('-')
  .filter(Boolean)
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

const discoveredTracks = Object.fromEntries(
  Object.entries(discoveredUrls).flatMap(([filePath, src]) => {
    const id = slugFromPath(filePath);
    if (!id || id === DEFAULT_MUSIC_TRACK_ID) return [];
    return [[id, {
      id,
      label: labelFromSlug(id),
      src,
      loop: false,
      gain: 1
    } satisfies MusicTrack]];
  })
) as Record<string, MusicTrack>;

const defaultTrack: MusicTrack = {
  id: DEFAULT_MUSIC_TRACK_ID,
  label: 'Black Protocol Dawn',
  src: `${import.meta.env.BASE_URL}audio/black-protocol-dawn.mp3`,
  loop: false,
  gain: 1
};

export const MUSIC_TRACKS: Record<string, MusicTrack> = {
  [DEFAULT_MUSIC_TRACK_ID]: defaultTrack,
  ...discoveredTracks
};

export const MUSIC_TRACK_OPTIONS = Object.values(MUSIC_TRACKS)
  .sort((left, right) => {
    if (left.id === DEFAULT_MUSIC_TRACK_ID) return -1;
    if (right.id === DEFAULT_MUSIC_TRACK_ID) return 1;
    return left.label.localeCompare(right.label);
  });

export function resolveMusicTrackId(id: string | undefined): string {
  return id && MUSIC_TRACKS[id] ? id : DEFAULT_MUSIC_TRACK_ID;
}
