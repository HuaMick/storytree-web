// ---------------------------------------------------------------------------
// act2-narration — the plain-language copy for the SIX-beat walkthrough
// (ADR-0134 §3, extended to the upstream reveal by ADR-0150). Site-side, keyed
// by beat id against the synced director's exported zod contract; validated at
// build time by act2-validate.ts (a missing or orphaned key FAILS `astro build`).
//
// Pure data, no engine imports — importable from anywhere (the validation wall
// in astro.config.mjs, the walkthrough overlay, a future test).
//
// The voice is the tonal inverse of Act 1's storm jargon: short, warm, zero
// insider vocabulary without showing it first (say "a promise of what this
// piece will do" while the label appears, THEN name it a story).
//
// ADR-0150 re-shape: beats 4-5 are the ONE continuous walk growing UPSTREAM —
// the dependency LAYERS (backend, database) shown on the real map ARE the
// advantage, not a flagged mistake. G's beat-4 wrong-way-road copy is RETIRED.
// The `done` CTA is the true END of the whole walk (the walk already grew
// upstream — there is no "grow the backend next" destination to hand off to).
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
 * The narration copy, keyed by beat id (`beat-1-plant-story` … `beat-6-pull-back`)
 * plus the `done` CTA entry. EXACT coverage against the site walk script is
 * enforced at build time — edit freely, but every beat keeps a voice and no key
 * may outlive its beat.
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
  // ── Upstream reveal — the dependency layers ARE the advantage (ADR-0150 §4) ──
  'beat-4-add-upstream-backend': {
    title: 'What it really needs, shown up front',
    body:
      'A mock has no backend — so the cart, payments and receipts can’t truly work yet. So a ' +
      'new tree grows just ABOVE the website: a backend it depends on. Nothing is hidden — the ' +
      'thing you build next appears in plain sight, in the right order. (Tap it to see what it ' +
      'is and why.)',
  },
  'beat-5-add-upstream-database': {
    title: 'The layers stack in the right order',
    body:
      'And above the backend, one more: a database, to keep every order and cart. Now you can ' +
      'read the whole stack at a glance — website needs a backend needs a database. That honest ' +
      'structure, laid out for you, is the whole advantage. The swarm buried it; here you see it.',
  },
  'beat-6-pull-back': {
    title: 'The whole picture, one calm screen',
    body:
      'Step back and the forest reads at a glance: your website turned green — proven — and the ' +
      'two layers above it are saplings, proposed, waiting for you to grow them next, one at a ' +
      'time. Green means proven, a sapling means in progress, a withered tree would mean ' +
      'something broke. One quiet view of everything that matters.',
  },
  [DONE_KEY]: {
    title: 'This is how the real thing grows',
    body:
      'That was a diorama — staged, on made-up data, to show the idea. You planted a website, ' +
      'watched it prove itself green, and saw the backend and database it depends on rise into ' +
      'view — the honest layers, in the right order, nothing hidden. The real storytree grows ' +
      'exactly this way: watched live, proof by proof, one story at a time.',
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
    'One tap per step, and you can leave any time.',
};
