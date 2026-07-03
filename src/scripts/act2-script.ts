// ---------------------------------------------------------------------------
// act2-script — the SITE-OWNED fiction for the Act 2 walk (ADR-0145 substrate +
// ADR-0147 progressive growth, and the fictional-data precedent ADR-0093 §3/§4:
// the synced director's own header says "the plain-language copy and fictional
// story names live in the web repo keyed by beat id — no narration strings live
// here"). This is where the fiction lives: a fresh first-time visitor grows their
// FIRST tree, so the opening story is a relatable SHOPPING-WEBSITE checkout, not a
// backend-insider "API latency" promise — and then the forest fills in with the
// OTHER shopping stories the same team is growing.
//
// It is a COPY of the director's default-script STRUCTURE — same SEVEN beat ids,
// same narrationKeys, same camera targets — with shopping delta DATA. The
// STRUCTURE is what the two-way narration wall keys on (beat ids ⇒ narration
// keys), so keeping the ids identical keeps the wall green while the DATA tells a
// different (shopping) story.
//
// The thesis guarantee is intact regardless of whose script it is: this const is
// parsed against the director's exported `BeatScript` zod contract at build time
// (act2-validate.ts) AND each beat is parsed by `advance()`'s `Beat.parse` at
// runtime — so the green⇒signedProof refine still fires here (a limb coloured
// green without a signed proof THROWS, in fiction as in production).
//
// The director (src/lib/forest-world-r3f/act2-director.ts) is @generated and
// stays UNTOUCHED — no re-sync, no parent re-proof, check:web-engine green.
// ---------------------------------------------------------------------------

import { type BeatScript } from '../lib/forest-world-r3f/act2-director';

/**
 * The seven approved beats, shopping fiction. IDS / narrationKeys / cameras are
 * identical to the director's defaultScript (the wall's two-way coverage keys on
 * the ids); only the delta DATA is the checkout-forest story.
 *
 * Beats 1–4 keep their ids VERBATIM (the loved single-island opening — the fold
 * shows ONLY the opening story here). beat-5-grow-forest raises the SIBLING
 * shopping stories the team is also growing, carrying MIXED status (a proven one,
 * a building one, one broken/withered — so the pull-back legend is genuinely
 * populated). beat-6-connect-stories draws real inter-story roads, including one
 * INTO the broken story (the blast-radius read). beat-7-pull-back widens to the
 * whole forest.
 */
export const walkthroughScript: BeatScript = [
  // Beat 1 — Plant a story: a seed grows into a tree with its OUTCOME on a label.
  // Intent becomes a thing on the map, not buried in a chat log.
  {
    id: 'beat-1-plant-story',
    narrationKey: 'act2.beat1.plantStory',
    camera: { focus: 'story-tree', zoom: 0.7 },
    delta: {
      kind: 'plant-story',
      storyId: 'story-checkout',
      label: 'Shoppers can check out',
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
      storyId: 'story-checkout',
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

  // Beat 4 — Stories connect: roads draw the DAG.
  // One road is the wrong-way UI→DB road skipping the service layer, flagged as
  // an antipattern FROM ITS DATA (a declared layer violation, not a canvas hint).
  // The ids ui/db/service are KEPT verbatim — the fold's bypassedLayerOf parses
  // 'service' out of the violation string and stages the bypassed pad from it.
  {
    id: 'beat-4-add-roads',
    narrationKey: 'act2.beat4.addRoads',
    camera: { focus: 'dag-view', zoom: 0.5 },
    delta: {
      kind: 'add-roads',
      roads: [
        // Valid DAG dependency road
        { from: 'story-checkout', to: 'cap-cart' },
        // Wrong-way UI→DB road: declared layer violation FROM ITS DATA
        {
          from: 'ui',
          to: 'db',
          violation: 'layer-violation:ui-bypasses-service',
        },
      ],
    },
  },

  // Beat 5 — The forest grows (NEW, ADR-0147): neighbor SHOPPING stories rise as
  // more islands, each already carrying an explicit status so the forest is
  // genuinely mixed the moment it grows — a proven green story, a building
  // sapling, one withered/broken (the honest legend, the blast-radius read).
  {
    id: 'beat-5-grow-forest',
    narrationKey: 'act2.beat5.growForest',
    camera: { focus: 'forest-overview', zoom: 0.3 },
    delta: {
      kind: 'grow-forest',
      neighbors: [
        // A proven neighboring story (renders green on the map).
        { id: 'story-order-emails', label: 'Order confirmation emails', status: 'proven' },
        // A building story (renders as a sapling).
        { id: 'story-fast-search', label: 'Search results in under a second', status: 'building' },
        // A broken story (renders as withered) — the blast-radius read.
        { id: 'story-loyalty-points', label: 'Loyalty points sync', status: 'broken' },
      ],
    },
  },

  // Beat 6 — Stories depend on each other (NEW, ADR-0147): real inter-story
  // dependency roads draw the cross-story DAG between the islands (reusing
  // add-roads with story-id endpoints — no new road mechanism). A road from the
  // checkout story INTO the broken loyalty-points story is the blast-radius read
  // (C-11/12 — hidden coupling / blast radius, still coupling not duplication).
  {
    id: 'beat-6-connect-stories',
    narrationKey: 'act2.beat6.connectStories',
    camera: { focus: 'forest-dag', zoom: 0.25 },
    delta: {
      kind: 'add-roads',
      roads: [
        // Valid inter-story dependency road: checkout leans on order emails.
        { from: 'story-checkout', to: 'story-order-emails' },
        // Road INTO the broken story — the blast-radius read: checkout also
        // depends on the loyalty-points sync that is currently broken.
        { from: 'story-checkout', to: 'story-loyalty-points' },
      ],
    },
  },

  // Beat 7 — Pull back (RENUMBERED from beat-5-pull-back, ADR-0147): camera
  // widens to the whole legible forest. Green = proven, sapling = in-progress,
  // withered = broken (the legend GENUINELY populated now — not uniform amber);
  // session wisps drift over the live stories. → done: true (CTA state).
  {
    id: 'beat-7-pull-back',
    narrationKey: 'act2.beat7.pullBack',
    camera: { focus: 'full-forest', zoom: 0.1 },
    delta: { kind: 'pull-back' },
  },
];

export default walkthroughScript;
