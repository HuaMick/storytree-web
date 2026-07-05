// ---------------------------------------------------------------------------
// inflection — the transform-to-2.5D-tutorial handoff (ADR-0134 §2, ADR-0145,
// ADR-0148 §5, reshaped by ADR-0165). This is the destination the first act's
// "show me the better way" transform lands the visitor in — one path, all in on
// the tutorial, ZERO WebGL.
//
// Reached EXCLUSIVELY via dynamic import() from the storm engine at the
// transform click (act1-storm's `import('./inflection')`). Since ADR-0148 this
// module — and everything it reaches — is pure SVG/DOM: no React, no three.js,
// no @react-three, no WebGL context. (The synced forest-world-r3f package still
// ships in web/src/lib for check:web-engine, but this module never imports its
// WebGL surfaces — only act2-director's pure zod state machine, via the
// walkthrough.) The parent's check:web-experience walks the STATIC closure from
// index.astro and this seam is only ever a DYNAMIC import, so it stays outside
// that closure regardless.
//
// THE FLOW (ADR-0165): the transform's collapse finishes on quiet ground; this
// module then
//   1. mounts the 2.5D guided walk (act2-walkthrough — the empty "quiet ground"
//      beat-0 map), with its narration callout DEFERRED, and
//   2. mounts the session-orchestrator GUIDE (act2-orchestrator), which OWNS
//      the flow from D0 to the end: the persistent chat dock at the bottom, the
//      ONE growing system diagram above it (act2-diagram, steps D0–D6), the
//      compaction to the docked mini-map (act2-minimap) at the island handoff,
//      and the walk's beats — every advance one bounded reply chip in the chat
//      (the guide calls walk.next()/back()/revealCallout() per its step
//      script's declarative state; act2-guide.ts is the single source).
//
// The exported contract is UNCHANGED so the storm engine needs no edit:
// mountForestLand(container) → { unmount }. The disarm path (skip / Escape /
// the closing CTA) chains unmount(), so a mid-walk exit tears the whole
// tutorial down — guide (chat + diagram + mini-map) and walk alike. Everything
// here is a pure function of fixed data: the same land, the same script, on
// every load.
// ---------------------------------------------------------------------------

import { mountWalkthrough, type WalkthroughHandle } from './act2-walkthrough';
import { mountGuide, type GuideHandle } from './act2-orchestrator';

/** The exported handle the storm engine holds — name kept for the unchanged
 *  contract (act1-storm calls `mod.mountForestLand(landCanvasEl)`). */
export interface InflectionHandle {
  /** Tear the tutorial (guide + walk) down — the disarm path chains this into
   *  its halt. */
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
 * Mount the 2.5D guided tutorial into `container` (the first act's
 * #storm-land-canvas mount): the walk on the real 2.5D map underneath, the
 * guide (chat + growing diagram + mini-map) over it. No WebGL, no R3F — the
 * collapse choreography has already played; this is where it lands.
 *
 * `container` is the land canvas; everything mounts onto the #storm-land layer
 * (its closest ancestor) so it shares the land's fade-up and disarm path.
 */
export function mountForestLand(container: HTMLElement): InflectionHandle {
  const reducedMotion = prefersReducedMotion();

  // The walk mounts onto the land layer (the storm engine fades #storm-land up);
  // fall back to the container itself if the layer is not found (defensive).
  const land = container.closest<HTMLElement>('#storm-land') ?? container;

  // 1. the 2.5D walk — empty "quiet ground" beat 0, its narration callout
  //    DEFERRED so it does not compete while Phase D explains the system; the
  //    guide reveals it at the island handoff (I1).
  const walk: WalkthroughHandle = mountWalkthrough(land, {
    reducedMotion,
    deferCallout: true,
  });

  // 2. the session-orchestrator guide — the single advance surface (ADR-0165
  //    §3). It mounts the persistent chat dock, the growing diagram and the
  //    mini-map, and drives the walk through its handle.
  const guide: GuideHandle = mountGuide(land, { reducedMotion, walk });

  return {
    unmount(): void {
      guide.unmount();
      walk.unmount();
    },
  };
}
