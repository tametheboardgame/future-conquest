export type IntroPanelMood =
  | 'ruin'
  | 'human-cost'
  | 'command'
  | 'discovery'
  | 'mobilisation'
  | 'portal'
  | 'crossing'
  | 'arrival'
  | 'contact'
  | 'response'
  | 'burden';

export type IntroMotion = 'push-in' | 'pan-left' | 'pan-right' | 'rise' | 'drift' | 'hold';
export type IntroBeatKind = 'caption' | 'dialogue' | 'radio';
export type IntroPageNumber = 1 | 2;

export interface IntroBeat {
  id: string;
  kind: IntroBeatKind;
  text: string;
  speaker?: string;
  delayMs: number;
  x: number;
  y: number;
  maxWidth: number;
}

export interface IntroLayer {
  assetFile: string;
  kind: 'image' | 'video';
  className: string;
  parallax?: number;
}

export interface IntroPanel {
  id: string;
  sequence: number;
  page: IntroPageNumber;
  durationMs: number;
  mood: IntroPanelMood;
  motion: IntroMotion;
  assetFile: string;
  variantPrefix?: string;
  alt: string;
  transcript: string;
  x: number;
  y: number;
  width: number;
  height: number;
  beats: IntroBeat[];
  layers?: IntroLayer[];
}

export interface IntroTitleCard {
  durationMs: number;
  assetFile: string;
  alt: string;
  transcript: string;
  beats: IntroBeat[];
}

export const INTRO_STORAGE_KEY = 'future-conquest:intro-seen:v3';
export const INTRO_PAGE_OVERVIEW_MS = 1400;

export const INTRO_PAGE_ASSETS: Readonly<Record<IntroPageNumber, string>> = {
  1: 'page-01-motion-comic.webp',
  2: 'page-02-motion-comic.webp'
};

export const INTRO_PANELS: IntroPanel[] = [
  {
    id: 'world-that-remains', sequence: 1, page: 1, durationMs: 7200, mood: 'ruin', motion: 'push-in',
    assetFile: 'panel-01-world-that-remains.webp',
    alt: 'A powered infantry soldier crosses the flooded ruins of a future European city.',
    transcript: 'The future did not end in a single day.',
    x: 3, y: 4, width: 57, height: 34,
    beats: [{ id: 'p1-caption', kind: 'caption', text: 'The future did not end in a single day.', delayMs: 700, x: 5, y: 7, maxWidth: 42 }]
  },
  {
    id: 'human-cost', sequence: 2, page: 1, durationMs: 9000, mood: 'human-cost', motion: 'pan-right',
    assetFile: 'panel-02-human-cost.webp',
    alt: 'Medics and technicians treat casualties and salvage damaged powered armour in a field repair shelter.',
    transcript: 'It was lost piece by piece. City by city. Decision by decision.',
    x: 61.2, y: 4, width: 35.8, height: 34,
    beats: [
      { id: 'p2-caption-1', kind: 'caption', text: 'It was lost piece by piece.', delayMs: 500, x: 5, y: 6, maxWidth: 48 },
      { id: 'p2-caption-2', kind: 'caption', text: 'City by city.', delayMs: 2100, x: 5, y: 24, maxWidth: 32 },
      { id: 'p2-caption-3', kind: 'caption', text: 'Decision by decision.', delayMs: 3400, x: 5, y: 39, maxWidth: 46 },
      { id: 'p2-medic', kind: 'dialogue', speaker: 'Medic', text: 'Another suit is down.', delayMs: 5000, x: 52, y: 8, maxWidth: 40 },
      { id: 'p2-tech', kind: 'dialogue', speaker: 'Technician', text: 'Strip what still works.', delayMs: 6500, x: 50, y: 67, maxWidth: 43 }
    ]
  },
  {
    id: 'final-command', sequence: 3, page: 1, durationMs: 8500, mood: 'command', motion: 'rise',
    assetFile: 'panel-03-final-command-female.webp',
    alt: 'The armoured General stands over a tactical table in the damaged final command centre.',
    transcript: 'What remained searched for an answer. The General says: We have found the break.',
    x: 3, y: 39.2, width: 29, height: 27,
    beats: [
      { id: 'p3-caption', kind: 'caption', text: 'What remained searched for an answer.', delayMs: 500, x: 5, y: 6, maxWidth: 54 },
      { id: 'p3-general-1', kind: 'dialogue', speaker: 'General', text: 'We have found the break.', delayMs: 2500, x: 48, y: 10, maxWidth: 45 },
      { id: 'p3-scientist', kind: 'dialogue', speaker: 'Scientist', text: 'A divergence, perhaps. Not proof.', delayMs: 4400, x: 5, y: 66, maxWidth: 53 },
      { id: 'p3-general-2', kind: 'dialogue', speaker: 'General', text: 'Proof will arrive too late.', delayMs: 6100, x: 51, y: 67, maxWidth: 43 }
    ]
  },
  {
    id: 'anomaly', sequence: 4, page: 1, durationMs: 9000, mood: 'discovery', motion: 'push-in',
    assetFile: 'panel-04-anomaly.webp',
    alt: 'Analysts reconstruct a branching historical timeline and isolate a divergence over Europe.',
    transcript: 'Buried beneath corrupted records and broken timelines, a single historical divergence appeared.',
    x: 33.2, y: 39.2, width: 35, height: 27,
    beats: [
      { id: 'p4-caption-1', kind: 'caption', text: 'Buried beneath corrupted records and broken timelines—', delayMs: 500, x: 4, y: 5, maxWidth: 56 },
      { id: 'p4-caption-2', kind: 'caption', text: '—a single historical divergence appeared.', delayMs: 2800, x: 4, y: 27, maxWidth: 52 },
      { id: 'p4-scientist', kind: 'dialogue', speaker: 'Scientist', text: 'We cannot identify the event.', delayMs: 5000, x: 53, y: 8, maxWidth: 42 },
      { id: 'p4-general', kind: 'dialogue', speaker: 'General', text: 'Then we identify the place.', delayMs: 6700, x: 54, y: 68, maxWidth: 40 }
    ]
  },
  {
    id: 'hypothesis', sequence: 5, page: 1, durationMs: 9800, mood: 'discovery', motion: 'pan-left',
    assetFile: 'panel-05-hypothesis.webp',
    alt: 'A divided view contrasts devastated future Europe with ordinary present-day Europe.',
    transcript: 'Somewhere in the past, a catalyst turned crisis into extinction. The intervention may itself become the cause.',
    x: 69.4, y: 39.2, width: 27.6, height: 27,
    beats: [
      { id: 'p5-caption', kind: 'caption', text: 'Somewhere in the past, a catalyst turned crisis into extinction.', delayMs: 500, x: 4, y: 5, maxWidth: 60 },
      { id: 'p5-general-1', kind: 'dialogue', speaker: 'General', text: 'If it can be stopped there, this future may never happen.', delayMs: 3200, x: 44, y: 12, maxWidth: 52 },
      { id: 'p5-scientist', kind: 'dialogue', speaker: 'Scientist', text: 'Or the intervention becomes the cause.', delayMs: 5700, x: 4, y: 67, maxWidth: 52 },
      { id: 'p5-general-2', kind: 'dialogue', speaker: 'General', text: 'Then we will carry that risk.', delayMs: 7600, x: 53, y: 69, maxWidth: 42 }
    ]
  },
  {
    id: 'order', sequence: 6, page: 1, durationMs: 11000, mood: 'mobilisation', motion: 'drift',
    assetFile: 'panel-06-order.webp',
    alt: 'The General addresses the assembled expeditionary army of powered infantry.',
    transcript: 'One hundred thousand soldiers. No reinforcements. No return. Secure the continent. Find the catalyst.',
    x: 3, y: 67.4, width: 94, height: 28.6,
    beats: [
      { id: 'p6-caption-1', kind: 'caption', text: 'One hundred thousand soldiers.', delayMs: 400, x: 3, y: 5, maxWidth: 27 },
      { id: 'p6-caption-2', kind: 'caption', text: 'No reinforcements.', delayMs: 1900, x: 3, y: 31, maxWidth: 22 },
      { id: 'p6-caption-3', kind: 'caption', text: 'No return.', delayMs: 3100, x: 3, y: 55, maxWidth: 16 },
      { id: 'p6-general-1', kind: 'dialogue', speaker: 'General', text: 'Secure the continent.', delayMs: 4700, x: 70, y: 8, maxWidth: 25 },
      { id: 'p6-general-2', kind: 'dialogue', speaker: 'General', text: 'Find the catalyst.', delayMs: 6100, x: 73, y: 35, maxWidth: 21 },
      { id: 'p6-general-3', kind: 'dialogue', speaker: 'General', text: 'Change what follows.', delayMs: 7500, x: 70, y: 62, maxWidth: 24 },
      { id: 'p6-soldier', kind: 'dialogue', speaker: 'Soldier', text: 'And if they resist?', delayMs: 8800, x: 45, y: 70, maxWidth: 20 },
      { id: 'p6-general-4', kind: 'dialogue', speaker: 'General', text: 'They will.', delayMs: 9800, x: 58, y: 70, maxWidth: 14 }
    ]
  },
  {
    id: 'portal', sequence: 7, page: 2, durationMs: 8500, mood: 'portal', motion: 'push-in',
    assetFile: 'panel-07-portal.webp',
    alt: 'A violent temporal rupture tears open inside a ruined future industrial complex.',
    transcript: 'The expedition began. The General orders the breach opened despite collapsing spatial stability.',
    x: 3, y: 4, width: 36, height: 31,
    beats: [
      { id: 'p7-caption', kind: 'caption', text: 'The expedition began.', delayMs: 500, x: 4, y: 5, maxWidth: 42 },
      { id: 'p7-general-1', kind: 'dialogue', speaker: 'General', text: 'Open the breach.', delayMs: 2300, x: 5, y: 62, maxWidth: 35 },
      { id: 'p7-tech', kind: 'dialogue', speaker: 'Technician', text: 'Spatial stability is collapsing.', delayMs: 4200, x: 55, y: 8, maxWidth: 40 },
      { id: 'p7-general-2', kind: 'dialogue', speaker: 'General', text: 'Proceed.', delayMs: 6200, x: 67, y: 70, maxWidth: 25 }
    ]
  },
  {
    id: 'crossing', sequence: 8, page: 2, durationMs: 8200, mood: 'crossing', motion: 'pan-right',
    assetFile: 'panel-08-crossing.webp',
    alt: 'Disciplined ranks of powered infantry enter the temporal rupture, distorting at the threshold.',
    transcript: 'There would be no second attempt. The vanguard crosses and its signal disappears.',
    x: 40.2, y: 4, width: 56.8, height: 31,
    beats: [
      { id: 'p8-caption', kind: 'caption', text: 'There would be no second attempt.', delayMs: 500, x: 4, y: 5, maxWidth: 36 },
      { id: 'p8-general', kind: 'dialogue', speaker: 'General', text: 'Advance.', delayMs: 2600, x: 7, y: 68, maxWidth: 20 },
      { id: 'p8-soldier', kind: 'radio', speaker: 'Vanguard', text: 'Vanguard crossing.', delayMs: 4200, x: 29, y: 70, maxWidth: 28 },
      { id: 'p8-radio', kind: 'radio', speaker: 'Radio', text: 'Signal loss in three—', delayMs: 6100, x: 70, y: 68, maxWidth: 27 }
    ]
  },
  {
    id: 'arrival', sequence: 9, page: 2, durationMs: 9200, mood: 'arrival', motion: 'push-in',
    assetFile: 'panel-09-arrival-default.webp', variantPrefix: 'panel-09-arrival-',
    alt: 'The temporal rupture erupts into an ordinary present-day European street as civilians flee and future troops emerge.',
    transcript: 'The past was not waiting to be saved. Emergency services report armed personnel emerging from the disturbance.',
    x: 3, y: 36.2, width: 62, height: 30,
    beats: [
      { id: 'p9-caption', kind: 'caption', text: 'The past was not waiting to be saved.', delayMs: 500, x: 3, y: 5, maxWidth: 36 },
      { id: 'p9-civilian', kind: 'dialogue', speaker: 'Civilian', text: 'What is that?', delayMs: 2800, x: 35, y: 18, maxWidth: 18 },
      { id: 'p9-radio', kind: 'radio', speaker: 'Emergency radio', text: 'Multiple armed personnel emerging from the disturbance.', delayMs: 4700, x: 56, y: 7, maxWidth: 38 },
      { id: 'p9-soldier', kind: 'radio', speaker: 'Future soldier', text: 'Perimeter. Two hundred metres.', delayMs: 6800, x: 65, y: 70, maxWidth: 30 }
    ]
  },
  {
    id: 'first-contact', sequence: 10, page: 2, durationMs: 9200, mood: 'contact', motion: 'hold',
    assetFile: 'panel-10-first-contact.webp',
    alt: 'A vast formation of future soldiers faces a much smaller line of present-day police and emergency responders.',
    transcript: 'They saw no rescuers. They saw an invasion. Both forces hold their positions without firing.',
    x: 66.2, y: 36.2, width: 30.8, height: 30,
    beats: [
      { id: 'p10-caption-1', kind: 'caption', text: 'They saw no rescuers.', delayMs: 400, x: 4, y: 5, maxWidth: 42 },
      { id: 'p10-caption-2', kind: 'caption', text: 'They saw an invasion.', delayMs: 1900, x: 4, y: 25, maxWidth: 42 },
      { id: 'p10-responder', kind: 'dialogue', speaker: 'Responder', text: 'Drop your weapons!', delayMs: 3900, x: 56, y: 8, maxWidth: 38 },
      { id: 'p10-soldier', kind: 'dialogue', speaker: 'Future officer', text: 'Hold fire. Secure the perimeter.', delayMs: 5900, x: 7, y: 68, maxWidth: 46 },
      { id: 'p10-radio', kind: 'radio', speaker: 'Responder', text: 'They are establishing positions.', delayMs: 7400, x: 56, y: 68, maxWidth: 38 }
    ]
  },
  {
    id: 'world-responds', sequence: 11, page: 2, durationMs: 11000, mood: 'response', motion: 'pan-right',
    assetFile: 'panel-11-world-responds.webp',
    alt: 'A four-part montage shows aircraft launching, a government crisis room, emergency news coverage and satellite tracking.',
    transcript: 'Every border closed. Every military prepared to respond. To them, you were the catastrophe.',
    x: 3, y: 67.4, width: 53, height: 28.6,
    beats: [
      { id: 'p11-caption-1', kind: 'caption', text: 'Every border closed.', delayMs: 400, x: 3, y: 4, maxWidth: 28 },
      { id: 'p11-caption-2', kind: 'caption', text: 'Every military prepared to respond.', delayMs: 2200, x: 34, y: 4, maxWidth: 36 },
      { id: 'p11-caption-3', kind: 'caption', text: 'To them, you were the catastrophe.', delayMs: 4300, x: 71, y: 4, maxWidth: 27 },
      { id: 'p11-news', kind: 'radio', speaker: 'News presenter', text: 'Governments across Europe have declared emergency measures—', delayMs: 6100, x: 3, y: 69, maxWidth: 34 },
      { id: 'p11-military', kind: 'radio', speaker: 'Military radio', text: 'Unknown force strength remains unconfirmed.', delayMs: 7600, x: 36, y: 69, maxWidth: 31 },
      { id: 'p11-government', kind: 'radio', speaker: 'Government official', text: 'This is a coordinated armed incursion.', delayMs: 9000, x: 69, y: 69, maxWidth: 29 }
    ]
  },
  {
    id: 'burden-of-command', sequence: 12, page: 2, durationMs: 10500, mood: 'burden', motion: 'push-in',
    assetFile: 'panel-12-burden-of-command.webp',
    alt: 'The armoured General faces a strategic map of Europe resolving into the game command interface.',
    transcript: 'Conquest is the method. Survival is the claim. Win quickly enough to alter history and restrain the war already begun.',
    x: 57.2, y: 67.4, width: 39.8, height: 28.6,
    beats: [
      { id: 'p12-caption-1', kind: 'caption', text: 'Conquest is the method.', delayMs: 400, x: 4, y: 5, maxWidth: 35 },
      { id: 'p12-caption-2', kind: 'caption', text: 'Survival is the claim.', delayMs: 1900, x: 4, y: 27, maxWidth: 35 },
      { id: 'p12-general-1', kind: 'dialogue', speaker: 'General', text: 'Win quickly enough to alter history.', delayMs: 3900, x: 58, y: 9, maxWidth: 37 },
      { id: 'p12-general-2', kind: 'dialogue', speaker: 'General', text: 'Restrain the war we have begun.', delayMs: 6100, x: 56, y: 67, maxWidth: 39 },
      { id: 'p12-officer', kind: 'radio', speaker: 'Command officer', text: 'Europe is mobilising.', delayMs: 7900, x: 4, y: 70, maxWidth: 31 },
      { id: 'p12-general-3', kind: 'dialogue', speaker: 'General', text: 'Then we have already spent too long.', delayMs: 9000, x: 56, y: 42, maxWidth: 40 }
    ]
  }
];

export const INTRO_TITLE_CARD: IntroTitleCard = {
  durationMs: 9000,
  assetFile: 'title-card-future-conquest.webp',
  alt: 'Future Conquest title over a dark map of Europe with the tagline Invade the past. Save the future.',
  transcript: 'If we fail, our world dies. If we succeed, it may never have existed.',
  beats: [
    { id: 'title-line-1', kind: 'caption', text: 'If we fail, our world dies.', delayMs: 1800, x: 7, y: 73, maxWidth: 34 },
    { id: 'title-line-2', kind: 'caption', text: 'If we succeed…', delayMs: 4000, x: 7, y: 82, maxWidth: 25 },
    { id: 'title-line-3', kind: 'caption', text: 'It may never have existed.', delayMs: 5700, x: 62, y: 78, maxWidth: 32 }
  ]
};

export const INTRO_TOTAL_STEPS = INTRO_PANELS.length + 1;
