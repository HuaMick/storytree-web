// ---------------------------------------------------------------------------
// act2-script — the SITE-OWNED fiction for the Act 2 walk (ADR-0145 / ADR-0150,
// and the fictional-data precedent ADR-0093 §3/§4: the synced director's own
// header says "the plain-language copy and fictional story names live in the web
// repo keyed by beat id — no narration strings live here"). This is where the
// fiction lives: a fresh first-time visitor grows their FIRST tree — a relatable
// SHOPPING-WEBSITE checkout — then the SAME walk keeps going UPSTREAM into the
// backend + database that checkout depends on (increment H, ADR-0150).
//
// It is a COPY of the director's default-script STRUCTURE — same SIX beat ids,
// same narrationKeys, same camera targets — with shopping delta DATA. The
// STRUCTURE is what the two-way narration wall keys on (beat ids ⇒ narration
// keys), so keeping the ids identical keeps the wall green while the DATA tells
// a different story.
//
// The thesis guarantee is intact regardless of whose script it is: this const
// is parsed against the director's exported `BeatScript` zod contract at build
// time (act2-validate.ts) AND each beat is parsed by `advance()`'s `Beat.parse`
// at runtime — so the green⇒signedProof refine still fires here (a limb coloured
// green without a signed proof THROWS, in fiction as in production). The upstream
// stories are `building` (proposed/sapling) — NEVER green (UAT 2); only the
// website resolves to `proven` at the pull-back.
//
// The director (src/lib/forest-world-r3f/act2-director.ts) is @generated and
// stays UNTOUCHED — no re-sync, no parent re-proof, check:web-engine green.
// ---------------------------------------------------------------------------

import { type BeatScript } from '../lib/forest-world-r3f/act2-director';

/**
 * The site-owned story ids the walk grows, in walk order:
 * the website (grown first), then the two upstream layers it depends on.
 * Exported so the walkthrough's inspect affordance + the fold can key metadata
 * by the SAME ids the deltas carry (no string drift between script and site).
 */
export const STORY_WEBSITE = 'story-checkout';
export const STORY_BACKEND = 'story-backend';
export const STORY_DATABASE = 'story-database';

/**
 * The six approved beats, shopping fiction. IDS / narrationKeys / cameras are
 * identical to the director's defaultScript (the wall's two-way coverage keys
 * on the ids); only the delta DATA is the checkout story + its upstream layers.
 */
export const walkthroughScript: BeatScript = [
  // ─── Website walk (beats 1-3, the mock the orchestrator proposed) ───────────

  // Beat 1 — Plant a story: a seed grows into a tree with its OUTCOME on a label.
  // Intent becomes a thing on the map, not buried in a chat log. The website
  // story starts as 'building' (a sapling in the legend — green is earned later).
  {
    id: 'beat-1-plant-story',
    narrationKey: 'act2.beat1.plantStory',
    camera: { focus: 'story-tree', zoom: 0.7 },
    delta: {
      kind: 'plant-story',
      storyId: STORY_WEBSITE,
      label: 'Shoppers can check out',
      status: 'building',
    },
  },

  // Beat 2 — Watch a wisp: a soft wisp drifts over the tree.
  // Presence without obligation.
  {
    id: 'beat-2-attach-wisp',
    narrationKey: 'act2.beat2.attachWisp',
    camera: { focus: 'story-tree', zoom: 0.65 },
    delta: {
      kind: 'attach-wisp',
      storyId: STORY_WEBSITE,
    },
  },

  // Beat 3 — It branches: capability limbs appear.
  // Green ONLY on a signed passing proof — a limb without the marker cannot be
  // coloured green (the verification-gap answer, enforced in data).
  {
    id: 'beat-3-branch-caps',
    narrationKey: 'act2.beat3.branchCaps',
    camera: { focus: 'story-tree', zoom: 0.6 },
    delta: {
      kind: 'branch-caps',
      limbs: [
        // Proven limb — carries the signed-proof marker (required for green)
        {
          id: 'cap-cart',
          label: 'Cart',
          green: true,
          signedProof: 'sha256:7c1e0b9a4d2f8e63',
        },
        // In-progress limbs — no signed-proof marker (demonstrates the gap)
        {
          id: 'cap-payments',
          label: 'Payments',
          green: false,
        },
        {
          id: 'cap-receipts',
          label: 'Receipts',
          green: false,
        },
      ],
    },
  },

  // ─── Upstream forest reveal (beats 4-5 — the dependency layers ARE the
  //     advantage; ADR-0150 §4 replaces G's wrong-way-flag antipattern) ────────

  // Beat 4 — Grow upstream: the backend. add-upstream-story raises a backend
  // story UPSTREAM of the website on a real dependsOn edge. The teach: the mock's
  // cart / payments / receipts can't truly work without a backend — you SEE the
  // layer, up front, in order. PROPOSED (building) — the layer you build next.
  {
    id: 'beat-4-add-upstream-backend',
    narrationKey: 'act2.beat4.addUpstreamBackend',
    camera: { focus: 'dag-view', zoom: 0.5 },
    delta: {
      kind: 'add-upstream-story',
      id: STORY_BACKEND,
      label: 'A backend that serves the shop',
      status: 'building',
      dependsOn: [STORY_WEBSITE],
    },
  },

  // Beat 5 — Grow upstream: the database. add-upstream-story raises a database
  // story UPSTREAM of the backend on a dependsOn edge. The forest now holds the
  // layered stack website → backend → database. Both upstream layers are PROPOSED
  // (building) — the honest dependency structure, shown up front, in order.
  // (UAT 2: the upstream forest is proposed/sapling, NEVER green.)
  {
    id: 'beat-5-add-upstream-database',
    narrationKey: 'act2.beat5.addUpstreamDatabase',
    camera: { focus: 'dag-view', zoom: 0.45 },
    delta: {
      kind: 'add-upstream-story',
      id: STORY_DATABASE,
      label: 'A database to keep it all',
      status: 'building',
      dependsOn: [STORY_BACKEND],
    },
  },

  // Beat 6 — Pull back: the camera widens to the whole legible forest AND the
  // website you grew resolves to 'proven' (the culminating reveal). The forest
  // now reads: website = proven (green), backend + database = building (the
  // proposed layers above it). Green = proven, sapling = in-progress, withered =
  // broken — the legend is backed by real story statuses, not a uniform amber.
  // done: true → CTA state (parked here by advance()).
  {
    id: 'beat-6-pull-back',
    narrationKey: 'act2.beat6.pullBack',
    camera: { focus: 'full-forest', zoom: 0.1 },
    delta: { kind: 'pull-back', proven: [STORY_WEBSITE] },
  },
];

export default walkthroughScript;

// ---------------------------------------------------------------------------
// Inspect metadata — WHAT each upstream story is + WHY it is proposed (UAT 5).
// ---------------------------------------------------------------------------
//
// The inspect affordance (site-side, keyed by story id) opens a proposed
// upstream story to read, in plain language, its outcome (WHAT) and the
// orchestrator's dependency rationale (WHY it sits above the website). This is
// site FICTION (the Cohoot precedent) — the same voice the orchestrator used to
// propose the mock returns to explain the layers it now guides the visitor to.

export interface StoryInspect {
  /** The plain-language name shown as the inspect title. */
  readonly label: string;
  /** WHAT it is — the outcome/promise, one plain sentence. */
  readonly what: string;
  /** WHY it is proposed — the orchestrator's dependency rationale, grounded in
   *  the website's needs (carts need storage → a database; payments need server
   *  logic → a backend). */
  readonly why: string;
}

/**
 * Inspect copy for the two PROPOSED upstream stories (keyed by the delta ids).
 * Only the upstream layers are inspectable — the website is the thing the walk
 * already grew; the point of inspection is comprehension of what's proposed next.
 */
export const STORY_INSPECT: Readonly<Record<string, StoryInspect>> = {
  [STORY_BACKEND]: {
    label: 'A backend that serves the shop',
    what: 'A small server the shop talks to — it takes an order, checks the payment, and remembers what happened.',
    why: 'Your cart, payments and receipts can’t truly work as a mock. They each need server logic that runs somewhere real — that’s a backend. It sits directly above the website, because the website depends on it.',
  },
  [STORY_DATABASE]: {
    label: 'A database to keep it all',
    what: 'The place your orders, carts and customers are stored so they’re still there tomorrow.',
    why: 'A cart that forgets itself on refresh isn’t a shop. Somewhere has to keep the data — that’s a database. The backend depends on it, so it sits at the top of the stack: website → backend → database.',
  },
};
