// ---------------------------------------------------------------------------
// act2-script — the SITE-OWNED fiction for the Act 2 walk (ADR-0145 / ADR-0150 /
// ADR-0153, and the fictional-data precedent ADR-0093 §3/§4: the synced
// director's own header says "the plain-language copy and fictional story names
// live in the web repo keyed by beat id — no narration strings live here"). This
// is where the fiction lives: a fresh first-time visitor grows their FIRST tree —
// a relatable SHOPPING-WEBSITE checkout — then the SAME walk keeps going UPSTREAM
// into the backend + database that checkout depends on (increment H, ADR-0150).
//
// It is a COPY of the director's default-script STRUCTURE — same SIX beat ids,
// same narrationKeys, same camera targets — with shopping delta DATA. The
// STRUCTURE is what the two-way narration wall keys on (beat ids ⇒ narration
// keys), so keeping the ids identical keeps the wall green while the DATA tells a
// different story.
//
// ── ADR-0157: the BaaS DIAMOND (the frontend reads the database directly) ─────
// The `add-upstream-story` delta carries `dependentId` — the id (or ids) of the
// EXISTING stories whose `dependsOn` gains the new upstream story's id. The edge
// points FROM the dependent TO its prerequisite (ADR-0058 / cross-story-dependency:
// A depends_on B iff A needs B's delivered outcome to pass A's OWN UAT). The owner
// confirmed BaaS at the H#2 gate (ADR-0157): a real shopping app reads the catalog
// DIRECTLY from the database AND still needs the backend for checkout/payments, so:
//   • website.dependsOn  = [backend, database]  (beat 4 fans the backend into the
//        website; beat 5 fans the database into BOTH the website and the backend)
//   • backend.dependsOn  = [database]
//   • database.dependsOn = []                    (the shared foundation, the sink)
// A DIAMOND, not a spine: the database is depended on by two stories (the website
// reads its catalog directly; the backend keeps its data). The refused first build
// encoded the direction BACKWARDS (`dependsOn: [website]` on the backend); ADR-0153
// corrected the direction, ADR-0157 adds the direct read edge in that same
// direction. The synced director's delta accepts `dependentId: string | string[]`;
// this script matches it (beat 5 passes both dependents).
//
// The thesis guarantee is intact regardless of whose script it is: this const is
// parsed against the director's exported `BeatScript` zod contract at build time
// (act2-validate.ts) AND each beat is parsed by `advance()`'s `Beat.parse` at
// runtime — so the green⇒signedProof refine still fires here (a limb coloured
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
 * the website (grown first, the ANCHOR — nothing depends on it), then the two
 * upstream layers it depends on. Exported so the walkthrough's inspect affordance
 * + the fold can key metadata by the SAME ids the deltas carry (no string drift
 * between script and site).
 */
export const STORY_WEBSITE = 'story-checkout';
export const STORY_BACKEND = 'story-backend';
export const STORY_DATABASE = 'story-database';

/**
 * The six approved beats, shopping fiction. IDS / narrationKeys / cameras are
 * identical to the director's defaultScript (the wall's two-way coverage keys on
 * the ids); only the delta DATA is the checkout story + its upstream layers.
 */
export const walkthroughScript: BeatScript = [
  // ─── Website walk (beats 1-3, the mock the orchestrator proposed) ───────────

  // Beat 1 — Plant a story: a seed grows into a tree with its OUTCOME on a label.
  // The outcome brief is carried by the orchestrator chat at the bottom (ADR-0153
  // §4); on the map, the promise takes root as a young tree. The website story
  // starts as 'building' (a sapling in the legend — green is earned later).
  {
    id: 'beat-1-plant-story',
    narrationKey: 'act2.beat1.plantStory',
    camera: { focus: 'story-tree', zoom: 0.7 },
    delta: {
      kind: 'plant-story',
      storyId: STORY_WEBSITE,
      label: 'Shoppers can check out',
    },
  },

  // Beat 2 — Watch a wisp: a soft wisp drifts over the tree.
  // Presence without obligation. (The drive-machinery overlay — the background
  // agent loop — surfaces here, top-left; ADR-0153 §5, keyed by beat id site-side.)
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
  // coloured green (the verification-gap answer, enforced in data). (The
  // drive-machinery overlay expands here into CI/CD + gates; ADR-0153 §6.)
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
  //     advantage; ADR-0150 §4 replaces G's wrong-way-flag antipattern.
  //     Direction CORRECTED by ADR-0153; the BaaS diamond added by ADR-0157) ─────

  // Beat 4 — Grow upstream: the backend. add-upstream-story raises a backend story
  // the WEBSITE depends on — `dependentId: STORY_WEBSITE` makes the edge
  // website.dependsOn=[backend] (dependent → prerequisite; ADR-0058 / ADR-0153).
  // The teach: cart / payments / receipts need privileged writes (checkout, taking
  // payment) that a mock can't do — that's the backend. You SEE the layer, up
  // front, in order. PROPOSED (building) — the layer you build next. Rendered as a
  // FOUNDATION layer BELOW the website (frontend high; ADR-0153 spatial preference).
  {
    id: 'beat-4-add-upstream-backend',
    narrationKey: 'act2.beat4.addUpstreamBackend',
    camera: { focus: 'upstream-backend', zoom: 0.55 },
    delta: {
      kind: 'add-upstream-story',
      id: STORY_BACKEND,
      label: 'A backend for checkout',
      status: 'building',
      dependentId: STORY_WEBSITE,
    },
  },

  // Beat 5 — Grow upstream: the database, the SHARED FOUNDATION (the BaaS diamond,
  // ADR-0157). add-upstream-story raises a database story that BOTH the website AND
  // the backend depend on — `dependentId: [STORY_BACKEND, STORY_WEBSITE]` fans the
  // database id into backend.dependsOn AND website.dependsOn, giving the diamond:
  //   website → {backend, database},  backend → database,  database → []
  // The website reads its catalog DIRECTLY from the database (as a real shopping
  // app does), so it has a direct read edge to the database ALONGSIDE its backend
  // edge; the backend keeps the data too. The database sits at the base as the
  // foundation both rest on. Both upstream layers are PROPOSED (building) — the
  // honest structure shown up front, in order. (UAT 2: upstream is proposed/sapling,
  // NEVER green.)
  {
    id: 'beat-5-add-upstream-database',
    narrationKey: 'act2.beat5.addUpstreamDatabase',
    camera: { focus: 'upstream-database', zoom: 0.5 },
    delta: {
      kind: 'add-upstream-story',
      id: STORY_DATABASE,
      label: 'A database to store it all',
      status: 'building',
      dependentId: [STORY_BACKEND, STORY_WEBSITE],
    },
  },

  // Beat 6 — Pull back: the camera widens to the whole legible forest AND the
  // website you grew resolves to 'proven' (the culminating reveal). The forest now
  // reads as the BaaS diamond: website = proven (green, on top, with edges to BOTH
  // the backend and the database), backend + database = building (the proposed
  // foundation below it, the database at the base). Green = proven, sapling =
  // in-progress, withered = broken — the legend is backed by real story statuses,
  // not a uniform amber. done: true → CTA state (parked here by advance()).
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
// The inspect affordance (site-side, keyed by story id) opens a proposed upstream
// story to read, in plain language, its outcome (WHAT) and the orchestrator's
// dependency rationale (WHY the website / backend depends on it). This is site
// FICTION (the Cohoot precedent) — the same voice the orchestrator used to propose
// the mock returns to explain the layers it now guides the visitor to.
//
// ADR-0153 spatial framing: the frontend is HIGH and the dependencies are the
// FOUNDATION BELOW. The copy speaks of the layers the website RESTS ON (the
// foundation beneath it), not layers "above" it — matching the render.

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
    label: 'A backend for checkout',
    what: 'A small server the shop calls when it needs to do something for real — take a payment, place an order, send a receipt.',
    why: 'Reading the catalog is one thing; taking someone’s money is another. Checkout and payments can’t run safely straight from the browser — they need server code you control. That’s the backend. Your website depends on it, so it sits just beneath the website.',
  },
  [STORY_DATABASE]: {
    label: 'A database to store it all',
    what: 'The place your products, orders and customers are kept, so they’re still there tomorrow.',
    why: 'Two things need the same store: your website reads the product list straight from it (that’s how a real shop shows its catalog fast), and the backend saves each order into it. So both depend on the database — it sits at the very bottom, the shared foundation the whole shop rests on.',
  },
};
