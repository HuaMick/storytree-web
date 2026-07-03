// ---------------------------------------------------------------------------
// act2-script — the SITE-OWNED fiction for the Act 2 walk (ADR-0145, and the
// fictional-data precedent ADR-0093 §3/§4: the synced director's own header
// says "the plain-language copy and fictional story names live in the web repo
// keyed by beat id — no narration strings live here"). This is where the
// fiction lives: a fresh first-time visitor grows their FIRST tree, so the
// story is a relatable SHOPPING-WEBSITE checkout, not a backend-insider
// "API latency" promise.
//
// It is a COPY of the director's default-script STRUCTURE — same five beat ids,
// same narrationKeys, same camera targets — with shopping delta DATA. The
// STRUCTURE is what the two-way narration wall keys on (beat ids ⇒ narration
// keys), so keeping the ids identical keeps the wall green while the DATA tells
// a different story.
//
// The thesis guarantee is intact regardless of whose script it is: this const
// is parsed against the director's exported `BeatScript` zod contract at build
// time (act2-validate.ts) AND each beat is parsed by `advance()`'s `Beat.parse`
// at runtime — so the green⇒signedProof refine still fires here (a limb coloured
// green without a signed proof THROWS, in fiction as in production).
//
// The director (src/lib/forest-world-r3f/act2-director.ts) is @generated and
// stays UNTOUCHED — no re-sync, no parent re-proof, check:web-engine green.
// ---------------------------------------------------------------------------

import { type BeatScript } from '../lib/forest-world-r3f/act2-director';

/**
 * The five approved beats, shopping fiction. IDS / narrationKeys / cameras are
 * identical to the director's defaultScript (the wall's two-way coverage keys
 * on the ids); only the delta DATA is the checkout story.
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

  // Beat 5 — Pull back: camera widens to the whole legible forest.
  // Green = proven, sapling = in-progress, withered = broken. → done: true (CTA).
  {
    id: 'beat-5-pull-back',
    narrationKey: 'act2.beat5.pullBack',
    camera: { focus: 'full-forest', zoom: 0.1 },
    delta: { kind: 'pull-back' },
  },
];

export default walkthroughScript;
