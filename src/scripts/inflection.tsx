// ---------------------------------------------------------------------------
// inflection — the storm-to-forest island mount (ADR-0134 §2, ADR-0123).
//
// The ONLY module through which React / three / the R3F island are reachable
// from the experience, and it is reached EXCLUSIVELY via dynamic import() from
// the storm engine at the visitor's one calm-card click — the sanctioned seam
// in the no-WebGL-in-Act-1 wall (the parent repo's check:web-experience walks
// static imports only). NEVER import this module statically from anything the
// entry page reaches at first paint.
//
// Since the Act 2 walkthrough landed (ADR-0134 §3), what mounts here is no
// longer a filtered-to-ground still life: the walkthrough module rebuilds a
// fresh SceneInput from the synced beat director's state per visitor tap and
// re-derives the descriptors (buildScene → worldTo3D) — beat 0 IS the same
// deterministic empty land as before (a territory always emits a tree, so the
// pre-story state still suppresses non-ground descriptors inside the fold's
// derive step). Everything remains a pure function of the beat data: the same
// state renders the same land on every load.
// ---------------------------------------------------------------------------

import { mountWalkthrough } from './act2-walkthrough';

// ── the mount ────────────────────────────────────────────────────────────────

export interface InflectionHandle {
  /** Tear the island down (the disarm path chains this into its halt). */
  unmount(): void;
}

/**
 * Mount the calm land and its guided walkthrough into `container`. Resolves to
 * the empty land (beat 0); every further change is one visitor Next-tap. The
 * exported contract is unchanged: `mountForestLand(container) → { unmount() }`
 * — act1-storm chains unmount() into its halt (Escape / skip / classic-page).
 */
export function mountForestLand(container: HTMLElement): InflectionHandle {
  return mountWalkthrough(container);
}
