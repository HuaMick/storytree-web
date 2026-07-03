// ---------------------------------------------------------------------------
// act2-walkthrough — the visitor-paced SEVEN-beat walkthrough ON THE REAL 2.5D
// MAP (ADR-0145, re-deciding ADR-0134 §3's substrate; grown to a PROGRESSIVE
// multi-island forest by ADR-0147). STATE is the proven engine's (the synced
// act2-director, now holding MULTIPLE stories each with a tri-state status); the
// LOOK is the product's own: each beat folds into the shared `buildScene`
// scene-graph and renders through the same `sceneToSvg` rail the home map rides,
// so the walk inherits the site's `tw-*` vocabulary (TreeWorld.astro's global
// CSS) — never a re-implementation.
//
// Reached EXCLUSIVELY through the inflection seam (act1-storm's dynamic
// import('./inflection') at the transform click; inflection imports this
// module). Plain TS + DOM — NO React, NO three.js, NO WebGL anywhere here.
//
// THE PROGRESSIVE SHAPE (ADR-0147): the walk OPENS on the loved single island
// (one story on one island — beats 1–4 are pixel-identical to the PR #22 opening,
// non-overwhelming) and then GROWS: beat-5 raises the neighbor story-islands,
// beat-6 draws the inter-story roads, beat-7 pulls back to the whole legible
// forest. The expansion is strictly ADDITIVE — the opening island never moves
// when new ones grow in (layout stability), so it never reads as a second storm.
//
// Three layers, in file order:
//   1. THE FOLD — pure: DirectorState.world (N stories) + the script → a fresh
//      SceneInput with N non-overlapping island discs (mesh ground + smoothed
//      coast — the exact home-map substrate), each tree wearing its story's
//      status → SceneStatus (proven→healthy/green, building→proposed/sapling,
//      broken→unhealthy/withered), plus the site metadata the scene cannot carry
//      (limb greenness, road violations, ghost teaching pads, story labels).
//   2. THE STAGE — per tap: fold → buildScene → sceneToSvg → replace the stage
//      SVG contents; site teaching furniture (ghost pads, the violation flag)
//      appended as an own SVG group; camera = a tweened viewBox resolved from
//      each beat's declared CameraTarget. prefers-reduced-motion ⇒ jump-cuts.
//   3. THE PACING UI — game-tutorial CALLOUT BOXES anchored NEXT TO the exact
//      map element each beat teaches (tail pointing at it, clamped on-stage,
//      re-anchored on resize) carrying the narration + the ONE primary Next;
//      Back (pure director replay), progress dots, a quiet persistent skip, and
//      the honest CTA at the end. NOTHING auto-advances; Escape stays the
//      page's global disarm (never intercepted).
//
// Determinism: every piece of geometry and every scene string is a pure
// function of the beat data (hash/rand01 seeding — no Math.random, no
// wall-clock); elapsed time drives MOTION only (the viewBox tween). The same
// beat state renders the identical stage SVG on every visit — Back replay is
// byte-identical, including which islands/roads have grown in.
// ---------------------------------------------------------------------------

import {
  AXIAL_DIRS,
  HEX_R,
  axialKey,
  buildRelaxedCells,
  buildScene,
  crownRadius,
  hash,
  hexCenter,
  hexCorners,
  rand01,
  smoothCoast,
  type Axial,
  type BoundarySeg,
  type DrawTile,
  type Pt,
  type SceneInput,
  type ScenePlantInput,
  type SceneRoadInput,
  type SceneStatus,
  type SceneTerritoryInput,
} from '../lib/forest-world';
import { sceneToSvg } from '../lib/worldSvg';
import {
  advance,
  initialState,
  type Beat,
  type CameraTarget,
  type DirectorState,
  type StoryNode,
  type StoryStatus,
  type WorldState,
} from '../lib/forest-world-r3f/act2-director';
// The FICTION is site-owned (ADR-0093 fictional-data precedent): the walk plays
// the shopping-forest script, not the director's default. The director's pure
// state machine (advance / initialState / the zod contract) is still the engine.
import { walkthroughScript } from './act2-script';
import { DONE_KEY, INTRO, NARRATION, type BeatNarration } from './act2-narration';

// ── the parameters (few, meaningful, named — never a knob per pixel) ─────────

/** Rings of hex tiles in each land disc (2 → 19 tiles, the inflection's island). */
const DISC_RINGS = 2;
/** Scene frame carried into SceneInput (the empty-land idiom). */
const SCENE_W = 1400;
const SCENE_H = 1000;
/** Where the OPENING island (stories[0]) sits inside the scene frame — the
 *  pixel origin of the whole forest. stories[0] stays at axial (0,0), so its
 *  pixels are identical to the PR #22 single-island opening. */
const OFFSET: Pt = { x: 700, y: 420 };
/** Each island territory's declared radius (wisp orbit + plate sizing ride it). */
const ISLAND_R = 64;
/** How far capability limbs sit from the story tree, and their fan spread. */
const LIMB_RING_R = 40;
const LIMB_FAN_STEP = 0.78; // radians between limbs, fanned south of the tree
/** The nameplate row OFFSET below each island's centre — FIXED per island so a
 *  plate never hops when the garden grows (layout stability across beats). */
const PLATE_DY = 80;
/** The fictional teaching pads (road endpoints with no island home) sit on a row
 *  on the open board, south of the OPENING island's coast. */
const GHOST_ROW_DY = 190;
const GHOST_SPACING = 190;
const PAD_RX = 30; // pad platform half-width
/** Road routing: gentle bow on a valid road; the swerve a violating road makes
 *  around the layer it skips (the visual "shortcut" read). */
const ROAD_BOW = 9;
const VIOLATION_DODGE = 44;
const ROAD_SAMPLES = 12; // polyline samples per road
const ROAD_TRIM_TREE = 8; // back a road's end off the tree trunk
const ROAD_TRIM_PLANT = 12; // … off a capability plant
const ROAD_TRIM_PAD = 36; // … off a teaching pad platform
const ROAD_TRIM_ISLAND = 60; // … off an island centre (inter-story roads)
/** Camera: zoom 0 = widest, 1 = tightest (the director's CameraTarget contract).
 *  half-width of the viewBox in scene units at the two extremes. */
const HALF_WIDE = 660;
const HALF_TIGHT = 120;
const CAMERA_MS = 1100; // viewBox tween length (motion only)
const FIT_PAD = 1.14; // a focus bbox always fits with this margin
/** Callout placement. */
const CALLOUT_GAP = 20; // px between the anchor and the callout box
const CALLOUT_MARGIN = 12; // px the callout keeps from the stage edges

// ── the island layout (ADR-0147): a FIXED axial centre per story slot ─────────
//
// Each island is a 2-ring disc placed at a distinct axial centre so the discs
// never overlap AND stay tile-level NON-ADJACENT — the mesh substrate only merges
// same-owner triangles, and the layout keeping islands non-adjacent is exactly
// what guarantees a merge never spans two stories (substrate.ts step 2). The
// slots are verified clear (no shared tile, no hex-neighbour across islands).
//
// stories[0] (the opening) is ALWAYS slot 0 = axial origin, so its pixels are
// unchanged from the single-island opening. Neighbours take the remaining slots
// in the order the walk introduces them (the site script's grow-forest order),
// and a story keeps its slot for the whole walk — an island never hops when a
// later one grows in.
const ISLAND_SLOTS: Axial[] = [
  { q: 0, r: 0 }, // 0 — the opening story, centre (pixel-identical to PR #22)
  { q: 9, r: -4 }, // 1 — upper-right
  { q: -6, r: 6 }, // 2 — lower-left
  { q: 6, r: 5 }, // 3 — lower-right
];

/** All axial tiles within `radius` rings of the origin (the inflection's disc). */
function discTiles(radius: number): Axial[] {
  const tiles: Axial[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      tiles.push({ q, r });
    }
  }
  return tiles;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE FOLD — pure functions of the director's world (N stories) + the script
// ─────────────────────────────────────────────────────────────────────────────

export interface LimbMeta {
  id: string;
  label: string;
  green: boolean;
  signedProof: string | undefined;
  pos: Pt;
}

export interface RoadMeta {
  from: string;
  to: string;
  violation: string | undefined;
  /** The site-routed polyline (scene space, pre-offset). */
  points: Pt[];
}

export interface GhostMeta {
  id: string;
  label: string;
  pos: Pt;
  /** True when this pad is the layer a violating road skips (derived from the
   *  road's declared violation DATA, never invented). */
  bypassed: boolean;
}

/** One folded island — its story id/label/status, tree spot + centre, and (for
 *  the opening island only) the limbs/ghosts that hang off it. */
export interface IslandMeta {
  storyId: string;
  label: string;
  status: StoryStatus;
  hasWisp: boolean;
  /** Slot index → the island's axial centre; drives its pixel placement. */
  slot: number;
  /** The island centre in scene space (pre-offset). */
  centre: Pt;
  /** The story tree's spot in scene space (pre-offset). */
  treeSpot: Pt;
  /** The disc's tiles, in ABSOLUTE axial coords (centre-shifted). */
  tiles: Axial[];
}

export interface FoldedWorld {
  sceneInput: SceneInput;
  /** True before beat 1: the land is empty (no stories planted yet). The
   *  synthetic ground territory still exists in the scene graph (a territory
   *  always emits a tree), so the pre-story render suppresses the flora/hits
   *  layers via the `is-prestory` class on the stage svg. */
  preStory: boolean;
  /** Every island currently in the world (stories[0] first). */
  islands: IslandMeta[];
  /** Capability limbs of the OPENING story (the director's branch-caps targets
   *  stories[0]); positioned around island 0's tree. */
  limbs: LimbMeta[];
  roads: RoadMeta[];
  ghosts: GhostMeta[];
  /** The violation flag's anchor (the violating road's apex), when one exists. */
  flagAt: (Pt & { layer: string; violation: string }) | null;
  /** The OPENING island's ground bounds (scene space, pre-offset) — the camera's
   *  single-island frame + intro anchor. */
  islandRect: Rect;
  /** Bounds of every GROWN island (scene space, pre-offset) — the forest frame. */
  forestRect: Rect;
  /** Bounds of the inter-story road network (scene space, pre-offset). */
  interRoadRect: Rect;
  /** Everything drawn (islands + pads + labels + roads) — the full frame. */
  contentRect: Rect;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Union of a list of rects (empty → a zero rect at origin). */
function unionRects(rects: Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Sample a quadratic bezier A→(ctrl)→B into n points (emitted as an M/L
 *  polyline `d`). */
function sampleQuadratic(a: Pt, ctrl: Pt, b: Pt, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const u = 1 - t;
    pts.push({
      x: u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y,
    });
  }
  return pts;
}

const f = (n: number): string => n.toFixed(1);

function polylineD(pts: Pt[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${f(p.x)} ${f(p.y)}`).join(' ');
}

/** Move `a` toward `b` by `dist` (road end trimming). */
function toward(a: Pt, b: Pt, dist: number): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const k = Math.min(0.45, dist / len);
  return { x: a.x + dx * k, y: a.y + dy * k };
}

/** The layer a violating road bypasses, parsed from the violation's declared
 *  antipattern name (e.g. 'layer-violation:ui-bypasses-service' → 'service').
 *  Data-derived — no violation string, no pad. */
export function bypassedLayerOf(violation: string): string | null {
  const m = /bypasses-([a-z0-9-]+)$/.exec(violation);
  return m ? m[1]! : null;
}

/** Plain display label for a fictional teaching pad — tuned to the shopping
 *  fiction so beat 4's furniture reads concrete (the ids stay ui/db/service so
 *  bypassedLayerOf still resolves the skipped layer from the violation data). */
function ghostLabel(id: string): string {
  const KNOWN: Record<string, string> = {
    ui: 'the checkout screen',
    db: 'the orders database',
    service: 'the payment service',
  };
  return KNOWN[id] ?? id;
}

/** The site's amber "in progress" hue for a story WITHOUT an explicit tri-state
 *  status yet — the opening story (stories[0]) before the forest grows. It NEVER
 *  folds 'healthy' (the story's own proof is not in this fiction; only one cap's
 *  proof is — green is earned per-limb, never claimed at the story level). */
const OPENING_STATUS: SceneStatus = 'proposed';

/** Fold a story's tri-state proof status → the scene's visual status (ADR-0147).
 *  This is what makes the pull-back legend HONEST: proven→green, building→sapling
 *  (the young amber form), broken→withered. */
function statusToScene(status: StoryStatus): SceneStatus {
  switch (status) {
    case 'proven':
      return 'healthy';
    case 'building':
      return 'proposed';
    case 'broken':
      return 'unhealthy';
  }
}

/** A story's scene status: the opening story (index 0, planted by plant-story)
 *  wears the amber opening hue until it earns otherwise; a grown neighbour wears
 *  its declared tri-state status. plant-story seeds stories[0] with status
 *  'building', so we special-case index 0 to the opening hue (it is the arc's ONE
 *  story whose own proof is deliberately not in the fiction). */
function sceneStatusForStory(story: StoryNode, index: number): SceneStatus {
  return index === 0 ? OPENING_STATUS : statusToScene(story.status);
}

/**
 * THE FOLD: the director's accumulated WorldState (N stories) + the script → a
 * fresh SceneInput with one non-overlapping island disc per story, over the exact
 * home-map substrate (mesh ground + smoothed coast from the shared core), plus
 * the site metadata the scene cannot carry. Pure and deterministic — a beat state
 * always folds identically (which islands/roads exist is a pure function of the
 * beats applied), and every island's ground layer is identical across every beat
 * (its fixed disc; decor/wheat seeded by absolute tile key only).
 */
export function foldWorldToScene(world: WorldState, script: Beat[]): FoldedWorld {
  const preStory = world.stories.length === 0;

  // ── place every story on its fixed slot (layout-stable) ──
  const islands: IslandMeta[] = world.stories.map((story, index) => {
    const slot = Math.min(index, ISLAND_SLOTS.length - 1);
    const c = ISLAND_SLOTS[slot] ?? { q: 0, r: 0 };
    const localTiles = discTiles(DISC_RINGS);
    const tiles = localTiles.map((t) => ({ q: t.q + c.q, r: t.r + c.r }));
    const centres = tiles.map(hexCenter);
    const cx = centres.reduce((s, p) => s + p.x, 0) / centres.length;
    const cy = centres.reduce((s, p) => s + p.y, 0) / centres.length;
    return {
      storyId: story.id,
      label: story.label,
      status: story.status,
      hasWisp: story.hasWisp,
      slot,
      centre: { x: cx, y: cy },
      treeSpot: { x: cx, y: cy - 6 },
      tiles,
    };
  });
  // The opening island (stories[0]) — the anchor for limbs, ghosts, within-story
  // roads. A safe synthetic origin island for the pre-story frame.
  const opening: IslandMeta =
    islands[0] ??
    ((): IslandMeta => {
      const localTiles = discTiles(DISC_RINGS);
      const centres = localTiles.map(hexCenter);
      const cx = centres.reduce((s, p) => s + p.x, 0) / centres.length;
      const cy = centres.reduce((s, p) => s + p.y, 0) / centres.length;
      return {
        storyId: '',
        label: '',
        status: 'building',
        hasWisp: false,
        slot: 0,
        centre: { x: cx, y: cy },
        treeSpot: { x: cx, y: cy - 6 },
        tiles: localTiles,
      };
    })();
  const islandById = new Map(islands.map((i) => [i.storyId, i] as const));

  // ── the opening story's capability limbs (branch-caps targets stories[0]) ──
  const openingStory = world.stories[0];
  const worldLimbs = openingStory?.limbs ?? [];
  const limbs: LimbMeta[] = worldLimbs.map((limb, i) => {
    const n = worldLimbs.length;
    const a = Math.PI / 2 + (i - (n - 1) / 2) * LIMB_FAN_STEP;
    const r = LIMB_RING_R + (rand01(hash(`${limb.id}:ring`)) - 0.5) * 8;
    return {
      id: limb.id,
      label: limb.label,
      green: limb.green,
      signedProof: limb.signedProof,
      pos: {
        x: opening.treeSpot.x + Math.cos(a) * r * 1.2,
        y: opening.treeSpot.y + Math.sin(a) * r * 0.85 + 8,
      },
    };
  });
  const limbById = new Map(limbs.map((l) => [l.id, l] as const));

  // ── classify each road endpoint: a story island, a limb, or a teaching pad ──
  const isStory = (id: string): boolean => islandById.has(id);
  const isLimb = (id: string): boolean => limbById.has(id);

  // Fictional teaching pads: within-story road endpoints with no island/limb home
  // (the ui/db/service ids) get a spot on the row south of the OPENING island.
  const ghostIds: string[] = [];
  for (const road of world.roads) {
    for (const end of [road.from, road.to]) {
      if (!isStory(end) && !isLimb(end) && !ghostIds.includes(end)) ghostIds.push(end);
    }
  }
  const ghosts: GhostMeta[] = ghostIds.map((id, i) => ({
    id,
    label: ghostLabel(id),
    pos: {
      x: opening.centre.x + (i - (ghostIds.length - 1) / 2) * GHOST_SPACING,
      y: opening.centre.y + GHOST_ROW_DY,
    },
    bypassed: false,
  }));
  const ghostById = new Map(ghosts.map((g) => [g.id, g] as const));

  const anchorOf = (id: string): Pt => {
    const isle = islandById.get(id);
    if (isle) return { x: isle.treeSpot.x, y: isle.treeSpot.y + 4 };
    return limbById.get(id)?.pos ?? ghostById.get(id)?.pos ?? opening.centre;
  };

  // Stage the bypassed layer's pad for each violating road (data-derived: the
  // declared antipattern name says which layer was skipped).
  for (const road of world.roads) {
    if (road.violation === undefined) continue;
    const layer = bypassedLayerOf(road.violation);
    if (layer === null || ghostById.has(layer)) continue;
    const a = anchorOf(road.from);
    const b = anchorOf(road.to);
    const pad: GhostMeta = {
      id: layer,
      label: ghostLabel(layer),
      pos: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      bypassed: true,
    };
    ghosts.push(pad);
    ghostById.set(layer, pad);
  }

  // ── route the roads ──
  // A within-story road (limb/pad endpoints) bows gently; a violating road
  // swerves AROUND the layer it skips (the shortcut read). An INTER-STORY road
  // (both endpoints are islands) bows gently island→island, trimmed off each
  // centre. Geometry from data + parameters — no hand-placed coordinates.
  const trimOf = (id: string): number => {
    if (isStory(id)) return ROAD_TRIM_ISLAND;
    if (isLimb(id)) return ROAD_TRIM_PLANT;
    if (ghostById.has(id)) return ROAD_TRIM_PAD;
    return ROAD_TRIM_TREE;
  };
  let flagAt: FoldedWorld['flagAt'] = null;
  const interRoadPts: Pt[] = [];
  const roads: RoadMeta[] = world.roads.map((road) => {
    const rawA = anchorOf(road.from);
    const rawB = anchorOf(road.to);
    const a = toward(rawA, rawB, trimOf(road.from));
    const b = toward(rawB, rawA, trimOf(road.to));
    const mid: Pt = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    // unit perpendicular of A→B
    const px = -(b.y - a.y) / len;
    const py = (b.x - a.x) / len;
    const bow = road.violation === undefined ? ROAD_BOW : VIOLATION_DODGE;
    // dodge consistently to one side; the side is seeded by the pair id
    const side = rand01(hash(`${road.from}->${road.to}:side`)) < 0.5 ? 1 : -1;
    const ctrl: Pt = { x: mid.x + px * bow * side, y: mid.y + py * bow * side };
    const points = sampleQuadratic(a, ctrl, b, ROAD_SAMPLES);
    if (isStory(road.from) && isStory(road.to)) interRoadPts.push(...points);
    if (road.violation !== undefined && flagAt === null) {
      const apex = points[Math.floor(points.length / 2)]!;
      const skipped = bypassedLayerOf(road.violation);
      flagAt = {
        x: apex.x,
        y: apex.y,
        // the friendly label (e.g. 'the payment service'), so the flag caption
        // matches the bypassed pad exactly — no 'the service layer' vs
        // 'the payment service' mismatch between the two teaching marks.
        layer: skipped === null ? 'a required layer' : ghostLabel(skipped),
        violation: road.violation,
      };
    }
    return { from: road.from, to: road.to, violation: road.violation, points };
  });

  // ── build every island's territory + its ground tiles + wheat ──
  const territories: SceneTerritoryInput[] = [];
  const drawTiles: DrawTile[] = [];
  const wheatSets: Set<string>[] = [];

  islands.forEach((isle, index) => {
    const status = sceneStatusForStory(world.stories[index]!, index);
    // fixed decor + wheat, seeded by ABSOLUTE tile key only (never the story id),
    // so an island's ground never changes between beats.
    const decor: { x: number; y: number; seed: number }[] = [];
    const wheat = new Set<string>();
    for (const tile of isle.tiles) {
      const key = axialKey(tile);
      const c = hexCenter(tile);
      const roll = rand01(hash(`act2:dec:${key}`));
      const nearTree = Math.hypot(c.x - isle.treeSpot.x, c.y - isle.treeSpot.y) < 55;
      const inGarden = c.y > isle.centre.y + 8; // the southern band limbs+plate own
      if (roll < 0.42 && !nearTree && !inGarden) {
        decor.push({ x: c.x, y: c.y, seed: hash(`act2:${key}:f`) });
      } else if (roll >= 0.42 && roll < 0.62 && !nearTree) {
        wheat.add(key);
      }
      drawTiles.push({ h: tile, owner: index });
    }
    wheatSets.push(wheat);

    // limbs render as flora only on the OPENING island (index 0).
    const islePlants: ScenePlantInput[] =
      index === 0
        ? limbs.map((l) => ({
            id: l.id,
            status: (l.green ? 'healthy' : 'proposed') as SceneStatus,
            x: l.pos.x,
            y: l.pos.y,
            title: l.green
              ? `${l.label} — proven (signed proof ${l.signedProof ?? ''})`
              : `${l.label} — in progress, no signed proof yet`,
          }))
        : [];

    const plateW = Math.max(120, isle.label.length * 7.6 + 26);
    const caps = index === 0 ? limbs.length : 0;
    // the sub-line names the story's state in plain shopping words.
    const sub =
      index === 0
        ? 'a story'
        : world.stories[index]!.status === 'proven'
          ? 'proven'
          : world.stories[index]!.status === 'broken'
            ? 'broken'
            : 'in progress';

    const territory: SceneTerritoryInput = {
      id: isle.storyId,
      status,
      caps,
      centroid: { x: isle.centre.x, y: isle.centre.y },
      radius: ISLAND_R,
      treeSpot: isle.treeSpot,
      labelY: isle.centre.y + PLATE_DY,
      coastPaths: [], // filled below (the smoothed coast)
      decor,
      plants: islePlants,
      treeTitle: `${isle.label} — ${sub}`,
      wisps: isle.hasWisp
        ? [{ runId: `walk:${isle.storyId}`, title: 'an agent at work — you can look away' }]
        : [],
      plate: {
        w: plateW,
        h: 34,
        rx: 7,
        idY: 15,
        subY: 28,
        idText: isle.label,
        subText: sub,
        title: isle.label,
      },
    };

    // the smoothed organic coastline of THIS disc (the exact home-map recipe),
    // seeded by the island's own id so each coast is stable + distinct.
    const mine = new Set(isle.tiles.map(axialKey));
    const segs: BoundarySeg[] = [];
    for (const tile of isle.tiles) {
      const c = hexCenter(tile);
      const cor = hexCorners(c.x, c.y, HEX_R);
      AXIAL_DIRS.forEach((d, e) => {
        if (mine.has(axialKey({ q: tile.q + d.q, r: tile.r + d.r }))) return;
        const a = cor[e];
        const b = cor[(e + 1) % 6];
        if (a && b) segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      });
    }
    territory.coastPaths = smoothCoast(segs, `act2-island:${isle.slot}`).paths;
    territories.push(territory);
  });

  // Pre-story: one synthetic dormant ground holder (its tree/plate/hit are
  // suppressed by the is-prestory render) so the empty land still has material.
  if (preStory) {
    const localTiles = discTiles(DISC_RINGS);
    const wheat = new Set<string>();
    for (const tile of localTiles) {
      const key = axialKey(tile);
      const c = hexCenter(tile);
      const roll = rand01(hash(`act2:dec:${key}`));
      const nearTree = Math.hypot(c.x - opening.treeSpot.x, c.y - opening.treeSpot.y) < 55;
      const inGarden = c.y > opening.centre.y + 8;
      if (roll >= 0.42 && roll < 0.62 && !nearTree && !inGarden) wheat.add(key);
      drawTiles.push({ h: tile, owner: 0 });
    }
    wheatSets.push(wheat);
    const mine = new Set(localTiles.map(axialKey));
    const segs: BoundarySeg[] = [];
    for (const tile of localTiles) {
      const c = hexCenter(tile);
      const cor = hexCorners(c.x, c.y, HEX_R);
      AXIAL_DIRS.forEach((d, e) => {
        if (mine.has(axialKey({ q: tile.q + d.q, r: tile.r + d.r }))) return;
        const a = cor[e];
        const b = cor[(e + 1) % 6];
        if (a && b) segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      });
    }
    territories.push({
      id: 'first-light',
      status: 'proposed',
      caps: 1,
      centroid: { x: opening.centre.x, y: opening.centre.y },
      radius: ISLAND_R,
      treeSpot: opening.treeSpot,
      labelY: opening.centre.y + PLATE_DY,
      coastPaths: smoothCoast(segs, 'act2-island:0').paths,
      decor: [],
      plants: [],
      treeTitle: '',
      wisps: [],
      plate: { w: 120, h: 34, rx: 7, idY: 15, subY: 28, idText: '', subText: '', title: '' },
    });
  }

  const sceneRoads: SceneRoadInput[] = roads.map((r) => ({
    from: r.from,
    to: r.to,
    d: polylineD(r.points),
    title:
      r.violation === undefined
        ? `${r.to} depends on ${r.from}`
        : `${r.from} → ${r.to} — flagged: ${r.violation}`,
  }));

  // The mesh ground over every island's disc — the same shared-core call the home
  // map makes (`buildRelaxedCells(..., 'mesh')`); owner = the story index.
  const relaxedCells = buildRelaxedCells(drawTiles, wheatSets, 'mesh');

  const sceneInput: SceneInput = {
    offset: { x: OFFSET.x, y: OFFSET.y },
    width: SCENE_W,
    height: SCENE_H,
    empties: [],
    relaxedCells,
    drawTiles: [],
    wheatSets: [],
    roads: sceneRoads,
    territories,
  };

  // ── bounds (scene space, pre-offset) ──
  const islandRectOf = (isle: IslandMeta): Rect => ({
    x: isle.centre.x - 124,
    y: isle.centre.y - 116,
    w: 248,
    h: 232 + (PLATE_DY - 80) + 36,
  });
  // the OPENING island frame (the single-island beats + intro anchor).
  const islandRect: Rect = preStory
    ? { x: opening.centre.x - 124, y: opening.centre.y - 116, w: 248, h: 232 }
    : islandRectOf(opening);
  // the forest frame — every grown island + its plate row.
  const grownRects = islands.map((isle) => ({
    x: isle.centre.x - 124,
    y: isle.centre.y - 116,
    w: 248,
    h: 248 + PLATE_DY - 80,
  }));
  const forestRect = islands.length ? unionRects(grownRects) : islandRect;
  // the inter-story road-network frame (beat 6). Falls back to the forest when
  // no inter-story road exists yet.
  const interRoadRect =
    interRoadPts.length > 0
      ? (() => {
          const xs = interRoadPts.map((p) => p.x);
          const ys = interRoadPts.map((p) => p.y);
          const minX = Math.min(...xs) - 30;
          const maxX = Math.max(...xs) + 30;
          const minY = Math.min(...ys) - 30;
          const maxY = Math.max(...ys) + 30;
          return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        })()
      : forestRect;
  // the full content frame — islands + pads + labels.
  const extra: Rect[] = ghosts.map((g) => ({
    x: g.pos.x - PAD_RX - 26,
    y: g.pos.y - 20,
    w: (PAD_RX + 26) * 2,
    h: 54,
  }));
  const contentRect = unionRects([forestRect, islandRect, ...extra]);

  return {
    sceneInput,
    preStory,
    islands,
    limbs,
    roads,
    ghosts,
    flagAt,
    islandRect,
    forestRect,
    interRoadRect,
    contentRect,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE STAGE — scene string + site furniture + the viewBox camera
// ─────────────────────────────────────────────────────────────────────────────

const escXml = (s: unknown): string =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** The teaching pads + violation flag — SITE furniture derived from the fold
 *  metadata (RoadMeta.violation is DATA, never a presentation guess), appended
 *  into the stage svg AFTER the scene group so it draws on top. Every wrapper
 *  group is transform-free (the translate rides an inner group) so the enter
 *  animation's CSS transform cannot clobber an SVG transform attribute. */
function furnitureSvg(fold: FoldedWorld, entering: boolean): string {
  let out = '';
  for (const g of fold.ghosts) {
    const enter = entering ? ' act2-enter' : '';
    out +=
      `<g class="act2-pad${g.bypassed ? ' is-bypassed' : ''}${enter}" data-act2-pad="${escXml(g.id)}">` +
      `<g transform="translate(${f(g.pos.x + OFFSET.x)} ${f(g.pos.y + OFFSET.y)})">` +
      `<title>${escXml(g.bypassed ? `${g.label} — skipped by the flagged road` : `${g.label} (not part of this story — shown to teach roads)`)}</title>` +
      `<ellipse class="pad-shadow" cx="2" cy="3" rx="${f(PAD_RX)}" ry="10.5"/>` +
      `<ellipse class="pad-top" cx="0" cy="0" rx="${f(PAD_RX)}" ry="10"/>` +
      (g.bypassed ? `<text class="pad-tag" x="0" y="-17" text-anchor="middle">skipped</text>` : '') +
      `<text class="pad-label" x="0" y="27" text-anchor="middle">${escXml(g.label)}</text>` +
      `</g></g>`;
  }
  if (fold.flagAt) {
    const v = fold.flagAt;
    const enter = entering ? ' act2-enter' : '';
    const line = `wrong way — skips ${v.layer}`;
    out +=
      `<g class="act2-flag${enter}" data-act2-violation="${escXml(v.violation)}" role="img" aria-label="${escXml(`Flagged: this road skips ${v.layer}`)}">` +
      `<g transform="translate(${f(v.x + OFFSET.x)} ${f(v.y + OFFSET.y)})">` +
      `<path class="flag-post" d="M 0 2 L 0 -20"/>` +
      `<path class="flag-cloth" d="M 0 -20 L 15 -15.5 L 0 -11 Z"/>` +
      `<rect class="flag-bg" x="-92" y="-46" width="184" height="18" rx="9"/>` +
      `<text class="flag-text" x="0" y="-33.5" text-anchor="middle">${escXml(line)}</text>` +
      `</g></g>`;
  }
  return out;
}

/** The stage svg for one beat state: the worldSvg shell pattern with act2's own
 *  defs ids (`a2-*`, so nothing depends on the hidden home-map svg), the walked
 *  scene-graph, then the site furniture. Pure string of the fold. */
function stageSvg(fold: FoldedWorld, beatIndex: number, viewBox: string): string {
  let scene = sceneToSvg(buildScene(fold.sceneInput));
  // the scene's road marker references the home map's defs id — retarget it at
  // this svg's own copy so the stage is self-contained.
  scene = scene.split('url(#tw-arrow)').join('url(#a2-arrow)');

  const label =
    'A staged map of a fictional shopping project growing on quiet ground — the same look as ' +
    'the real storytree map. Nothing here is live; each Next step adds one idea.';
  return (
    `<svg class="tw-svg act2-svg${fold.preStory ? ' is-prestory' : ''}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" role="group" aria-roledescription="illustrated map" aria-label="${escXml(label)}" data-act2-beat="${beatIndex}">` +
    `<defs>` +
    `<radialGradient id="a2-board" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#fbf3ea"/><stop offset="1" stop-color="#edd9c9"/></radialGradient>` +
    `<marker id="a2-arrow" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1.4 L 8 5 L 0 8.6 z"/></marker>` +
    `<marker id="a2-arrow-bad" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1.4 L 8 5 L 0 8.6 z"/></marker>` +
    `</defs>` +
    `<rect class="tw-bg act2-bg" x="0" y="0" width="${SCENE_W}" height="${SCENE_H}"/>` +
    scene +
    furnitureSvg(fold, beatIndex === 4) +
    `</svg>`
  );
}

/** What each beat ADDS over the previous one — the groups that wear the enter
 *  animation on arrival (a pure function of the beat index, so a Back-replay
 *  re-renders the identical DOM and replays the same growth). `scale` is only
 *  ever put on transform-attribute-free groups (a CSS transform would clobber
 *  an SVG transform attribute); everything else fades.
 *
 *  ADR-0147 beats 5–7: beat-5 grows the NEIGHBOUR islands (their coast/ground/
 *  flora groups scale/fade in — those groups carry the story-id `data-id`, so we
 *  target the newly-present islands by id, NOT the opening island); beat-6 fades
 *  the inter-story roads in; beat-7 pull-back is a camera move only. */
function enterSelectorsFor(
  beatIndex: number,
  fold: FoldedWorld,
): { scale: string[]; fade: string[] } {
  switch (beatIndex) {
    case 1:
      return { scale: ['.tw-flora-layer .tw-terr'], fade: [] };
    case 2:
      return { scale: [], fade: ['.tw-wisps'] };
    case 3:
      return { scale: [], fade: ['.tw-flora-layer .tw-flora'] };
    case 4:
      // pads + flag carry their enter class from the furniture string builder.
      return { scale: [], fade: ['.tw-roads .tw-road'] };
    case 5: {
      // the neighbour islands (every island except the opening, index 0): their
      // ground, coast and flora groups fade in; the flora group scales (it is a
      // transform-free `<g>`). Target by the story-id `data-id`.
      const neighbourIds = fold.islands.slice(1).map((i) => i.storyId);
      const fade: string[] = [];
      const scale: string[] = [];
      for (const id of neighbourIds) {
        fade.push(`.tw-ground[data-id="${cssEsc(id)}"]`);
        fade.push(`.tw-isle[data-id="${cssEsc(id)}"]`);
        scale.push(`.tw-terr[data-id="${cssEsc(id)}"]`);
      }
      return { scale, fade };
    }
    case 6:
      // the inter-story roads fade in (they are the roads added THIS beat; every
      // road is re-rendered each beat, so fading all roads on beat 6 replays the
      // same growth — the within-story roads were already visible at beat 4, so
      // only the two new inter-story roads visibly appear).
      return { scale: [], fade: ['.tw-roads .tw-road'] };
    default:
      return { scale: [], fade: [] };
  }
}

/** CSS.escape-lite for a story id inside an attribute selector (our ids are
 *  `[a-z-]+`, so this is belt-and-braces for a stray char). */
function cssEsc(s: string): string {
  return s.replace(/["\\]/g, '\\$&');
}

// ── the camera: a beat's declared CameraTarget → a viewBox rect ──────────────

interface CamRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Resolve a semantic focus anchor to a scene rect (pre-offset). */
function focusRect(fold: FoldedWorld, focus: string): Rect {
  const opening = fold.islands[0];
  const openTree = opening?.treeSpot ?? { x: 0, y: 0 };
  const treeTop = openTree.y - (2.72 * crownRadius(fold.limbs.length) + 18);
  const plateBottom = (opening?.centre.y ?? 0) + PLATE_DY + 36;
  switch (focus) {
    case 'story-tree': {
      const w = Math.max(200, fold.sceneInput.territories[0]?.plate.w ?? 160) + 40;
      const cx = openTree.x;
      return { x: cx - w / 2, y: treeTop - 8, w, h: plateBottom - treeTop + 16 };
    }
    case 'dag-view': {
      // the opening island + its teaching pads (beat 4).
      const extra: Rect[] = fold.ghosts.map((g) => ({
        x: g.pos.x - PAD_RX - 26,
        y: g.pos.y - 20,
        w: (PAD_RX + 26) * 2,
        h: 54,
      }));
      return unionRects([fold.islandRect, ...extra]);
    }
    case 'forest-overview':
      // the growing multi-island bounds (beat 5).
      return fold.forestRect;
    case 'forest-dag':
      // the inter-story road-network bounds (beat 6), padded to keep both
      // connected islands legible.
      return unionRects([fold.interRoadRect, fold.forestRect]);
    case 'full-forest':
      return fold.contentRect;
    case 'origin':
    default:
      return fold.islandRect;
  }
}

/** The declared CameraTarget → an aspect-matched viewBox rect (absolute scene
 *  coordinates). zoom 0 = widest, 1 = tightest; the focus bbox always fits. */
function cameraRect(fold: FoldedWorld, cam: CameraTarget, aspect: number): CamRect {
  const rect = focusRect(fold, cam.focus);
  const cxa = rect.x + rect.w / 2 + OFFSET.x;
  const cya = rect.y + rect.h / 2 + OFFSET.y;
  const zoom = Math.min(1, Math.max(0, cam.zoom));
  let halfW = HALF_WIDE - zoom * (HALF_WIDE - HALF_TIGHT);
  halfW = Math.max(halfW, (rect.w / 2) * FIT_PAD, (rect.h / 2) * FIT_PAD * aspect);
  const halfH = halfW / aspect;
  return { x: cxa - halfW, y: cya - halfH, w: halfW * 2, h: halfH * 2 };
}

const vbString = (r: CamRect): string => `${f(r.x)} ${f(r.y)} ${f(r.w)} ${f(r.h)}`;

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE PACING UI + the mount (plain DOM, the act1-storm idiom)
// ─────────────────────────────────────────────────────────────────────────────

export interface WalkthroughHandle {
  unmount(): void;
}

export interface WalkthroughOptions {
  /** Jump-cut everything (camera, growth, the stage fade) — the visitor prefers
   *  reduced motion. Read once by the caller at begin. */
  reducedMotion: boolean;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Replay the pure director from zero to `n` beats (Back is cheap by design). */
function stateAt(n: number, script: Beat[]): DirectorState {
  let s = initialState;
  for (let i = 0; i < n; i++) s = advance(s, script);
  return s;
}

/** The per-beat callout anchor, in scene space (pre-offset): the exact map
 *  element the beat teaches. Also names the DOM selector the witness can hold
 *  the anchoring against. */
function anchorFor(fold: FoldedWorld, beatIndex: number): { rect: Rect; selector: string } {
  const opening = fold.islands[0];
  const openTree = opening?.treeSpot ?? { x: 0, y: 0 };
  const orbitR = ISLAND_R * 0.72 + 10;
  switch (beatIndex) {
    case 1: {
      const w = (fold.sceneInput.territories[0]?.plate.w ?? 160) + 24;
      const top = openTree.y - (2.72 * crownRadius(fold.limbs.length) + 18);
      return {
        rect: { x: openTree.x - w / 2, y: top, w, h: (opening?.centre.y ?? 0) + PLATE_DY + 34 - top },
        selector: '.tw-flora-layer .tw-terr',
      };
    }
    case 2:
      return {
        rect: {
          x: openTree.x - orbitR - 14,
          y: (opening?.centre.y ?? 0) - orbitR - 14,
          w: orbitR * 2 + 28,
          h: orbitR * 2 + 28,
        },
        selector: '.tw-wisps',
      };
    case 3: {
      const green = fold.limbs.find((l) => l.green);
      const p = green?.pos ?? openTree;
      return {
        rect: { x: p.x - 16, y: p.y - 22, w: 32, h: 34 },
        selector: green ? `.tw-flora[data-id="${green.id}"]` : '.tw-terr',
      };
    }
    case 4: {
      const v = fold.flagAt;
      if (v) {
        return {
          rect: { x: v.x - 95, y: v.y - 50, w: 190, h: 62 },
          selector: '.act2-flag',
        };
      }
      return { rect: fold.islandRect, selector: '.tw-roads' };
    }
    case 5: {
      // near the newly-risen neighbours — the union of the neighbour islands.
      const neighbours = fold.islands.slice(1);
      if (neighbours.length > 0) {
        const rect = unionRects(
          neighbours.map((i) => ({ x: i.centre.x - 100, y: i.centre.y - 100, w: 200, h: 200 })),
        );
        const firstId = neighbours[0]?.storyId;
        return { rect, selector: firstId ? `.tw-terr[data-id="${firstId}"]` : '.act2-svg' };
      }
      return { rect: fold.forestRect, selector: '.act2-svg' };
    }
    case 6: {
      // near the blast-radius road into the withered (broken) story.
      const broken = fold.islands.find((i) => i.status === 'broken');
      const interRoad = fold.roads.find(
        (r) =>
          r.violation === undefined &&
          fold.islands.some((i) => i.storyId === r.from) &&
          fold.islands.some((i) => i.storyId === r.to) &&
          (broken ? r.to === broken.storyId || r.from === broken.storyId : true),
      );
      if (interRoad) {
        const mid = interRoad.points[Math.floor(interRoad.points.length / 2)]!;
        return {
          rect: { x: mid.x - 70, y: mid.y - 50, w: 140, h: 100 },
          selector: `.tw-road[data-from="${interRoad.from}"][data-to="${interRoad.to}"]`,
        };
      }
      return { rect: fold.interRoadRect, selector: '.tw-roads' };
    }
    case 7:
      return { rect: fold.contentRect, selector: '.act2-svg' };
    case 0:
    default:
      return { rect: fold.islandRect, selector: '.tw-land' };
  }
}

/**
 * Mount the walkthrough into the land layer. One container in, one unmount()
 * out — the inflection seam chains it into the page's existing disarm path
 * (Escape / skip / the classic-page affordance), so teardown is total.
 */
export function mountWalkthrough(land: HTMLElement, opts: WalkthroughOptions): WalkthroughHandle {
  const script = walkthroughScript;
  const reducedMotion = opts.reducedMotion;

  // ── state ──
  let director = initialState;
  let cta = false;
  let disposed = false;

  // ── the stage scaffold (plain DOM; styled by index.astro's global CSS) ──
  const stage = el('div', 'act2-stage');
  stage.setAttribute('data-act2-stage', '');
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', 'Guided walkthrough — a staged story map, one step per tap');

  const canvas = el('div', 'act2-canvas');
  canvas.setAttribute('data-act2-canvas', '');

  // the quiet persistent skip (game-tutorial corner affordance)
  const skipBar = el('div', 'act2-skipbar');
  const skipBtn = el('button', 'act2-skip', 'skip the walk →');
  skipBtn.type = 'button';
  skipBtn.setAttribute('data-act2-skip', '');
  skipBar.appendChild(skipBtn);

  // the anchored callout box (narration + the one primary Next)
  const callout = el('div', 'act2-callout');
  callout.setAttribute('data-act2-callout', '');
  callout.setAttribute('role', 'group');
  callout.setAttribute('aria-label', 'Walk narration');
  const tail = el('div', 'act2-tail');
  tail.setAttribute('aria-hidden', 'true');
  const head = el('div', 'act2-head');
  const step = el('p', 'act2-step');
  step.setAttribute('data-act2-step', '');
  const dots = el('div', 'act2-dots');
  dots.setAttribute('aria-hidden', 'true');
  const dotEls: HTMLElement[] = [];
  for (let i = 0; i < script.length; i++) {
    const d = el('span', 'act2-dot');
    dotEls.push(d);
    dots.appendChild(d);
  }
  head.append(step, dots);
  const voice = el('div', 'act2-voice');
  voice.setAttribute('aria-live', 'polite');
  const title = el('h2', 'act2-title');
  const body = el('p', 'act2-body');
  voice.append(title, body);
  // the pull-back legend (site furniture, shown only on the final pull-back)
  const legend = el('ul', 'act2-legend');
  legend.setAttribute('aria-label', 'How to read the map');
  legend.innerHTML =
    '<li><span class="k k-green" aria-hidden="true"></span>green — proven</li>' +
    '<li><span class="k k-pale" aria-hidden="true"></span>sapling — in progress</li>' +
    '<li><span class="k k-with" aria-hidden="true"></span>withered — broken</li>';
  legend.hidden = true;
  voice.append(legend);
  const controls = el('div', 'act2-controls');
  const backBtn = el('button', 'act2-back', '← back');
  backBtn.type = 'button';
  backBtn.setAttribute('data-act2-back', '');
  const nextBtn = el('button', 'act2-next btn btn--primary', 'next →');
  nextBtn.type = 'button';
  nextBtn.setAttribute('data-act2-next', '');
  controls.append(backBtn, nextBtn);
  callout.append(tail, head, voice, controls);

  // the honest diorama-closing CTA (revealed at the end; every exit is real)
  const done = el('div', 'act2-done');
  done.setAttribute('data-act2-cta', '');
  done.setAttribute('role', 'group');
  done.setAttribute('aria-label', 'The end of the walk — where to next');
  const doneTitle = el('h2', 'act2-title', NARRATION[DONE_KEY]!.title);
  const doneBody = el('p', 'act2-body', NARRATION[DONE_KEY]!.body);
  const doneNav = document.createElement('nav');
  doneNav.className = 'act2-done-links';
  doneNav.setAttribute('aria-label', 'Where to next');
  const ctaHow = document.createElement('a');
  ctaHow.className = 'btn btn--primary';
  ctaHow.href = '/how-it-works/';
  ctaHow.textContent = 'how the real thing works';
  const ctaInvolved = document.createElement('a');
  ctaInvolved.className = 'btn btn--ghost';
  ctaInvolved.href = '/get-involved/';
  ctaInvolved.textContent = 'get involved';
  const ctaClassic = el('button', 'act2-classic', 'prefer the classic front page? →');
  ctaClassic.type = 'button';
  ctaClassic.setAttribute('data-storm-disarm', '');
  doneNav.append(ctaHow, ctaInvolved, ctaClassic);
  const doneBack = el('button', 'act2-back-forest', '← back to the forest');
  doneBack.type = 'button';
  doneBack.setAttribute('data-act2-back', '');
  done.append(doneTitle, doneBody, doneNav, doneBack);
  done.hidden = true;

  stage.append(canvas, skipBar, callout, done);
  land.appendChild(stage);

  // ── the camera (a tweened viewBox; MOTION only — geometry is the fold's) ──
  let svgEl: SVGSVGElement | null = null;
  let camFrom: CamRect | null = null;
  let camTo: CamRect | null = null;
  let camStart = 0;
  let camRaf = 0;
  let settled = false;
  let onSettle: (() => void) | null = null;

  const stageAspect = (): number => {
    const r = stage.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r.width / r.height : 16 / 9;
  };

  const currentFold = (): FoldedWorld => foldWorldToScene(director.world, script);

  const applyViewBox = (r: CamRect): void => {
    if (svgEl) svgEl.setAttribute('viewBox', vbString(r));
  };

  const settle = (): void => {
    settled = true;
    exposeWitness();
    const cb = onSettle;
    onSettle = null;
    if (cb) cb();
  };

  const camTick = (now: number): void => {
    if (disposed || !camFrom || !camTo) return;
    const t = Math.min(1, (now - camStart) / CAMERA_MS);
    const k = easeInOutCubic(t);
    applyViewBox({
      x: camFrom.x + (camTo.x - camFrom.x) * k,
      y: camFrom.y + (camTo.y - camFrom.y) * k,
      w: camFrom.w + (camTo.w - camFrom.w) * k,
      h: camFrom.h + (camTo.h - camFrom.h) * k,
    });
    if (t >= 1) {
      applyViewBox(camTo);
      camFrom = null;
      settle();
      return;
    }
    camRaf = requestAnimationFrame(camTick);
  };

  const moveCamera = (target: CamRect, snap: boolean): void => {
    cancelAnimationFrame(camRaf);
    settled = false;
    exposeWitness();
    if (snap || reducedMotion || !svgEl) {
      camFrom = null;
      camTo = target;
      applyViewBox(target);
      // settle on the next frame so layout reflects the final viewBox first
      camRaf = requestAnimationFrame(() => settle());
      return;
    }
    const vb = svgEl.viewBox.baseVal;
    camFrom = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
    camTo = target;
    camStart = performance.now();
    camRaf = requestAnimationFrame(camTick);
  };

  // ── scene ↔ stage mapping (for the callout anchoring) ──
  const sceneToStagePx = (p: Pt): Pt => {
    const sr = stage.getBoundingClientRect();
    const vb = svgEl?.viewBox.baseVal;
    if (!vb || vb.width === 0) return { x: sr.width / 2, y: sr.height / 2 };
    const scale = sr.width / vb.width;
    return {
      x: (p.x + OFFSET.x - vb.x) * scale,
      y: (p.y + OFFSET.y - vb.y) * scale,
    };
  };

  // ── the callout placement (anchored NEXT TO the beat's map element) ──
  const narrationFor = (): BeatNarration => {
    if (director.beatIndex === 0) return INTRO;
    const beat = script[director.beatIndex - 1];
    return (beat && NARRATION[beat.id]) || INTRO;
  };

  const placeCallout = (): void => {
    if (cta || disposed) return;
    const fold = currentFold();
    const { rect } = anchorFor(fold, director.beatIndex);
    const a1 = sceneToStagePx({ x: rect.x, y: rect.y });
    const a2 = sceneToStagePx({ x: rect.x + rect.w, y: rect.y + rect.h });
    const anchor = { left: a1.x, top: a1.y, right: a2.x, bottom: a2.y };
    const sr = stage.getBoundingClientRect();

    callout.hidden = false;
    callout.style.visibility = 'hidden';
    const cw = callout.offsetWidth;
    const ch = callout.offsetHeight;

    const M = CALLOUT_MARGIN;
    const G = CALLOUT_GAP;
    const acx = (anchor.left + anchor.right) / 2;
    const acy = (anchor.top + anchor.bottom) / 2;
    const clamp = (v: number, lo: number, hi: number): number =>
      Math.min(Math.max(v, lo), Math.max(lo, hi));

    type Cand = { side: 'right' | 'left' | 'bottom' | 'top'; x: number; y: number; fits: boolean };
    const mk = (side: Cand['side']): Cand => {
      let x = 0;
      let y = 0;
      if (side === 'right') {
        x = anchor.right + G;
        y = clamp(acy - ch / 2, M, sr.height - ch - M);
      } else if (side === 'left') {
        x = anchor.left - G - cw;
        y = clamp(acy - ch / 2, M, sr.height - ch - M);
      } else if (side === 'bottom') {
        x = clamp(acx - cw / 2, M, sr.width - cw - M);
        y = anchor.bottom + G;
      } else {
        x = clamp(acx - cw / 2, M, sr.width - cw - M);
        y = anchor.top - G - ch;
      }
      const fits = x >= M && y >= M && x + cw <= sr.width - M && y + ch <= sr.height - M;
      return { side, x, y, fits };
    };
    // the wide-view beats (intro, forest-overview, forest-dag, pull-back) speak
    // about the whole board — a calm fixed corner spot; otherwise hug the anchor
    // on the first side that fits.
    const wide =
      director.beatIndex === 0 ||
      director.beatIndex === 5 ||
      director.beatIndex === 6 ||
      director.beatIndex === 7;
    const order: Cand['side'][] = wide
      ? ['bottom', 'right', 'left', 'top']
      : ['right', 'left', 'bottom', 'top'];
    let pick = order.map(mk).find((c) => c.fits);
    if (!pick) {
      // nothing fully fits (a small stage) — bottom-centre, clamped on-stage.
      const x = clamp(acx - cw / 2, M, Math.max(M, sr.width - cw - M));
      const y = clamp(anchor.bottom + G, M, Math.max(M, sr.height - ch - M));
      pick = { side: 'bottom', x, y, fits: false };
    }

    callout.style.left = `${pick.x.toFixed(1)}px`;
    callout.style.top = `${pick.y.toFixed(1)}px`;
    callout.dataset['side'] = pick.side;

    // the tail points back at the anchor's centre, clamped along the edge
    if (pick.side === 'right' || pick.side === 'left') {
      const ty = clamp(acy - pick.y, 18, ch - 18);
      tail.style.top = `${ty.toFixed(1)}px`;
      tail.style.left = pick.side === 'right' ? '-7px' : `${cw - 7}px`;
    } else {
      const tx = clamp(acx - pick.x, 18, cw - 18);
      tail.style.left = `${tx.toFixed(1)}px`;
      tail.style.top = pick.side === 'bottom' ? '-7px' : `${ch - 7}px`;
    }

    callout.style.visibility = '';
    callout.classList.add('is-placed');
  };

  // ── the witness hook ──
  const exposeWitness = (): void => {
    (
      window as unknown as {
        __act2?: { beatIndex: number; done: boolean; cta: boolean; settled: boolean };
      }
    ).__act2 = { beatIndex: director.beatIndex, done: director.done, cta, settled };
  };

  // ── render: fold → buildScene → sceneToSvg → swap the stage svg ──
  const renderScene = (): void => {
    const fold = currentFold();
    const aspect = stageAspect();
    const target = cameraRect(fold, director.camera, aspect);
    const startVb = svgEl
      ? (() => {
          const vb = svgEl.viewBox.baseVal;
          return { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
        })()
      : target;
    canvas.innerHTML = stageSvg(fold, director.beatIndex, vbString(startVb));
    svgEl = canvas.querySelector('svg');

    // the walk is a diorama, not the studio: the delegation hit layer goes
    // inert — the walk's own affordances are the only interactive surface.
    canvas.querySelectorAll('.tw-hit').forEach((h) => {
      h.removeAttribute('tabindex');
      h.removeAttribute('role');
      h.setAttribute('aria-hidden', 'true');
    });

    // the violating road is distinguishable FROM ITS DATA: the fold knows which
    // road carries a declared violation — mark it for the site CSS (dash +
    // crimson + a matching crimson arrowhead).
    for (const r of fold.roads) {
      if (r.violation === undefined) continue;
      const bad = canvas.querySelector(`.tw-road[data-from="${r.from}"][data-to="${r.to}"]`);
      bad?.classList.add('act2-violation');
      bad?.querySelector('.line')?.setAttribute('marker-end', 'url(#a2-arrow-bad)');
    }

    // growth: what THIS beat added scales/fades in (deterministic per beat —
    // a Back-replay re-renders the identical DOM and replays the same growth).
    const enter = enterSelectorsFor(director.beatIndex, fold);
    for (const sel of enter.scale) {
      canvas.querySelectorAll(sel).forEach((n) => n.classList.add('act2-enter'));
    }
    for (const sel of enter.fade) {
      canvas.querySelectorAll(sel).forEach((n, i) => {
        n.classList.add('act2-enter-fade');
        // the proven limb greens LAST, landing with the narration (never before)
        if (director.beatIndex === 3) {
          const id = n.getAttribute('data-id');
          const greenLast = fold.limbs.filter((l) => !l.green).map((l) => l.id);
          const ei =
            id === null
              ? i
              : greenLast.indexOf(id) === -1
                ? greenLast.length
                : greenLast.indexOf(id);
          (n as SVGElement).style.setProperty('--ei', String(ei));
        }
      });
    }

    moveCamera(target, false);
  };

  // ── panel sync (copy, dots, buttons, witness) ──
  const syncPanel = (): void => {
    const n = narrationFor();
    title.textContent = n.title;
    body.textContent = n.body;
    legend.hidden = director.beatIndex !== script.length;

    step.textContent = cta
      ? 'the end of the walk'
      : director.beatIndex === 0
        ? 'before the walk'
        : `step ${director.beatIndex} of ${script.length}`;

    dotEls.forEach((d, i) => {
      d.classList.toggle('is-lit', director.beatIndex >= i + 1);
    });

    if (director.beatIndex === 0) nextBtn.textContent = 'plant a story →';
    else if (director.done) nextBtn.textContent = 'finish the walk →';
    else nextBtn.textContent = 'next →';
    if (director.done) nextBtn.setAttribute('data-act2-finish', '');
    else nextBtn.removeAttribute('data-act2-finish');
    backBtn.hidden = director.beatIndex === 0;

    done.hidden = !cta;
    callout.classList.toggle('is-cta', cta);
    skipBar.hidden = cta;
    exposeWitness();
  };

  const hideCallout = (): void => {
    callout.classList.remove('is-placed');
  };

  const applyDirector = (next: DirectorState): void => {
    director = next;
    hideCallout();
    renderScene();
    syncPanel();
    onSettle = (): void => {
      if (cta || disposed) return;
      placeCallout();
      try {
        nextBtn.focus({ preventScroll: true });
      } catch {
        /* focus is a courtesy */
      }
    };
    if (settled) {
      // snap path may have already settled before onSettle was set
      const cb = onSettle;
      onSettle = null;
      cb();
    }
  };

  const enterCta = (): void => {
    cta = true;
    hideCallout();
    callout.hidden = true;
    syncPanel();
    try {
      ctaHow.focus({ preventScroll: true });
    } catch {
      /* focus is a courtesy */
    }
  };

  const leaveCta = (): void => {
    cta = false;
    callout.hidden = false;
    syncPanel();
    onSettle = null;
    placeCallout();
    try {
      nextBtn.focus({ preventScroll: true });
    } catch {
      /* focus is a courtesy */
    }
  };

  // ── the affordances (the visitor disposes; nothing auto-advances) ──
  const onNext = (): void => {
    if (cta) return;
    if (!director.done) applyDirector(advance(director, script));
    else enterCta();
  };
  const onBack = (): void => {
    if (cta) {
      leaveCta();
      return;
    }
    if (director.beatIndex > 0) applyDirector(stateAt(director.beatIndex - 1, script));
  };
  const onSkip = (): void => {
    if (cta) return;
    director = stateAt(script.length, script);
    renderScene();
    enterCta();
  };
  nextBtn.addEventListener('click', onNext);
  backBtn.addEventListener('click', onBack);
  doneBack.addEventListener('click', onBack);
  skipBtn.addEventListener('click', onSkip);

  // re-anchor on resize (the viewBox rect is aspect-matched to the stage)
  const onResize = (): void => {
    if (disposed) return;
    const fold = currentFold();
    const target = cameraRect(fold, director.camera, stageAspect());
    cancelAnimationFrame(camRaf);
    camFrom = null;
    camTo = target;
    applyViewBox(target);
    settled = true;
    exposeWitness();
    if (!cta) placeCallout();
  };
  window.addEventListener('resize', onResize);

  // ── first paint: the empty land, beat 0 (fade-in is the caller's, via CSS) ──
  applyDirector(initialState);
  requestAnimationFrame(() => {
    if (!disposed) stage.classList.add('is-live');
  });

  return {
    unmount(): void {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(camRaf);
      onSettle = null;
      nextBtn.removeEventListener('click', onNext);
      backBtn.removeEventListener('click', onBack);
      doneBack.removeEventListener('click', onBack);
      skipBtn.removeEventListener('click', onSkip);
      window.removeEventListener('resize', onResize);
      stage.remove();
      delete (window as unknown as { __act2?: unknown }).__act2;
    },
  };
}
