// ---------------------------------------------------------------------------
// inflection — the storm-to-forest island mount (ADR-0134 §2, ADR-0123) and,
// since ADR-0145, the ARMING POINT for the Act 2 guided walk.
//
// The ONLY module through which React / three / the R3F island are reachable
// from the experience, and it is reached EXCLUSIVELY via dynamic import() from
// the storm engine at the visitor's one calm-card click — the sanctioned seam
// in the no-WebGL-in-Act-1 wall (the parent repo's check:web-experience walks
// static imports only). NEVER import this module statically from anything the
// entry page reaches at first paint.
//
// It mounts the synced forest-world artifacts (@generated copies — never a
// re-implementation) over a hand-authored EMPTY land: one synthetic dormant
// territory gives the ground its material, then the descriptors are filtered
// to hex-ground ONLY, so the land resolves empty of story nodes. The attested
// landing moment is untouched.
//
// THE WALK ENTRY (ADR-0145): the interim CTA card became the walk invitation
// (index.astro's #storm-land-cta region). This module binds its begin button:
// on begin, the 2.5D walkthrough stage (plain SVG on the shared scene-graph —
// see act2-walkthrough.ts, no WebGL) fades in over the R3F canvas, and the
// island is unmounted once the fade completes so the WebGL context is freed.
// The exported contract is unchanged: mountForestLand(container) → { unmount }
// — the disarm path (skip / Escape / classic-front-page) chains it, so a
// mid-walk exit tears the whole walk down too. Everything here is a pure
// function of fixed data: the same land on every load.
// ---------------------------------------------------------------------------

import { createRoot } from 'react-dom/client';
import {
  buildScene,
  hexCenter,
  type Axial,
  type SceneInput,
  type SceneTerritoryInput,
} from '../lib/forest-world';
import { worldTo3D, type InstanceDescriptor } from '../lib/forest-world-r3f/world-to-3d';
import { ForestWorldCanvas } from '../lib/forest-world-r3f/ForestWorldCanvas';
import { mountWalkthrough, type WalkthroughHandle } from './act2-walkthrough';

// ── the empty land: a compact disc of dormant tiles, no stories ──────────────

/** How long the stage fade-in runs before the WebGL island is released
 *  (index.astro's .act2-stage transition is 900ms; a beat of headroom). */
const STAGE_FADE_MS = 1000;

/** All axial tiles within `radius` rings of the origin (radius 2 → 19 tiles —
 *  enough ground to read as a calm island, not three lonely hexes). */
function discTiles(radius: number): Axial[] {
  const tiles: Axial[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      tiles.push({ q, r });
    }
  }
  return tiles;
}

/**
 * The hand-authored SceneInput (the harness pattern): ONE synthetic dormant
 * territory — status 'proposed' reads pale/wheat, dormant soil — purely to give
 * the ground its material. `empties` stays [] (they map to 'skipped', not
 * ground); no roads, no wisps, no plants. The territory's tree/plate/label all
 * exist in the scene graph but are filtered out below — the land is EMPTY.
 */
function emptyLandInput(): SceneInput {
  const tiles = discTiles(2);
  const centres = tiles.map(hexCenter);
  const cx = centres.reduce((s, c) => s + c.x, 0) / centres.length;
  const cy = centres.reduce((s, c) => s + c.y, 0) / centres.length;
  const territory: SceneTerritoryInput = {
    id: 'first-light',
    status: 'proposed',
    caps: 1,
    centroid: { x: cx, y: cy },
    radius: 64,
    treeSpot: { x: cx, y: cy - 6 },
    labelY: cy + 46,
    coastPaths: [],
    decor: [],
    plants: [],
    treeTitle: '',
    wisps: [],
    plate: { w: 120, h: 33, rx: 7, idY: 14, subY: 27, idText: '', subText: '', title: '' },
  };
  return {
    offset: { x: 0, y: 0 },
    width: 1400,
    height: 1000,
    empties: [],
    relaxedCells: null, // classic extruded-hex ground from drawTiles
    drawTiles: tiles.map((h) => ({ h, owner: 0 })),
    wheatSets: [new Set<string>()],
    roads: [],
    territories: [territory],
  };
}

// ── the mount ────────────────────────────────────────────────────────────────

export interface InflectionHandle {
  /** Tear the island — and, if begun, the walk — down (the disarm path chains
   *  this into its halt). */
  unmount(): void;
}

/**
 * Mount the calm, EMPTY 3D land into `container`: real buildScene over the
 * hand-authored input, the pure worldTo3D mapping, then the descriptors
 * filtered to `hex-ground` ONLY before they reach the canvas — no tree, no
 * plate, no roads, no wisps. Drei MapControls (inside ForestWorldCanvas) make
 * the resolved land navigable. Also arms the Act 2 walk entry (see header).
 */
export function mountForestLand(container: HTMLElement): InflectionHandle {
  const all = worldTo3D(buildScene(emptyLandInput()));
  const grounds = all.filter((d): d is InstanceDescriptor => d.kind === 'hex-ground');
  // The machine-checkable render signal (the harness's summary pattern): counts
  // per kind over what is actually RENDERED — hex-ground > 0, everything else 0.
  const count = (k: string): number => grounds.filter((d) => d.kind === k).length;
  const summary =
    `hex-ground ${count('hex-ground')} · story-tree ${count('story-tree')} · ` +
    `road-strip ${count('road-strip')} · wisp-sprite ${count('wisp-sprite')} · ` +
    `skipped ${count('skipped')}`;
  console.log(`[storm-inflection] descriptors: ${summary}`);

  const root = createRoot(container);
  root.render(<ForestWorldCanvas descriptors={grounds} />);
  let islandAlive = true;
  const unmountIsland = (): void => {
    if (!islandAlive) return;
    islandAlive = false;
    root.unmount(); // frees the WebGL context (the canvas element is removed)
  };

  // ── the Act 2 walk entry (ADR-0145) ──
  const land = container.closest<HTMLElement>('#storm-land');
  const entry = land?.querySelector<HTMLElement>('[data-act2-entry]') ?? null;
  const beginBtn = land?.querySelector<HTMLElement>('[data-act2-begin]') ?? null;
  let walk: WalkthroughHandle | null = null;
  let fadeTimer = 0;
  let prevLandLabel: string | null = null;

  const begin = (): void => {
    if (walk !== null || !land) return;
    const reducedMotion = ((): boolean => {
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch {
        return false;
      }
    })();
    if (entry) entry.hidden = true;
    prevLandLabel = land.getAttribute('aria-label');
    land.setAttribute(
      'aria-label',
      'A guided walk on a staged story map — one step per tap, leave any time',
    );
    // the 2.5D stage mounts (opacity 0), fades up over the R3F canvas, and the
    // island is released once the cross-fade completes. Reduced motion: a cut.
    walk = mountWalkthrough(land, { reducedMotion });
    if (reducedMotion) {
      land.classList.add('act2-cut');
      unmountIsland();
    } else {
      fadeTimer = window.setTimeout(unmountIsland, STAGE_FADE_MS);
    }
  };
  beginBtn?.addEventListener('click', begin);

  return {
    unmount(): void {
      beginBtn?.removeEventListener('click', begin);
      window.clearTimeout(fadeTimer);
      if (walk) {
        walk.unmount();
        walk = null;
      }
      if (land) {
        land.classList.remove('act2-cut');
        if (prevLandLabel !== null) land.setAttribute('aria-label', prevLandLabel);
      }
      unmountIsland();
    },
  };
}
