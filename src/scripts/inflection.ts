// ---------------------------------------------------------------------------
// inflection — the storm-to-2.5D-tutorial handoff (ADR-0134 §2, ADR-0145, and
// now ADR-0148 §5: the R3F 3D landing island is DROPPED and the transform
// resolves STRAIGHT into the 2.5D guided tutorial). This is the destination the
// storm's "show me the better way" transform lands the visitor in — one path,
// all in on the tutorial, ZERO WebGL.
//
// Reached EXCLUSIVELY via dynamic import() from the storm engine at the
// transform click (act1-storm's `import('./inflection')`). Since ADR-0148 this
// module — and everything it reaches — is pure SVG/DOM: no React, no three.js,
// no @react-three, no WebGL context. (The synced forest-world-r3f package still
// ships in web/src/lib for check:web-engine, but this module no longer imports
// its WebGL surfaces — only act2-director's pure zod state machine, via the
// walkthrough.) The parent's check:web-experience walks the STATIC closure from
// index.astro and this seam is only ever a DYNAMIC import, so it stays outside
// that closure regardless.
//
// THE FLOW (ADR-0148 §5): the transform's storm→soil collapse finishes on quiet
// ground; this module then
//   1. mounts the 2.5D guided walk (act2-walkthrough — the empty "quiet ground"
//      beat-0 map), with its narration callout DEFERRED, and
//   2. overlays the session ORCHESTRATOR's mock-website proposal (ADR-0148 §2,
//      act2-orchestrator) on top of that ground.
// When the visitor accepts the proposal, the overlay tears down, the first
// story is planted (the walk advances to beat 1), and the beat callout is
// revealed — the visitor flows straight from the proposal into the walk.
//
// The exported contract is UNCHANGED so the storm engine needs no edit beyond
// dropping the R3F canvas mount: mountForestLand(container) → { unmount }. The
// disarm path (skip / Escape / the closing CTA) chains unmount(), so a mid-walk
// exit tears the whole tutorial down. Everything here is a pure function of
// fixed data: the same land, the same proposal, on every load.
// ---------------------------------------------------------------------------

import { mountWalkthrough, type WalkthroughHandle } from './act2-walkthrough';
import { mountOrchestrator, type OrchestratorHandle } from './act2-orchestrator';

/** The exported handle the storm engine holds — name kept for the unchanged
 *  contract (act1-storm calls `mod.mountForestLand(landCanvasEl)`). */
export interface InflectionHandle {
  /** Tear the tutorial (proposal overlay + walk) down — the disarm path chains
   *  this into its halt. */
  unmount(): void;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Mount the 2.5D guided tutorial into `container` (the storm's #storm-land-canvas
 * mount): the walk on the real 2.5D map, then the orchestrator's mock-website
 * proposal over it. No WebGL, no R3F — the storm→soil choreography has already
 * played; this is where it lands.
 *
 * `container` is the storm land canvas; the walk mounts onto the #storm-land
 * layer (its closest ancestor) so it shares the land's fade-up and disarm path.
 */
export function mountForestLand(container: HTMLElement): InflectionHandle {
  const reducedMotion = prefersReducedMotion();

  // The walk mounts onto the land layer (the storm engine fades #storm-land up);
  // fall back to the container itself if the layer is not found (defensive).
  const land = container.closest<HTMLElement>('#storm-land') ?? container;

  // 1. the 2.5D walk — empty "quiet ground" beat 0, its narration callout
  //    DEFERRED so it does not compete with the proposal overlay.
  const walk: WalkthroughHandle = mountWalkthrough(land, {
    reducedMotion,
    deferCallout: true,
  });

  // 2. the session orchestrator's mock-website proposal, over the ground.
  let orchestrator: OrchestratorHandle | null = mountOrchestrator(land, {
    reducedMotion,
    onAccept: () => {
      // the proposal is accepted: tear the overlay down, plant the first story
      // (advance beat 0 → 1), and reveal the walk's narration callout — the
      // visitor flows straight from the proposal into the walk.
      if (orchestrator) {
        orchestrator.unmount();
        orchestrator = null;
      }
      walk.next(); // beat 0 → beat 1: plant the story
      walk.revealCallout();
    },
  });

  return {
    unmount(): void {
      if (orchestrator) {
        orchestrator.unmount();
        orchestrator = null;
      }
      walk.unmount();
    },
  };
}
