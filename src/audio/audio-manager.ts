import type { GlobalSettings } from '../game/global-settings';
import { DEFAULT_GLOBAL_SETTINGS } from '../game/global-settings';
import { MUSIC_TRACKS, resolveMusicTrackId } from './music-library';

interface RegisteredAudioTrack {
  src: string;
  gain: number;
}

export const MUSIC_CONTEXTS = {
  title: 'selected',
  prologue: 'selected'
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
    const previousTrack = resolveMusicTrackId(this.settings.musicTrackId);
    const nextTrack = resolveMusicTrackId(settings.musicTrackId);
    this.settings = settings;

    if (this.requestedTrack && previousTrack !== nextTrack) {
      this.requestedTrack = nextTrack;
      if (this.unlocked) void this.playTrack(nextTrack, 350);
      return;
    }

    this.applyMusicVolume();
  }

  requestMusic(_context: MusicContext, fadeMs = 650) {
    const trackId = resolveMusicTrackId(this.settings.musicTrackId);
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
    const resolvedTrackId = resolveMusicTrackId(trackId);
    const track = MUSIC_TRACKS[resolvedTrackId];

    if (this.currentTrack === resolvedTrackId && this.music) {
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
