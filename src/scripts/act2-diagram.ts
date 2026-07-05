// ---------------------------------------------------------------------------
// act2-diagram — the ONE growing system diagram (ADR-0165 §1, stages D1–D6): a
// left-to-right spine that assembles above the orchestrator chat BEFORE any
// island is shown, reading as a sentence (accepted default 1) —
//
//   your intent → the decision record → the library (definitions · principles ·
//   capabilities · contracts) → the story (a NAMEPLATE — the pre-echo of the
//   island) → the honest-TDD ring blooming BELOW the spine (the landed loop
//   content, HONEST_LOOP, verbatim — ADR-0165 §2 relocated it here from the
//   retired corner overlay; the kind-check styling stays unmistakably the
//   SYSTEM's, the load-bearing honesty) → the map-signal glyph (a tile-and-tree
//   turning green; "green = a signed proof").
//
// ADDITIVE ONLY (ADR-0165 §1): every stage group is built once, up front, from
// fixed data; a step only turns stages ON (`is-on`), never removes, replaces or
// swaps an element — and re-applying the state for step n yields the identical
// DOM regardless of path (Back replay, accepted default 9). Pure geometry: no
// Math.random, no wall-clock; the appear transition is CSS (reduced-motion:
// elements appear without transitions).
//
// At the island handoff (I1) the panel COMPACTS away (`is-away` — a CSS
// transition toward the top-left, where the docked mini-map takes over,
// ADR-0165 §2); Back from I1 restores it in place.
//
// The geometry is the owner-approved proposal mock's (viewBox 1040×430, the
// spine on MIDY 205, the ring below), drawn with the site's global.css tokens.
// Styled by index.astro's global CSS (`.act2-diagram` / `a2d-*`).
// ---------------------------------------------------------------------------

import { HONEST_LOOP } from './act2-loop-diagram';

const SVGNS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
  parent?: Element,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (parent) parent.appendChild(node);
  return node;
}

function txt(node: SVGTextElement | SVGTSpanElement, s: string): void {
  node.textContent = s;
}

// ── the approved geometry (the proposal mock, verbatim) ──────────────────────

const VB_W = 1040;
const VB_H = 430;
/** The spine's midline — every spine box centres on it. */
const MIDY = 205;
/** The D5 ring (below the spine, blooming out of the story node). CY sits 2px
 *  above the mock's so the bottom node clears the viewBox edge with the wider
 *  boxes the landed loop labels need. */
const RING = { cx: 770, cy: 346, rx: 150, ry: 62 };
/** Ring node box — wider than the mock's 148 so the landed loop labels
 *  ("Write code to pass the test") fit verbatim. */
const RNODE_W = 168;
const RNODE_H = 40;

/** A titled spine box: rect + optional kicker/label/sub rows (the mock's
 *  `box()` helper). */
function box(
  g: SVGGElement,
  x: number,
  y: number,
  w: number,
  h: number,
  cls: string,
  kicker?: string,
  label?: string,
  sub?: string,
): void {
  svg('rect', { x, y, width: w, height: h, rx: 10, class: `a2d-box ${cls}` }, g);
  if (kicker) txt(svg('text', { x: x + 12, y: y + 19, class: 'a2d-kicker' }, g), kicker);
  if (label)
    txt(svg('text', { x: x + 12, y: y + (kicker ? 38 : 26), class: 'a2d-label' }, g), label);
  if (sub) txt(svg('text', { x: x + 12, y: y + (kicker ? 54 : 42), class: 'a2d-sub' }, g), sub);
}

/** Build one stage group (`[data-d-step]`): an optional connecting arrow (which
 *  fades in slightly after the node) + the stage's node elements. */
function stageGroup(root: SVGSVGElement, step: number): { g: SVGGElement; node: SVGGElement } {
  const g = svg('g', { class: 'a2d-step', 'data-d-step': step }, root);
  const node = svg('g', { class: 'a2d-node' }, g);
  return { g, node };
}

function arrow(g: SVGGElement, d: string, sage = false): void {
  const wrap = svg('g', { class: 'a2d-arrow' }, g);
  svg(
    'path',
    { class: 'a2d-edge', d, 'marker-end': sage ? 'url(#a2d-ah-sage)' : 'url(#a2d-ah)' },
    wrap,
  );
  // the arrow layer sits under the node visuals — insert it first.
  g.insertBefore(wrap, g.firstChild);
}

/** Build the full six-stage diagram into `root` — every group present from the
 *  start (hidden), turned on additively by setStep. Pure fixed data. */
function buildStages(root: SVGSVGElement): SVGGElement[] {
  const defs = svg('defs', {}, root);
  const mk = svg(
    'marker',
    {
      id: 'a2d-ah',
      viewBox: '0 0 10 10',
      refX: 8,
      refY: 5,
      markerWidth: 6,
      markerHeight: 6,
      orient: 'auto-start-reverse',
    },
    defs,
  );
  svg('path', { d: 'M 0 1.5 L 8 5 L 0 8.5 z', class: 'a2d-edge-head' }, mk);
  const mk2 = svg(
    'marker',
    {
      id: 'a2d-ah-sage',
      viewBox: '0 0 10 10',
      refX: 8,
      refY: 5,
      markerWidth: 6,
      markerHeight: 6,
      orient: 'auto-start-reverse',
    },
    defs,
  );
  svg('path', { d: 'M 0 1.5 L 8 5 L 0 8.5 z', class: 'a2d-edge-head--sage' }, mk2);

  const groups: SVGGElement[] = [];

  // ── D1 · your intent — the visitor's OWN words as a quote chip ──
  {
    const { g, node } = stageGroup(root, 1);
    box(node, 20, MIDY - 42, 170, 84, 'a2d-box--intent', 'your intent');
    txt(svg('text', { x: 32, y: MIDY + 6, class: 'a2d-quote' }, node), '“build me a shopping');
    txt(svg('text', { x: 32, y: MIDY + 24, class: 'a2d-quote' }, node), 'website”');
    groups.push(g);
  }

  // ── D2 · the decision record ──
  {
    const { g, node } = stageGroup(root, 2);
    arrow(g, `M 192 ${MIDY} L 234 ${MIDY}`);
    box(
      node,
      240,
      MIDY - 42,
      160,
      84,
      'a2d-box--adr',
      'the decision',
      'a decision record',
      'what · why · what we chose',
    );
    // a tiny document glyph in the corner
    svg(
      'path',
      {
        d: `M 372 ${MIDY - 30} l 14 0 l 0 18 l -14 0 z`,
        class: 'a2d-doc',
      },
      node,
    );
    svg(
      'path',
      {
        d: `M 375 ${MIDY - 24} l 8 0 M 375 ${MIDY - 20} l 8 0 M 375 ${MIDY - 16} l 5 0`,
        class: 'a2d-doc-lines',
      },
      node,
    );
    groups.push(g);
  }

  // ── D3 · the library — fanning into four chips ──
  {
    const { g, node } = stageGroup(root, 3);
    arrow(g, `M 402 ${MIDY} L 444 ${MIDY}`);
    txt(svg('text', { x: 462, y: MIDY - 56, class: 'a2d-kicker' }, node), 'the library');
    const chips = ['definitions', 'principles', 'capabilities', 'contracts'];
    for (let i = 0; i < 4; i++) {
      const cx = 450 + (i % 2) * 98;
      const cy = MIDY - 44 + Math.floor(i / 2) * 46;
      svg('rect', { x: cx, y: cy, width: 90, height: 34, rx: 8, class: 'a2d-box a2d-box--lib' }, node);
      const t = svg(
        'text',
        { x: cx + 45, y: cy + 21, class: 'a2d-chiplabel', 'text-anchor': 'middle' },
        node,
      );
      txt(t, chips[i]!);
    }
    groups.push(g);
  }

  // ── D4 · the story — a NAMEPLATE (the pre-echo of the island) ──
  {
    const { g, node } = stageGroup(root, 4);
    arrow(g, `M 642 ${MIDY} L 684 ${MIDY}`);
    box(node, 690, MIDY - 42, 160, 84, 'a2d-box--story', 'a story', 'Shoppers can');
    txt(svg('text', { x: 702, y: MIDY + 22, class: 'a2d-label' }, node), 'check out');
    txt(svg('text', { x: 702, y: MIDY + 36, class: 'a2d-sub' }, node), 'one outcome you can check');
    groups.push(g);
  }

  // ── D5 · the story BLOOMS into the honest-TDD ring (HONEST_LOOP, verbatim:
  //         four nodes, two SYSTEM checks, the centre caption — ADR-0157 §5's
  //         honesty obligations intact; only its home moved, ADR-0165 §2) ──
  {
    const { g, node } = stageGroup(root, 5);
    arrow(g, `M 770 ${MIDY + 44} L 770 ${RING.cy - RING.ry - 26}`);
    const anchors = [0, 1, 2, 3].map((i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 2;
      return { x: RING.cx + Math.cos(a) * RING.rx, y: RING.cy + Math.sin(a) * RING.ry };
    });
    // the four arcs, bowed outward, travelling clockwise round the ring
    for (let j = 0; j < 4; j++) {
      const from = anchors[j]!;
      const to = anchors[(j + 1) % 4]!;
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      const ox = mx - RING.cx;
      const oy = my - RING.cy;
      const ol = Math.hypot(ox, oy) || 1;
      const bw = 16;
      const qx = mx + (ox / ol) * bw;
      const qy = my + (oy / ol) * bw;
      svg(
        'path',
        {
          class: 'a2d-loop-arc',
          d:
            `M ${(from.x + (qx - from.x) * 0.25).toFixed(1)} ${(from.y + (qy - from.y) * 0.25).toFixed(1)} ` +
            `Q ${qx.toFixed(1)} ${qy.toFixed(1)} ` +
            `${(to.x + (qx - to.x) * 0.25).toFixed(1)} ${(to.y + (qy - to.y) * 0.25).toFixed(1)}`,
          'marker-end': 'url(#a2d-ah-sage)',
        },
        node,
      );
    }
    // the four nodes — the landed loop content, verbatim; the CHECK nodes wear
    // the system's styling (never an agent's)
    HONEST_LOOP.nodes.forEach((n, i) => {
      const p = anchors[i]!;
      const sys = n.kind === 'check';
      svg(
        'rect',
        {
          x: p.x - RNODE_W / 2,
          y: p.y - RNODE_H / 2,
          width: RNODE_W,
          height: RNODE_H,
          rx: 8,
          class: `a2d-loop-box${sys ? ' a2d-loop-box--check' : ''}`,
        },
        node,
      );
      txt(
        svg('text', { x: p.x, y: p.y - 3, 'text-anchor': 'middle', class: 'a2d-loop-lab' }, node),
        n.label,
      );
      txt(
        svg(
          'text',
          {
            x: p.x,
            y: p.y + 12,
            'text-anchor': 'middle',
            class: `a2d-loop-who${sys ? ' a2d-loop-who--sys' : ''}`,
          },
          node,
        ),
        n.who,
      );
    });
    // the centre caption — the referee, named (split over the em-dash)
    const centreWords = HONEST_LOOP.centre.split(' — ');
    txt(
      svg(
        'text',
        { x: RING.cx, y: RING.cy - 6, 'text-anchor': 'middle', class: 'a2d-loop-centre' },
        node,
      ),
      `${centreWords[0] ?? HONEST_LOOP.centre}${centreWords.length === 2 ? ' —' : ''}`,
    );
    if (centreWords.length === 2) {
      txt(
        svg(
          'text',
          { x: RING.cx, y: RING.cy + 10, 'text-anchor': 'middle', class: 'a2d-loop-centre' },
          node,
        ),
        centreWords[1]!,
      );
    }
    groups.push(g);
  }

  // ── D6 · the map signal — a tile-and-tree glyph turning green ──
  {
    const { g, node } = stageGroup(root, 6);
    arrow(g, `M 852 ${MIDY} L 894 ${MIDY}`);
    box(node, 900, MIDY - 52, 122, 104, 'a2d-box--signal', 'the map');
    svg(
      'path',
      {
        d: `M 961 ${MIDY + 34} l 26 -13 l 26 13 l -26 13 z`,
        class: 'a2d-tile',
        transform: 'translate(-26,-14)',
      },
      node,
    );
    svg('rect', { x: 958, y: MIDY - 2, width: 5, height: 18, rx: 2, class: 'a2d-trunk' }, node);
    svg('circle', { cx: 960.5, cy: MIDY - 10, r: 13, class: 'a2d-canopy' }, node);
    txt(
      svg('text', { x: 961, y: MIDY + 44, 'text-anchor': 'middle', class: 'a2d-sub' }, node),
      'green = a signed proof',
    );
    groups.push(g);
  }

  return groups;
}

// ── the mount ─────────────────────────────────────────────────────────────────

export interface DiagramHandle {
  /** Turn stages 1..n on (0 = the empty canvas of D0). Additive + declarative:
   *  re-applying any n yields the identical DOM — Back replay is byte-identical. */
  setStep(n: number): void;
  /** Compact the panel away (the I-phase handoff — the mini-map takes over) or
   *  restore it (Back from I1). */
  setAway(away: boolean): void;
  unmount(): void;
}

export interface DiagramOptions {
  /** Reduced motion: stages appear without transitions (CSS-guarded). */
  readonly reducedMotion: boolean;
}

/**
 * Mount the growing diagram panel into `host` (the 2.5D land layer). It sits
 * above the map, below the chat dock, purely visual (pointer-events none) — the
 * chat is the one advance surface. One handle out; the guide drives it.
 */
export function mountDiagram(host: HTMLElement, _opts: DiagramOptions): DiagramHandle {
  const panel = document.createElement('div');
  panel.className = 'act2-diagram';
  panel.setAttribute('data-act2-diagram', '');

  const root = svg('svg', {
    class: 'a2d-svg',
    viewBox: `0 0 ${VB_W} ${VB_H}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label':
      'A system diagram that grows step by step: your intent becomes a decision record, the ' +
      'decision grows a library of definitions, principles, capabilities and contracts, the ' +
      'library scopes a story, the story is built by a test-first loop the system referees, ' +
      'and the loop’s outcome becomes a signal on the map.',
  });
  const groups = buildStages(root);
  panel.appendChild(root);
  host.appendChild(panel);

  return {
    setStep(n: number): void {
      // the parchment scrim rides the first stage in (D0's bare ground stays)
      panel.classList.toggle('has-stages', n > 0);
      groups.forEach((g, i) => {
        g.classList.toggle('is-on', i + 1 <= n);
      });
    },
    setAway(away: boolean): void {
      panel.classList.toggle('is-away', away);
      panel.setAttribute('aria-hidden', away ? 'true' : 'false');
    },
    unmount(): void {
      panel.remove();
    },
  };
}
