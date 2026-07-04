// ---------------------------------------------------------------------------
// act2-narration — the plain-language copy for the SIX-beat walkthrough
// (ADR-0134 §3, extended to the upstream reveal by ADR-0150, re-directed by
// ADR-0153). Site-side, keyed by beat id against the synced director's exported
// zod contract; validated at build time by act2-validate.ts (a missing or
// orphaned key FAILS `astro build`).
//
// Pure data, no engine imports — importable from anywhere (the validation wall in
// astro.config.mjs, the walkthrough overlay, a future test).
//
// The voice is the tonal inverse of Act 1's storm jargon: short, warm, zero
// insider vocabulary without showing it first (say "a promise of what this piece
// will do" while the label appears, THEN name it a story).
//
// ── ADR-0153 re-direction ────────────────────────────────────────────────────
//  • Step 1 is an OUTCOME BRIEF with an example, carried by the orchestrator CHAT
//    at the bottom (the real app's chat dock). The earlier "young tree / lives on
//    the map / not buried in a chat log" framing is DROPPED (§4). The map still
//    shows the promise take root, but the FRAMING is the brief in the chat below.
//  • The dependency LAYERS render as the FOUNDATION BELOW the website (frontend
//    HIGH; §5 spatial preference). The copy says the layers sit BENEATH the
//    website (the ground it rests on), never "above" it — matching the render.
//  • The dependency DIRECTION is corrected (the website depends on the backend
//    depends on the database — §1); the copy names the right-way stack.
//  • The drive-machinery OVERLAY copy lives in act2-overlays.ts (keyed by beat id
//    too) — the narration here is the map's teach; the overlay is the background
//    machinery floating above it (§5/§6).
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
    title: 'Your brief becomes a story',
    body:
      'You told the orchestrator what you want — “shoppers can check out” — and it read the ' +
      'brief back with an example. That promise now takes root here, as a tree carrying the ' +
      'outcome. This is a story: what done looks like, standing in the open, not lost in a thread.',
  },
  'beat-2-attach-wisp': {
    title: 'See it working — without watching it',
    body:
      'That soft light drifting over the tree means an agent is working on this story right now. ' +
      'You don’t have to supervise. Glance over any time, or don’t — the work carries on either ' +
      'way. (Curious what runs in the background? The loop is sketched top-left.)',
  },
  'beat-3-branch-caps': {
    title: 'Green means proven',
    body:
      'Checkout branches into the smaller pieces it needs — a cart, payments, receipts. The cart ' +
      'just turned green: not because an agent said “done”, but because a signed, passing test run ' +
      'proves it. The pale plants are still in progress. Here, green is earned. It can’t be claimed.',
  },
  // ── Upstream reveal — the dependency layers ARE the advantage (ADR-0150 §4),
  //    rendered as the FOUNDATION BELOW the website (ADR-0153 §5) ──
  'beat-4-add-upstream-backend': {
    title: 'What it rests on, shown up front',
    body:
      'A mock has no backend — so the cart, payments and receipts can’t truly work yet. So a new ' +
      'tree grows just BENEATH the website: a backend the website depends on. Nothing is hidden — ' +
      'the thing you build next appears in plain sight, holding the shop up. (Tap it to see what ' +
      'it is and why.)',
  },
  'beat-5-add-upstream-database': {
    title: 'The layers stack in the right order',
    body:
      'And beneath the backend, one more: a database, to keep every order and cart. Now you can ' +
      'read the whole stack at a glance — the website rests on a backend, which rests on a ' +
      'database. That honest foundation, laid out for you, is the whole advantage. The swarm ' +
      'buried it; here you see it.',
  },
  'beat-6-pull-back': {
    title: 'The whole picture, one calm screen',
    body:
      'Step back and the forest reads at a glance: your website turned green — proven, on top — ' +
      'and the two layers beneath it are saplings, proposed, waiting for you to grow them next, ' +
      'one at a time. Green means proven, a sapling means in progress, a withered tree would mean ' +
      'something broke. One quiet view of everything that matters.',
  },
  [DONE_KEY]: {
    title: 'This is how the real thing grows',
    body:
      'That was a diorama — staged, on made-up data, to show the idea. You planted a website, ' +
      'watched it prove itself green, and saw the backend and database it rests on rise into view ' +
      '— the honest foundation, in the right order, nothing hidden. The real storytree grows ' +
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
