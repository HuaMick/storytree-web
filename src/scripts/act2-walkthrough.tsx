// ---------------------------------------------------------------------------
// act2-walkthrough — the visitor-paced five-beat walkthrough on the calm land
// (ADR-0134 §3). STATE is the proven engine's (the synced act2-director);
// motion, camera and copy are the site's.
//
// Reached EXCLUSIVELY through the inflection seam (act1-storm's dynamic
// import('./inflection') at the transform click) — this module imports React /
// three / the synced R3F artifacts and must NEVER enter the entry page's static
// import closure (the parent repo's check:web-experience WebGL wall).
//
// Three layers, in file order:
//   1. THE FOLD — pure: DirectorState.world + the script → a fresh SceneInput
//      per beat state (the beat-driven scene REBUILD that replaces the old
//      hex-ground-only filter), plus the site metadata worldTo3D cannot carry
//      (limb identity/greenness, road violations, ghost teaching pads, the
//      story label read from the script's plant-story delta).
//   2. THE CANVAS — a site-owned R3F layer over the derived descriptors,
//      art-directed to the site's calm cream/evergreen palette: growth
//      animations, camera tweens between the director's declared CameraTargets,
//      DOM labels (drei Html) for the nameplate / limb tags / the violation
//      flag. prefers-reduced-motion ⇒ no tweens or growth — states jump-cut.
//   3. THE PACING UI — a plain-DOM overlay card (the act1-storm idiom: DOM
//      built here, styled by index.astro's global CSS): narration (aria-live),
//      ONE primary Next per beat, Back (a cheap pure replay), progress dots, a
//      quiet persistent skip, and the honest CTA at the end. NOTHING
//      auto-advances; Escape stays the page's global disarm (never intercepted).
//
// Determinism: every piece of geometry is a pure function of the beat data
// (hash/rand01 seeding — no Math.random, no wall-clock); elapsed-time drives
// MOTION only. The same beat state renders the same world on every load.
// ---------------------------------------------------------------------------

import { useEffect, useRef, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Instance, Instances, Line, MapControls } from '@react-three/drei';
import {
  buildScene,
  hash,
  hexCenter,
  rand01,
  type Axial,
  type Pt,
  type SceneInput,
  type ScenePlantInput,
  type SceneRoadInput,
  type SceneStatus,
  type SceneTerritoryInput,
} from '../lib/forest-world';
import {
  worldTo3D,
  type Descriptor3D,
  type InstanceDescriptor,
} from '../lib/forest-world-r3f/world-to-3d';
import {
  advance,
  defaultScript,
  initialState,
  type Beat,
  type CameraTarget,
  type DirectorState,
  type WorldState,
} from '../lib/forest-world-r3f/act2-director';
import { DONE_KEY, INTRO, NARRATION, type BeatNarration } from './act2-narration';

// ── the parameters (few, meaningful, named — never a knob per pixel) ─────────

/** Rings of hex tiles in the land disc (2 → 19 tiles, the inflection's island). */
const DISC_RINGS = 2;
/** Scene frame carried into SceneInput (the empty-land idiom). */
const SCENE_W = 1400;
const SCENE_H = 1000;
/** How far capability limbs sit from the story tree, and their fan spread. */
const LIMB_RING_R = 40;
const LIMB_FAN_STEP = 0.78; // radians between limbs, fanned south of the tree
/** The fictional teaching pads (road endpoints with no island home). */
const GHOST_ROW_Y = 60; // the row south of the tree the pads sit on
const GHOST_SPACING = 88; // gap between pads on the row
/** Road routing: gentle bow on a valid road; the swerve a violating road makes
 *  around the layer it skips (the visual "shortcut" read). */
const ROAD_BOW = 9;
const VIOLATION_DODGE = 24;
const ROAD_SAMPLES = 10; // polyline samples per road (kept faithful by worldTo3D)
/** Camera: zoom 0 = widest, 1 = tightest (the director's CameraTarget contract). */
const DIST_NEAR = 130;
const DIST_FAR = 470;
const LOOK_Y = 6; // aim slightly above the ground plane
/** Look-ahead bias (fraction of camera distance, applied south): frames the
 *  subject in the UPPER part of the viewport, clear of the pacing card. */
const LOOK_AHEAD_K = 0.16;
const CAM_LAMBDA = 2.6; // exponential-damp rate → ~1.5 s settle
/** Growth animation length (scale-in of newly added things). */
const GROW_SECS = 0.9;
/** The wisp's drift (motion only — its PHASE is seeded from the runId). */
const WISP_ORBIT_R = 36;
const WISP_HEIGHT = 34;
const WISP_SPEED = 0.35; // rad/s

// ── the calm palette (site tokens, not the spike's placeholder hues) ──────────

const SKY = '#f2e9d8'; // soft parchment daylight — the anti-storm
const SOIL_A = '#dcc9a3';
const SOIL_B = '#d3bd92';
const TRUNK = '#6b4f35';
/** Folded SceneStatus → canopy/limb hue. Green is EARNED: only 'healthy' wears
 *  the evergreen (one art element per signal — proof state colours flora). */
const STATUS_COLOUR: Record<string, string> = {
  healthy: '#2f6b3f', // --evergreen: proven
  building: '#a9bd7e', // young green: in progress
  proposed: '#c9c08a', // pale wheat-green: a promise
  mapped: '#8fae9a',
  unhealthy: '#8a5a44', // withered
  unknown: '#9a9a9a',
};
const ROAD_GOOD = '#b9a887';
const ROAD_VIOLATION = '#b0452f';
const GHOST_PAD = '#e7d9bd';
const WISP_GLOW = '#ffd75e';

const colourOf = (material: string | undefined): string =>
  STATUS_COLOUR[material ?? 'unknown'] ?? STATUS_COLOUR['unknown']!;

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE FOLD — pure functions of the director's world + the script
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
  /** The site-routed polyline (scene space) — the same points the SceneInput's
   *  `d` string carries, so descriptors can be matched back by endpoints. */
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

export interface FoldedWorld {
  sceneInput: SceneInput;
  /** True before beat 1: the land is empty. A territory always emits a tree, so
   *  the pre-story state keeps the synthetic ground territory and the derive
   *  step suppresses non-ground descriptors (the documented constraint). */
  preStory: boolean;
  /** The story label, read from the script's plant-story delta (the director's
   *  WorldState stores only the storyId). Null before beat 1. */
  storyLabel: string | null;
  storyStatus: SceneStatus;
  treeSpot: Pt;
  limbs: LimbMeta[];
  roads: RoadMeta[];
  ghosts: GhostMeta[];
}

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

/** Sample a quadratic bezier A→(ctrl)→B into n points (emitted as an M/L
 *  polyline so worldTo3D's path parse recovers the exact vertices). */
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

const fmt = (n: number): string => n.toFixed(1);

function polylineD(pts: Pt[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${fmt(p.x)} ${fmt(p.y)}`).join(' ');
}

/** The layer a violating road bypasses, parsed from the violation's declared
 *  antipattern name (e.g. 'layer-violation:ui-bypasses-service' → 'service').
 *  Data-derived — no violation string, no pad. */
export function bypassedLayerOf(violation: string): string | null {
  const m = /bypasses-([a-z0-9-]+)$/.exec(violation);
  return m ? m[1]! : null;
}

/** Plain display label for a fictional teaching pad. */
function ghostLabel(id: string): string {
  const KNOWN: Record<string, string> = {
    ui: 'the screen (UI)',
    db: 'the database',
    service: 'the service layer',
  };
  return KNOWN[id] ?? id;
}

/**
 * THE FOLD: the director's accumulated WorldState + the script → a fresh
 * SceneInput (the beat-driven rebuild) plus the site metadata the 3D mapping
 * cannot carry (worldTo3D skips flora/plates, and road-strips carry no
 * identity). Pure and deterministic — a beat state always folds identically.
 */
export function foldWorldToScene(world: WorldState, script: Beat[]): FoldedWorld {
  const tiles = discTiles(DISC_RINGS);
  const centres = tiles.map(hexCenter);
  const cx = centres.reduce((s, c) => s + c.x, 0) / centres.length;
  const cy = centres.reduce((s, c) => s + c.y, 0) / centres.length;
  const treeSpot: Pt = { x: cx, y: cy - 6 };

  const preStory = world.storyId === '';

  // The story label lives on the script's plant-story delta (the director's
  // WorldState stores only the id) — read it from the script when folding.
  let storyLabel: string | null = null;
  for (const beat of script) {
    if (beat.delta.kind === 'plant-story' && beat.delta.storyId === world.storyId) {
      storyLabel = beat.delta.label;
    }
  }

  // Folded story status: a fresh plant is a promise ('proposed', the young
  // form); once it branches into capabilities it is being built ('building').
  // It NEVER folds 'healthy' here — the story's own proof is not in this
  // fiction, only cap-auth's is (green is earned per-limb, never claimed).
  const storyStatus: SceneStatus = world.limbs.length > 0 ? 'building' : 'proposed';

  // Capability limbs fan south of the tree, deterministically jittered by id.
  const limbs: LimbMeta[] = world.limbs.map((limb, i) => {
    const n = world.limbs.length;
    const a = Math.PI / 2 + (i - (n - 1) / 2) * LIMB_FAN_STEP;
    const r = LIMB_RING_R + (rand01(hash(`${limb.id}:ring`)) - 0.5) * 8;
    return {
      id: limb.id,
      label: limb.label,
      green: limb.green,
      signedProof: limb.signedProof,
      pos: {
        x: treeSpot.x + Math.cos(a) * r * 1.2,
        y: treeSpot.y + Math.sin(a) * r * 0.85 + 8,
      },
    };
  });
  const limbById = new Map(limbs.map((l) => [l.id, l] as const));

  // Fictional teaching pads: road endpoints with no island home get a spot on
  // the row south of the tree, in encounter order; a violating road also stages
  // the layer it skips (parsed from its violation data) at its midpoint.
  const ghostIds: string[] = [];
  for (const road of world.roads) {
    for (const end of [road.from, road.to]) {
      if (end !== world.storyId && !limbById.has(end) && !ghostIds.includes(end)) {
        ghostIds.push(end);
      }
    }
  }
  const ghosts: GhostMeta[] = ghostIds.map((id, i) => ({
    id,
    label: ghostLabel(id),
    pos: {
      x: cx + (i - (ghostIds.length - 1) / 2) * GHOST_SPACING,
      y: cy + GHOST_ROW_Y,
    },
    bypassed: false,
  }));
  const ghostById = new Map(ghosts.map((g) => [g.id, g] as const));

  const anchorOf = (id: string): Pt =>
    id === world.storyId ? treeSpot : (limbById.get(id)?.pos ?? ghostById.get(id)?.pos ?? { x: cx, y: cy });

  // Stage the bypassed layer's pad for each violating road (data-derived).
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

  // Route the roads: a valid road bows gently; a violating road swerves AROUND
  // the layer it skips (the shortcut read) — geometry from data + parameters.
  const roads: RoadMeta[] = world.roads.map((road) => {
    const a = anchorOf(road.from);
    const b = anchorOf(road.to);
    const mid: Pt = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    // unit perpendicular of A→B
    const px = -(b.y - a.y) / len;
    const py = (b.x - a.x) / len;
    const bow = road.violation === undefined ? ROAD_BOW : VIOLATION_DODGE;
    // dodge consistently to the polyline's right; sign seeded by the pair id
    const side = rand01(hash(`${road.from}->${road.to}:side`)) < 0.5 ? 1 : -1;
    const ctrl: Pt = { x: mid.x + px * bow * side, y: mid.y + py * bow * side };
    return {
      from: road.from,
      to: road.to,
      violation: road.violation,
      points: sampleQuadratic(a, ctrl, b, ROAD_SAMPLES),
    };
  });

  // The territory: the synthetic dormant ground holder before beat 1 (its tree
  // and plate are suppressed by the derive step), the story itself after.
  const plants: ScenePlantInput[] = limbs.map((l) => ({
    id: l.id,
    status: l.green ? 'healthy' : 'building',
    x: l.pos.x,
    y: l.pos.y,
    title: l.green ? `${l.label} — proven (signed proof)` : `${l.label} — in progress`,
  }));

  const territory: SceneTerritoryInput = preStory
    ? {
        id: 'first-light',
        status: 'proposed',
        caps: 1,
        centroid: { x: cx, y: cy },
        radius: 64,
        treeSpot,
        labelY: cy + 46,
        coastPaths: [],
        decor: [],
        plants: [],
        treeTitle: '',
        wisps: [],
        plate: { w: 120, h: 33, rx: 7, idY: 14, subY: 27, idText: '', subText: '', title: '' },
      }
    : {
        id: world.storyId,
        status: storyStatus,
        caps: world.limbs.length,
        centroid: { x: cx, y: cy },
        radius: 64,
        treeSpot,
        labelY: cy + 46,
        coastPaths: [],
        decor: [],
        plants,
        treeTitle: storyLabel ?? world.storyId,
        wisps: world.hasWisp
          ? [{ runId: `walk:${world.storyId}`, title: 'an agent at work — you can look away' }]
          : [],
        plate: {
          w: 150,
          h: 34,
          rx: 7,
          idY: 15,
          subY: 28,
          idText: storyLabel ?? world.storyId,
          subText: 'a story',
          title: storyLabel ?? world.storyId,
        },
      };

  const sceneRoads: SceneRoadInput[] = roads.map((r) => ({
    from: r.from,
    to: r.to,
    d: polylineD(r.points),
    title: r.violation === undefined ? `${r.from} depends on ${r.to}` : `${r.from} → ${r.to} — flagged: ${r.violation}`,
  }));

  const sceneInput: SceneInput = {
    offset: { x: 0, y: 0 },
    width: SCENE_W,
    height: SCENE_H,
    empties: [],
    relaxedCells: null, // classic extruded-hex ground from drawTiles
    drawTiles: tiles.map((h) => ({ h, owner: 0 })),
    wheatSets: [new Set<string>()],
    roads: sceneRoads,
    territories: [territory],
  };

  return {
    sceneInput,
    preStory,
    storyLabel,
    storyStatus,
    treeSpot,
    limbs,
    roads,
    ghosts,
  };
}

// ── the derived frame: fold → buildScene → worldTo3D → descriptors + anchors ─

interface XZ {
  x: number;
  z: number;
}

export interface Act2Frame {
  fold: FoldedWorld;
  /** The rendered instances (skips dropped; pre-story keeps hex-ground only —
   *  the documented territory-always-emits-a-tree constraint). */
  instances: InstanceDescriptor[];
  camera: CameraTarget;
  beatIndex: number;
  done: boolean;
  /** Semantic camera anchors resolved from the derived world geometry. */
  anchors: Record<string, XZ>;
}

const meanXZ = (pts: XZ[]): XZ | null => {
  if (pts.length === 0) return null;
  let sx = 0;
  let sz = 0;
  for (const p of pts) {
    sx += p.x;
    sz += p.z;
  }
  return { x: sx / pts.length, z: sz / pts.length };
};

export function deriveFrame(state: DirectorState, script: Beat[]): Act2Frame {
  const fold = foldWorldToScene(state.world, script);
  const all: Descriptor3D[] = worldTo3D(buildScene(fold.sceneInput));
  const instances = all.filter((d): d is InstanceDescriptor =>
    fold.preStory ? d.kind === 'hex-ground' : d.kind !== 'skipped',
  );

  const positions = instances.map((d) => ({ x: d.transform.x, z: d.transform.z }));
  const grounds = instances.filter((d) => d.kind === 'hex-ground');
  const tree = instances.find((d) => d.kind === 'story-tree');
  const origin = meanXZ(grounds.map((d) => ({ x: d.transform.x, z: d.transform.z }))) ?? {
    x: 0,
    z: 0,
  };
  const dagPts: XZ[] = [
    ...fold.roads.flatMap((r) => r.points.map((p) => ({ x: p.x, z: p.y }))),
    ...fold.ghosts.map((g) => ({ x: g.pos.x, z: g.pos.y })),
    ...(tree ? [{ x: tree.transform.x, z: tree.transform.z }] : []),
  ];

  const anchors: Record<string, XZ> = {
    origin,
    'story-tree': tree ? { x: tree.transform.x, z: tree.transform.z } : origin,
    'dag-view': meanXZ(dagPts) ?? origin,
    'full-forest': meanXZ(positions) ?? origin,
  };

  return { fold, instances, camera: state.camera, beatIndex: state.beatIndex, done: state.done, anchors };
}

// ── the machine-checkable render signal ───────────────────────────────────────

function countKind(list: InstanceDescriptor[], kind: InstanceDescriptor['kind']): number {
  return list.filter((d) => d.kind === kind).length;
}

function logFrame(frame: Act2Frame, script: Beat[]): void {
  const { instances, fold } = frame;
  const beatId =
    frame.beatIndex === 0 ? 'empty-land' : (script[frame.beatIndex - 1]?.id ?? 'unknown-beat');
  const greenLimbs = fold.limbs.filter((l) => l.green).length;
  const violations = fold.roads.filter((r) => r.violation !== undefined).length;
  console.log(
    `[act2] beat ${frame.beatIndex}/${script.length} ${beatId}${frame.done ? ' · done' : ''} · ` +
      `descriptors: hex-ground ${countKind(instances, 'hex-ground')} · ` +
      `story-tree ${countKind(instances, 'story-tree')} · ` +
      `road-strip ${countKind(instances, 'road-strip')} · ` +
      `wisp-sprite ${countKind(instances, 'wisp-sprite')} · ` +
      `limbs ${fold.limbs.length} · green-limbs ${greenLimbs} · violation-roads ${violations}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE CANVAS — the site-owned R3F layer (the LOOK)
// ─────────────────────────────────────────────────────────────────────────────

type GroupLike = { scale: { setScalar(s: number): void } };

/** Gentle scale-in on mount (an ease-out with a whisper of overshoot). Reduced
 *  motion ⇒ full scale immediately — states jump-cut. */
function Grow({
  children,
  position,
  delay = 0,
  reducedMotion,
}: {
  children: ReactNode;
  position: [number, number, number];
  delay?: number;
  reducedMotion: boolean;
}) {
  const ref = useRef<GroupLike | null>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (reducedMotion) {
      g.scale.setScalar(1);
      return;
    }
    t.current += dt;
    const k = Math.min(1, Math.max(0, (t.current - delay) / GROW_SECS));
    // easeOutBack, gentle overshoot
    const c1 = 0.9;
    const c3 = c1 + 1;
    const e = 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
    g.scale.setScalar(Math.max(0.001, e));
  });
  return (
    <group ref={ref as never} position={position} scale={0.001}>
      {children}
    </group>
  );
}

function HexGround({ tiles }: { tiles: InstanceDescriptor[] }) {
  if (tiles.length === 0) return null;
  const R = 26.2; // circumradius just under the lattice pitch — a fine soil seam
  const H = 3.4;
  return (
    <Instances limit={Math.max(tiles.length, 1)}>
      <cylinderGeometry args={[R, R, H, 6]} />
      <meshStandardMaterial roughness={0.95} />
      {tiles.map((t, i) => (
        <Instance
          key={i}
          position={[t.transform.x, t.transform.y - H / 2, t.transform.z]}
          color={rand01(hash(`soil:${fmt(t.transform.x)}:${fmt(t.transform.z)}`)) < 0.5 ? SOIL_A : SOIL_B}
        />
      ))}
    </Instances>
  );
}

/** The story tree: trunk + a deterministic canopy cluster, young while the
 *  story is only a promise, fuller once it branches. Colour = folded status. */
function StoryTreeMesh({
  storyId,
  status,
  caps,
}: {
  storyId: string;
  status: string;
  caps: number;
}) {
  const young = status === 'proposed' || caps === 0;
  const s = young ? 0.72 : 1;
  const colour = colourOf(status);
  const j = (k: string, spread: number): number =>
    (rand01(hash(`${storyId}:${k}`)) - 0.5) * spread;
  return (
    <group scale={s}>
      <mesh position={[0, 5.5, 0]}>
        <cylinderGeometry args={[1.4, 2, 11]} />
        <meshStandardMaterial color={TRUNK} roughness={0.9} />
      </mesh>
      <mesh position={[0, 16.5, 0]}>
        <sphereGeometry args={[10, 18, 14]} />
        <meshStandardMaterial color={colour} roughness={0.85} />
      </mesh>
      <mesh position={[6 + j('b1x', 1.8), 13.4, 1.8 + j('b1z', 1.6)]}>
        <sphereGeometry args={[6.4, 16, 12]} />
        <meshStandardMaterial color={colour} roughness={0.85} />
      </mesh>
      <mesh position={[-5.8 + j('b2x', 1.8), 14, -1.6 + j('b2z', 1.6)]}>
        <sphereGeometry args={[6.9, 16, 12]} />
        <meshStandardMaterial color={colour} roughness={0.85} />
      </mesh>
    </group>
  );
}

/** A capability limb: a proven cap is a small evergreen bush; an in-progress
 *  cap is a pale sapling. The label chip carries identity + proof state for
 *  the DOM (and the witness). */
function LimbMesh({ limb }: { limb: LimbMeta }) {
  const colour = colourOf(limb.green ? 'healthy' : 'building');
  return (
    <group>
      {limb.green ? (
        <>
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.7, 1, 5]} />
            <meshStandardMaterial color={TRUNK} roughness={0.9} />
          </mesh>
          <mesh position={[0, 7, 0]}>
            <sphereGeometry args={[4.4, 14, 12]} />
            <meshStandardMaterial color={colour} roughness={0.85} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 1.7, 0]}>
            <cylinderGeometry args={[0.5, 0.7, 3.4]} />
            <meshStandardMaterial color={TRUNK} roughness={0.9} />
          </mesh>
          <mesh position={[0, 5.6, 0]}>
            <coneGeometry args={[2.4, 5.6, 9]} />
            <meshStandardMaterial color={colour} roughness={0.9} />
          </mesh>
        </>
      )}
      <Html
        center
        position={[0, 12, 0]}
        distanceFactor={190}
        zIndexRange={[8, 0]}
        wrapperClass="act2-html"
      >
        <div
          className={`act2-chip${limb.green ? ' act2-chip--proven' : ''}`}
          data-act2-limb={limb.id}
          data-act2-green={limb.green ? 'true' : 'false'}
          title={limb.green ? `signed proof: ${limb.signedProof ?? ''}` : 'no signed proof yet'}
        >
          {limb.label}
          <span className="act2-chip-state">{limb.green ? '✓ proven' : 'growing'}</span>
        </div>
      </Html>
    </group>
  );
}

/** A fictional teaching pad (a road endpoint off the island). */
function GhostPadMesh({ ghost }: { ghost: GhostMeta }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[7, 7.6, 1, 18]} />
        <meshStandardMaterial color={GHOST_PAD} roughness={0.95} />
      </mesh>
      <Html
        center
        position={[0, 5.5, 0]}
        distanceFactor={190}
        zIndexRange={[8, 0]}
        wrapperClass="act2-html"
      >
        <div className="act2-chip act2-chip--ghost" data-act2-ghost={ghost.id}>
          {ghost.label}
        </div>
      </Html>
    </group>
  );
}

type LineMaterialLike = { opacity: number; transparent: boolean };

/** One road: descriptor points on the ground; a violating road is dashed rust
 *  and carries its flag chip — both derived from the road's DATA (the matched
 *  RoadMeta), never from draw order. Draws in by fading up. */
function RoadStrip({
  desc,
  meta,
  reducedMotion,
}: {
  desc: InstanceDescriptor;
  meta: RoadMeta | undefined;
  reducedMotion: boolean;
}) {
  const matRef = useRef<LineMaterialLike | null>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    const m = matRef.current;
    if (!m) return;
    if (reducedMotion) {
      m.opacity = 1;
      return;
    }
    t.current += dt;
    m.opacity = Math.min(1, t.current / GROW_SECS);
  });
  const pts = desc.points ?? [];
  if (pts.length < 2) return null;
  const violating = meta?.violation !== undefined;
  const midPt = pts[Math.floor(pts.length / 2)]!;
  return (
    <group>
      <Line
        points={pts.map((p) => [p.x, p.y + 0.35, p.z] as [number, number, number])}
        color={violating ? ROAD_VIOLATION : ROAD_GOOD}
        lineWidth={violating ? 3.5 : 4}
        dashed={violating}
        dashSize={4.5}
        gapSize={3}
        transparent
        opacity={0}
        ref={((obj: unknown) => {
          const line = obj as { material?: LineMaterialLike } | null;
          matRef.current = line?.material ?? null;
          if (matRef.current) matRef.current.transparent = true;
        }) as never}
      />
      {violating && meta && (
        <Html
          center
          position={[midPt.x, 7, midPt.z]}
          distanceFactor={190}
          zIndexRange={[9, 0]}
          wrapperClass="act2-html"
        >
          <div className="act2-flag" data-act2-violation={meta.violation} role="img" aria-label="Flagged: this road skips a required layer">
            ⚠ wrong way — skips {bypassedLayerOf(meta.violation!) === null ? 'a required layer' : `the ${bypassedLayerOf(meta.violation!)} layer`}
          </div>
        </Html>
      )}
    </group>
  );
}

/** The wisp: a soft warm glow drifting slowly around the story — presence
 *  without obligation. Its phase is seeded (deterministic first paint); the
 *  drift itself is motion and pauses under reduced motion. */
function WispGlow({
  center,
  runId,
  reducedMotion,
}: {
  center: XZ;
  runId: string;
  reducedMotion: boolean;
}) {
  const ref = useRef<{ position: { set(x: number, y: number, z: number): void } } | null>(null);
  const matRef = useRef<{ opacity: number } | null>(null);
  const t = useRef(0);
  const phase0 = rand01(hash(runId)) * Math.PI * 2;
  useFrame((_, dt) => {
    if (!reducedMotion) t.current += dt;
    const a = phase0 + t.current * WISP_SPEED;
    const bob = reducedMotion ? 0 : Math.sin(t.current * 0.8) * 2;
    ref.current?.position.set(
      center.x + Math.cos(a) * WISP_ORBIT_R,
      WISP_HEIGHT + bob,
      center.z + Math.sin(a) * WISP_ORBIT_R * 0.72,
    );
    if (matRef.current) {
      matRef.current.opacity = reducedMotion ? 0.9 : Math.min(0.9, t.current / GROW_SECS);
    }
  });
  return (
    <group ref={ref as never}>
      <mesh>
        <sphereGeometry args={[2.4, 14, 12]} />
        <meshStandardMaterial
          color={WISP_GLOW}
          emissive={WISP_GLOW}
          emissiveIntensity={1.5}
          transparent
          opacity={0}
          ref={matRef as never}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[5.2, 14, 12]} />
        <meshStandardMaterial color={WISP_GLOW} transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Exponential damp (framerate-independent smoothing). */
const damp = (a: number, b: number, lambda: number, dt: number): number =>
  a + (b - a) * (1 - Math.exp(-lambda * dt));

type ControlsLike = {
  target: { set(x: number, y: number, z: number): void };
  update(): void;
} | null;

/** The directed camera: eases toward each beat's declared CameraTarget
 *  (semantic focus anchor + zoom) over ~1.5 s; snaps under reduced motion;
 *  hands the camera to MapControls once the walk is done (free = true). */
function CameraRig({
  frame,
  free,
  reducedMotion,
}: {
  frame: Act2Frame;
  free: boolean;
  reducedMotion: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as ControlsLike;
  const snapped = useRef(false);

  const anchor = frame.anchors[frame.camera.focus] ?? frame.anchors['origin'] ?? { x: 0, z: 0 };
  const zoom = Math.min(1, Math.max(0, frame.camera.zoom));
  const dist = DIST_FAR - (DIST_FAR - DIST_NEAR) * zoom;
  const dest = { x: anchor.x, y: LOOK_Y + dist * 0.8235, z: anchor.z + dist * 0.5673 };
  // aim a touch south of the anchor (proportional to distance) so the subject
  // rides the upper part of the frame, clear of the pacing card
  const lookZ = anchor.z + dist * LOOK_AHEAD_K;

  useEffect(() => {
    if (free && controls) {
      controls.target.set(anchor.x, LOOK_Y, lookZ);
      controls.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [free, controls]);

  useFrame((_, dt) => {
    if (free) return;
    if (reducedMotion || !snapped.current) {
      camera.position.set(dest.x, dest.y, dest.z);
      snapped.current = true;
    } else {
      camera.position.set(
        damp(camera.position.x, dest.x, CAM_LAMBDA, dt),
        damp(camera.position.y, dest.y, CAM_LAMBDA, dt),
        damp(camera.position.z, dest.z, CAM_LAMBDA, dt),
      );
    }
    camera.lookAt(anchor.x, LOOK_Y, lookZ);
  });
  return null;
}

/** Match each road-strip descriptor back to its RoadMeta by ENDPOINTS (the
 *  descriptor carries no identity) — data-derived, never a hardcoded index. */
function matchRoadMeta(desc: InstanceDescriptor, roads: RoadMeta[]): RoadMeta | undefined {
  const pts = desc.points;
  if (!pts || pts.length < 2) return undefined;
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  const near = (a: { x: number; z: number }, b: Pt): boolean =>
    Math.abs(a.x - b.x) + Math.abs(a.z - b.y) < 0.6;
  return roads.find(
    (r) =>
      r.points.length > 0 &&
      near(first, r.points[0]!) &&
      near(last, r.points[r.points.length - 1]!),
  );
}

function Act2Scene({
  frame,
  free,
  reducedMotion,
}: {
  frame: Act2Frame;
  free: boolean;
  reducedMotion: boolean;
}) {
  const { fold, instances } = frame;
  const grounds = instances.filter((d) => d.kind === 'hex-ground');
  const tree = instances.find((d) => d.kind === 'story-tree');
  const roadDescs = instances.filter((d) => d.kind === 'road-strip');
  const wisp = instances.find((d) => d.kind === 'wisp-sprite');

  return (
    <>
      <ambientLight intensity={0.85} color="#fff6e8" />
      <directionalLight position={[140, 260, 60]} intensity={1.05} color="#fff2dc" />
      <HexGround tiles={grounds} />

      {tree && fold.sceneInput.territories[0] && !fold.preStory && (
        <Grow
          key={`tree:${fold.sceneInput.territories[0].id}`}
          position={[tree.transform.x, 0, tree.transform.z]}
          reducedMotion={reducedMotion}
        >
          <StoryTreeMesh
            storyId={fold.sceneInput.territories[0].id}
            status={tree.material ?? 'unknown'}
            caps={fold.limbs.length}
          />
          <Html
            center
            position={[0, 0.5, 17]}
            distanceFactor={190}
            zIndexRange={[8, 0]}
            wrapperClass="act2-html"
          >
            <div className="act2-plate" data-act2-label>
              <span className="act2-plate-outcome">{fold.storyLabel ?? ''}</span>
              <span className="act2-plate-sub">a story</span>
            </div>
          </Html>
        </Grow>
      )}

      {fold.limbs.map((limb, i) => (
        <Grow
          key={`limb:${limb.id}`}
          position={[limb.pos.x, 0, limb.pos.y]}
          // saplings first; the proven limb greens LAST, landing with the
          // signed-proof narration (never before it)
          delay={limb.green ? 0.66 : i * 0.18}
          reducedMotion={reducedMotion}
        >
          <LimbMesh limb={limb} />
        </Grow>
      ))}

      {fold.ghosts.map((ghost) => (
        <Grow
          key={`ghost:${ghost.id}`}
          position={[ghost.pos.x, 0, ghost.pos.y]}
          delay={0.1}
          reducedMotion={reducedMotion}
        >
          <GhostPadMesh ghost={ghost} />
        </Grow>
      ))}

      {roadDescs.map((desc, i) => {
        const meta = matchRoadMeta(desc, fold.roads);
        return (
          <RoadStrip
            key={meta ? `road:${meta.from}->${meta.to}` : `road:${i}`}
            desc={desc}
            meta={meta}
            reducedMotion={reducedMotion}
          />
        );
      })}

      {wisp && (
        <WispGlow
          center={{ x: wisp.transform.x, z: wisp.transform.z }}
          runId={fold.sceneInput.territories[0]?.wisps[0]?.runId ?? 'walk'}
          reducedMotion={reducedMotion}
        />
      )}

      <CameraRig frame={frame} free={free} reducedMotion={reducedMotion} />
      <MapControls makeDefault enabled={free} maxPolarAngle={Math.PI * 0.46} />
    </>
  );
}

function Act2Canvas({
  frame,
  free,
  reducedMotion,
}: {
  frame: Act2Frame;
  free: boolean;
  reducedMotion: boolean;
}) {
  return (
    <Canvas camera={{ position: [0, 300, 210], fov: 42, near: 1, far: 4000 }}>
      <color attach="background" args={[SKY]} />
      <Act2Scene frame={frame} free={free} reducedMotion={reducedMotion} />
    </Canvas>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE PACING UI + the mount (plain DOM, the act1-storm idiom)
// ─────────────────────────────────────────────────────────────────────────────

export interface WalkthroughHandle {
  unmount(): void;
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

/**
 * Mount the walkthrough into the land canvas container. The exported contract
 * of the inflection seam is unchanged: one container in, one unmount() out —
 * the disarm path chains it (Escape / skip / the classic-page affordance).
 */
export function mountWalkthrough(container: HTMLElement): WalkthroughHandle {
  const script = defaultScript;
  const land = container.closest<HTMLElement>('#storm-land') ?? container.parentElement ?? container;
  const reducedMotion = ((): boolean => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  })();

  // ── state ──
  let director = initialState;
  let cta = false;

  // ── the React canvas root ──
  const root = createRoot(container);

  // ── the overlay panel (styled by index.astro's global CSS) ──
  const panel = el('div', 'act2-panel');
  panel.setAttribute('data-act2-panel', '');
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Guided walkthrough');

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

  // the honest CTA (revealed at the end; every link is a real onward step)
  const ctaNav = document.createElement('nav');
  ctaNav.className = 'act2-cta';
  ctaNav.setAttribute('data-act2-cta', '');
  ctaNav.setAttribute('aria-label', 'Where to next');
  ctaNav.hidden = true;
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
  ctaNav.append(ctaHow, ctaInvolved, ctaClassic);

  const controls = el('div', 'act2-controls');
  const skipBtn = el('button', 'act2-skip', 'skip the walk →');
  skipBtn.type = 'button';
  skipBtn.setAttribute('data-act2-skip', '');
  const backBtn = el('button', 'act2-back', '← back');
  backBtn.type = 'button';
  backBtn.setAttribute('data-act2-back', '');
  const nextBtn = el('button', 'act2-next btn btn--primary', 'next →');
  nextBtn.type = 'button';
  nextBtn.setAttribute('data-act2-next', '');
  controls.append(skipBtn, backBtn, nextBtn);

  panel.append(head, voice, ctaNav, controls);
  land.appendChild(panel);

  // ── state application: derive → log → render → sync panel + witness hook ──
  const narrationFor = (): BeatNarration => {
    if (cta) return NARRATION[DONE_KEY]!;
    if (director.beatIndex === 0) return INTRO;
    const beat = script[director.beatIndex - 1];
    return (beat && NARRATION[beat.id]) || INTRO;
  };

  const syncPanel = (): void => {
    const n = narrationFor();
    title.textContent = n.title;
    body.textContent = n.body;

    step.textContent = cta
      ? 'the end of the walk'
      : director.beatIndex === 0
        ? 'before the walk'
        : `step ${director.beatIndex} of ${script.length}`;

    dotEls.forEach((d, i) => {
      d.classList.toggle('is-lit', director.beatIndex >= i + 1);
    });

    ctaNav.hidden = !cta;
    nextBtn.hidden = cta;
    if (!cta) {
      if (director.beatIndex === 0) nextBtn.textContent = 'plant a story →';
      else if (director.done) nextBtn.textContent = 'finish the walk →';
      else nextBtn.textContent = 'next →';
      if (director.done) nextBtn.setAttribute('data-act2-finish', '');
      else nextBtn.removeAttribute('data-act2-finish');
    }
    backBtn.hidden = director.beatIndex === 0 && !cta;
    backBtn.textContent = cta ? '← back to the forest' : '← back';
    skipBtn.hidden = director.done || cta;

    (window as unknown as { __act2?: { beatIndex: number; done: boolean; cta: boolean } }).__act2 =
      { beatIndex: director.beatIndex, done: director.done, cta };
  };

  const render = (): void => {
    const frame = deriveFrame(director, script);
    root.render(<Act2Canvas frame={frame} free={cta} reducedMotion={reducedMotion} />);
  };

  const applyDirector = (next: DirectorState): void => {
    director = next;
    const frame = deriveFrame(director, script);
    logFrame(frame, script);
    root.render(<Act2Canvas frame={frame} free={cta} reducedMotion={reducedMotion} />);
    syncPanel();
  };

  // ── the affordances (the visitor disposes; nothing auto-advances) ──
  const onNext = (): void => {
    if (cta) return;
    if (!director.done) {
      applyDirector(advance(director, script));
    } else {
      cta = true;
      render();
      syncPanel();
    }
  };
  const onBack = (): void => {
    if (cta) {
      cta = false;
      render();
      syncPanel();
      return;
    }
    if (director.beatIndex > 0) applyDirector(stateAt(director.beatIndex - 1, script));
  };
  const onSkip = (): void => {
    cta = true;
    applyDirector(stateAt(script.length, script));
  };
  nextBtn.addEventListener('click', onNext);
  backBtn.addEventListener('click', onBack);
  skipBtn.addEventListener('click', onSkip);

  // ── first paint: the empty land, beat 0 ──
  // The legacy render signal, kept for continuity with the inflection increment:
  {
    const frame = deriveFrame(director, script);
    const c = (k: InstanceDescriptor['kind']): number => countKind(frame.instances, k);
    console.log(
      `[storm-inflection] descriptors: hex-ground ${c('hex-ground')} · story-tree ${c('story-tree')} · ` +
        `road-strip ${c('road-strip')} · wisp-sprite ${c('wisp-sprite')} · skipped 0`,
    );
  }
  applyDirector(initialState);

  return {
    unmount(): void {
      nextBtn.removeEventListener('click', onNext);
      backBtn.removeEventListener('click', onBack);
      skipBtn.removeEventListener('click', onSkip);
      root.unmount();
      panel.remove();
      delete (window as unknown as { __act2?: unknown }).__act2;
    },
  };
}
