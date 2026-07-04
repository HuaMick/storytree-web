// ---------------------------------------------------------------------------
// worldSvg.ts — turns a computed World (world.ts) into SVG by walking the SHARED
// forest-world SCENE-GRAPH (ADR-0093, strategy C). This is the website twin of
// the studio's SceneView.tsx: it folds the World into the core's neutral
// `SceneInput`, calls `buildScene(...)` (the core's pure, deterministic drawable
// tree), then walks the resulting `SceneNode` tree emitting SVG STRINGS with the
// website's own `tw-*` class vocabulary (the studio uses React + per-node
// handlers; the website uses string SVG + `data-id` event delegation).
//
// A studio look change in the core now FLOWS to the public site through this one
// scene-graph — the geometry is no longer hand-duplicated here. Colour still
// lives in CSS (classes only here) so the legend can recolour / filter.
//
// Pure string building, build-time only; the scene is deterministic
// (hash/rand01 from ids, no Math.random / wall-clock in render).
// ---------------------------------------------------------------------------

import {
  type SceneInput,
  type SceneKind,
  type SceneNode,
  type SceneStatus,
  buildScene,
} from './forest-world/index';
import type { World, Territory, CapSpot } from './world';

const f = (x: number): string => x.toFixed(1);
const esc = (s: unknown): string =>
  String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ---------------------------------------------------------------------------
// World → SceneInput (the website's fold; mirrors TreeView's worldToScene)
// ---------------------------------------------------------------------------
//
// The website folds ONLY presentation facts it owns — the status is already
// folded into each territory's `vis`, blooms/wisps/signpost are the demo's
// marks, nameplate text + tooltips are the website's vocabulary. The core
// derives every hash-seeded variant/jitter from the ids. The mesh branch:
// `relaxedCells` is the computed mesh, so `empties`/`drawTiles`/`wheatSets`
// are empty (the scene's hex/empties layers stay dark).

const SUB = (t: Territory): string =>
  t.vis === 'healthy' ? `${t.capCount} caps · proven`
    : t.vis === 'unhealthy' ? `${t.capCount} caps · failing`
      : `${t.vis} · ${t.capCount} caps`;

function capToSceneInput(c: CapSpot): SceneInput['territories'][number]['plants'][number] {
  return {
    id: c.id,
    status: c.status as SceneStatus,
    x: c.x,
    y: c.y,
    title: `${c.title} — ${c.status === 'unhealthy' ? 'failing' : c.status}`,
    // Capability-level blooms are disabled in the demo layout (world.ts), so the
    // crown bloom alone carries "just passed" — never emit a plant bloom here.
  };
}

function territoryToSceneInput(t: Territory): SceneInput['territories'][number] {
  return {
    id: t.id,
    status: t.vis as SceneStatus,
    caps: t.capCount,
    centroid: { x: t.cx, y: t.cy },
    radius: t.radius,
    treeSpot: { x: t.treeX, y: t.treeY },
    labelY: t.labelY,
    coastPaths: t.coastPaths,
    decor: t.decor.map((d) => ({ x: d.x, y: d.y, seed: d.seed })),
    plants: t.caps.map(capToSceneInput),
    treeTitle: `${t.title} — ${t.vis === 'unhealthy' ? 'failing' : t.vis}`,
    // A human-witness story shows the signpost; outcome null = a blank seal.
    ...(t.witness === 'human'
      ? { signpost: { outcome: t.sealFilled ? ('pass' as const) : null } }
      : {}),
    // Crown bloom: the demo seeds bloom by id only (no age decay over time), so a
    // present bloom rides at full age.
    ...(t.bloom && !t.sapling
      ? { bloom: { ageRatio: 1, outcome: (t.verdict?.outcome ?? 'pass') as 'pass' | 'fail' } }
      : {}),
    wisps: t.wisps.map((w) => ({
      runId: `${t.id}:${w.id}`,
      title: `${w.id} — ${w.workingOn}`,
      // The live prove-it-gate phase, when the surface folded one in; the core maps
      // it to the wisp's red→green band (ADR-0048 §3 v2). Absent → neutral building.
      ...(w.phase ? { phase: w.phase } : {}),
    })),
    plate: {
      w: t.plateW,
      h: 30,
      rx: 7,
      idY: 13,
      subY: 25,
      idText: t.title,
      subText: SUB(t),
      title: t.title,
    },
  };
}

export function worldToSceneInput(w: World): SceneInput {
  return {
    offset: { x: w.ox, y: w.oy },
    width: w.width,
    height: w.height,
    empties: [],
    relaxedCells: w.relaxedCells,
    drawTiles: [],
    wheatSets: [],
    roads: w.roads.map((e) => ({
      from: e.from,
      to: e.to,
      d: e.d,
      title: `${e.to} depends on ${e.from}`,
    })),
    territories: w.territories.map(territoryToSceneInput),
  };
}

// ---------------------------------------------------------------------------
// SceneNode → SVG string (the website's mapper; mirrors SceneView's role→class)
// ---------------------------------------------------------------------------
//
// Role → the website's base class(es). A kind absent here (or mapped to '')
// renders an unclassed element (a structural <g>, or a child the website styles
// via its group's class, e.g. crown blobs styled by `.tw-terr .lo circle`).
// Composed kinds (status / variant / road / tree / bloom / wisp) are handled in
// the walk below, NOT here.
const BASE: Partial<Record<SceneKind, string>> = {
  'coast-shore': 'tw-shore',
  // tree internals — styled by the group, so most are bare class names
  shadow: 'sh',
  trunk: 'trunk',
  'crown-lo': 'lo',
  'crown-hi': 'hi',
  bare: 'bare',
  litter: 'litter',
  'sign-post': 'post',
  'sign-head': 'head',
  // flora bodies (the silhouettes the studio's 6 variants resolve to)
  'flora-hit': 'flora-hit',
  'dead-ground': 'dead-ground',
  'flora-bed': 'bed',
  'flora-dark': 'dark',
  'flora-light': 'light',
  'flora-core': 'core',
  'flora-stem': 'stem',
  'flora-dead-stem': 'dead',
  'flora-dead-head': 'dead-head',
  'flora-dead-twig': 'dead-twig',
  'sapling-trunk': 'sap-trunk',
  // conifer
  'conifer-body': 'body',
  'conifer-snow': 'snow',
  // bloom internals
  'bloom-ring': 'ring',
  'bloom-spark': 'spark',
  // wisp internals
  'wisp-hit': 'wisp-hit',
  'wisp-glow': 'glow',
  'wisp-dot': 'dot',
  // nameplate internals
  'plate-bg': 'bg',
  'plate-id': 'ttl',
  'plate-sub': 'sub',
};

/** The class(es) for a node — the website's class for the role, plus folded
 *  status / variant for the composite roles. Returns '' for an unclassed node. */
function classOf(node: SceneNode): string {
  const k = node.kind;
  if (!k) return '';
  switch (k) {
    case 'cell':
      return `tw-cell v${node.variant ?? 0}`;
    case 'cell-wheat':
      return 'tw-cell wheat';
    case 'conifer-body':
      // the website styles the conifer body via the parent's `c-N`, so the body
      // itself is just `body`; the `c-N` lives on the conifer group (below).
      return 'body';
    case 'sign-blank':
      return 'seal-blank';
    case 'sign-pass':
    case 'sign-fail':
      return 'seal-filled';
    default: {
      const base = BASE[k] ?? '';
      return node.accent && base ? `${base} accent` : base;
    }
  }
}

/** Format the shared scene attrs (transform / opacity / stroke-width) common to
 *  every element kind. */
function commonAttrs(node: SceneNode): string {
  let s = '';
  if (node.transform) s += ` transform="${node.transform}"`;
  if (node.opacity != null) s += ` opacity="${node.opacity}"`;
  if (node.strokeWidth != null) s += ` stroke-width="${node.strokeWidth}"`;
  return s;
}

/** Emit a leaf primitive (everything but <g>) as an SVG string. In the scene,
 *  `<title>` tooltips ride GROUP nodes (territory / flora / tree / road / …), so
 *  leaf primitives never carry one — kept self-closing. */
function emitPrimitive(node: SceneNode, cls: string): string {
  const c = cls ? ` class="${cls}"` : '';
  const a = commonAttrs(node);
  switch (node.el) {
    case 'circle':
      return `<circle${c}${a} cx="${f(node.cx)}" cy="${f(node.cy)}" r="${f(node.r)}"/>`;
    case 'ellipse':
      return `<ellipse${c}${a} cx="${f(node.cx)}" cy="${f(node.cy)}" rx="${f(node.rx)}" ry="${f(node.ry)}"/>`;
    case 'rect':
      return `<rect${c}${a} x="${f(node.x)}" y="${f(node.y)}" width="${f(node.width)}" height="${f(node.height)}" rx="${f(node.rx)}"/>`;
    case 'path':
      return `<path${c}${a} d="${node.d}"/>`;
    case 'polygon':
      return `<polygon${c}${a} points="${node.points}"/>`;
    case 'text':
      return `<text${c}${a} x="${f(node.x)}" y="${f(node.y)}" text-anchor="${node.anchor}">${esc(node.text)}</text>`;
    default:
      return '';
  }
}

const childrenSvg = (node: Extract<SceneNode, { el: 'g' }>, storyId?: string): string =>
  node.children.map((c) => sceneToSvg(c, storyId)).join('');

/**
 * Walk a scene node → SVG string. Most nodes map straight through their role
 * class; a handful of website-specific behaviours (event delegation, the CSS
 * sway/orbit animations) need bespoke handling and are special-cased here:
 *  - the per-territory flora group carries `data-id` (delegation);
 *  - coast / ground groups carry `st-<vis>` + `data-id`;
 *  - a road emits BOTH a `bed` and a `line` path from its single `d`;
 *  - the hit layer becomes focusable `<rect>`s (the website renders it — the
 *    studio skips it);
 *  - the tree splits its translate (outer <g>) from a swaying `.tw-crown` (inner
 *    <g>), with the bloom + signpost kept OUTSIDE `.tw-crown` so the CSS rotate
 *    can't clobber them;
 *  - a bloom keeps the translate on the wrapper, the pulse on inner `.tw-bloom`;
 *  - a wisp carries `--phase` so the website's CSS can orbit it.
 */
export function sceneToSvg(node: SceneNode, storyId?: string): string {
  const k = node.kind;

  // ---- structural layers: the website's named wrappers (or a bare <g>) ----
  if (node.el === 'g') {
    switch (k) {
      case 'world':
        return `<g transform="${node.transform ?? ''}">${childrenSvg(node, storyId)}</g>`;
      case 'empties-layer':
        // the website's mesh branch passes no empties — nothing to draw.
        return '';
      case 'coast-layer':
        return `<g class="tw-coast-layer">${childrenSvg(node, storyId)}</g>`;
      case 'ground-mesh':
      case 'ground-hex':
        return `<g class="tw-land">${childrenSvg(node, storyId)}</g>`;
      case 'roads-layer':
        return `<g class="tw-roads">${childrenSvg(node, storyId)}</g>`;
      case 'flora-layer':
        return `<g class="tw-flora-layer">${childrenSvg(node, storyId)}</g>`;
      case 'hits-layer':
        return `<g class="tw-hits">${node.children.map((c) => hitRect(c)).join('')}</g>`;

      // ---- coast / ground per-territory groups (focus + filter hooks) ----
      case 'coast':
        return `<g class="tw-isle st-${node.status ?? 'unknown'}" data-id="${esc(node.id)}">${childrenSvg(node, node.id)}</g>`;
      case 'ground':
      case 'tile':
        return `<g class="tw-ground st-${node.status ?? 'unknown'}" data-id="${esc(node.id)}">${childrenSvg(node, node.id)}</g>`;

      // ---- a road: one scene `road-line` → both bed + dashed line. The road's
      //      `title` (surface vocabulary — e.g. "<a> needs <b>", or the BaaS
      //      "<website> reads directly from <database>" edge) rides the GROUP as a
      //      <title> tooltip, the same way flora/tree/territory groups carry theirs. ----
      case 'road': {
        const line = node.children.find((c) => c.kind === 'road-line');
        const d = line && line.el === 'path' ? line.d : '';
        return (
          `<g class="tw-road" data-from="${esc(node.from)}" data-to="${esc(node.to)}">` +
          (node.title ? `<title>${esc(node.title)}</title>` : '') +
          `<path class="bed" d="${d}"/>` +
          `<path class="line" d="${d}" marker-end="url(#tw-arrow)"/></g>`
        );
      }

      // ---- a whole island's flora group (the delegation hook) ----
      case 'territory':
        return `<g class="tw-terr st-${node.status ?? 'unknown'}" data-id="${esc(node.id)}">${childrenSvg(node, node.id)}</g>`;

      // ---- the central tree: translate outside, sway inside, marks outside ----
      case 'tree': {
        const id = node.id ?? storyId ?? '';
        const sway = (6 + (hashStr(id) % 30) / 10).toFixed(1);
        const delay = ((hashStr(id) % 40) / 10).toFixed(1);
        // crown shapes sway; the bloom + signpost must sit OUTSIDE .tw-crown so
        // its CSS rotate keyframe can't clobber their own translates.
        const sway_kinds = node.children.filter((c) => !isOutsideCrown(c.kind));
        const outside = node.children.filter((c) => isOutsideCrown(c.kind));
        return (
          `<g${node.transform ? ` transform="${node.transform}"` : ''}>` +
          `<g class="tw-crown" style="--sway:${sway}s;--d:${delay}s">` +
          sway_kinds.map((c) => sceneToSvg(c, storyId)).join('') +
          `</g>` +
          outside.map((c) => sceneToSvg(c, storyId)).join('') +
          `</g>`
        );
      }

      // ---- the human-witness signpost (state on the group, shapes within) ----
      case 'sign-blank':
      case 'sign-pass':
      case 'sign-fail': {
        const cls = classOf(node); // seal-filled | seal-blank
        const tick =
          k === 'sign-pass' || k === 'sign-fail'
            ? `<path class="tick" d="M -3.2 -18 l 2.4 2.4 l 4.4 -5.2"/>`
            : '';
        const titleTxt =
          k === 'sign-blank' ? 'awaiting a person’s sign-off' : 'signed off by a person';
        return (
          `<g class="tw-sign ${cls}"${node.transform ? ` transform="${node.transform}"` : ''}>` +
          `<title>${titleTxt}</title>` +
          childrenSvg(node, storyId) +
          tick +
          `</g>`
        );
      }

      // ---- a capability as garden flora (the per-cap delegation hook) ----
      case 'flora':
        return (
          `<g class="tw-flora st-${node.status ?? 'unknown'}" data-id="${esc(node.id)}"${node.transform ? ` transform="${node.transform}"` : ''}>` +
          (node.title ? `<title>${esc(node.title)}</title>` : '') +
          childrenSvg(node, storyId) +
          `</g>`
        );

      // ---- conifer: the colour band `c-N` rides the group ----
      case 'conifer': {
        const body = node.children.find((c) => c.kind === 'conifer-body');
        const band = body ? body.variant ?? 0 : 0;
        return `<g class="tw-conifer c-${band}"${node.transform ? ` transform="${node.transform}"` : ''}>${childrenSvg(node, storyId)}</g>`;
      }

      // ---- bloom: translate + age-decay opacity on the wrapper, pulse on the
      //      inner .tw-bloom (the CSS pulse can't clobber the wrapper's attrs) ----
      case 'bloom-anchor':
        return `<g${commonAttrs(node)}>${childrenSvg(node, storyId)}</g>`;
      case 'bloom-crown':
      case 'bloom-plant':
        return `<g class="tw-bloom">${childrenSvg(node, storyId)}</g>`;

      // ---- wisp orbit: --phase drives the CSS rotation; phaseBand → the band-*
      //      colour class (red cast / green pulse / teal building, ADR-0048 §3 v2,
      //      folded by the core so the public demo can't drift from the studio) ----
      case 'wisps':
        return `<g class="tw-wisps"${node.transform ? ` transform="${node.transform}"` : ''}>${childrenSvg(node, storyId)}</g>`;
      case 'wisp':
        return (
          `<g class="tw-wisp band-${node.phaseBand ?? 'building'}" style="--phase:${(node.phase ?? 0).toFixed(1)}deg">` +
          (node.title ? `<title>${esc(node.title)}</title>` : '') +
          childrenSvg(node, storyId) +
          `</g>`
        );

      // ---- nameplate ----
      case 'plate':
        return (
          `<g class="tw-plate"${node.transform ? ` transform="${node.transform}"` : ''}>` +
          childrenSvg(node, storyId) +
          `</g>`
        );

      // ---- any other group (e.g. crown-hi with its 0.7 opacity, an unclassed
      //      flora `body` wrapper) — forward transform/opacity/stroke-width ----
      default: {
        const cls = classOf(node);
        return `<g${cls ? ` class="${cls}"` : ''}${commonAttrs(node)}>${childrenSvg(node, storyId)}</g>`;
      }
    }
  }

  // ---- leaf primitives ----
  return emitPrimitive(node, classOf(node));
}

/** Kinds that, inside a tree group, must be rendered OUTSIDE the swaying
 *  `.tw-crown` (their own translate/pulse can't survive a parent CSS rotate). */
function isOutsideCrown(k: SceneKind | undefined): boolean {
  return (
    k === 'bloom-anchor' ||
    k === 'sign-blank' ||
    k === 'sign-pass' ||
    k === 'sign-fail'
  );
}

/** The website's focusable delegation hit rect (the studio skips this layer). */
function hitRect(node: SceneNode): string {
  if (node.el !== 'rect' || node.kind !== 'hit') return '';
  return (
    `<rect class="tw-hit" x="${f(node.x)}" y="${f(node.y)}" width="${f(node.width)}" height="${f(node.height)}" rx="${f(node.rx)}"` +
    ` tabindex="0" role="button" data-id="${esc(node.id)}" aria-label="${esc(node.title)}"/>`
  );
}

// The web's id-hash for the sway timing (same FNV-1a the core uses, so the
// per-tree sway phase is stable across loads).
function hashStr(s: string): number {
  let n = 2166136261;
  for (let i = 0; i < s.length; i++) {
    n ^= s.charCodeAt(i);
    n = Math.imul(n, 16777619);
  }
  return n >>> 0;
}

// ---------------------------------------------------------------------------
// the whole scene — the <svg> shell + <defs>, then the walked scene-graph
// ---------------------------------------------------------------------------

export function renderWorld(w: World): string {
  const scene = sceneToSvg(buildScene(worldToSceneInput(w)));

  return (
    `<svg class="tw-svg" viewBox="0 0 ${w.width} ${w.height}" role="group" aria-roledescription="interactive map" aria-label="A map of a fictional software system, drawn as a world of trees where each tree is a story and its colour shows its health. The stories below are focusable.">` +
    `<defs>` +
    `<radialGradient id="tw-board" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#fbf3ea"/><stop offset="1" stop-color="#edd9c9"/></radialGradient>` +
    `<filter id="tw-soft" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#5a3f1f" flood-opacity="0.10"/></filter>` +
    `<marker id="tw-arrow" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1.4 L 8 5 L 0 8.6 z"/></marker>` +
    `</defs>` +
    `<rect class="tw-bg" x="0" y="0" width="${w.width}" height="${w.height}"/>` +
    scene +
    `</svg>`
  );
}
