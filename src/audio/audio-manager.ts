import type { GlobalSettings } from '../game/global-settings';
import { DEFAULT_GLOBAL_SETTINGS } from '../game/global-settings';

interface RegisteredAudioTrack {
  src: string;
  gain: number;
}

interface RegisteredMusicTrack extends RegisteredAudioTrack {
  loop: boolean;
}

export const MUSIC_TRACKS = {
  'black-protocol-dawn': {
    src: `${import.meta.env.BASE_URL}audio/black-protocol-dawn.mp3`,
    loop: true,
    gain: 1
  }
} as const satisfies Record<string, RegisteredMusicTrack>;

export const MUSIC_CONTEXTS = {
  title: 'black-protocol-dawn',
  prologue: 'black-protocol-dawn'
} as const;

// Sound effects can be registered here as the interface gains authored SFX.
export const SFX_TRACKS: Record<string, RegisteredAudioTrack> = {};

export type MusicTrackId = keyof typeof MUSIC_TRACKS;
export type MusicContext = keyof typeof MUSIC_CONTEXTS;
export type SfxId = string;

const clamp = (value: number) => Math.max(0, Math.min(1, value));

class AudioManager {
  private music: HTMLAudioElement | null = null;
  private currentTrack: MusicTrackId | null = null;
  private requestedTrack: MusicTrackId | null = null;
  private settings: GlobalSettings = DEFAULT_GLOBAL_SETTINGS;
  private unlocked = false;
  private fadeFrame: number | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.unlocked = true;
      void this.resumeRequestedMusic();
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  setSettings(settings: GlobalSettings) {
    this.settings = settings;
    this.applyMusicVolume();
  }

  requestMusic(context: MusicContext, fadeMs = 650) {
    const trackId = MUSIC_CONTEXTS[context];
    this.requestedTrack = trackId;
    if (!this.unlocked) return;
    void this.playTrack(trackId, fadeMs);
  }

  stopMusic(fadeMs = 650) {
    this.requestedTrack = null;
    if (!this.music) return;
    this.fadeTo(0, fadeMs, () => {
      this.music?.pause();
      if (this.music) this.music.currentTime = 0;
      this.currentTrack = null;
    });
  }

  unlock() {
    this.unlocked = true;
    return this.resumeRequestedMusic();
  }

  async playSfx(id: SfxId) {
    const track = SFX_TRACKS[id];
    if (!track || this.settings.muted) return;
    const sound = new Audio(track.src);
    sound.volume = clamp(this.settings.masterVolume * this.settings.sfxVolume * track.gain);
    try {
      await sound.play();
    } catch {
      // SFX is best-effort when browser autoplay policy blocks playback.
    }
  }

  private async resumeRequestedMusic() {
    if (!this.requestedTrack) return;
    await this.playTrack(this.requestedTrack, 350);
  }

  private async playTrack(trackId: MusicTrackId, fadeMs: number) {
    const track = MUSIC_TRACKS[trackId];
    if (this.currentTrack === trackId && this.music) {
      this.applyMusicVolume();
      if (this.music.paused) {
        try { await this.music.play(); } catch { /* wait for another user gesture */ }
      }
      return;
    }

    if (this.fadeFrame !== null) cancelAnimationFrame(this.fadeFrame);
    this.music?.pause();

    const audio = new Audio(track.src);
    audio.preload = 'auto';
    audio.loop = track.loop;
    audio.volume = 0;
    this.music = audio;
    this.currentTrack = trackId;

    try {
      await audio.play();
      this.fadeTo(this.targetMusicVolume(), fadeMs);
    } catch {
      this.unlocked = false;
    }
  }

  private targetMusicVolume() {
    if (this.settings.muted || !this.currentTrack) return 0;
    return clamp(
      this.settings.masterVolume
      * this.settings.musicVolume
      * MUSIC_TRACKS[this.currentTrack].gain
    );
  }

  private applyMusicVolume() {
    if (!this.music) return;
    this.music.volume = this.targetMusicVolume();
  }

  private fadeTo(target: number, durationMs: number, onComplete?: () => void) {
    if (!this.music) return;
    if (this.fadeFrame !== null) cancelAnimationFrame(this.fadeFrame);
    const audio = this.music;
    const start = audio.volume;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = durationMs <= 0 ? 1 : Math.min(1, (now - startedAt) / durationMs);
      audio.volume = clamp(start + (target - start) * progress);
      if (progress < 1) {
        this.fadeFrame = requestAnimationFrame(tick);
      } else {
        this.fadeFrame = null;
        onComplete?.();
      }
    };
    this.fadeFrame = requestAnimationFrame(tick);
  }
}

export const audioManager = new AudioManager();
