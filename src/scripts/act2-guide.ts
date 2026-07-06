// ---------------------------------------------------------------------------
// act2-guide — the SITE-SIDE STEP SCRIPT for the redesigned Act-2 opening
// (ADR-0165): ONE growing left-to-right system diagram assembles above the
// orchestrator chat (Phase D, steps D0–D6), each step advanced by ONE bounded
// reply chip IN the chat — voiced as the questions a skeptical developer would
// ask — then the diagram COMPACTS to a persistent docked mini-map and the landed
// island walk runs underneath (the I steps), advanced by the same chips. The
// separate Next button is retired everywhere (ADR-0165 §3); Back stays (pure
// replay, accepted default 9).
//
// THE SINGLE SOURCE: every step carries its chat lines (the owner-approved
// proposal copy, verbatim — the STEPS array the owner walked and approved as
// presented), its one reply chip, an optional quiet "why does that matter?"
// aside (streams ONE extra muted line WITHOUT advancing; accepted default 8 —
// plain words, no industry-term name-drops), and the DECLARATIVE target stage
// state: how many diagram stages are on, which director beat the walk is at,
// whether the mini-map is docked (and which stage it lights), and whether the
// done/CTA state is entered.
//
// REPLAY SEMANTICS (accepted default 9): the target state is declarative, so
// stateAt(n) is a pure lookup — Back re-applies the state for step n−1 from
// scratch and the scene renders byte-identical (the walkthrough's fold is a pure
// function of the director state; the diagram is a pure function of the stage
// count). No Math.random, no wall-clock in any state-determining path — timers
// drive the chat reveal CADENCE only.
//
// I4 is TWO steps here (I4a backend, I4b database) — ADR-0165 accepted default
// 6: the upstream reveal keeps two beats; the proposal mock merged them for
// review speed only. The mock's I4 copy is split accordingly (the backend line
// on I4a, the reads-directly teach verbatim on I4b); the I4a chip is a natural
// skeptic bridge ("and where does the data live?" — owner-tunable at the gate).
//
// COPY HONESTY (ADR-0165 §9, binding): plain newcomer language; industry terms
// EMBODIED never NAMED; "gate" appears exactly once (the D5 second line) and
// "signed" carries the D6/I3 teach (accepted default 5 — the retired CI/CD
// row-list overlays' load-bearing words live HERE now); green = a signed proof
// against declared obligations only; no "storm" word; no stats.
//
// RUN 2 (ADR-0165 §6, Phase Z — built here): after I4b the walk ZOOMS OUT to
// the real studio. The view crossfades into a re-created studio frame around
// the map area (act2-studio.ts — top bar, legend, the multi-island forest,
// details panel, all on the REAL scene rail), revealed one chip per stage:
// Z1 frame (dimmed) → Z2 legend → Z3 forest → Z4 details → done (the honest
// close + the landed CTA affordances). Every Z step keeps beat 6 (the landed
// pull-back/website-greens state stays the walk's true final state beneath)
// and the mini-map stays docked at `signal` — all six dots earned (accepted
// default 2). The `studio` field is the ADDITIVE reveal target: frame ⊂
// legend ⊂ forest ⊂ details; Back re-applies a lower stage from scratch and
// the layer renders byte-identical (pure class state over fixed DOM).
// ---------------------------------------------------------------------------

/** The visitor's reused request, echoed at the top of the chat (the prompt the
 *  first act carried in — the worked example is the visitor's OWN words,
 *  accepted default 3). */
export const USER_PROMPT = 'build me a shopping website';

/** Which act of the experience a step belongs to: 'D' = the system on the one
 *  growing diagram; 'I' = the island walk (the landed director beats); 'Z' =
 *  the studio zoom-out (ADR-0165 §6); 'done' = the honest close + the landed
 *  CTA affordances. */
export type GuidePhase = 'D' | 'I' | 'Z' | 'done';

/** The studio layer's ADDITIVE reveal stages (ADR-0165 §6; act2-studio.ts):
 *  each stage includes all previous — frame (the chrome, dimmed, the visitor's
 *  island centred) ⊂ legend ⊂ forest (un-dim + the other islands, wisps
 *  orbiting, trails) ⊂ details (the panel slides in). */
export type StudioStage = 'frame' | 'legend' | 'forest' | 'details';

/** One streamed chat line, tagged by how it reads (the landed orchestrator
 *  vocabulary): 'reply' = the orchestrator's plain voice; 'brief' = the
 *  outcome-brief line (set apart); 'note' = a quiet muted aside. */
export type GuideLineKind = 'reply' | 'brief' | 'note';
export type GuideLine = readonly [GuideLineKind, string];

/** The six mini-map stages, left to right — the compacted diagram's dots
 *  (ADR-0165 §2). Exactly ONE is lit at a time. */
export type MiniStage = 'intent' | 'decision' | 'library' | 'story' | 'loop' | 'signal';
export const MINI_STAGES: readonly MiniStage[] = [
  'intent',
  'decision',
  'library',
  'story',
  'loop',
  'signal',
];

/** A quiet optional aside offered alongside the primary chip on a FEW steps
 *  (ADR-0165 §3): tapping streams ONE extra muted line WITHOUT advancing, then
 *  the aside chip disappears. */
export interface GuideAside {
  /** The aside chip's label (the quiet question). */
  readonly label: string;
  /** The one extra muted line it streams. */
  readonly line: string;
}

/** One step of the guided opening: the chat lines + chip (the advance surface)
 *  and the DECLARATIVE target stage state (the replay source of truth). */
export interface GuideStep {
  /** Stable id — also the witness key (window.__act2guide.step). */
  readonly id: string;
  readonly phase: GuidePhase;
  /** The orchestrator's lines for this step, streamed on entry. */
  readonly lines: readonly GuideLine[];
  /** The ONE bounded reply chip that advances to the next step (null only on
   *  the final step — the done state has no forward). Voiced as the skeptic's
   *  question; a trailing ' →' is stripped when echoed as the user's line. */
  readonly chip: string | null;
  /** The optional quiet aside (a few steps only). */
  readonly aside?: GuideAside;
  // ── the declarative TARGET stage state (pure replay: apply, never diff) ──
  /** How many diagram stages are ON (0..6) — the growing picture is additive
   *  only; step k of Phase D shows stages 1..k. */
  readonly diagramStep: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** The director beatIndex the walk sits at (0 through Phase D — quiet ground
   *  behind the diagram; 1..6 through Phase I — the landed beats, reused
   *  untouched). */
  readonly beat: number;
  /** null = the growing diagram is up (Phase D); a stage = the diagram is
   *  compacted to the docked mini-map with that stage lit (Phase I onward —
   *  the mini-map persists through Phase Z, accepted default 2). */
  readonly minimap: MiniStage | null;
  /** The studio layer's reveal stage (Phase Z; absent = no studio layer — the
   *  default for every D/I step). The sequencer mounts the layer lazily at the
   *  first non-null stage and hides it again on a Back into Phase I. */
  readonly studio?: StudioStage;
  /** True only on the final step: the landed done/CTA state is entered. */
  readonly cta: boolean;
}

/**
 * The approved step script (ADR-0165 §7 — the owner approved this table as
 * presented; the copy is the proposal's STEPS array verbatim, with the I4
 * two-beat split of accepted default 6). ~15 taps, one chip each.
 */
export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    id: 'D0',
    phase: 'D',
    lines: [
      [
        'reply',
        'I’m the orchestrator — I don’t write the code myself. I scope the work, hand it to agents, and only call something done when the system proves it.',
      ],
      ['brief', 'Yours reads: shoppers can add items to a cart, pay, and get a receipt.'],
      [
        'reply',
        'Before I plant anything, let me show you what happens to a request like yours in here. Six short steps — you drive.',
      ],
    ],
    chip: 'ok — show me',
    diagramStep: 0,
    beat: 0,
    minimap: null,
    cta: false,
  },
  {
    id: 'D1',
    phase: 'D',
    lines: [
      [
        'reply',
        'Everything starts with what you want, in your words. Not a ticket, not code — an outcome.',
      ],
    ],
    chip: 'what do you do with it?',
    diagramStep: 1,
    beat: 0,
    minimap: null,
    cta: false,
  },
  {
    id: 'D2',
    phase: 'D',
    lines: [
      [
        'reply',
        'First — before any code — the decision gets written down: what we’re building, why, and what we chose. Here: start with a mock shop, no backend yet.',
      ],
      [
        'reply',
        'Decisions never evaporate into a chat log. Months from now, anyone — person or agent — can ask “why is it like this?” and get the real answer.',
      ],
    ],
    chip: 'who reads them?',
    aside: {
      label: 'why does that matter?',
      line: 'Most projects keep the code and lose the reasons. Here the reasons are kept next to the work — so a question settled once stays settled, for people and agents alike.',
    },
    diagramStep: 2,
    beat: 0,
    minimap: null,
    cta: false,
  },
  {
    id: 'D3',
    phase: 'D',
    lines: [
      [
        'reply',
        'Decisions grow into a library: precise definitions, rules every agent must follow, and promises with tests attached.',
      ],
      [
        'reply',
        'Every agent working here reads the same library. That’s how a hundred sessions stay one coherent system — the knowledge isn’t trapped in anyone’s head.',
      ],
    ],
    chip: 'so where’s the actual work?',
    diagramStep: 3,
    beat: 0,
    minimap: null,
    cta: false,
  },
  {
    id: 'D4',
    phase: 'D',
    lines: [
      [
        'reply',
        'The work is cut into stories — one story, one outcome you can check. Yours: “shoppers can check out.”',
      ],
      [
        'reply',
        'And a story isn’t done when an agent says so. It’s done when it’s proven. Which is the good part —',
      ],
    ],
    chip: 'how do you prove it?',
    diagramStep: 4,
    beat: 0,
    minimap: null,
    cta: false,
  },
  {
    id: 'D5',
    phase: 'D',
    lines: [
      [
        'reply',
        'Two agents and a referee. One writes a test that must pass. The system watches it fail — proof the test is real. Another writes the code. The system watches it pass.',
      ],
      // "gate" lands here, once, plainly (ADR-0165 accepted default 5 — the
      // retired CI/CD overlays' load-bearing word, carried by chat copy).
      [
        'reply',
        'AI can write endless code; the hard part was always checking it. So here the checking is never the AI’s word — the system runs the test and signs the result — that’s the gate.',
      ],
    ],
    chip: 'and then I just… trust that?',
    aside: {
      label: 'why does that matter?',
      line: 'Because writing code got fast, and checking it didn’t. Watching the test fail first is what makes the pass mean something — a test that can’t fail can’t vouch for anything.',
    },
    diagramStep: 5,
    beat: 0,
    minimap: null,
    cta: false,
  },
  {
    id: 'D6',
    phase: 'D',
    lines: [
      [
        'reply',
        'No — you trust the signal. Everything that turns green on the map means one thing: a signed, passing proof. Nothing else can make it green.',
      ],
      [
        'reply',
        'That’s the whole idea. Everything you’ll see in this UI is a signal of what the agents are actually building. You don’t read the diffs — you read the map, until a signal says look closer.',
      ],
    ],
    chip: 'show me for real →',
    diagramStep: 6,
    beat: 0,
    minimap: null,
    cta: false,
  },
  {
    id: 'I1',
    phase: 'I',
    lines: [
      [
        'reply',
        'There’s your story — a real node on a real map. It lands as a proposal: pale, not green. Green is earned here, remember.',
      ],
    ],
    chip: 'start the work',
    diagramStep: 6,
    beat: 1,
    minimap: 'story',
    cta: false,
  },
  {
    id: 'I2',
    phase: 'I',
    lines: [
      [
        'reply',
        'An agent just picked it up. That light circling the island is a live session — the loop from our diagram, running right now.',
      ],
      [
        'reply',
        'You don’t have to watch it. Look over any time, or don’t — the work carries on either way.',
      ],
    ],
    chip: 'keep going',
    aside: {
      label: 'why does that matter?',
      line: 'Presence without obligation: the map stays true while you’re away, so checking in is a choice, not a duty. Nothing here depends on you watching.',
    },
    diagramStep: 6,
    beat: 2,
    minimap: 'loop',
    cta: false,
  },
  {
    id: 'I3',
    phase: 'I',
    lines: [
      [
        'reply',
        'Checkout split into the pieces it needs — a cart, payments, receipts. The cart just turned green: a test ran, the system signed it.',
      ],
      [
        'reply',
        'The pale ones aren’t failures — they’re just not proven yet. And they look it. Here, “done” and “not yet” are never dressed the same.',
      ],
    ],
    chip: 'what about the parts a mock can’t do?',
    diagramStep: 6,
    beat: 3,
    minimap: 'signal',
    cta: false,
  },
  // I4 splits into TWO beats (accepted default 6) — the backend first…
  {
    id: 'I4a',
    phase: 'I',
    lines: [
      [
        'reply',
        'A mock can’t take money or keep an order. So the map shows what your website really needs: a backend for checkout.',
      ],
    ],
    chip: 'and where does the data live?',
    diagramStep: 6,
    beat: 4,
    minimap: 'signal',
    cta: false,
  },
  // …then the database, with the reads-directly teach given its own breath.
  {
    id: 'I4b',
    phase: 'I',
    lines: [
      [
        'reply',
        'And a database — which your site reads directly, the way a real shop loads its catalog fast.',
      ],
      [
        'reply',
        'Nothing hidden, nothing invoiced later as a surprise. The next thing to build is standing right there, in plain sight.',
      ],
    ],
    chip: 'show me the whole picture',
    diagramStep: 6,
    beat: 5,
    minimap: 'signal',
    cta: false,
  },
  // Phase Z (ADR-0165 §6 — run 2): the zoom-out to the real studio. Z1 still
  // advances the director to beat 6 (the landed pull-back plays beneath the
  // crossfade — the walk's true final state); each later chip only brightens
  // the next studio stage. Copy is the owner-approved proposal mock's STEPS
  // array, verbatim.
  {
    id: 'Z1',
    phase: 'Z',
    lines: [
      [
        'reply',
        'This is the actual studio — the tool storytree is built with, building itself. Same map you’ve been walking. Just… all of it.',
      ],
    ],
    chip: 'what am I looking at?',
    diagramStep: 6,
    beat: 6,
    minimap: 'signal',
    studio: 'frame',
    cta: false,
  },
  {
    id: 'Z2',
    phase: 'Z',
    lines: [
      [
        'reply',
        'The legend you already know. Green: proven. Pale: being built. Withered: something broke — and everyone can see exactly where, upstream of whatever it affects.',
      ],
    ],
    chip: 'and all these islands?',
    diagramStep: 6,
    beat: 6,
    minimap: 'signal',
    studio: 'legend',
    cta: false,
  },
  {
    id: 'Z3',
    phase: 'Z',
    lines: [
      [
        'reply',
        'Every island is a story like yours. This is a whole codebase at a glance — what’s proven, what’s growing, where agents are working right now.',
      ],
      [
        'reply',
        'You can only hold so much of a system in your head. The map holds the rest — so you always know where to look, and where to start asking.',
      ],
    ],
    chip: 'can I look inside one?',
    // the one quiet Z aside (plain words; a restatement of D6's landed thesis —
    // no new claim, ADR-0165 §9).
    aside: {
      label: 'why does that matter?',
      line: 'Because you check on your own terms: glance at the whole forest, and read deeper only where a signal asks you to.',
    },
    diagramStep: 6,
    beat: 6,
    minimap: 'signal',
    studio: 'forest',
    cta: false,
  },
  {
    id: 'Z4',
    phase: 'Z',
    lines: [
      [
        'reply',
        'Tap any island: its promises, its proofs, and the decisions behind it — the same records from the start of our walk, attached to the thing they explain.',
      ],
      ['reply', 'Ask why anything is the way it is, and the answer is already there.'],
    ],
    chip: 'got it — what now?',
    diagramStep: 6,
    beat: 6,
    minimap: 'signal',
    studio: 'details',
    cta: false,
  },
  // the honest close: the studio stays fully revealed (a calm veil under the
  // card), the walk's landed done/CTA affordances present the real exits.
  {
    id: 'done',
    phase: 'done',
    lines: [
      [
        'reply',
        'That was staged, on made-up data — but this is exactly how the real thing grows: proof by proof, one story at a time, every signal earned.',
      ],
    ],
    chip: null,
    diagramStep: 6,
    beat: 6,
    minimap: 'signal',
    studio: 'details',
    cta: true,
  },
];

/** The target stage state for step n — a pure lookup (the state is declarative,
 *  so replay = re-apply; Back renders byte-identical scenes). */
export function stateAt(n: number): GuideStep {
  const step = GUIDE_STEPS[Math.max(0, Math.min(n, GUIDE_STEPS.length - 1))];
  if (!step) throw new Error('act2-guide: empty step script');
  return step;
}
