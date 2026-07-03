// ---------------------------------------------------------------------------
// act2-narration — the plain-language copy for the five-beat walkthrough
// (ADR-0134 §3). Site-side, keyed by beat id against the synced director's
// exported zod contract; validated at build time by act2-validate.ts (a missing
// or orphaned key FAILS `astro build`).
//
// Pure data, no engine imports — importable from anywhere (the validation wall
// in astro.config.mjs, the walkthrough overlay, a future test).
//
// The voice is the tonal inverse of Act 1's storm jargon: short, warm, zero
// insider vocabulary without showing it first (say "a promise of what this
// piece will do" while the label appears, THEN name it a story).
// ---------------------------------------------------------------------------

export interface BeatNarration {
  /** The short heading over the narration body. */
  title: string;
  /** 2–3 plain sentences that land the beat's one concept for a non-expert. */
  body: string;
}

/** The key of the final CTA entry — the one narration key that is not a beat id. */
export const DONE_KEY = 'done';

/**
 * The narration copy, keyed by beat id (`beat-1-plant-story` … `beat-5-pull-back`)
 * plus the `done` CTA entry. EXACT coverage against the director's default script
 * is enforced at build time — edit freely, but every beat keeps a voice and no
 * key may outlive its beat.
 */
export const NARRATION: Readonly<Record<string, BeatNarration>> = {
  'beat-1-plant-story': {
    title: 'Plant a story',
    body:
      'Start by writing down what done looks like — a plain promise of what you want, ' +
      'like “shoppers can check out”. It takes root here as a young tree with that promise on ' +
      'its label. That’s called a story: what you want lives on the map, not buried in a chat log.',
  },
  'beat-2-attach-wisp': {
    title: 'See it working — without watching it',
    body:
      'That soft light drifting over the tree means an agent is working on this story right ' +
      'now. You don’t have to supervise. Glance over any time, or don’t — the work carries on ' +
      'either way. Notice you just did nothing. That’s the point.',
  },
  'beat-3-branch-caps': {
    title: 'Green means proven',
    body:
      'Checkout branches into the smaller pieces it needs — a cart, payments, receipts. The ' +
      'cart just turned green: not because an agent said “done”, but because a signed, passing ' +
      'test run proves it. The pale plants are still in progress. Here, green is earned. It ' +
      'can’t be claimed.',
  },
  'beat-4-add-roads': {
    title: 'A wrong turn has nowhere to hide',
    body:
      'Roads show what depends on what. And look — one road cuts straight from the checkout ' +
      'screen to the database, skipping the payment service that should sit in between. It’s ' +
      'flagged the instant it appears, because the map knows the shape of a shortcut.',
  },
  'beat-5-pull-back': {
    title: 'The whole picture, one calm screen',
    body:
      'Step back and the forest reads at a glance: green means proven, a sapling means in ' +
      'progress, a withered tree would mean something broke. No twelve terminals shouting ' +
      'for you — one quiet view of everything that matters.',
  },
  [DONE_KEY]: {
    title: 'That was a diorama',
    body:
      'Everything you just watched was staged, on made-up data, to show the idea. The real ' +
      'storytree grows real software exactly this way — watched live, proof by proof. Here’s ' +
      'where to step out of the diorama.',
  },
};

/**
 * The pre-walk intro shown on the empty land (beat 0). Deliberately NOT in the
 * keyed map above: the map is held to exact beat-id coverage by the build-time
 * wall, and beat 0 is the absence of beats.
 */
export const INTRO: BeatNarration = {
  title: 'Quiet ground',
  body:
    'The storm settles into soil. This is a guided walk — nothing moves until you do. ' +
    'One tap per step, five steps, and you can leave any time.',
};
