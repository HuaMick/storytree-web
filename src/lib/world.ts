// ---------------------------------------------------------------------------
// world.ts — a self-contained, original layout + render engine for the
// storytree "story world" demo.
//
// It lays a set of stories (and their dependency edges) out as a
// Dorfromantik-style world of EXTRUDED HEX-TILE TERRITORIES — the most
// depended-upon "foundation" stories sit at the bottom and dependents fan
// upward, so the eye traces the load-bearing base up through the canopy.
// Each story claims a cluster of hex tiles and grows ONE central tree whose
// SIZE scales with how much is proven there (its total contract count), so a
// heavier, more-tested story is a visibly bigger tree — complexity you can read
// at a glance. Garden flora are its capabilities; dashed "roads" are dependency
// edges; a signpost marks a human-witnessed story; "blooms" announce fresh
// passing verdicts; "wisps" are the sessions working right now. Each story also
// carries a laid-out capability sub-DAG for the drill-down.
//
// Everything is computed deterministically at BUILD TIME (pure functions, no
// randomness that isn't hashed from ids), so the world renders identically
// every visit and ships as static HTML. The visual *language* is recreated
// from first principles — axial hex math, longest-path ranking, greedy
// territory growth, bezier roads — nothing is copied from the private studio.
// ---------------------------------------------------------------------------

export type Status = 'healthy' | 'mapped' | 'proposed' | 'building' | 'unhealthy';

export interface Verdict {
  outcome: 'pass' | 'fail';
  at: string;
}
export interface Capability {
  id: string;
  title: string;
  status: Status;
  /** Leaf-test count. Optional — derived from the id when absent. */
  contracts?: number;
  dependsOn?: string[];
  verdict?: Verdict;
}
export interface Story {
  id: string;
  title: string;
  outcome: string;
  status: Status;
  witness: 'human' | 'machine';
  dependsOn: string[];
  verdict?: Verdict;
  capabilities: Capability[];
}
export interface Session {
  id: string;
  branch: string;
  workingOn: string;
  band: 'fresh' | 'stale';
  nodes: string[];
}
export interface Dataset {
  project: string;
  tagline?: string;
  note: string;
  stories: Story[];
  sessions?: Session[];
}

// The instant the demo world is "as of" — fresh passing verdicts within
// BLOOM_WINDOW of this bloom on the map (a one-shot game-feel layer).
const DEMO_NOW = Date.parse('2026-06-14T09:30:00Z');
const BLOOM_WINDOW = 60 * 60 * 1000 * 48; // 48h

// ---------- deterministic pseudo-random (FNV-1a + mulberry32 step) ----------

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rand01(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------- hex grid (pointy-top, axial coordinates) ----------

const HEX_R = 26; // centre -> corner
const HEX_W = Math.sqrt(3) * HEX_R; // flat-to-flat width
const DEPTH = 7; // tile extrusion below the top face

interface Axial { q: number; r: number; }
interface Pt { x: number; y: number; }
const key = (h: Axial): string => `${h.q},${h.r}`;

const DIRS: Axial[] = [
  { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
  { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 },
];

function center(h: Axial): Pt {
  return { x: HEX_W * (h.q + h.r / 2), y: 1.5 * HEX_R * h.r };
}
function pixelToHex(p: Pt): Axial {
  const rf = p.y / (1.5 * HEX_R);
  const qf = p.x / HEX_W - rf / 2;
  const sf = -qf - rf;
  let q = Math.round(qf);
  let r = Math.round(rf);
  const s = Math.round(sf);
  const dq = Math.abs(q - qf);
  const dr = Math.abs(r - rf);
  const ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q, r };
}
function hexDist(a: Axial, b: Axial): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}
function corners(cx: number, cy: number, R: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    out.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
  }
  return out;
}
function hexPath(cx: number, cy: number, R: number): string {
  return corners(cx, cy, R)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ') + ' Z';
}

// ---------- graph helpers ----------

const ALIVE: Record<Status, Status> = {
  healthy: 'healthy', mapped: 'mapped', proposed: 'proposed',
  building: 'proposed', unhealthy: 'unhealthy', // building wears proposed
};
const display = (s: Status): Status => ALIVE[s] ?? s;

function longestRank(ids: string[], depsOf: Map<string, string[]>): Map<string, number> {
  const rank = new Map<string, number>();
  const visiting = new Set<string>();
  const visit = (id: string): number => {
    const known = rank.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0; // cycle guard
    visiting.add(id);
    let r = 0;
    for (const d of depsOf.get(id) ?? []) r = Math.max(r, visit(d) + 1);
    visiting.delete(id);
    rank.set(id, r);
    return r;
  };
  for (const id of ids) visit(id);
  return rank;
}
function transitiveClosure(start: string, next: Map<string, string[]>): string[] {
  const seen = new Set<string>();
  const stack = [...(next.get(start) ?? [])];
  for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(next.get(id) ?? []));
  }
  return [...seen];
}

const ringsOf = (q: number): number => (q <= 1 ? 0 : q <= 7 ? 1 : q <= 19 ? 2 : 3);
const estRadius = (q: number): number => Math.sqrt(q) * HEX_W * 0.46 + HEX_R;
// A capability's contract (leaf-test) count — the proxy for "how much is proven
// here". Authored when present, else a stable hash-derived 2..10 so the mock
// still shows a believable spread of complexity at a glance.
const contractsOf = (c: Capability): number => c.contracts ?? 2 + (hash(c.id) % 9);
// Crown size grows with the story's total contract count, so a heavier, more
// tested story is a visibly BIGGER tree — the core "complexity at a glance".
// Wide slope + range so light vs heavy stories read at very different sizes.
const crownRadius = (weight: number): number => Math.max(13, Math.min(48, 11 + weight * 0.85));
const treeReach = (crownR: number): number => 2.7 * crownR + 16;

// ---------- view structures ----------

interface Tile { d: string; side: string; owner: number; variant: number; wheat: boolean; }
interface CapSpot { id: string; title: string; status: Status; x: number; y: number; variant: number; bloom: boolean; contracts: number; }
interface DecorSpot { x: number; y: number; seed: number; }
interface WispView { id: string; band: 'fresh' | 'stale'; workingOn: string; }

export interface DagNode { id: string; title: string; status: Status; contracts: number; x: number; y: number; }
export interface CapDag { w: number; h: number; nodes: DagNode[]; edges: { d: string }[]; }

export interface Territory {
  i: number;
  id: string; title: string; outcome: string;
  status: Status; vis: Status; witness: 'human' | 'machine';
  capCount: number; contractTotal: number; weight: number; crownR: number; verdict?: Verdict;
  cx: number; cy: number; radius: number;
  treeX: number; treeY: number; labelY: number; plateW: number;
  caps: CapSpot[]; decor: DecorSpot[]; wisps: WispView[]; capDag: CapDag;
  bloom: boolean; sapling: boolean; young: boolean; withered: boolean;
  sealFilled: boolean;
  deps: string[]; ancestors: string[]; descendants: string[];
  sessions: { id: string; workingOn: string; band: string }[];
}
interface Border { x1: number; y1: number; x2: number; y2: number; }
interface Road { from: string; to: string; d: string; }

export interface World {
  project: string;
  width: number; height: number; ox: number; oy: number;
  tiles: Tile[]; coast: string[]; borders: Border[]; roads: Road[];
  territories: Territory[];
  drawOrder: number[];
  stats: { stories: number; caps: number; contracts: number; proven: number; building: number; unhealthy: number; sessions: number };
}

// ---------- capability sub-DAG layout (the drill-down) ----------

// A simple layered (longest-path) layout of a story's capabilities, dependencies
// at the bottom. Cards are a fixed CW×CH; CLIENT renders with the same numbers.
export const DAG_CW = 112;
export const DAG_CH = 42;
const DAG_HGAP = 26;
const DAG_WGAP = 12;

function layoutCapDag(story: Story): CapDag {
  const caps = story.capabilities;
  if (caps.length === 0) return { w: DAG_CW, h: DAG_CH, nodes: [], edges: [] };
  const ids = new Set(caps.map((c) => c.id));
  const depsOf = new Map<string, string[]>(
    caps.map((c) => [c.id, (c.dependsOn ?? []).filter((d) => d !== c.id && ids.has(d))]),
  );
  const rankMap = longestRank(caps.map((c) => c.id), depsOf);
  const maxR = Math.max(0, ...rankMap.values());
  const byR: Capability[][] = Array.from({ length: maxR + 1 }, () => []);
  caps.forEach((c) => byR[rankMap.get(c.id) ?? 0].push(c));
  const rowW = byR.map((row) => row.length * DAG_CW + Math.max(0, row.length - 1) * DAG_WGAP);
  const w = Math.max(DAG_CW, ...rowW);
  const h = (maxR + 1) * DAG_CH + maxR * DAG_HGAP;
  const pos = new Map<string, Pt>();
  byR.forEach((row, r) => {
    const y = (maxR - r) * (DAG_CH + DAG_HGAP); // rank 0 sits at the bottom
    let x = (w - rowW[r]) / 2;
    for (const c of row) { pos.set(c.id, { x, y }); x += DAG_CW + DAG_WGAP; }
  });
  const nodes: DagNode[] = caps.map((c) => {
    const p = pos.get(c.id)!;
    return { id: c.id, title: c.title, status: display(c.status), contracts: contractsOf(c), x: p.x, y: p.y };
  });
  const edges: { d: string }[] = [];
  for (const c of caps) {
    for (const d of depsOf.get(c.id) ?? []) {
      const cp = pos.get(c.id)!, dp = pos.get(d)!;
      const x1 = dp.x + DAG_CW / 2, y1 = dp.y;          // top of the dependency
      const x2 = cp.x + DAG_CW / 2, y2 = cp.y + DAG_CH; // bottom of the dependent
      const my = (y1 + y2) / 2;
      edges.push({ d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${my.toFixed(1)}, ${x2.toFixed(1)} ${my.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}` });
    }
  }
  return { w, h, nodes, edges };
}

// ---------- build ----------

export function buildWorld(data: Dataset): World {
  const stories = data.stories;
  const sessions = data.sessions ?? [];
  const n = stories.length;
  const idIndex = new Map(stories.map((s, i) => [s.id, i]));
  // weight = total contracts in the story (drives tree + island size)
  const weights = stories.map((s) => s.capabilities.reduce((sum, c) => sum + contractsOf(c), 0));
  const quotas = stories.map((_, i) => Math.max(4, Math.min(13, 3 + Math.round(weights[i] / 4))));

  // edges: declared story-level depends_on, filtered to real, non-self
  const depsOf = new Map<string, string[]>(stories.map((s) => [s.id, []]));
  const dependentsOf = new Map<string, string[]>(stories.map((s) => [s.id, []]));
  const edgeList: { from: string; to: string }[] = [];
  for (const s of stories) {
    for (const d of s.dependsOn ?? []) {
      if (d !== s.id && idIndex.has(d)) {
        depsOf.get(s.id)!.push(d);
        dependentsOf.get(d)!.push(s.id);
        edgeList.push({ from: d, to: s.id });
      }
    }
  }

  const ranks = longestRank(stories.map((s) => s.id), depsOf);
  const loadBearing = new Map(stories.map((s) => [s.id, transitiveClosure(s.id, dependentsOf).length]));
  const maxRank = Math.max(0, ...ranks.values());
  const byRank: number[][] = Array.from({ length: maxRank + 1 }, () => []);
  stories.forEach((s, i) => byRank[ranks.get(s.id) ?? 0].push(i));

  // row centre-lines, bottom (rank 0) up
  const RANK_GAP = 30, ISLAND_GAP = 52, SWING = 210;
  const rowY: number[] = [];
  let yC = 0;
  for (let r = 0; r <= maxRank; r++) {
    const tallest = Math.max(...byRank[r].map((i) => estRadius(quotas[i])), HEX_R);
    if (r === 0) yC = -tallest;
    else {
      const below = Math.max(...byRank[r - 1].map((i) => estRadius(quotas[i])), HEX_R);
      yC -= below + tallest + RANK_GAP;
    }
    rowY.push(yC);
  }

  // seed pixel positions per row
  const seedPx = new Map<number, Pt>();
  const baryOf = (idx: number): number => {
    const xs = (depsOf.get(stories[idx].id) ?? [])
      .map((d) => idIndex.get(d)!)
      .filter((j) => seedPx.has(j))
      .map((j) => seedPx.get(j)!.x);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  };
  for (let r = 0; r <= maxRank; r++) {
    const row = byRank[r];
    const ordered = [...row].sort((a, b) => {
      if (r === 0) return (loadBearing.get(stories[b].id) ?? 0) - (loadBearing.get(stories[a].id) ?? 0);
      return baryOf(a) - baryOf(b) || (hash(stories[a].id) % 997) - (hash(stories[b].id) % 997);
    });
    let display2 = ordered;
    if (r === 0) {
      display2 = [];
      ordered.forEach((i, k) => (k % 2 === 0 ? display2.push(i) : display2.unshift(i)));
    }
    const seq = display2.map((idx) => ({ idx, w: estRadius(quotas[idx]) }));
    const total = seq.reduce((s, x) => s + 2 * x.w, 0) + ISLAND_GAP * Math.max(0, seq.length - 1);
    let rowCenter = r === 0 ? 0 : display2.reduce((s, i) => s + baryOf(i), 0) / Math.max(display2.length, 1);
    if (r > 0 && seq.length === 1) rowCenter += (r % 2 === 1 ? 1 : -1) * SWING;
    let x = rowCenter - total / 2;
    for (const it of seq) {
      const seed = hash(stories[it.idx].id);
      seedPx.set(it.idx, { x: x + it.w + (rand01(seed) - 0.5) * 40, y: rowY[r] + (rand01(seed + 1) - 0.5) * 26 });
      x += 2 * it.w + ISLAND_GAP;
    }
  }

  // snap to lattice + spread overlapping seeds
  const seeds: Axial[] = stories.map((_, i) => pixelToHex(seedPx.get(i) ?? { x: 0, y: 0 }));
  for (let pass = 0; pass < 30; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const floor = ringsOf(quotas[i]) + ringsOf(quotas[j]) + 1;
        if (hexDist(seeds[i], seeds[j]) < floor) {
          seeds[j] = { q: seeds[j].q + 1, r: seeds[j].r };
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  // grow territories round-robin (each claims its nearest free frontier hex)
  const owner = new Map<string, number>();
  const tiles: Axial[][] = stories.map(() => []);
  seeds.forEach((sd, i) => { owner.set(key(sd), i); tiles[i].push(sd); });
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < n; i++) {
      if (tiles[i].length >= quotas[i]) continue;
      let best: Axial | null = null;
      let bestCost = Infinity;
      for (const t of tiles[i]) {
        for (const d of DIRS) {
          const cand = { q: t.q + d.q, r: t.r + d.r };
          if (owner.has(key(cand))) continue;
          const cost = hexDist(seeds[i], cand) + rand01(hash(`${stories[i].id}:${key(cand)}`)) * 1.3;
          if (cost < bestCost) { bestCost = cost; best = cand; }
        }
      }
      if (best) { owner.set(key(best), i); tiles[i].push(best); progress = true; }
    }
  }

  // per-territory geometry + contents
  const territories: Territory[] = stories.map((story, i) => {
    const cs = tiles[i].map(center);
    const cx = cs.reduce((s, p) => s + p.x, 0) / cs.length;
    const cy = cs.reduce((s, p) => s + p.y, 0) / cs.length;
    const radius = Math.max(0, ...cs.map((p) => Math.hypot(p.x - cx, p.y - cy))) + HEX_R;
    const centerTile = [...tiles[i]].sort((a, b) => {
      const ca = center(a), cb = center(b);
      return Math.hypot(ca.x - cx, ca.y - cy) - Math.hypot(cb.x - cx, cb.y - cy);
    })[0];
    const tp = center(centerTile);
    const vis = display(story.status);
    const caps = story.capabilities;
    const weight = weights[i];
    const crownR = crownRadius(weight);
    const ringR = Math.max(crownR * 0.9, Math.min(crownR + 16, radius - HEX_R * 0.5));
    const ARC = (Math.PI * 4) / 3;
    const capSpots: CapSpot[] = caps.map((cap, j) => {
      const a = -Math.PI / 6 + ((j + 0.5) / caps.length) * ARC + (rand01(hash(`${cap.id}:a`)) - 0.5) * 0.3;
      const rr = ringR + (rand01(hash(`${cap.id}:r`)) - 0.5) * 9;
      let x = tp.x + Math.cos(a) * rr;
      let y = tp.y + Math.sin(a) * rr * 0.7;
      for (let k = 0; k < 4 && owner.get(key(pixelToHex({ x, y }))) !== i; k++) {
        x += (tp.x - x) * 0.28; y += (tp.y - y) * 0.28;
      }
      const cv = display(cap.status);
      // Capability-level blooms are disabled: the mock verdicts cluster at each
      // story's timestamp, so per-cap sparkles bunch up. The crown bloom alone
      // carries "this story just passed" cleanly.
      return { id: cap.id, title: cap.title, status: cv, x, y, variant: hash(`${cap.id}:v`) % 3, bloom: false, contracts: contractsOf(cap) };
    });

    const decor: DecorSpot[] = [];
    const wheat = new Set<string>();
    for (const tile of tiles[i]) {
      if (key(tile) === key(centerTile)) continue;
      const roll = rand01(hash(`${story.id}:dec:${key(tile)}`));
      const c = center(tile);
      const near = Math.hypot(c.x - tp.x, c.y - tp.y) < crownR + 18;
      if (roll < 0.3 && !near) decor.push({ x: c.x, y: c.y, seed: hash(`${key(tile)}:f`) });
      else if (roll >= 0.3 && roll < 0.55) wheat.add(key(tile));
    }
    (story as any).__wheat = wheat;

    const labelY = Math.max(...cs.map((p) => p.y), cy) + HEX_R + DEPTH + 7;
    const witnessSessions = sessions.filter((se) =>
      se.nodes.some((nd) => nd === story.id || caps.some((c) => c.id === nd)));
    const wisps: WispView[] = witnessSessions.map((se) => ({ id: se.id, band: se.band, workingOn: se.workingOn }));
    const bloom = vis !== 'unhealthy' && !!story.verdict && story.verdict.outcome === 'pass'
      && DEMO_NOW - Date.parse(story.verdict.at) >= 0 && DEMO_NOW - Date.parse(story.verdict.at) < BLOOM_WINDOW;

    return {
      i, id: story.id, title: story.title, outcome: story.outcome,
      status: story.status, vis, witness: story.witness, capCount: caps.length, contractTotal: weight, weight, crownR, verdict: story.verdict,
      cx, cy, radius, treeX: tp.x, treeY: tp.y, labelY, plateW: Math.max(110, story.title.length * 7.6 + 26),
      caps: capSpots, decor, wisps, capDag: layoutCapDag(story),
      bloom, sapling: caps.length === 0 && vis !== 'unhealthy', young: vis === 'proposed' && caps.length > 0, withered: vis === 'unhealthy',
      sealFilled: story.witness === 'human' && !!story.verdict && story.verdict.outcome === 'pass',
      deps: depsOf.get(story.id) ?? [],
      ancestors: transitiveClosure(story.id, depsOf),
      descendants: transitiveClosure(story.id, dependentsOf),
      sessions: witnessSessions.map((se) => ({ id: se.id, workingOn: se.workingOn, band: se.band })),
    };
  });

  // draw tiles back-to-front; tag grass variant + wheat
  const drawTiles: Tile[] = [...owner.entries()]
    .map(([k, idx]) => {
      const parts = k.split(',');
      const h = { q: Number(parts[0]), r: Number(parts[1]) };
      const c = center(h);
      const wheatSet: Set<string> = (stories[idx] as any).__wheat ?? new Set();
      return {
        h, owner: idx,
        d: hexPath(c.x, c.y, HEX_R),
        side: hexPath(c.x, c.y + DEPTH, HEX_R),
        variant: hash(`tile:${k}`) % 3,
        wheat: wheatSet.has(k),
      };
    })
    .sort((a, b) => a.h.r - b.h.r || a.h.q - b.h.q)
    .map(({ d, side, owner, variant, wheat }) => ({ d, side, owner, variant, wheat }));

  // coast: up to two thinned rings of empty hexes
  const coast: string[] = [];
  const emptySet = new Set<string>();
  let ring: Axial[] = [...owner.keys()].map((k) => {
    const p = k.split(','); return { q: Number(p[0]), r: Number(p[1]) };
  });
  for (let depth = 0; depth < 2; depth++) {
    const next: Axial[] = [];
    for (const t of ring) {
      for (const d of DIRS) {
        const cand = { q: t.q + d.q, r: t.r + d.r };
        const k = key(cand);
        if (owner.has(k) || emptySet.has(k)) continue;
        if (depth === 1 && rand01(hash(`coast:${k}`)) < 0.5) continue;
        emptySet.add(k);
        const c = center(cand);
        coast.push(hexPath(c.x, c.y, HEX_R - 0.6));
        next.push(cand);
      }
    }
    ring = next;
  }

  // territory borders (edges adjacent to foreign / empty soil)
  const borders: Border[] = [];
  for (let i = 0; i < n; i++) {
    const mine = new Set(tiles[i].map(key));
    for (const tile of tiles[i]) {
      const c = center(tile);
      const cor = corners(c.x, c.y, HEX_R);
      DIRS.forEach((d, e) => {
        if (mine.has(key({ q: tile.q + d.q, r: tile.r + d.r }))) return;
        borders.push({ x1: cor[e].x, y1: cor[e].y, x2: cor[(e + 1) % 6].x, y2: cor[(e + 1) % 6].y });
      });
    }
  }

  // roads (dep -> dependent), bowed for multi-rank spans
  const roads: Road[] = edgeList.map(({ from, to }) => {
    const a = territories[idIndex.get(from)!];
    const b = territories[idIndex.get(to)!];
    const dx = b.cx - a.cx, dy = b.cy - a.cy;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const sx = a.cx + ux * a.radius * 0.78, sy = a.cy + uy * a.radius * 0.78;
    const ex = b.cx - ux * b.radius * 0.82, ey = b.cy - uy * b.radius * 0.82;
    const span = Math.abs((ranks.get(to) ?? 0) - (ranks.get(from) ?? 0));
    const rr = rand01(hash(`${from}->${to}`));
    let bow: number;
    if (span >= 2) {
      const side = Math.sign((a.cx + b.cx) / 2) || (rr < 0.5 ? -1 : 1);
      bow = side * Math.min(0.42, 0.16 + 0.06 * span + 0.05 * rr) * dist;
    } else bow = (rr - 0.5) * 0.36 * dist;
    const mx = (sx + ex) / 2 - uy * bow, my = (sy + ey) / 2 + ux * bow;
    return { from, to, d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}` };
  });

  // bounds
  const tileCenters: Pt[] = [];
  for (const [k] of owner) { const p = k.split(','); tileCenters.push(center({ q: Number(p[0]), r: Number(p[1]) })); }
  for (const k of emptySet) { const p = k.split(','); tileCenters.push(center({ q: Number(p[0]), r: Number(p[1]) })); }
  const MARGIN = 54;
  const minX = Math.min(...tileCenters.map((p) => p.x)) - HEX_W / 2 - MARGIN;
  const maxX = Math.max(...tileCenters.map((p) => p.x)) + HEX_W / 2 + MARGIN;
  const minY = Math.min(
    ...tileCenters.map((p) => p.y - HEX_R),
    ...territories.map((t) => t.treeY - treeReach(t.crownR)),
  ) - MARGIN;
  const maxY = Math.max(...tileCenters.map((p) => p.y), ...territories.map((t) => t.labelY + 30)) + HEX_R + DEPTH + MARGIN / 2;

  const drawOrder = territories.map((_, i) => i).sort((a, b) => territories[a].treeY - territories[b].treeY);

  const caps = stories.reduce((s, st) => s + st.capabilities.length, 0);
  const contractsTotal = weights.reduce((a, b) => a + b, 0);
  const proven = territories.filter((t) => t.vis === 'healthy').length;
  const building = stories.filter((s) => s.status === 'building').length;
  const unhealthy = territories.filter((t) => t.vis === 'unhealthy').length;

  return {
    project: data.project,
    width: Math.ceil(maxX - minX), height: Math.ceil(maxY - minY), ox: -minX, oy: -minY,
    tiles: drawTiles, coast, borders, roads, territories, drawOrder,
    stats: { stories: n, caps, contracts: contractsTotal, proven, building, unhealthy, sessions: sessions.length },
  };
}
