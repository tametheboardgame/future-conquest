import type { GlobalSettings } from '../game/global-settings';
import { DEFAULT_GLOBAL_SETTINGS } from '../game/global-settings';
import { MUSIC_TRACK_OPTIONS, MUSIC_TRACKS, resolveMusicTrackId } from './music-library';

interface RegisteredAudioTrack {
  src: string;
  gain: number;
}

export const MUSIC_CONTEXTS = {
  title: 'playlist',
  prologue: 'playlist',
  game: 'playlist'
} as const;

// Sound effects can be registered here as the interface gains authored SFX.
export const SFX_TRACKS: Record<string, RegisteredAudioTrack> = {};

export type MusicTrackId = string;
export type MusicContext = keyof typeof MUSIC_CONTEXTS;
export type SfxId = string;

const clamp = (value: number) => Math.max(0, Math.min(1, value));

class AudioManager {
  private music: HTMLAudioElement | null = null;
  private currentTrack: MusicTrackId | null = null;
  private settings: GlobalSettings = DEFAULT_GLOBAL_SETTINGS;
  private unlocked = false;
  private musicRequested = false;
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
    const previousTrack = resolveMusicTrackId(this.settings.musicTrackId);
    const nextTrack = resolveMusicTrackId(settings.musicTrackId);
    this.settings = settings;

    if (this.musicRequested && previousTrack !== nextTrack) {
      if (this.unlocked) void this.playTrack(nextTrack, 350);
      return;
    }

    this.applyMusicVolume();
  }

  requestMusic(_context: MusicContext, fadeMs = 650) {
    this.musicRequested = true;
    if (!this.unlocked) return;

    if (this.music && this.currentTrack) {
      this.applyMusicVolume();
      if (this.music.paused && !this.music.ended) {
        try { void this.music.play(); } catch { /* wait for another user gesture */ }
      }
      return;
    }

    void this.playTrack(resolveMusicTrackId(this.settings.musicTrackId), fadeMs);
  }

  stopMusic(fadeMs = 650) {
    this.musicRequested = false;
    if (!this.music) return;
    this.fadeTo(0, fadeMs, () => {
      this.music?.pause();
      if (this.music) this.music.currentTime = 0;
      this.currentTrack = null;
      this.music = null;
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
    if (!this.musicRequested) return;

    if (this.music && this.currentTrack) {
      if (this.music.ended) this.music.currentTime = 0;
      this.applyMusicVolume();
      try { await this.music.play(); } catch { /* wait for another user gesture */ }
      return;
    }

    await this.playTrack(resolveMusicTrackId(this.settings.musicTrackId), 350);
  }

  private async playNextTrack() {
    if (!this.musicRequested || MUSIC_TRACK_OPTIONS.length === 0) return;

    const currentIndex = MUSIC_TRACK_OPTIONS.findIndex(track => track.id === this.currentTrack);
    const nextIndex = currentIndex >= 0
      ? (currentIndex + 1) % MUSIC_TRACK_OPTIONS.length
      : 0;
    const nextTrack = MUSIC_TRACK_OPTIONS[nextIndex];

    if (MUSIC_TRACK_OPTIONS.length === 1 && this.music) {
      this.music.currentTime = 0;
      this.applyMusicVolume();
      try {
        await this.music.play();
      } catch {
        this.unlocked = false;
      }
      return;
    }

    await this.playTrack(nextTrack.id, 0);
  }

  private async playTrack(trackId: MusicTrackId, fadeMs: number) {
    const resolvedTrackId = resolveMusicTrackId(trackId);
    const track = MUSIC_TRACKS[resolvedTrackId];

    if (this.currentTrack === resolvedTrackId && this.music) {
      if (this.music.ended) this.music.currentTime = 0;
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
    audio.loop = false;
    audio.volume = 0;
    audio.addEventListener('ended', () => {
      if (this.music !== audio || !this.musicRequested) return;
      void this.playNextTrack();
    });
    this.music = audio;
    this.currentTrack = resolvedTrackId;

    try {
      await audio.play();
      this.fadeTo(this.targetMusicVolume(), fadeMs);
    } catch {
      this.unlocked = false;
    }
  }

  private targetMusicVolume() {
    if (this.settings.muted || !this.currentTrack) return 0;
    const track = MUSIC_TRACKS[resolveMusicTrackId(this.currentTrack)];
    return clamp(this.settings.masterVolume * this.settings.musicVolume * track.gain);
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
