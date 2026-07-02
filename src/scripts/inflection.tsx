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
// It mounts the synced forest-world artifacts (@generated copies — never a
// re-implementation) over a hand-authored EMPTY land: one synthetic dormant
// territory gives the ground its material, then the descriptors are filtered
// to hex-ground ONLY, so the land resolves empty of story nodes — beat 1 of
// Act 2 plants the first tree later. Everything here is a pure function of
// fixed data: the same land on every load.
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

// ── the empty land: a compact disc of dormant tiles, no stories ──────────────

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
  /** Tear the island down (the disarm path chains this into its halt). */
  unmount(): void;
}

/**
 * Mount the calm, EMPTY 3D land into `container`: real buildScene over the
 * hand-authored input, the pure worldTo3D mapping, then the descriptors
 * filtered to `hex-ground` ONLY before they reach the canvas — no tree, no
 * plate, no roads, no wisps. Drei MapControls (inside ForestWorldCanvas) make
 * the resolved land navigable.
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
  return {
    unmount(): void {
      root.unmount();
    },
  };
}
