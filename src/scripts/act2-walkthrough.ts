// ---------------------------------------------------------------------------
// act2-walkthrough — the visitor-paced SIX-beat walkthrough ON THE REAL 2.5D
// MAP (ADR-0145), the ONE continuous walk that grows the mock website green then
// keeps going UPSTREAM into the backend + database it depends on (ADR-0150).
// STATE is the proven engine's (the synced act2-director — now a MULTI-STORY
// world with dependsOn edges); the LOOK is the product's own: each beat folds
// into the shared `buildScene` scene-graph and renders through the same
// `sceneToSvg` rail the home map rides, so the walk inherits the site's `tw-*`
// vocabulary (TreeWorld.astro's global CSS) — never a re-implementation.
//
// Reached EXCLUSIVELY through the inflection seam (act1-storm's dynamic
// import('./inflection') at the transform click; inflection imports this
// module). Plain TS + DOM — NO React, NO three.js, NO WebGL anywhere here.
//
// Three layers, in file order:
//   1. THE FOLD — pure: DirectorState.world (multi-story) + the script → a fresh
//      SceneInput per beat. Each story becomes its OWN territory (its own disc of
//      mesh ground + smoothed coast — the exact home-map substrate), STACKED by
//      dependency layer: the website at the bottom, the backend above it, the
//      database at the top (the upstream stack the website dependsOn). The
//      dependency edges are drawn from each dependent story UP to what it needs.
//      Plus the site metadata the scene cannot carry (limb greenness, the story
//      labels). (ADR-0150 §4: the wrong-way road + its ghost/flag furniture is
//      RETIRED — the honest dependency layers ARE the teach, not a flagged mistake.)
//   2. THE STAGE — per tap: fold → buildScene → sceneToSvg → replace the stage
//      SVG contents; camera = a tweened viewBox resolved from each beat's declared
//      CameraTarget. prefers-reduced-motion ⇒ jump-cuts.
//   3. THE PACING UI — game-tutorial CALLOUT BOXES anchored NEXT TO the exact
//      map element each beat teaches (tail pointing at it, clamped on-stage,
//      re-anchored on resize) carrying the narration + the ONE primary Next;
//      Back (pure director replay), progress dots, a quiet persistent skip, the
//      beat legend, the honest CTA at the end, and the INSPECT affordance (open a
//      proposed upstream story → what it is + why it's proposed). NOTHING
//      auto-advances; Escape stays the page's global disarm (never intercepted).
//
// Determinism: every piece of geometry and every scene string is a pure
// function of the beat data (hash/rand01 seeding — no Math.random, no
// wall-clock); elapsed time drives MOTION only (the viewBox tween). The same
// beat state renders the identical stage SVG on every visit — Back replay is
// byte-identical.
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
  type Pt,
  type RelaxedCell,
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
// the shopping-checkout script, not the director's default. The director's pure
// state machine (advance / initialState / the zod contract) is still the engine.
import { walkthroughScript, STORY_INSPECT, type StoryInspect } from './act2-script';
import { DONE_KEY, INTRO, NARRATION, type BeatNarration } from './act2-narration';

// ── the parameters (few, meaningful, named — never a knob per pixel) ─────────

/** Rings of hex tiles in the ANCHOR (website) land disc (2 → 19 tiles). */
const DISC_RINGS = 2;
/** Rings in an UPSTREAM story's disc — a smaller, younger island (1 → 7 tiles),
 *  so the proposed layers read as growing, not as second full continents. */
const UPSTREAM_RINGS = 1;
/** Scene frame carried into SceneInput (the empty-land idiom). */
const SCENE_W = 1400;
const SCENE_H = 1200;
/** Where the WEBSITE island sits inside the scene frame (the anchor, bottom of
 *  the stack — upstream layers rise ABOVE it toward smaller y). */
const OFFSET: Pt = { x: 700, y: 640 };
/** The island territory's declared radius (wisp orbit + plate sizing ride it). */
const ISLAND_R = 64;
/** An upstream island's declared radius (smaller — a younger disc). */
const UPSTREAM_R = 40;
/** Vertical rise between stacked layers (scene units, pre-offset): each upstream
 *  story sits this far ABOVE the one it is upstream of. Sized to clear both discs'
 *  coasts AND the lower disc's nameplate row with a calm gap. */
const LAYER_RISE = 250;
/** How far capability limbs sit from the story tree, and their fan spread. */
const LIMB_RING_R = 40;
const LIMB_FAN_STEP = 0.78; // radians between limbs, fanned south of the tree
/** The website nameplate sits this far below its tree spot — FIXED so the plate
 *  never hops when the garden grows (layout stability across beats). */
const PLATE_Y = 80;
/** An upstream story's nameplate sits closer under its (smaller) tree. */
const UPSTREAM_PLATE_Y = 52;
/** Road routing: gentle bow on a dependency edge. */
const ROAD_BOW = 10;
const ROAD_SAMPLES = 12; // polyline samples per road
const ROAD_TRIM_TREE = 10; // back a road's end off a tree trunk
/** Camera: zoom 0 = widest, 1 = tightest (the director's CameraTarget contract).
 *  half-width of the viewBox in scene units at the two extremes. */
const HALF_WIDE = 720;
const HALF_TIGHT = 120;
const CAMERA_MS = 1100; // viewBox tween length (motion only)
const FIT_PAD = 1.14; // a focus bbox always fits with this margin
/** Callout placement. */
const CALLOUT_GAP = 20; // px between the anchor and the callout box
const CALLOUT_MARGIN = 12; // px the callout keeps from the stage edges

/** Fold a director tri-state story status → the scene's visual status. proven →
 *  green (healthy), building → sapling (proposed), broken → withered (unhealthy).
 *  The mapping the pull-back legend reads (ADR-0150 honest legend). */
function sceneStatusOf(status: StoryStatus): SceneStatus {
  switch (status) {
    case 'proven':
      return 'healthy';
    case 'broken':
      return 'unhealthy';
    case 'building':
    default:
      return 'proposed';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE FOLD — pure functions of the director's multi-story world + the script
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
  /** The site-routed polyline (scene space, pre-offset). */
  points: Pt[];
}

/** One folded story territory — everything the stage + the callout anchoring +
 *  the inspect affordance need, keyed by the director's story id. */
export interface TerritoryMeta {
  id: string;
  label: string;
  status: StoryStatus;
  /** Where in the vertical stack (0 = website/anchor, 1 = backend, 2 = database).
   *  The upstream depth — higher layer = further up the map. */
  layer: number;
  /** True for an inspectable PROPOSED upstream story (backend / database). */
  upstream: boolean;
  centre: Pt; // this disc's centre (scene space, pre-offset)
  treeSpot: Pt;
  radius: number;
  plateY: number;
  hasWisp: boolean;
  limbs: LimbMeta[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FoldedWorld {
  sceneInput: SceneInput;
  /** True before beat 1: the land is empty. The synthetic ground territory
   *  still exists in the scene graph (a territory always emits a tree), so the
   *  pre-story render suppresses the flora/hits layers via the `is-prestory`
   *  class on the stage svg. */
  preStory: boolean;
  /** The folded story territories, in stack order (website first). */
  territories: TerritoryMeta[];
  roads: RoadMeta[];
  /** The website (anchor) disc's ground bounds (scene space, pre-offset) — the
   *  camera + intro anchor. */
  islandRect: Rect;
  /** Everything drawn (all discs + labels) — the full-forest frame. */
  contentRect: Rect;
}

/** All axial tiles within `radius` rings of the origin (a disc). */
function discTiles(radius: number): Axial[] {
  const tiles: Axial[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      tiles.push({ q, r });
    }
  }
  return tiles;
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

/** One disc's geometry, built at the origin then TRANSLATED to `centre` — the
 *  cells, the smoothed coast, the tree spot, and the fixed ground decor/wheat.
 *  Pure + deterministic: seeded by a FIXED per-layer id (never the story id), so
 *  the ground never changes when a beat renames or greens the territory. */
interface DiscGeometry {
  cells: RelaxedCell[];
  coastPaths: string[];
  treeSpot: Pt;
  decor: { x: number; y: number; seed: number }[];
  /** Ground bounds (scene space, pre-offset, already translated to centre). */
  rect: Rect;
}

function buildDisc(centre: Pt, rings: number, seedId: string): DiscGeometry {
  const tiles = discTiles(rings);
  const centres = tiles.map(hexCenter);
  const cx = centres.reduce((s, c) => s + c.x, 0) / centres.length;
  const cy = centres.reduce((s, c) => s + c.y, 0) / centres.length;
  // translate everything so the disc's own centroid lands on `centre`.
  const dx = centre.x - cx;
  const dy = centre.y - cy;
  const tr = (p: Pt): Pt => ({ x: p.x + dx, y: p.y + dy });

  const treeSpot: Pt = tr({ x: cx, y: cy - 6 });

  // fixed ground: decor conifers + wheat patches seeded by TILE KEY only (never
  // the story id), so the ground never changes between beats.
  const decor: { x: number; y: number; seed: number }[] = [];
  const wheat = new Set<string>();
  for (const tile of tiles) {
    const key = axialKey(tile);
    const c = hexCenter(tile);
    const roll = rand01(hash(`${seedId}:dec:${key}`));
    const nearTree = Math.hypot(c.x - (cx), c.y - (cy - 6)) < 42;
    const inGarden = c.y > cy + 8; // the southern band the limbs + plate own
    if (roll < 0.42 && !nearTree && !inGarden) {
      const t = tr(c);
      decor.push({ x: t.x, y: t.y, seed: hash(`${seedId}:${key}:f`) });
    } else if (roll >= 0.42 && roll < 0.62 && !nearTree) {
      wheat.add(key);
    }
  }

  // the mesh ground over the disc — the same shared-core call the home map makes
  // (`buildRelaxedCells(..., 'mesh')`), owner 0, then translated to centre.
  const drawTiles = tiles.map((h) => ({ h, owner: 0 }));
  const cells = buildRelaxedCells(drawTiles, [wheat], 'mesh').map((c) => ({
    ...c,
    poly: c.poly.map(tr),
  }));

  // the smoothed organic coastline of the disc (the exact home-map recipe),
  // seeded by the FIXED disc id — the coast belongs to the land, not the story,
  // so it cannot pop when a beat renames the territory. Built at origin then
  // translated (smoothCoast works on raw segments).
  const mine = new Set(tiles.map(axialKey));
  const segs: BoundarySeg[] = [];
  for (const tile of tiles) {
    const c = hexCenter(tile);
    const cor = hexCorners(c.x, c.y, HEX_R);
    AXIAL_DIRS.forEach((d, e) => {
      if (mine.has(axialKey({ q: tile.q + d.q, r: tile.r + d.r }))) return;
      const a = cor[e];
      const b = cor[(e + 1) % 6];
      if (a && b) segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    });
  }
  const rawCoast = smoothCoast(segs, seedId).loops;
  const coastPaths = rawCoast.map(
    (loop) =>
      loop.map((p, i) => `${i === 0 ? 'M' : 'L'} ${f(p.x + dx)} ${f(p.y + dy)}`).join(' ') + ' Z',
  );

  // ground bounds (translated): a disc of `rings` spans ± (rings*HEX_W + HEX_R)
  // horizontally and ± (rings*1.5*HEX_R + HEX_R) vertically, with coast margin.
  const halfW = rings * Math.sqrt(3) * HEX_R + HEX_R + 8;
  const halfH = rings * 1.5 * HEX_R + HEX_R + 8;
  const rect: Rect = {
    x: centre.x - halfW,
    y: centre.y - halfH,
    w: halfW * 2,
    h: halfH * 2,
  };

  return { cells, coastPaths, treeSpot, decor, rect };
}

/**
 * THE FOLD: the director's accumulated multi-story WorldState + the script → a
 * fresh SceneInput (the beat-driven rebuild). Each story becomes its own
 * territory, placed by dependency layer (website at the bottom, upstream stories
 * stacked ABOVE it), plus the dependency edges and the site metadata the scene
 * cannot carry. Pure and deterministic.
 */
export function foldWorldToScene(world: WorldState, _script: Beat[]): FoldedWorld {
  const stories = world.stories;
  const preStory = stories.length === 0;

  // ── assign each story a vertical LAYER from the dependency stack ──
  // The website (the story nothing else in the stack sits below — i.e. the one
  // no OTHER story dependsOn-points-away-from) anchors layer 0. An upstream
  // story's layer is 1 + the layer of the story it dependsOn. Because the walk
  // reveals them in order (website → backend → database), the natural chain is a
  // simple linear stack; we compute it from dependsOn so it is data-driven.
  const byId = new Map(stories.map((s) => [s.id, s] as const));
  const layerCache = new Map<string, number>();
  const layerOf = (s: StoryNode, seen: Set<string> = new Set()): number => {
    const cached = layerCache.get(s.id);
    if (cached !== undefined) return cached;
    if (seen.has(s.id)) return 0; // cycle guard (never expected in the fiction)
    seen.add(s.id);
    // this story sits ABOVE every story it dependsOn — one layer higher than the
    // highest of them. A story that depends on nothing is the anchor (layer 0).
    let base = -1;
    for (const dep of s.dependsOn) {
      const d = byId.get(dep);
      if (d) base = Math.max(base, layerOf(d, seen));
    }
    const layer = base + 1;
    layerCache.set(s.id, layer);
    return layer;
  };

  // ── fold each story into a territory (disc geometry + limbs) ──
  const territories: TerritoryMeta[] = stories.map((s) => {
    const layer = layerOf(s);
    const upstream = layer > 0;
    const rings = upstream ? UPSTREAM_RINGS : DISC_RINGS;
    const radius = upstream ? UPSTREAM_R : ISLAND_R;
    const plateY = upstream ? UPSTREAM_PLATE_Y : PLATE_Y;
    // stacked straight up: the website centre is the origin, each layer LAYER_RISE
    // higher (smaller y). x stays 0 so the stack reads as a vertical column.
    const centre: Pt = { x: 0, y: -layer * LAYER_RISE };
    const disc = buildDisc(centre, rings, `act2-disc-${s.id}`);

    const limbs: LimbMeta[] = s.limbs.map((limb, i) => {
      const n = s.limbs.length;
      const a = Math.PI / 2 + (i - (n - 1) / 2) * LIMB_FAN_STEP;
      const r = LIMB_RING_R + (rand01(hash(`${limb.id}:ring`)) - 0.5) * 8;
      return {
        id: limb.id,
        label: limb.label,
        green: limb.green,
        signedProof: limb.signedProof,
        pos: {
          x: disc.treeSpot.x + Math.cos(a) * r * 1.2,
          y: disc.treeSpot.y + Math.sin(a) * r * 0.85 + 8,
        },
      };
    });

    return {
      id: s.id,
      label: s.label,
      status: s.status,
      layer,
      upstream,
      centre,
      treeSpot: disc.treeSpot,
      radius,
      plateY,
      hasWisp: s.hasWisp,
      limbs,
    };
  });
  const terrById = new Map(territories.map((t) => [t.id, t] as const));

  // ── the dependency edges: draw each edge from the DEPENDENT story UP to what
  //    it depends on. dependsOn points DOWN (backend.dependsOn = [website]); we
  //    render from the lower/dependent story to the upper/depended-on story so
  //    the arrow lands ON the layer above — reading "website needs backend needs
  //    database" (the arrow points at the thing you depend on, which is higher). ──
  // ── The RENDER-DIRECTION decision (the open sub-Q, decided explicitly): the
  //    director records `dependsOn` as the LAYERING adjacency — a story's
  //    dependsOn lists the stories it sits ABOVE (backend.dependsOn = [website]).
  //    So `s` is UPSTREAM of every `depId` it lists. We render each edge as the
  //    NEEDS arrow of the walk's teach — "website needs a backend needs a
  //    database" — by drawing the path FROM the lower/dependent story (depId) UP
  //    TO the upper story it needs (s), with the arrowhead (marker-end, path end)
  //    landing ON the upper story. The arrow therefore points UP, at the thing you
  //    depend on, reinforcing "these sit ABOVE my website; my website depends on
  //    them" (UAT 2). data-from = the needing (lower) story, data-to = the needed
  //    (upper) story; the tooltip reads "<lower> needs <upper>". ──
  const roads: RoadMeta[] = [];
  for (const s of stories) {
    const upper = terrById.get(s.id); // s sits above every story it dependsOn
    if (!upper) continue;
    for (const depId of s.dependsOn) {
      const lower = terrById.get(depId); // the story s sits above (the dependent)
      if (!lower) continue;
      // path a → b: a = the lower (needing) story, b = the upper (needed) story,
      // so the marker-end arrow lands on the upper story (points UP).
      const rawA = { x: lower.treeSpot.x, y: lower.treeSpot.y };
      const rawB = { x: upper.treeSpot.x, y: upper.treeSpot.y };
      const a = toward(rawA, rawB, ROAD_TRIM_TREE);
      const b = toward(rawB, rawA, ROAD_TRIM_TREE);
      const mid: Pt = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const px = -(b.y - a.y) / len;
      const py = (b.x - a.x) / len;
      const side = rand01(hash(`${depId}->${s.id}:side`)) < 0.5 ? 1 : -1;
      const ctrl: Pt = { x: mid.x + px * ROAD_BOW * side, y: mid.y + py * ROAD_BOW * side };
      const points = sampleQuadratic(a, ctrl, b, ROAD_SAMPLES);
      roads.push({ from: depId, to: s.id, points });
    }
  }

  // ── assemble the SceneInput: one territory per story (owner index = stack
  //    order), each disc's cells tagged with that owner. ──
  const allCells: RelaxedCell[] = [];
  const sceneTerritories: SceneTerritoryInput[] = [];

  territories.forEach((t, owner) => {
    const disc = buildDisc(t.centre, t.upstream ? UPSTREAM_RINGS : DISC_RINGS, `act2-disc-${t.id}`);
    for (const c of disc.cells) allCells.push({ ...c, owner });

    const storyStatus = sceneStatusOf(t.status);

    const plants: ScenePlantInput[] = t.limbs.map((l) => ({
      id: l.id,
      status: (l.green ? 'healthy' : 'proposed') as SceneStatus,
      x: l.pos.x,
      y: l.pos.y,
      title: l.green
        ? `${l.label} — proven (signed proof ${l.signedProof ?? ''})`
        : `${l.label} — in progress, no signed proof yet`,
    }));

    const plateW = Math.max(t.upstream ? 150 : 120, t.label.length * 7.6 + 26);
    const subText = t.upstream ? 'a story you depend on' : 'a story';
    const treeTitle =
      t.status === 'proven'
        ? `${t.label} — a story, proven`
        : `${t.label} — a story, proposed (not yet built)`;

    sceneTerritories.push({
      id: t.id,
      status: storyStatus,
      caps: t.limbs.length,
      centroid: t.centre,
      radius: t.radius,
      treeSpot: t.treeSpot,
      labelY: t.centre.y + t.plateY,
      coastPaths: disc.coastPaths,
      decor: disc.decor,
      plants,
      treeTitle,
      wisps: t.hasWisp
        ? [{ runId: `walk:${t.id}`, title: 'an agent at work — you can look away' }]
        : [],
      plate: {
        w: plateW,
        h: 34,
        rx: 7,
        idY: 15,
        subY: 28,
        idText: t.label,
        subText,
        title: t.label,
      },
    });
  });

  // pre-story: a single dormant ground disc so the empty land still has soil.
  if (preStory) {
    const disc = buildDisc({ x: 0, y: 0 }, DISC_RINGS, 'act2-disc-first-light');
    for (const c of disc.cells) allCells.push({ ...c, owner: 0 });
    sceneTerritories.push({
      id: 'first-light',
      status: 'proposed',
      caps: 0,
      centroid: { x: 0, y: 0 },
      radius: ISLAND_R,
      treeSpot: disc.treeSpot,
      labelY: PLATE_Y,
      coastPaths: disc.coastPaths,
      decor: disc.decor,
      plants: [],
      treeTitle: '',
      wisps: [],
      plate: { w: 120, h: 34, rx: 7, idY: 15, subY: 28, idText: '', subText: '', title: '' },
    });
  }

  const sceneRoads: SceneRoadInput[] = roads.map((r) => {
    const fromT = terrById.get(r.from);
    const toT = terrById.get(r.to);
    const fromLabel = fromT?.label ?? r.from;
    const toLabel = toT?.label ?? r.to;
    return {
      from: r.from,
      to: r.to,
      d: polylineD(r.points),
      title: `${fromLabel} needs ${toLabel}`,
    };
  });

  const sceneInput: SceneInput = {
    offset: { x: OFFSET.x, y: OFFSET.y },
    width: SCENE_W,
    height: SCENE_H,
    empties: [],
    relaxedCells: allCells,
    drawTiles: [],
    wheatSets: [],
    roads: sceneRoads,
    territories: sceneTerritories,
  };

  // ── bounds ──
  const anchor = territories.find((t) => t.layer === 0);
  const islandRect: Rect = anchor
    ? buildDisc(anchor.centre, DISC_RINGS, `act2-disc-${anchor.id}`).rect
    : { x: -124, y: -116, w: 248, h: 232 };

  // content bounds = union of every disc's rect + its plate row.
  let minX = islandRect.x;
  let maxX = islandRect.x + islandRect.w;
  let minY = islandRect.y;
  let maxY = islandRect.y + islandRect.h;
  const src = preStory
    ? [{ centre: { x: 0, y: 0 }, upstream: false, plateY: PLATE_Y }]
    : territories;
  for (const t of src) {
    const rings = t.upstream ? UPSTREAM_RINGS : DISC_RINGS;
    const halfW = rings * Math.sqrt(3) * HEX_R + HEX_R + 24;
    const halfH = rings * 1.5 * HEX_R + HEX_R + 8;
    minX = Math.min(minX, t.centre.x - halfW);
    maxX = Math.max(maxX, t.centre.x + halfW);
    minY = Math.min(minY, t.centre.y - halfH);
    maxY = Math.max(maxY, t.centre.y + t.plateY + 40);
  }
  const contentRect: Rect = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

  return { sceneInput, preStory, territories, roads, islandRect, contentRect };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE STAGE — scene string + the viewBox camera
// ─────────────────────────────────────────────────────────────────────────────

const escXml = (s: unknown): string =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** The stage svg for one beat state: the worldSvg shell pattern with act2's own
 *  defs ids (`a2-*`, so nothing depends on the hidden home-map svg), then the
 *  walked scene-graph. Pure string of the fold. */
function stageSvg(fold: FoldedWorld, beatIndex: number, viewBox: string): string {
  let scene = sceneToSvg(buildScene(fold.sceneInput));
  // the scene's road marker references the home map's defs id — retarget it at
  // this svg's own copy so the stage is self-contained.
  scene = scene.split('url(#tw-arrow)').join('url(#a2-arrow)');

  const label =
    'A staged map of fictional stories growing on quiet ground — the same look as the real ' +
    'storytree map. Nothing here is live; each Next step adds one idea.';
  return (
    `<svg class="tw-svg act2-svg${fold.preStory ? ' is-prestory' : ''}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" role="group" aria-roledescription="illustrated map" aria-label="${escXml(label)}" data-act2-beat="${beatIndex}">` +
    `<defs>` +
    `<radialGradient id="a2-board" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#fbf3ea"/><stop offset="1" stop-color="#edd9c9"/></radialGradient>` +
    `<marker id="a2-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1.4 L 8 5 L 0 8.6 z"/></marker>` +
    `</defs>` +
    `<rect class="tw-bg act2-bg" x="0" y="0" width="${SCENE_W}" height="${SCENE_H}"/>` +
    scene +
    `</svg>`
  );
}

/** What each beat ADDS over the previous one — the groups that wear the enter
 *  animation on arrival (a pure function of the beat index, so a Back-replay
 *  re-renders the identical DOM and replays the same growth). `scale` is only
 *  ever put on transform-attribute-free groups (a CSS transform would clobber
 *  an SVG transform attribute); everything else fades. */
function enterSelectorsFor(beatIndex: number): { scale: string[]; fade: string[] } {
  switch (beatIndex) {
    case 1:
      return { scale: ['.tw-flora-layer .tw-terr'], fade: [] };
    case 2:
      return { scale: [], fade: ['.tw-wisps'] };
    case 3:
      return { scale: [], fade: ['.tw-flora-layer .tw-flora'] };
    case 4:
    case 5:
      // the newest upstream disc (its ground + coast + tree) fades/scales in;
      // its dependency road fades in with it.
      return { scale: [], fade: ['.tw-roads .tw-road'] };
    default:
      return { scale: [], fade: [] };
  }
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
  switch (focus) {
    case 'story-tree': {
      // the anchor (website) tree + its plate row.
      const anchor = fold.territories.find((t) => t.layer === 0) ?? fold.territories[0];
      if (!anchor) return fold.islandRect;
      const caps = anchor.limbs.length;
      const treeTop = anchor.treeSpot.y - (2.72 * crownRadius(caps) + 18);
      const plateBottom = anchor.centre.y + anchor.plateY + 36;
      const w = 240;
      return { x: -w / 2, y: treeTop - 8, w, h: plateBottom - treeTop + 16 };
    }
    case 'dag-view': {
      // the whole stack grown SO FAR — the content bounds, so a new upstream
      // layer coming into view widens the frame to include it.
      return fold.contentRect;
    }
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
  /** Advance one beat programmatically — the orchestrator proposal's accept
   *  (ADR-0148 §2) plants the first story so the visitor flows straight from
   *  the proposal into beat 1 (a single felt gesture, not accept-then-tap). */
  next(): void;
  /** Reveal the beat callout that {@link WalkthroughOptions.deferCallout}
   *  suppressed — called once the orchestrator overlay hands off. */
  revealCallout(): void;
}

export interface WalkthroughOptions {
  /** Jump-cut everything (camera, growth, the stage fade) — the visitor prefers
   *  reduced motion. Read once by the caller at begin. */
  reducedMotion: boolean;
  /** Keep the beat callout hidden until {@link WalkthroughHandle.revealCallout}
   *  is called — the walk mounts UNDER the orchestrator proposal overlay
   *  (ADR-0148 §2) and its narration must not compete while the proposal reads.
   *  Defaults to false (the callout places itself on settle as before). */
  deferCallout?: boolean;
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
  const anchor = fold.territories.find((t) => t.layer === 0) ?? fold.territories[0];
  const orbitR = ISLAND_R * 0.72 + 10;
  switch (beatIndex) {
    case 1: {
      if (!anchor) return { rect: fold.islandRect, selector: '.tw-land' };
      const top = anchor.treeSpot.y - (2.72 * crownRadius(anchor.limbs.length) + 18);
      return {
        rect: { x: -120, y: top, w: 240, h: anchor.centre.y + PLATE_Y + 34 - top },
        selector: '.tw-flora-layer .tw-terr',
      };
    }
    case 2:
      return {
        rect: { x: -orbitR - 14, y: -orbitR - 14, w: orbitR * 2 + 28, h: orbitR * 2 + 28 },
        selector: '.tw-wisps',
      };
    case 3: {
      const green = anchor?.limbs.find((l) => l.green);
      const p = green?.pos ?? anchor?.treeSpot ?? { x: 0, y: 0 };
      return {
        rect: { x: p.x - 16, y: p.y - 22, w: 32, h: 34 },
        selector: green ? `.tw-flora[data-id="${green.id}"]` : '.tw-terr',
      };
    }
    case 4: {
      // the newest upstream story (the backend) — anchor on its tree/disc.
      const t = upstreamAt(fold, 1);
      if (t) {
        const halfW = UPSTREAM_RINGS * Math.sqrt(3) * HEX_R + HEX_R + 20;
        return {
          rect: { x: t.centre.x - halfW, y: t.centre.y - halfW, w: halfW * 2, h: halfW * 2 + 30 },
          selector: `.tw-terr[data-id="${t.id}"]`,
        };
      }
      return { rect: fold.contentRect, selector: '.tw-roads' };
    }
    case 5: {
      // the database (topmost) — anchor on it.
      const t = upstreamAt(fold, 2);
      if (t) {
        const halfW = UPSTREAM_RINGS * Math.sqrt(3) * HEX_R + HEX_R + 20;
        return {
          rect: { x: t.centre.x - halfW, y: t.centre.y - halfW, w: halfW * 2, h: halfW * 2 + 30 },
          selector: `.tw-terr[data-id="${t.id}"]`,
        };
      }
      return { rect: fold.contentRect, selector: '.act2-svg' };
    }
    case 6:
      return { rect: fold.contentRect, selector: '.act2-svg' };
    case 0:
    default:
      return { rect: fold.islandRect, selector: '.tw-land' };
  }
}

/** The territory at stack layer `layer` (1 = backend, 2 = database), if present. */
function upstreamAt(fold: FoldedWorld, layer: number): TerritoryMeta | undefined {
  return fold.territories.find((t) => t.layer === layer);
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
  // While the orchestrator proposal overlay is up (ADR-0148 §2), the beat
  // callout is suppressed so the two do not compete; revealCallout() lifts it.
  let calloutDeferred = opts.deferCallout === true;
  // The inspect panel's open story id (null = closed). Only proposed upstream
  // stories are inspectable (STORY_INSPECT keys).
  let inspectId: string | null = null;

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
  // an inline "inspect" prompt shown on the upstream-reveal beats (UAT 5) — the
  // primary way in; the tree itself is also clickable (bound in renderScene).
  const inspectPrompt = el('button', 'act2-inspect-open');
  inspectPrompt.type = 'button';
  inspectPrompt.setAttribute('data-act2-inspect-open', '');
  inspectPrompt.hidden = true;
  voice.append(inspectPrompt);
  // the beat-6 legend (site furniture, shown only on the pull-back)
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

  // ── the inspect panel (UAT 5): open a proposed upstream story → what + why ──
  const inspect = el('div', 'act2-inspect');
  inspect.setAttribute('data-act2-inspect', '');
  inspect.setAttribute('role', 'dialog');
  inspect.setAttribute('aria-modal', 'false');
  inspect.setAttribute('aria-label', 'What this proposed story is, and why');
  const inspectCard = el('div', 'act2-inspect-card');
  const inspectBadge = el('span', 'act2-inspect-badge', 'proposed — not built yet');
  inspectBadge.setAttribute('aria-hidden', 'true');
  const inspectTitle = el('h3', 'act2-inspect-title');
  const inspectWhatH = el('p', 'act2-inspect-h', 'What it is');
  const inspectWhat = el('p', 'act2-inspect-p');
  const inspectWhyH = el('p', 'act2-inspect-h', 'Why it’s proposed');
  const inspectWhy = el('p', 'act2-inspect-p');
  const inspectClose = el('button', 'act2-inspect-close', 'close');
  inspectClose.type = 'button';
  inspectClose.setAttribute('data-act2-inspect-close', '');
  inspectCard.append(
    inspectBadge,
    inspectTitle,
    inspectWhatH,
    inspectWhat,
    inspectWhyH,
    inspectWhy,
    inspectClose,
  );
  inspect.appendChild(inspectCard);
  inspect.hidden = true;

  // the honest diorama-closing CTA (revealed at the end; every exit is real)
  const done = el('div', 'act2-done');
  done.setAttribute('data-act2-cta', '');
  done.setAttribute('role', 'group');
  done.setAttribute('aria-label', 'The end of the walk — where to next');
  const doneTitle = el('h2', 'act2-title', NARRATION[DONE_KEY]!.title);
  const doneBody = el('p', 'act2-body', NARRATION[DONE_KEY]!.body);
  // ADR-0150: the walk ALREADY grew upstream — there is no "grow the backend
  // next" destination. The CTA is the true END: it points at the real product
  // (watched-live) and how it works. No dead-end Next; the classic-front-page
  // escape stays removed (the no-JS / reduced-motion fallback lives on index.astro).
  const doneNav = document.createElement('nav');
  doneNav.className = 'act2-done-links';
  doneNav.setAttribute('aria-label', 'Where to next');
  const ctaNext = document.createElement('a');
  ctaNext.className = 'btn btn--primary';
  ctaNext.href = '/get-involved/';
  ctaNext.setAttribute('data-act2-whats-next', '');
  ctaNext.textContent = 'watch the real thing grow →';
  const ctaHow = document.createElement('a');
  ctaHow.className = 'btn btn--ghost';
  ctaHow.href = '/how-it-works/';
  ctaHow.textContent = 'how it works';
  doneNav.append(ctaNext, ctaHow);
  const doneBack = el('button', 'act2-back-forest', '← back to the forest');
  doneBack.type = 'button';
  doneBack.setAttribute('data-act2-back', '');
  done.append(doneTitle, doneBody, doneNav, doneBack);
  done.hidden = true;

  stage.append(canvas, skipBar, callout, inspect, done);
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
    if (cta || disposed || calloutDeferred) return;
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
    // the pull-back speaks about the whole board — a calm fixed corner spot;
    // otherwise hug the anchor on the first side that fits.
    const wide = director.beatIndex === 6 || director.beatIndex === 0;
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
        __act2?: {
          beatIndex: number;
          done: boolean;
          cta: boolean;
          settled: boolean;
          inspect: string | null;
        };
      }
    ).__act2 = {
      beatIndex: director.beatIndex,
      done: director.done,
      cta,
      settled,
      inspect: inspectId,
    };
  };

  // ── the inspect affordance (UAT 5) ──
  const inspectableAt = (beatIndex: number): TerritoryMeta | null => {
    // On the upstream-reveal beats, the newest revealed upstream story is the
    // one the prompt opens (beat 4 → backend, beat 5+ → database).
    const fold = currentFold();
    if (beatIndex === 4) return upstreamAt(fold, 1) ?? null;
    if (beatIndex >= 5) return upstreamAt(fold, 2) ?? upstreamAt(fold, 1) ?? null;
    return null;
  };

  const openInspect = (id: string): void => {
    const data: StoryInspect | undefined = STORY_INSPECT[id];
    if (!data) return;
    inspectId = id;
    inspectTitle.textContent = data.label;
    inspectWhat.textContent = data.what;
    inspectWhy.textContent = data.why;
    inspect.hidden = false;
    requestAnimationFrame(() => {
      if (!disposed) inspect.classList.add('is-open');
    });
    try {
      inspectClose.focus({ preventScroll: true });
    } catch {
      /* focus is a courtesy */
    }
    exposeWitness();
  };

  const closeInspect = (): void => {
    if (inspectId === null) return;
    inspectId = null;
    inspect.classList.remove('is-open');
    inspect.hidden = true;
    exposeWitness();
    if (!cta) {
      try {
        nextBtn.focus({ preventScroll: true });
      } catch {
        /* focus is a courtesy */
      }
    }
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

    // an upstream story's tree/disc is clickable to INSPECT it (UAT 5) — a
    // first-class affordance, keyed by story id. Mark the proposed upstream
    // territories interactive.
    for (const t of fold.territories) {
      if (!t.upstream || !(t.id in STORY_INSPECT)) continue;
      const terr = canvas.querySelector(`.tw-terr[data-id="${t.id}"]`);
      if (terr) {
        terr.classList.add('act2-inspectable');
        terr.setAttribute('role', 'button');
        terr.setAttribute('tabindex', '0');
        terr.setAttribute('aria-label', `Inspect ${t.label} — what it is and why it’s proposed`);
        (terr as SVGElement & { dataset: DOMStringMap }).dataset['act2Inspect'] = t.id;
      }
    }

    // growth: what THIS beat added scales/fades in (deterministic per beat —
    // a Back-replay re-renders the identical DOM and replays the same growth).
    const enter = enterSelectorsFor(director.beatIndex);
    for (const sel of enter.scale) {
      // only the NEWEST territory (the one the beat added) animates; the anchor
      // (website) territory is already present, so scope beat 1's scale to it.
      canvas.querySelectorAll(sel).forEach((n) => n.classList.add('act2-enter'));
    }
    for (const sel of enter.fade) {
      canvas.querySelectorAll(sel).forEach((n, i) => {
        n.classList.add('act2-enter-fade');
        // the proven limb greens LAST, landing with the narration (never before)
        if (director.beatIndex === 3) {
          const id = n.getAttribute('data-id');
          const anchor = fold.territories.find((t) => t.layer === 0);
          const greenLast = (anchor?.limbs ?? []).filter((l) => !l.green).map((l) => l.id);
          const ei =
            id === null ? i : greenLast.indexOf(id) === -1 ? greenLast.length : greenLast.indexOf(id);
          (n as SVGElement).style.setProperty('--ei', String(ei));
        }
      });
    }
    // on the upstream beats, the newest disc's flora/coast/ground fade in with
    // its road (scoped to the newest territory by data-id).
    if (director.beatIndex === 4 || director.beatIndex === 5) {
      const layer = director.beatIndex === 4 ? 1 : 2;
      const t = upstreamAt(fold, layer);
      if (t) {
        canvas
          .querySelectorAll(
            `.tw-terr[data-id="${t.id}"], .tw-isle[data-id="${t.id}"], .tw-ground[data-id="${t.id}"]`,
          )
          .forEach((n) => n.classList.add('act2-enter-fade'));
      }
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

    // the inspect prompt: shown on the upstream-reveal beats, labelled for the
    // story it opens (UAT 5 — comprehension on demand, first-class not a tooltip).
    const insp = inspectableAt(director.beatIndex);
    if (insp && !cta) {
      inspectPrompt.hidden = false;
      inspectPrompt.textContent = `what is “${insp.label}”, and why? →`;
      inspectPrompt.dataset['act2InspectId'] = insp.id;
    } else {
      inspectPrompt.hidden = true;
      delete inspectPrompt.dataset['act2InspectId'];
    }

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
    // any open inspect closes when the walk moves.
    if (inspectId !== null) closeInspect();
    director = next;
    hideCallout();
    renderScene();
    syncPanel();
    onSettle = (): void => {
      if (cta || disposed) return;
      placeCallout();
      // while the orchestrator proposal owns focus (calloutDeferred), the walk
      // must not steal it back to Next behind the overlay.
      if (calloutDeferred) return;
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
    if (inspectId !== null) closeInspect();
    hideCallout();
    callout.hidden = true;
    syncPanel();
    try {
      ctaNext.focus({ preventScroll: true }); // the "what's next" primary
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
    if (inspectId !== null) closeInspect();
    director = stateAt(script.length, script);
    renderScene();
    enterCta();
  };
  const onInspectPromptClick = (): void => {
    const id = inspectPrompt.dataset['act2InspectId'];
    if (id) openInspect(id);
  };
  // click/keyboard on an upstream tree opens its inspect panel too.
  const onCanvasClick = (ev: MouseEvent): void => {
    const target = ev.target as Element | null;
    const host = target?.closest<SVGElement>('[data-act2-inspect]');
    const id = host?.dataset?.['act2Inspect'];
    if (id) openInspect(id);
  };
  const onCanvasKey = (ev: KeyboardEvent): void => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const target = ev.target as Element | null;
    const host = target?.closest<SVGElement>('[data-act2-inspect]');
    const id = host?.dataset?.['act2Inspect'];
    if (id) {
      ev.preventDefault();
      openInspect(id);
    }
  };
  nextBtn.addEventListener('click', onNext);
  backBtn.addEventListener('click', onBack);
  doneBack.addEventListener('click', onBack);
  skipBtn.addEventListener('click', onSkip);
  inspectPrompt.addEventListener('click', onInspectPromptClick);
  inspectClose.addEventListener('click', closeInspect);
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('keydown', onCanvasKey);

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
    next(): void {
      if (disposed) return;
      onNext();
    },
    revealCallout(): void {
      if (disposed || !calloutDeferred) return;
      calloutDeferred = false;
      // place the callout for the current beat (the walk has been sitting on
      // beat 0/1 under the proposal); settle may already have passed.
      if (!cta) placeCallout();
    },
    unmount(): void {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(camRaf);
      onSettle = null;
      nextBtn.removeEventListener('click', onNext);
      backBtn.removeEventListener('click', onBack);
      doneBack.removeEventListener('click', onBack);
      skipBtn.removeEventListener('click', onSkip);
      inspectPrompt.removeEventListener('click', onInspectPromptClick);
      inspectClose.removeEventListener('click', closeInspect);
      canvas.removeEventListener('click', onCanvasClick);
      canvas.removeEventListener('keydown', onCanvasKey);
      window.removeEventListener('resize', onResize);
      stage.remove();
      delete (window as unknown as { __act2?: unknown }).__act2;
    },
  };
}
