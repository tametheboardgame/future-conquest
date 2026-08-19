import { useEffect, useState } from 'react';
import { MUSIC_TRACK_OPTIONS, resolveMusicTrackId } from '../audio/music-library';
import { ASSISTANCE_LEVELS, type AssistanceLevel, type GlobalSettings, type MusicMode } from '../game/global-settings';
import {
  DEFAULT_WARNING_PREFERENCES,
  WARNING_DEFINITIONS,
  WARNING_MODE_OPTIONS,
  loadWarningPreferences,
  saveWarningPreferences,
  type WarningMode,
  type WarningPreferences
} from '../game/warning-preferences';

interface Props {
  settings: GlobalSettings;
  onChange: (settings: GlobalSettings) => void;
  onClose: () => void;
  onPreviewVictory?: () => void;
  onPreviewDefeat?: () => void;
  onReturnToTitle?: () => void;
}

const percentage = (value: number) => `${Math.round(value * 100)}%`;

export function GlobalSettingsPanel({ settings, onChange, onClose, onPreviewVictory, onPreviewDefeat, onReturnToTitle }: Props) {
  const [warningPreferences, setWarningPreferences] = useState<WarningPreferences>(() => loadWarningPreferences());

  useEffect(() => {
    const refresh = () => setWarningPreferences(loadWarningPreferences());
    window.addEventListener('future-conquest:warning-preferences-changed', refresh);
    return () => window.removeEventListener('future-conquest:warning-preferences-changed', refresh);
  }, []);

  const updateVolume = (key: 'masterVolume' | 'musicVolume' | 'sfxVolume', value: string) => {
    onChange({ ...settings, [key]: Number(value) });
  };

  const updateWarningPreferences = (next: WarningPreferences) => {
    const saved = saveWarningPreferences(next);
    setWarningPreferences(saved);
    window.dispatchEvent(new CustomEvent('future-conquest:warning-preferences-changed'));
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
        <label className="settings-track-picker"><span><b>Music behaviour</b><small>Adaptive follows campaign intensity; Manual preserves the existing selectable playlist</small></span><select value={settings.musicMode} onChange={event => onChange({ ...settings, musicMode: event.target.value as MusicMode })}><option value="adaptive">Adaptive soundtrack</option><option value="manual">Manual playlist</option></select></label>
        <label className="settings-track-picker"><span><b>Music track</b><small>{MUSIC_TRACK_OPTIONS.length} available{settings.musicMode === 'adaptive' ? ' · used as the Manual starting track' : ''}</small></span><select value={selectedTrackId} onChange={event => onChange({ ...settings, musicTrackId: event.target.value })}>{MUSIC_TRACK_OPTIONS.map(track => <option key={track.id} value={track.id}>{track.label}</option>)}</select></label>
        <label className="settings-slider"><span><b>Master volume</b><output>{percentage(settings.masterVolume)}</output></span><input type="range" min="0" max="1" step="0.01" value={settings.masterVolume} onChange={event => updateVolume('masterVolume', event.target.value)} /></label>
        <label className="settings-slider"><span><b>Music volume</b><output>{percentage(settings.musicVolume)}</output></span><input type="range" min="0" max="1" step="0.01" value={settings.musicVolume} onChange={event => updateVolume('musicVolume', event.target.value)} /></label>
        <label className="settings-slider"><span><b>Sound effects</b><output>{percentage(settings.sfxVolume)}</output></span><input type="range" min="0" max="1" step="0.01" value={settings.sfxVolume} onChange={event => updateVolume('sfxVolume', event.target.value)} /></label>
        <p className="settings-future-copy">The low-level campaign atmosphere follows Master volume and Sound effects. Audio remains optional and never carries gameplay information by itself.</p>
      </div>

      <div className="settings-section">
        <div className="settings-section-heading"><div><p className="launcher-kicker">PLAYER PREFERENCES</p><h3>Saves &amp; assistance</h3></div></div>
        <p className="settings-future-copy">These preferences persist on this device and are not stored in campaign save files.</p>
        <label className="settings-mute"><input type="checkbox" checked={settings.autosaveEnabled} onChange={event => onChange({ ...settings, autosaveEnabled: event.target.checked })} />Autosave after each resolved day</label>
        <label className="settings-track-picker"><span><b>Assistance</b><small>Player preference</small></span><select value={settings.assistanceLevel} onChange={event => onChange({ ...settings, assistanceLevel: event.target.value as AssistanceLevel })}>{ASSISTANCE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}</select></label>
      </div>

      <div className="settings-section warning-preferences-settings" id="warning-preferences-settings">
        <div className="settings-section-heading"><div><p className="launcher-kicker">WARNING PREFERENCES</p><h3>Warnings &amp; advisories</h3></div></div>
        <p className="settings-future-copy">Repeat advisory warnings can be reduced or suppressed. Critical and operationally mandatory warnings always remain enabled.</p>
        <label className="settings-track-picker"><span><b>Warning mode</b><small>Global player preference</small></span><select value={warningPreferences.warningMode} onChange={event => updateWarningPreferences({ ...warningPreferences, warningMode: event.target.value as WarningMode })}>{WARNING_MODE_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        <div className="warning-suppression-review">
          <div><b>Suppressed warnings</b><small>{warningPreferences.suppressedWarningIds.length ? `${warningPreferences.suppressedWarningIds.length} suppressed` : 'None suppressed'}</small></div>
          {warningPreferences.suppressedWarningIds.map(id => <button type="button" key={id} className="settings-secondary" onClick={() => updateWarningPreferences({ ...warningPreferences, suppressedWarningIds: warningPreferences.suppressedWarningIds.filter(item => item !== id) })}>Restore · {WARNING_DEFINITIONS[id].label}</button>)}
          <button type="button" className="settings-secondary" disabled={warningPreferences.warningMode === DEFAULT_WARNING_PREFERENCES.warningMode && warningPreferences.suppressedWarningIds.length === 0} onClick={() => updateWarningPreferences({ ...DEFAULT_WARNING_PREFERENCES, suppressedWarningIds: [] })}>Reset warning preferences</button>
        </div>
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

      <footer>{onReturnToTitle && <button type="button" className="settings-secondary" onClick={onReturnToTitle}>Return to Title</button>}<button type="button" className="launcher-primary" onClick={onClose}>Done</button></footer>
    </section>
  </div>;
}
