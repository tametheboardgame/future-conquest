export type EndingBeatKind = 'caption' | 'dialogue';
export type EndingMotion = 'push-in' | 'pan-left' | 'pan-right' | 'drift-up' | 'hold';

export interface EndingBeat {
  id: string;
  kind: EndingBeatKind;
  text: string;
  speaker?: string;
  delayMs: number;
  x: number;
  y: number;
  maxWidth: number;
  narrowX?: number;
  narrowY?: number;
}

export interface VictoryEndingPanel {
  id: string;
  imageFile: string;
  alt: string;
  durationMs: number;
  motion: EndingMotion;
  beats: EndingBeat[];
}

export const ENDING_SUBTITLE_STORAGE_KEY = 'future-conquest:intro-subtitles:v1';

export const VICTORY_ENDING_PANELS: VictoryEndingPanel[] = [
  {
    id: 'europe-secured',
    imageFile: 'victory-01-europe-secured.webp',
    alt: 'The General studies a holographic map showing Europe under expedition control.',
    durationMs: 7600,
    motion: 'push-in',
    beats: [
      { id: 'v1-caption', kind: 'caption', text: 'The final organised resistance collapsed.', delayMs: 450, x: 5, y: 7, maxWidth: 38 },
      { id: 'v1-officer', kind: 'dialogue', speaker: 'Operations officer', text: 'Continental command is secure.', delayMs: 2800, x: 61, y: 17, maxWidth: 31, narrowX: 52, narrowY: 18 },
      { id: 'v1-general', kind: 'dialogue', speaker: 'General', text: 'Then we did it.', delayMs: 5100, x: 8, y: 69, maxWidth: 27, narrowX: 7, narrowY: 66 }
    ]
  },
  {
    id: 'mission-success',
    imageFile: 'victory-02-occupation.webp',
    alt: 'The General overlooks an occupied European capital filled with checkpoints and future troops.',
    durationMs: 8200,
    motion: 'pan-right',
    beats: [
      { id: 'v2-caption-1', kind: 'caption', text: 'For the first time since the crossing, the map was quiet.', delayMs: 500, x: 51, y: 7, maxWidth: 42, narrowX: 46, narrowY: 7 },
      { id: 'v2-caption-2', kind: 'caption', text: 'The mission had succeeded.', delayMs: 3400, x: 61, y: 25, maxWidth: 30, narrowX: 56, narrowY: 25 },
      { id: 'v2-general', kind: 'dialogue', speaker: 'General', text: 'Begin the handover. No reprisals.', delayMs: 5600, x: 8, y: 68, maxWidth: 32, narrowX: 6, narrowY: 66 }
    ]
  },
  {
    id: 'recovered-archives',
    imageFile: 'victory-03-archives.webp',
    alt: 'Scientists reconstruct corrupted historical archives while the General watches.',
    durationMs: 9000,
    motion: 'pan-left',
    beats: [
      { id: 'v3-caption', kind: 'caption', text: 'With the fighting over, the archives could finally be reconstructed.', delayMs: 500, x: 5, y: 6, maxWidth: 44 },
      { id: 'v3-scientist', kind: 'dialogue', speaker: 'Lead analyst', text: 'General... we found the catalyst.', delayMs: 4000, x: 57, y: 63, maxWidth: 35, narrowX: 49, narrowY: 62 },
      { id: 'v3-general', kind: 'dialogue', speaker: 'General', text: 'Show me.', delayMs: 6500, x: 7, y: 72, maxWidth: 22, narrowX: 6, narrowY: 69 }
    ]
  },
  {
    id: 'the-revelation',
    imageFile: 'victory-04-revelation.webp',
    alt: 'A holographic timeline reveals the future army invasion as the origin point of the apocalypse.',
    durationMs: 10500,
    motion: 'push-in',
    beats: [
      { id: 'v4-caption-1', kind: 'caption', text: 'Not a weapon. Not a government. Not a forgotten war.', delayMs: 500, x: 5, y: 6, maxWidth: 42 },
      { id: 'v4-scientist-1', kind: 'dialogue', speaker: 'Lead analyst', text: 'The divergence begins here.', delayMs: 3500, x: 62, y: 12, maxWidth: 30, narrowX: 54, narrowY: 12 },
      { id: 'v4-scientist-2', kind: 'dialogue', speaker: 'Lead analyst', text: 'At the incursion.', delayMs: 6000, x: 66, y: 31, maxWidth: 25, narrowX: 58, narrowY: 31 },
      { id: 'v4-general', kind: 'dialogue', speaker: 'General', text: '...us.', delayMs: 8200, x: 8, y: 70, maxWidth: 18, narrowX: 7, narrowY: 67 }
    ]
  },
  {
    id: 'consequences',
    imageFile: 'victory-05-consequences.webp',
    alt: 'Europe militarises, reverse-engineers future weapons, protests occupation and prepares for a new arms race.',
    durationMs: 11200,
    motion: 'drift-up',
    beats: [
      { id: 'v5-caption-1', kind: 'caption', text: 'Europe had seen the future arrive armed.', delayMs: 500, x: 5, y: 6, maxWidth: 36 },
      { id: 'v5-caption-2', kind: 'caption', text: 'Every government prepared for its return.', delayMs: 3000, x: 59, y: 8, maxWidth: 35, narrowX: 51, narrowY: 8 },
      { id: 'v5-caption-3', kind: 'caption', text: 'Captured armour became doctrine. Energy weapons became prototypes.', delayMs: 5600, x: 5, y: 68, maxWidth: 42, narrowX: 5, narrowY: 62 },
      { id: 'v5-caption-4', kind: 'caption', text: 'Occupation became grievance. Fear became policy.', delayMs: 8200, x: 55, y: 69, maxWidth: 39, narrowX: 49, narrowY: 66 }
    ]
  },
  {
    id: 'the-loop',
    imageFile: 'victory-06-the-loop.webp',
    alt: 'A lone future soldier walks through the devastated European city the expedition tried to prevent.',
    durationMs: 12500,
    motion: 'push-in',
    beats: [
      { id: 'v6-caption-1', kind: 'caption', text: 'Decades later, the war began exactly as the surviving records remembered it.', delayMs: 600, x: 5, y: 6, maxWidth: 46 },
      { id: 'v6-caption-2', kind: 'caption', text: 'The expedition had not travelled back to prevent the apocalypse.', delayMs: 4300, x: 52, y: 12, maxWidth: 42, narrowX: 46, narrowY: 12 },
      { id: 'v6-caption-3', kind: 'caption', text: 'It had travelled back to begin it.', delayMs: 7600, x: 8, y: 69, maxWidth: 36, narrowX: 6, narrowY: 65 },
      { id: 'v6-final', kind: 'caption', text: 'YOU WON THE WAR. YOU CREATED THE FUTURE.', delayMs: 9800, x: 48, y: 70, maxWidth: 46, narrowX: 42, narrowY: 69 }
    ]
  }
];

export const VICTORY_ENDING_TOTAL_MS = VICTORY_ENDING_PANELS.reduce((sum, panel) => sum + panel.durationMs, 0);
