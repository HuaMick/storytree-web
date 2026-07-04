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
// The voice is the tonal inverse of Act 1's overwhelming swarm: short, warm, zero
// insider vocabulary without showing it first (say "a note of what done means"
// while the label appears, THEN name it a story). Plain, newcomer-legible, no
// "storm" metaphor and no strained analogies (ADR-0157 §2/§4).
//
// ── ADR-0153 re-direction ────────────────────────────────────────────────────
//  • Step 1 is an OUTCOME BRIEF with an example, carried by the orchestrator CHAT
//    at the bottom (the real app's chat dock). The earlier "young tree / lives on
//    the map / not buried in a chat log" framing is DROPPED (§4). The map still
//    shows the promise take root, but the FRAMING is the brief in the chat below.
//  • The dependency LAYERS render as the FOUNDATION BELOW the website (frontend
//    HIGH; §5 spatial preference). The copy says the layers sit BENEATH the
//    website (the ground it rests on), never "above" it — matching the render.
//  • The BaaS DIAMOND (ADR-0157 §1): the website reads its catalog DIRECTLY from
//    the database AND needs the backend for checkout; the backend needs the
//    database. So beat 4 names the backend (privileged writes — checkout/payments)
//    and beat 5 names the database as the SHARED foundation both lean on.
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
      'You told the orchestrator what you want — “shoppers can check out” — and it read that ' +
      'back as a clear outcome. It takes root here as a tree. Right now it’s a proposal, not a ' +
      'finished thing: a note of what “done” means, out in the open. It turns green only once a ' +
      'test proves it.',
  },
  'beat-2-attach-wisp': {
    title: 'See it working — without watching it',
    body:
      'That soft light drifting over the tree means an agent is working on this story right now. ' +
      'You don’t have to watch it. Look over any time, or don’t — the work carries on either ' +
      'way. (Want to see how the agents actually prove it? The loop is sketched top-left.)',
  },
  'beat-3-branch-caps': {
    title: 'Green means proven',
    body:
      'Checkout splits into the smaller pieces it needs — a cart, payments, receipts. The cart ' +
      'just turned green: not because an agent said “done”, but because a test ran and passed. ' +
      'The pale plants aren’t proven yet. Here, green is earned — it can’t just be claimed.',
  },
  // ── Upstream reveal — the dependency layers ARE the advantage (ADR-0150 §4),
  //    the BaaS diamond (ADR-0157 §1), rendered as the FOUNDATION BELOW (ADR-0153 §5) ──
  'beat-4-add-upstream-backend': {
    title: 'What it needs to really work',
    body:
      'A mock can’t actually take money or save an order — that needs code you run on a server. ' +
      'So a new tree grows just beneath the website: a backend it depends on for checkout. ' +
      'Nothing is hidden — the next thing to build is right there, in plain sight. (Tap it to ' +
      'see what it is and why.)',
  },
  'beat-5-add-upstream-database': {
    title: 'Both of them lean on one thing',
    body:
      'One more tree grows at the base: a database, where the products and orders live. Your ' +
      'website reads the catalog straight from it — that’s how a real shop loads fast — and the ' +
      'backend saves each order into it. So both point down to the same foundation. That honest, ' +
      'shared shape is the whole advantage: the swarm buried it; here you see it.',
  },
  'beat-6-pull-back': {
    title: 'The whole picture, one calm screen',
    body:
      'Step back and it reads at a glance: your website turned green — proven, on top — resting ' +
      'on a backend and a database that are still proposals, waiting for you to grow them next, ' +
      'one at a time. Green means proven, a sapling means in progress, a withered tree would mean ' +
      'something broke. One quiet view of everything that matters.',
  },
  [DONE_KEY]: {
    title: 'This is how the real thing grows',
    body:
      'That was a staged demo, on made-up data, to show the idea. You proposed a website, watched ' +
      'a test turn it green, and saw the backend and database it leans on come into view — the ' +
      'honest shape, in the right order, nothing hidden. The real storytree grows exactly this ' +
      'way: watched live, proof by proof, one story at a time.',
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
    'The noise settles into quiet ground. This is a guided walk — nothing moves until you do. ' +
    'One tap per step, and you can leave any time.',
};
