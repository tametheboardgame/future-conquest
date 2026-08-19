import type { GlobalSettings } from '../game/global-settings';
import { DEFAULT_GLOBAL_SETTINGS } from '../game/global-settings';
import {
  MUSIC_TRACK_OPTIONS,
  MUSIC_TRACKS,
  musicPlaylistForContext,
  resolveMusicTrackId,
  type MusicContext
} from './music-library';

interface RegisteredAudioTrack {
  src: string;
  gain: number;
}

interface ProceduralNote {
  frequency: number;
  duration: number;
  offset?: number;
  endFrequency?: number;
  type?: OscillatorType;
  gain?: number;
}

export const MUSIC_CONTEXTS: Record<MusicContext, MusicContext> = {
  title: 'title',
  prologue: 'prologue',
  game: 'game',
  tension: 'tension',
  combat: 'combat',
  victory: 'victory',
  defeat: 'defeat'
};

// Authored sound effects can still be registered here. WP7 additionally uses
// small procedural cues so core command feedback does not depend on optional
// binary assets being present.
export const SFX_TRACKS: Record<string, RegisteredAudioTrack> = {};

const PROCEDURAL_SFX: Record<string, ProceduralNote[]> = {
  'ui-confirm': [
    { frequency: 520, endFrequency: 700, duration: 0.09, type: 'sine', gain: 0.5 }
  ],
  'order-issued': [
    { frequency: 330, endFrequency: 520, duration: 0.14, type: 'triangle', gain: 0.55 },
    { frequency: 660, duration: 0.08, offset: 0.08, type: 'sine', gain: 0.35 }
  ],
  'attack-order': [
    { frequency: 150, endFrequency: 105, duration: 0.18, type: 'sawtooth', gain: 0.42 },
    { frequency: 420, endFrequency: 610, duration: 0.16, offset: 0.06, type: 'square', gain: 0.22 }
  ],
  'movement-resolve': [
    { frequency: 120, endFrequency: 180, duration: 0.24, type: 'triangle', gain: 0.38 },
    { frequency: 240, endFrequency: 360, duration: 0.18, offset: 0.08, type: 'sine', gain: 0.25 }
  ],
  warning: [
    { frequency: 210, duration: 0.12, type: 'square', gain: 0.3 },
    { frequency: 210, duration: 0.12, offset: 0.18, type: 'square', gain: 0.3 }
  ],
  'battle-victory': [
    { frequency: 392, endFrequency: 523, duration: 0.16, type: 'triangle', gain: 0.38 },
    { frequency: 659, duration: 0.2, offset: 0.12, type: 'sine', gain: 0.38 }
  ],
  'battle-loss': [
    { frequency: 220, endFrequency: 165, duration: 0.22, type: 'triangle', gain: 0.38 },
    { frequency: 147, duration: 0.24, offset: 0.14, type: 'sine', gain: 0.32 }
  ],
  victory: [
    { frequency: 392, endFrequency: 523, duration: 0.18, type: 'triangle', gain: 0.36 },
    { frequency: 659, duration: 0.2, offset: 0.14, type: 'sine', gain: 0.36 },
    { frequency: 784, duration: 0.28, offset: 0.3, type: 'sine', gain: 0.32 }
  ],
  defeat: [
    { frequency: 196, endFrequency: 147, duration: 0.28, type: 'triangle', gain: 0.34 },
    { frequency: 110, duration: 0.36, offset: 0.2, type: 'sine', gain: 0.3 }
  ]
};

const ATMOSPHERE_GAIN: Record<MusicContext, number> = {
  title: 0,
  prologue: 0,
  game: 0.014,
  tension: 0.02,
  combat: 0.012,
  victory: 0.006,
  defeat: 0.008
};

export type MusicTrackId = string;
export type { MusicContext } from './music-library';
export type SfxId = string;

const clamp = (value: number) => Math.max(0, Math.min(1, value));

class AudioManager {
  private music: HTMLAudioElement | null = null;
  private currentTrack: MusicTrackId | null = null;
  private currentContext: MusicContext = 'title';
  private settings: GlobalSettings = DEFAULT_GLOBAL_SETTINGS;
  private unlocked = false;
  private musicRequested = false;
  private fadeFrame: number | null = null;
  private effectsContext: AudioContext | null = null;
  private atmosphereSource: AudioBufferSourceNode | null = null;
  private atmosphereGain: GainNode | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.unlocked = true;
      void this.resumeRequestedMusic();
      void this.applyAtmosphere();
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  setSettings(settings: GlobalSettings) {
    const previousTrack = resolveMusicTrackId(this.settings.musicTrackId);
    const previousMode = this.settings.musicMode;
    const nextTrack = resolveMusicTrackId(settings.musicTrackId);
    this.settings = settings;

    if (this.musicRequested && (
      previousMode !== settings.musicMode
      || (settings.musicMode === 'manual' && previousTrack !== nextTrack)
    )) {
      if (this.unlocked) void this.playTrack(this.requestedTrackId(), 350);
      void this.applyAtmosphere();
      return;
    }

    this.applyMusicVolume();
    void this.applyAtmosphere();
  }

  requestMusic(context: MusicContext, fadeMs = 650) {
    const contextChanged = this.currentContext !== context;
    this.currentContext = context;
    this.musicRequested = true;
    if (!this.unlocked) return;

    void this.applyAtmosphere();

    if (this.music && this.currentTrack) {
      const requestedTrack = this.requestedTrackId();
      if (contextChanged && this.settings.musicMode === 'adaptive' && requestedTrack !== this.currentTrack) {
        void this.playTrack(requestedTrack, fadeMs);
        return;
      }
      this.applyMusicVolume();
      if (this.music.paused && !this.music.ended) {
        try { void this.music.play(); } catch { /* wait for another user gesture */ }
      }
      return;
    }

    void this.playTrack(this.requestedTrackId(), fadeMs);
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
    void this.applyAtmosphere();
    return this.resumeRequestedMusic();
  }

  async playSfx(id: SfxId) {
    if (this.settings.muted) return;

    const track = SFX_TRACKS[id];
    if (track) {
      const sound = new Audio(track.src);
      sound.volume = clamp(this.settings.masterVolume * this.settings.sfxVolume * track.gain);
      try {
        await sound.play();
      } catch {
        // SFX is best-effort when browser autoplay policy blocks playback.
      }
      return;
    }

    const notes = PROCEDURAL_SFX[id];
    if (!notes) return;
    await this.playProceduralSfx(notes);
  }

  private requestedTrackId(): MusicTrackId {
    if (this.settings.musicMode === 'manual') {
      return resolveMusicTrackId(this.settings.musicTrackId);
    }
    const playlist = musicPlaylistForContext(this.currentContext);
    if (this.currentTrack && playlist.some(track => track.id === this.currentTrack)) return this.currentTrack;
    return playlist[0]?.id ?? resolveMusicTrackId(this.settings.musicTrackId);
  }

  private activePlaylist() {
    return this.settings.musicMode === 'adaptive'
      ? musicPlaylistForContext(this.currentContext)
      : MUSIC_TRACK_OPTIONS;
  }

  private async resumeRequestedMusic() {
    if (!this.musicRequested) return;

    if (this.music && this.currentTrack) {
      if (this.music.ended) this.music.currentTime = 0;
      this.applyMusicVolume();
      try { await this.music.play(); } catch { /* wait for another user gesture */ }
      return;
    }

    await this.playTrack(this.requestedTrackId(), 350);
  }

  private async playNextTrack() {
    if (!this.musicRequested) return;
    const playlist = this.activePlaylist();
    if (playlist.length === 0) return;

    const currentIndex = playlist.findIndex(track => track.id === this.currentTrack);
    const nextIndex = currentIndex >= 0
      ? (currentIndex + 1) % playlist.length
      : 0;
    const nextTrack = playlist[nextIndex];

    if (playlist.length === 1 && this.music) {
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
    if (!track) return;

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
    audio.loop = track.loop;
    audio.volume = 0;
    audio.addEventListener('ended', () => {
      if (this.music !== audio || !this.musicRequested || track.loop) return;
      void this.playNextTrack();
    });
    audio.addEventListener('error', () => {
      if (this.music !== audio) return;
      if (resolvedTrackId !== DEFAULT_GLOBAL_SETTINGS.musicTrackId) {
        void this.playTrack(DEFAULT_GLOBAL_SETTINGS.musicTrackId, 0);
      } else {
        this.currentTrack = null;
        this.music = null;
      }
    }, { once: true });
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

  private async ensureEffectsContext(): Promise<AudioContext | null> {
    if (!this.unlocked || typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
    try {
      if (!this.effectsContext) this.effectsContext = new AudioContext();
      if (this.effectsContext.state === 'suspended') await this.effectsContext.resume();
      return this.effectsContext;
    } catch {
      return null;
    }
  }

  private async playProceduralSfx(notes: ProceduralNote[]) {
    const context = await this.ensureEffectsContext();
    if (!context || this.settings.muted) return;
    const masterGain = clamp(this.settings.masterVolume * this.settings.sfxVolume);
    if (masterGain <= 0) return;

    const now = context.currentTime;
    for (const note of notes) {
      const offset = note.offset ?? 0;
      const startAt = now + offset;
      const stopAt = startAt + note.duration;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = note.type ?? 'sine';
      oscillator.frequency.setValueAtTime(note.frequency, startAt);
      if (note.endFrequency) oscillator.frequency.linearRampToValueAtTime(note.endFrequency, stopAt);
      const peak = Math.max(0.0001, masterGain * (note.gain ?? 0.35));
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.linearRampToValueAtTime(peak, startAt + Math.min(0.018, note.duration / 3));
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(stopAt + 0.01);
    }
  }

  private async applyAtmosphere() {
    const targetScale = ATMOSPHERE_GAIN[this.currentContext] ?? 0;
    if (targetScale <= 0 && !this.atmosphereGain) return;
    const context = await this.ensureEffectsContext();
    if (!context) return;

    if (!this.atmosphereSource || !this.atmosphereGain) {
      const length = Math.max(1, Math.floor(context.sampleRate * 0.75));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      let seed = 0x57f7a11;
      for (let index = 0; index < data.length; index += 1) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        data[index] = ((seed / 0xffffffff) * 2 - 1) * 0.32;
      }
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      filter.Q.value = 0.7;
      gain.gain.value = 0;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start();
      this.atmosphereSource = source;
      this.atmosphereGain = gain;
    }

    const target = this.settings.muted
      ? 0
      : clamp(this.settings.masterVolume * this.settings.sfxVolume * targetScale);
    const now = context.currentTime;
    this.atmosphereGain.gain.cancelScheduledValues(now);
    this.atmosphereGain.gain.setValueAtTime(this.atmosphereGain.gain.value, now);
    this.atmosphereGain.gain.linearRampToValueAtTime(target, now + 0.45);
  }
}

export const audioManager = new AudioManager();
