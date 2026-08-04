export type IntroPanelMood = 'ruin' | 'command' | 'discovery' | 'mobilisation' | 'portal' | 'arrival' | 'response' | 'decision';

export interface IntroPanel {
  id: string;
  sequence: number;
  durationMs: number;
  mood: IntroPanelMood;
  eyebrow?: string;
  caption: string;
  narration?: string;
  visualDescription: string;
}

export const INTRO_STORAGE_KEY = 'future-conquest:intro-seen:v1';

export const INTRO_PANELS: IntroPanel[] = [
  {
    id: 'world-that-remains',
    sequence: 1,
    durationMs: 7000,
    mood: 'ruin',
    eyebrow: 'THE LAST WAR',
    caption: 'THE FUTURE DID NOT END IN A SINGLE DAY.',
    visualDescription: 'A shattered future European city at dawn, crossed by one damaged powered infantry soldier.'
  },
  {
    id: 'final-command',
    sequence: 2,
    durationMs: 7000,
    mood: 'command',
    eyebrow: 'FINAL COMMAND AUTHORITY',
    caption: 'IT WAS LOST ONE DECISION AT A TIME.',
    visualDescription: 'The General stands before a fractured holographic map while casualty projections climb around the command table.'
  },
  {
    id: 'anomaly',
    sequence: 3,
    durationMs: 7000,
    mood: 'discovery',
    eyebrow: 'TEMPORAL INTELLIGENCE',
    caption: 'THEN WE FOUND THE BREAK IN HISTORY.',
    visualDescription: 'Scientists isolate a temporal rupture connecting the ruined future to present-day Europe.'
  },
  {
    id: 'hypothesis',
    sequence: 4,
    durationMs: 7000,
    mood: 'discovery',
    eyebrow: 'CAUSALITY UNKNOWN',
    caption: 'A CAUSE. A PLACE. A CHANCE.',
    narration: 'Somewhere in the past, a catalyst turned crisis into extinction.',
    visualDescription: 'A split timeline contrasts future devastation with peaceful present-day European cities and transport corridors.'
  },
  {
    id: 'order',
    sequence: 5,
    durationMs: 8000,
    mood: 'mobilisation',
    eyebrow: 'EXPEDITIONARY ORDER',
    caption: 'ONE HUNDRED THOUSAND SOLDIERS. NO SECOND WAVE.',
    narration: 'We cannot reinforce you. We cannot bring you home.',
    visualDescription: 'The General addresses ranks of scarred, field-repaired powered infantry in a cavernous deployment bay.'
  },
  {
    id: 'portal',
    sequence: 6,
    durationMs: 8000,
    mood: 'portal',
    eyebrow: 'POINT OF NO RETURN',
    caption: 'THE EXPEDITION BEGAN.',
    narration: 'Secure the continent. Find the catalyst. Change what follows.',
    visualDescription: 'A colossal temporal portal opens inside a ruined industrial complex as the first units enter.'
  },
  {
    id: 'arrival',
    sequence: 7,
    durationMs: 8000,
    mood: 'arrival',
    eyebrow: 'PRESENT DAY',
    caption: 'THE PAST WAS NOT WAITING TO BE SAVED.',
    visualDescription: 'The portal erupts near a major European transport corridor as civilians flee and emergency forces converge.'
  },
  {
    id: 'response',
    sequence: 8,
    durationMs: 7000,
    mood: 'response',
    eyebrow: 'GLOBAL RESPONSE',
    caption: 'TO THEM, YOU ARE THE CATASTROPHE.',
    narration: 'Every border will close. Every army will respond.',
    visualDescription: 'Military mobilisation, emergency broadcasts, satellites and government crisis rooms form a rapid montage.'
  },
  {
    id: 'burden-of-command',
    sequence: 9,
    durationMs: 8000,
    mood: 'decision',
    eyebrow: 'OPERATIONAL COMMAND',
    caption: 'CONQUEST IS THE METHOD. SURVIVAL IS THE CLAIM.',
    narration: 'Win quickly enough to alter history. Restrain the war you are starting.',
    visualDescription: 'A field command table overlooks the portal perimeter while Europe resolves into operational territories.'
  },
  {
    id: 'title',
    sequence: 10,
    durationMs: 8000,
    mood: 'decision',
    eyebrow: 'BEGIN CAMPAIGN',
    caption: 'FUTURE CONQUEST',
    narration: 'If we fail, our world dies. If we succeed... it may never have existed.',
    visualDescription: 'The tactical map darkens beneath the title while the portal burns at the first controlled territory.'
  }
];

export const INTRO_TOTAL_DURATION_MS = INTRO_PANELS.reduce((total, panel) => total + panel.durationMs, 0);
