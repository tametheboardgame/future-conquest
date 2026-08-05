export type IntroPanelMood = 'ruin' | 'command' | 'discovery' | 'mobilisation' | 'portal' | 'arrival' | 'response';
export type IntroMotion = 'push-in' | 'pan-left' | 'pan-right' | 'rise' | 'hold';

export interface IntroPanel {
  id: string;
  sequence: number;
  durationMs: number;
  mood: IntroPanelMood;
  motion: IntroMotion;
  assetFile: string;
  alt: string;
  transcript: string;
}

export const INTRO_STORAGE_KEY = 'future-conquest:intro-seen:v2';

export const INTRO_PANELS: IntroPanel[] = [
  {
    id: 'world-that-remains', sequence: 1, durationMs: 8000, mood: 'ruin', motion: 'push-in',
    assetFile: 'panel-01-world-that-remains.webp',
    alt: 'A powered infantry soldier crosses the flooded ruins of a future European city.',
    transcript: 'The future did not end in a single day. Civilisation still survives, but it is broken and running out of time.'
  },
  {
    id: 'final-command', sequence: 2, durationMs: 8000, mood: 'command', motion: 'pan-right',
    assetFile: 'panel-02-final-command.webp',
    alt: 'The General studies a failing holographic map of Europe in the final command centre.',
    transcript: 'The General announces that the final command has identified a point of divergence in history.'
  },
  {
    id: 'anomaly', sequence: 3, durationMs: 8000, mood: 'discovery', motion: 'push-in',
    assetFile: 'panel-03-anomaly.webp',
    alt: 'Temporal analysts reconstruct corrupted records and isolate an unknown divergence point in present-day Europe.',
    transcript: 'The cause remains hidden, but the point where history diverged appears real.'
  },
  {
    id: 'hypothesis', sequence: 4, durationMs: 8000, mood: 'discovery', motion: 'pan-left',
    assetFile: 'panel-04-hypothesis.webp',
    alt: 'A split timeline contrasts ruined future Europe with ordinary present-day Europe.',
    transcript: 'The General believes removing the catalyst could prevent the collapse, although the alternative future is unknown.'
  },
  {
    id: 'order', sequence: 5, durationMs: 9000, mood: 'mobilisation', motion: 'rise',
    assetFile: 'panel-05-order.webp',
    alt: 'The General addresses a vast but finite expeditionary force of powered infantry.',
    transcript: 'One hundred thousand soldiers are committed. There will be no second wave, no reinforcements and no extraction.'
  },
  {
    id: 'portal', sequence: 6, durationMs: 9000, mood: 'portal', motion: 'push-in',
    assetFile: 'panel-06-portal.webp',
    alt: 'Powered infantry advance into a violent temporal rupture as the General gives the final order.',
    transcript: 'Secure the continent. Find the catalyst. Change what follows.'
  },
  {
    id: 'arrival', sequence: 7, durationMs: 9000, mood: 'arrival', motion: 'pan-right',
    assetFile: 'panel-07-arrival-default.webp',
    alt: 'The expedition emerges into present-day Europe as civilians and emergency services react.',
    transcript: 'The past was not waiting to be saved. The expedition establishes a perimeter while present-day authorities assess the threat.'
  },
  {
    id: 'response', sequence: 8, durationMs: 9000, mood: 'response', motion: 'hold',
    assetFile: 'panel-08-first-response.webp',
    alt: 'European governments, armed forces and emergency services mobilise against the unknown incursion.',
    transcript: 'Every nation reacts. Borders close, armed forces mobilise and the expedition is classified as hostile. To them, you are the catastrophe.'
  }
];

export const INTRO_TOTAL_DURATION_MS = INTRO_PANELS.reduce((total, panel) => total + panel.durationMs, 0);
