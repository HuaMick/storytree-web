// ---------------------------------------------------------------------------
// act2-overlays — the DRIVE-MACHINERY flow-diagram overlays (ADR-0153 §5/§6).
//
// After the orchestrator scopes a story, the walk shows what it DOES with it: it
// routes the story to the drive machinery — the background agent loop, then the
// CI/CD / gates / wiring that keeps the work honest. These are TEMPORARY overlays
// that float ABOVE the 2.5D map (NOT drawn on it), because the background
// machinery is not map SIGNAL unless something breaks — the map stays the honest
// picture of the work; transient process detail surfaces here and clears.
//
// SITE-SIDE, keyed by BEAT ID (ADR-0153's authoring call — the act2-beat-director
// engine carries NO overlay field; an overlay is presentational chrome with no
// scene semantics and no isolatable red→green oracle, so it lives with the
// surface, like the narration copy). Pure data + a small deterministic DOM/SVG
// renderer, the act1-storm idiom: a fixed diagram → a rAF-free staggered reveal.
// No React, no three.js, no WebGL, no live data, no Math.random, no wall-clock in
// the DATA (elapsed time drives the reveal cadence only).
//
// Scaffolding (ADR-0153 §6 — "MUST NOT overload"): each overlay reveals its rows
// one at a time, in the order a first-timer can hold; the step-3/step-4 diagram
// is BUILT OUT across two beats (verify, then ship) rather than dumped at once.
//
// Corner placement (ADR-0153): the agent loop is TOP-LEFT (step 2); the expanded
// CI/CD / gates / wiring diagram is TOP-RIGHT (steps 3-4). Both clear on the
// pull-back and on teardown.
// ---------------------------------------------------------------------------

/** Which screen corner an overlay pins to. */
export type OverlayCorner = 'top-left' | 'top-right';

/** One row of a flow diagram: a labelled step with an optional sub-caption. */
export interface OverlayRow {
  /** Stable id (also the reveal order key). */
  readonly id: string;
  /** A short glyph/marker shown in the node (a monospace token — not an emoji). */
  readonly tag: string;
  /** The step's plain-language label (one short line). */
  readonly label: string;
  /** An optional one-line caption under the label (kept terse). */
  readonly note?: string;
  /** Accent role → colour class: 'run' (in-flight), 'gate' (a hard check),
   *  'good' (proven/green), 'plain' (structural). */
  readonly role: 'run' | 'gate' | 'good' | 'plain';
}

/** One node of the honest TDD LOOP DIAGRAM (ADR-0157 §5). Two kinds of node go
 *  round the loop: a WRITE step done by an agent ('author' = write the failing
 *  test; 'build' = write the code), and a CHECK done by the SYSTEM ('check' — the
 *  referee observes RED, then GREEN). The 'check' kind is styled unmistakably as
 *  the system's, never an AI's — that is the load-bearing honest element. */
export interface LoopNode {
  /** Stable id (also the reveal order key, clockwise from the top). */
  readonly id: string;
  /** 'author' / 'build' = an agent writes (a write-scoped phase); 'check' = the
   *  SYSTEM checks (the referee — red then green, never the model). */
  readonly kind: 'author' | 'build' | 'check';
  /** The step's plain-language label (one short line, vibe-coder altitude). */
  readonly label: string;
  /** Who does it — shown small under the label ("an agent" / "the system"). The
   *  'check' nodes MUST read as the system, not an AI (ADR-0157 §5). */
  readonly who: string;
}

/** The honest TDD loop diagram: four nodes on a ring (write test → system checks it
 *  fails → write code → system checks it passes → back to the top), drawn as boxes +
 *  arrows that visibly LOOP. The looping shape is the point (ADR-0157 §5). */
export interface LoopDiagram {
  /** The four nodes, in clockwise reveal order from the top. */
  readonly nodes: readonly LoopNode[];
  /** The centre caption — names the referee (the system, not the AI). */
  readonly centre: string;
}

/** A drive-machinery overlay: a titled flow diagram pinned to a corner, its rows
 *  (or a loop diagram) revealed scaffolded. Keyed by beat id. */
export interface DriveOverlay {
  /** The beat id this overlay surfaces on (site-side key — NOT a director field). */
  readonly beatId: string;
  readonly corner: OverlayCorner;
  /** The overlay's eyebrow (what layer of the machinery this is). */
  readonly eyebrow: string;
  /** The overlay's short title. */
  readonly title: string;
  /** A LOOP DIAGRAM (ADR-0157 §5) — when present, the overlay renders the honest
   *  TDD loop (boxes + arrows that loop) instead of the row list. Used by the
   *  agent-loop overlay (beat 2); the CI/CD overlays stay row lists. */
  readonly loop?: LoopDiagram;
  /** The flow rows, top → bottom, revealed one at a time. Empty when `loop` is set. */
  readonly rows: readonly OverlayRow[];
  /** A closing one-liner under the flow (the takeaway; kept short). */
  readonly footer: string;
}

// ── The diagrams (fiction, but faithful to the real machinery) ────────────────
//
// beat-2: the HONEST TDD LOOP the orchestrator routes the story into (ADR-0157 §5)
//         — the inner loop that turns one unit red→green, drawn as a LOOP: write a
//         failing test → the SYSTEM checks it really fails → write code → the SYSTEM
//         checks it really passes → repeat. The referee is the SYSTEM, not the AI
//         (storytree's verification-gap thesis). Top-left, revealed as the wisp
//         appears (something IS running; here is what).
// beat-3: the loop earns green through PROOF — the CI / gates / signed verdict
//         that stand between "an agent said done" and a green tree. Top-right,
//         the first half of the CI/CD picture.
// beat-4: the SHIP half — how proven work is wired to the code and lands, and how
//         the same machinery grows the next layer. Top-right, extending beat-3's
//         diagram (same corner, deeper) rather than a second unrelated panel.

/** The drive-machinery overlays, keyed by beat id (ADR-0153 §5/§6, ADR-0157 §5).
 *  Beats without an entry show no overlay (the map is the whole picture there). */
export const DRIVE_OVERLAYS: Readonly<Record<string, DriveOverlay>> = {
  // The HONEST TDD LOOP DIAGRAM (ADR-0157 §5). A loop, not a list: the two
  // write-scoped agent phases ('author' = write the failing test; 'build' = write
  // the code) alternate with the SYSTEM's two checks ('check' = the referee sees it
  // fail, then sees it pass). Grounded in the real ADR-0020 phase machine
  // (AUTHOR_TEST → CONFIRM_RED → IMPLEMENT → CONFIRM_GREEN); red/green is OBSERVED
  // by the deterministic spine, NEVER claimed by the model — so the CHECK nodes read
  // as the system, never an AI grading its own homework.
  'beat-2-attach-wisp': {
    beatId: 'beat-2-attach-wisp',
    corner: 'top-left',
    eyebrow: 'behind the wisp',
    title: 'How the work is proven',
    loop: {
      nodes: [
        {
          id: 'author',
          kind: 'author',
          label: 'Write a test that must pass',
          who: 'one agent',
        },
        {
          id: 'red',
          kind: 'check',
          label: 'Check it really fails first',
          who: 'the system',
        },
        {
          id: 'build',
          kind: 'build',
          label: 'Write code to pass the test',
          who: 'another agent',
        },
        {
          id: 'green',
          kind: 'check',
          label: 'Check it really passes now',
          who: 'the system',
        },
      ],
      centre: 'the system checks — not the AI',
    },
    rows: [],
    footer: 'Each loop proves one small piece. The system is the referee — the agents can’t mark their own work.',
  },

  'beat-3-branch-caps': {
    beatId: 'beat-3-branch-caps',
    corner: 'top-right',
    eyebrow: 'why green is earned',
    title: 'Proof, not a promise',
    rows: [
      {
        id: 'change',
        tag: '±',
        label: 'An agent proposes some code',
        note: 'for one small piece — say, the cart',
        role: 'plain',
      },
      {
        id: 'ci',
        tag: '▶',
        label: 'The tests run on a clean machine',
        note: 'automatically, every time — this is “CI”',
        role: 'run',
      },
      {
        id: 'gate',
        tag: '⛔',
        label: 'A gate blocks anything unproven',
        note: 'the tests must pass — it stops, it doesn’t just warn',
        role: 'gate',
      },
      {
        id: 'verdict',
        tag: '✔',
        label: 'Only then does the piece turn green',
        note: 'green follows a passing test — never someone saying “done”',
        role: 'good',
      },
    ],
    footer: 'No passing test, no green. That’s the whole difference from the swarm.',
  },

  'beat-4-add-upstream-backend': {
    beatId: 'beat-4-add-upstream-backend',
    corner: 'top-right',
    eyebrow: 'how it stays honest',
    title: 'Wired to the code',
    rows: [
      {
        id: 'merge',
        tag: '⇢',
        label: 'Proven work joins the main code',
        note: 'the gate is the only way in — green work only',
        role: 'good',
      },
      {
        id: 'deploy',
        tag: '☁',
        label: 'It ships automatically, on the record',
        note: 'no risky manual push — this is “CD”',
        role: 'run',
      },
      {
        id: 'depend',
        tag: '⌸',
        label: 'The map shows what it needs next',
        note: 'the backend below — the piece you build next',
        role: 'plain',
      },
      {
        id: 'repeat',
        tag: '↑',
        label: 'The same loop grows that piece',
        note: 'one story at a time, each proven before it counts',
        role: 'gate',
      },
    ],
    footer: 'Every layer is grown the same honest way — proof by proof, in order.',
  },
};

// ── the reveal cadence (motion only; the DATA above is pure) ──────────────────

/** ms before the overlay's first row appears (a beat after it mounts). */
const LEAD_MS = 260;
/** ms between successive rows revealing (scaffolded, one at a time). */
const STEP_MS = 620;
/** ms the footer waits after the last row. */
const FOOTER_MS = 360;

export interface OverlayOptions {
  /** Reduced motion: reveal every row at once, no stagger. */
  readonly reducedMotion: boolean;
}

export interface OverlayHandle {
  /** Fade the overlay out and remove it (the walk cleared this beat). */
  clear(): void;
  /** Remove immediately (teardown). */
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

const SVGNS = 'http://www.w3.org/2000/svg';
function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

// ── the honest TDD LOOP DIAGRAM (ADR-0157 §5) ────────────────────────────────
// Geometry: four nodes on a squashed ring, clockwise from the top —
//   top = write test (agent) → right = system checks it FAILS →
//   bottom = write code (agent) → left = system checks it PASSES → (back to top).
// Curved arrows connect consecutive nodes AND close the loop (left → top), so the
// looping shape is unmistakable. The CHECK nodes are styled as the system (the
// referee), the WRITE nodes as the agents — the load-bearing honest distinction.
// Pure geometry (no Math.random, no clock); everything is a function of the data.

/** viewBox + ring layout (diagram units). Sized so all FOUR node boxes fit inside
 *  the viewBox with margin: left/right node centres sit at RING_CX ± RING_RX, each
 *  NODE_W/2 wide, so left = 78 → [22,134] and right = 222 → [166,278] both clear the
 *  300-wide box. The centre of the ring stays free (a small caption sits there). */
const LOOP_W = 308;
const LOOP_H = 250;
const RING_CX = LOOP_W / 2; // 154
const RING_CY = 121;
const RING_RX = 74;
const RING_RY = 86;
const NODE_W = 124;
const NODE_H = 42;

/** The four clockwise ring anchors (top, right, bottom, left) in diagram space. */
function ringAnchors(): { x: number; y: number }[] {
  // start at the TOP (−90°) and go clockwise.
  return [0, 1, 2, 3].map((i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    return { x: RING_CX + Math.cos(a) * RING_RX, y: RING_CY + Math.sin(a) * RING_RY };
  });
}

/** A curved arrow path (quadratic, bowed outward around the ring) from node i's
 *  edge to node j's edge, so the arc reads as travelling AROUND the loop. */
function loopArc(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  // bow the control point away from the ring centre (outward) for a round loop.
  const ox = mx - RING_CX;
  const oy = my - RING_CY;
  const olen = Math.hypot(ox, oy) || 1;
  const bow = 22;
  const cx = mx + (ox / olen) * bow;
  const cy = my + (oy / olen) * bow;
  // trim the endpoints toward the control point so the arrowhead sits off the box.
  const trim = (p: { x: number; y: number }, c: number): { x: number; y: number } => {
    const dx = cx - p.x;
    const dy = cy - p.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / l) * c, y: p.y + (dy / l) * c };
  };
  const a = trim(from, 30);
  const b = trim(to, 30);
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

/**
 * Build the honest TDD loop diagram (ADR-0157 §5): boxes + arrows that visibly
 * LOOP. Returns the body element and the revealable node groups (in clockwise
 * scaffold order). Each node group carries `is-hidden` (unless reduced motion) so
 * the mount's existing stagger reveals them one at a time; the arrows fade with the
 * ring as a whole (CSS), so the loop shape is legible from the first node.
 */
function buildLoopDiagram(
  loop: LoopDiagram,
  reducedMotion: boolean,
): { body: HTMLElement; nodeEls: Element[] } {
  const body = el('div', 'act2-loop');
  const s = svg('svg', {
    class: 'act2-loop-svg',
    viewBox: `0 0 ${LOOP_W} ${LOOP_H}`,
    role: 'img',
    'aria-label':
      'A loop: an agent writes a test that must pass; the system checks it really fails; ' +
      'another agent writes code to pass it; the system checks it really passes; then the loop repeats. ' +
      'The system does the checking, not the AI.',
  });
  // arrowhead marker (scoped id so it can't clash with the map's a2-arrow).
  const defs = svg('defs', {});
  const marker = svg('marker', {
    id: 'a2loop-arrow',
    viewBox: '0 0 10 10',
    refX: 8,
    refY: 5,
    markerWidth: 6.5,
    markerHeight: 6.5,
    orient: 'auto-start-reverse',
  });
  marker.appendChild(svg('path', { d: 'M 0 1.4 L 8 5 L 0 8.6 z', class: 'act2-loop-arrowhead' }));
  defs.appendChild(marker);
  s.appendChild(defs);

  const anchors = ringAnchors();

  // the connecting arcs (drawn UNDER the nodes) — consecutive + the closing edge.
  const arcLayer = svg('g', { class: 'act2-loop-arcs' });
  for (let i = 0; i < anchors.length; i++) {
    const from = anchors[i]!;
    const to = anchors[(i + 1) % anchors.length]!;
    const path = svg('path', {
      class: 'act2-loop-arc',
      d: loopArc(from, to),
      'marker-end': 'url(#a2loop-arrow)',
    });
    arcLayer.appendChild(path);
  }
  s.appendChild(arcLayer);

  // the centre caption (names the referee — the system, not the AI).
  const centre = svg('text', {
    class: 'act2-loop-centre',
    // sit in the CLEAR band between the top node (bottom ≈ 56) and the left/right
    // node row (top ≈ 100) — centred across the full width, clear of every box.
    x: RING_CX,
    y: 80,
    'text-anchor': 'middle',
  });
  // split the caption over up to two lines so it fits inside the ring.
  const centreWords = loop.centre.split(' — ');
  if (centreWords.length === 2) {
    const l1 = svg('tspan', { x: RING_CX, dy: '-0.4em' });
    l1.textContent = centreWords[0]!;
    const l2 = svg('tspan', { x: RING_CX, dy: '1.25em', class: 'act2-loop-centre-em' });
    l2.textContent = centreWords[1]!;
    centre.append(l1, l2);
  } else {
    centre.textContent = loop.centre;
  }
  s.appendChild(centre);

  // the nodes (drawn OVER the arcs), in clockwise reveal order.
  const nodeEls: Element[] = loop.nodes.map((node, i) => {
    const p = anchors[i] ?? { x: RING_CX, y: RING_CY };
    const g = svg('g', {
      class: `act2-loop-node kind-${node.kind}`,
      'data-node': node.id,
      transform: `translate(${(p.x - NODE_W / 2).toFixed(1)} ${(p.y - NODE_H / 2).toFixed(1)})`,
    });
    g.appendChild(svg('rect', { class: 'act2-loop-box', x: 0, y: 0, width: NODE_W, height: NODE_H, rx: 8 }));
    // the label (line 1) + who (line 2), centred in the box.
    const label = svg('text', { class: 'act2-loop-label', x: NODE_W / 2, y: 18, 'text-anchor': 'middle' });
    label.textContent = node.label;
    const who = svg('text', { class: 'act2-loop-who', x: NODE_W / 2, y: 31, 'text-anchor': 'middle' });
    who.textContent = node.who;
    g.append(label, who);
    if (!reducedMotion) g.classList.add('is-hidden');
    s.appendChild(g);
    return g;
  });

  body.appendChild(s);
  return { body, nodeEls };
}

/**
 * Mount a drive-machinery overlay for `beatId` into `host` (the walk stage). No
 * overlay is defined for the beat → returns null (nothing to show). The overlay
 * pins to its corner, reveals its rows scaffolded, and exposes a witness hook
 * (window.__act2overlay) naming which overlay is up + how many rows are revealed,
 * so the headless witness can assert appear→clear.
 *
 * One handle out — the walk clears it when the beat changes and the page's disarm
 * path chains unmount() so a mid-walk exit tears it down.
 */
export function mountDriveOverlay(
  host: HTMLElement,
  beatId: string,
  opts: OverlayOptions,
): OverlayHandle | null {
  const data = DRIVE_OVERLAYS[beatId];
  if (!data) return null;

  const { reducedMotion } = opts;
  let disposed = false;
  const timers: number[] = [];

  const overlay = el('div', `act2-overlay act2-overlay--${data.corner}`);
  overlay.setAttribute('data-act2-overlay', data.beatId);
  overlay.setAttribute('role', 'group');
  overlay.setAttribute('aria-label', `Background machinery: ${data.title}`);

  const panel = el('div', 'act2-overlay-panel');

  const head = el('div', 'act2-overlay-head');
  const eyebrow = el('p', 'act2-overlay-eyebrow', data.eyebrow);
  const title = el('h3', 'act2-overlay-title', data.title);
  head.append(eyebrow, title);

  // The revealable elements, in scaffold order, and how many there are (the witness
  // total). Either the honest TDD LOOP DIAGRAM (ADR-0157 §5) or the row list.
  let revealEls: Element[];
  let stepCount: number;

  if (data.loop) {
    const { body, nodeEls } = buildLoopDiagram(data.loop, reducedMotion);
    revealEls = nodeEls;
    stepCount = data.loop.nodes.length;
    panel.append(head, body);
  } else {
    const flow = el('ol', 'act2-overlay-flow');
    flow.setAttribute('aria-live', 'polite');
    revealEls = data.rows.map((row) => {
      const li = el('li', `act2-overlay-row role-${row.role}`);
      li.setAttribute('data-row', row.id);
      const tag = el('span', 'act2-overlay-tag', row.tag);
      tag.setAttribute('aria-hidden', 'true');
      const bodyWrap = el('div', 'act2-overlay-rowbody');
      const label = el('p', 'act2-overlay-label', row.label);
      bodyWrap.appendChild(label);
      if (row.note !== undefined) {
        bodyWrap.appendChild(el('p', 'act2-overlay-note', row.note));
      }
      li.append(tag, bodyWrap);
      if (!reducedMotion) li.classList.add('is-hidden');
      flow.appendChild(li);
      return li;
    });
    stepCount = data.rows.length;
    panel.append(head, flow);
  }

  const footer = el('p', 'act2-overlay-footer', data.footer);
  if (!reducedMotion) footer.classList.add('is-hidden');

  panel.append(footer);
  overlay.appendChild(panel);
  host.appendChild(overlay);

  const exposeWitness = (revealed: number, cleared: boolean): void => {
    (
      window as unknown as {
        __act2overlay?: {
          beatId: string;
          corner: OverlayCorner;
          revealed: number;
          total: number;
          cleared: boolean;
        };
      }
    ).__act2overlay = {
      beatId: data.beatId,
      corner: data.corner,
      revealed,
      total: stepCount,
      cleared,
    };
  };

  const revealAll = (): void => {
    for (const li of revealEls) li.classList.remove('is-hidden');
    footer.classList.remove('is-hidden');
    exposeWitness(stepCount, false);
  };

  if (reducedMotion) {
    revealAll();
  } else {
    exposeWitness(0, false);
    revealEls.forEach((li, i) => {
      timers.push(
        window.setTimeout(() => {
          if (disposed) return;
          li.classList.remove('is-hidden');
          exposeWitness(i + 1, false);
        }, LEAD_MS + i * STEP_MS),
      );
    });
    timers.push(
      window.setTimeout(
        () => {
          if (disposed) return;
          footer.classList.remove('is-hidden');
        },
        LEAD_MS + revealEls.length * STEP_MS + FOOTER_MS,
      ),
    );
  }

  // reveal on first paint (the fade/slide-in is CSS)
  requestAnimationFrame(() => {
    if (!disposed) overlay.classList.add('is-live');
  });

  const teardown = (): void => {
    for (const t of timers) window.clearTimeout(t);
    timers.length = 0;
  };

  return {
    clear(): void {
      if (disposed) return;
      disposed = true;
      teardown();
      exposeWitness(stepCount, true);
      overlay.classList.add('is-leaving');
      const remove = (): void => {
        overlay.remove();
        const w = window as unknown as { __act2overlay?: { beatId: string } };
        if (w.__act2overlay?.beatId === data.beatId) delete w.__act2overlay;
      };
      if (reducedMotion) remove();
      else window.setTimeout(remove, 380);
    },
    unmount(): void {
      if (disposed) return;
      disposed = true;
      teardown();
      overlay.remove();
      const w = window as unknown as { __act2overlay?: { beatId: string } };
      if (w.__act2overlay?.beatId === data.beatId) delete w.__act2overlay;
    },
  };
}
