import { MUSIC_TRACK_OPTIONS, resolveMusicTrackId } from '../audio/music-library';
import type { GlobalSettings } from '../game/global-settings';

interface Props {
  settings: GlobalSettings;
  onChange: (settings: GlobalSettings) => void;
  onClose: () => void;
  onPreviewVictory?: () => void;
  onPreviewDefeat?: () => void;
}

const percentage = (value: number) => `${Math.round(value * 100)}%`;

export function GlobalSettingsPanel({ settings, onChange, onClose, onPreviewVictory, onPreviewDefeat }: Props) {
  const updateVolume = (key: 'masterVolume' | 'musicVolume' | 'sfxVolume', value: string) => {
    onChange({ ...settings, [key]: Number(value) });
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen availability is browser/platform controlled.
    }
  };

  const selectedTrackId = resolveMusicTrackId(settings.musicTrackId);

  return <div className="global-settings-backdrop" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="global-settings-panel" role="dialog" aria-modal="true" aria-labelledby="global-settings-title">
      <header>
        <div><p className="launcher-kicker">SYSTEM SETTINGS</p><h2 id="global-settings-title">Settings</h2></div>
        <button type="button" className="settings-close" onClick={onClose} aria-label="Close settings">×</button>
      </header>

      <div className="settings-section">
        <div className="settings-section-heading"><div><p className="launcher-kicker">AUDIO</p><h3>Sound</h3></div><label className="settings-mute"><input type="checkbox" checked={settings.muted} onChange={event => onChange({ ...settings, muted: event.target.checked })} />Mute all</label></div>
        <label className="settings-track-picker"><span><b>Music track</b><small>{MUSIC_TRACK_OPTIONS.length} available</small></span><select value={selectedTrackId} onChange={event => onChange({ ...settings, musicTrackId: event.target.value })}>{MUSIC_TRACK_OPTIONS.map(track => <option key={track.id} value={track.id}>{track.label}</option>)}</select></label>
        <label className="settings-slider"><span><b>Master volume</b><output>{percentage(settings.masterVolume)}</output></span><input type="range" min="0" max="1" step="0.01" value={settings.masterVolume} onChange={event => updateVolume('masterVolume', event.target.value)} /></label>
        <label className="settings-slider"><span><b>Music volume</b><output>{percentage(settings.musicVolume)}</output></span><input type="range" min="0" max="1" step="0.01" value={settings.musicVolume} onChange={event => updateVolume('musicVolume', event.target.value)} /></label>
        <label className="settings-slider"><span><b>Sound effects</b><output>{percentage(settings.sfxVolume)}</output></span><input type="range" min="0" max="1" step="0.01" value={settings.sfxVolume} onChange={event => updateVolume('sfxVolume', event.target.value)} /></label>
      </div>

      <div className="settings-section">
        <div className="settings-section-heading"><div><p className="launcher-kicker">DISPLAY</p><h3>Screen</h3></div></div>
        <button type="button" className="settings-secondary" onClick={toggleFullscreen}>Toggle fullscreen</button>
        <p className="settings-future-copy">Graphics quality, UI scale, animation controls and additional accessibility options will live here as those systems are added.</p>
      </div>

      {(onPreviewVictory || onPreviewDefeat) && <div className="settings-section ending-preview-settings">
        <div className="settings-section-heading"><div><p className="launcher-kicker">ENDING PREVIEW</p><h3>Temporary test controls</h3></div></div>
        <p className="settings-future-copy">These buttons bypass campaign completion so the ending presentation can be reviewed during development. They can be removed once the ending package is signed off.</p>
        <div className="ending-preview-actions">
          {onPreviewVictory && <button type="button" className="settings-secondary" onClick={onPreviewVictory}>Preview victory ending</button>}
          {onPreviewDefeat && <button type="button" className="settings-secondary" onClick={onPreviewDefeat}>Preview defeat screen</button>}
        </div>
      </div>}

      <footer><button type="button" className="launcher-primary" onClick={onClose}>Done</button></footer>
    </section>
  </div>;
}
