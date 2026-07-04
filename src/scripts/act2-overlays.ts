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

/** A drive-machinery overlay: a titled flow diagram pinned to a corner, its rows
 *  revealed scaffolded. Keyed by beat id. */
export interface DriveOverlay {
  /** The beat id this overlay surfaces on (site-side key — NOT a director field). */
  readonly beatId: string;
  readonly corner: OverlayCorner;
  /** The overlay's eyebrow (what layer of the machinery this is). */
  readonly eyebrow: string;
  /** The overlay's short title. */
  readonly title: string;
  /** The flow rows, top → bottom, revealed one at a time. */
  readonly rows: readonly OverlayRow[];
  /** A closing one-liner under the flow (the takeaway; kept short). */
  readonly footer: string;
}

// ── The two diagrams (fiction, but faithful to the real machinery) ────────────
//
// beat-2: the BACKGROUND AGENT LOOP the orchestrator routes the story into — the
//         inner loop that turns one unit red→green. Top-left, revealed as the
//         wisp appears (something IS running; here is what).
// beat-3: the loop earns green through PROOF — the CI / gates / signed verdict
//         that stand between "an agent said done" and a green tree. Top-right,
//         the first half of the CI/CD picture.
// beat-4: the SHIP half — how proven work is wired to the code and lands, and how
//         the same machinery grows the next layer. Top-right, extending beat-3's
//         diagram (same corner, deeper) rather than a second unrelated panel.

/** The drive-machinery overlays, keyed by beat id (ADR-0153 §5/§6). Beats without
 *  an entry show no overlay (the map is the whole picture there). */
export const DRIVE_OVERLAYS: Readonly<Record<string, DriveOverlay>> = {
  'beat-2-attach-wisp': {
    beatId: 'beat-2-attach-wisp',
    corner: 'top-left',
    eyebrow: 'behind the wisp',
    title: 'The agent loop',
    rows: [
      {
        id: 'orchestrate',
        tag: '›_',
        label: 'The orchestrator scopes the work',
        note: 'turns your brief into one small, provable unit',
        role: 'plain',
      },
      {
        id: 'route',
        tag: '→',
        label: 'It routes that unit to an agent',
        note: 'the inner loop: build the smallest thing that could work',
        role: 'run',
      },
      {
        id: 'prove',
        tag: '✓?',
        label: 'The agent must PROVE it',
        note: 'a failing test first, then the code that turns it green',
        role: 'gate',
      },
      {
        id: 'report',
        tag: '↺',
        label: 'The result comes back to the map',
        note: 'the wisp you see — running, so you don’t have to watch',
        role: 'plain',
      },
    ],
    footer: 'This runs in the background. The map only lights up when it needs you.',
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
        label: 'The agent proposes a change',
        note: 'code for one capability — say, the cart',
        role: 'plain',
      },
      {
        id: 'ci',
        tag: 'CI',
        label: 'Continuous integration runs it',
        note: 'the tests execute on a clean machine, every time',
        role: 'run',
      },
      {
        id: 'gate',
        tag: '⛔',
        label: 'A gate refuses anything unproven',
        note: 'tests must pass — it blocks, it doesn’t warn',
        role: 'gate',
      },
      {
        id: 'verdict',
        tag: '✔',
        label: 'A signed verdict colours it green',
        note: 'the tree greens ONLY on this — never on “done”',
        role: 'good',
      },
    ],
    footer: 'No signed proof, no green. That is the whole difference from the swarm.',
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
        label: 'Proven work merges to the trunk',
        note: 'the gate is the only door in — green work only',
        role: 'good',
      },
      {
        id: 'deploy',
        tag: '☁',
        label: 'CD ships it, watched',
        note: 'delivery is automatic and recorded, not a manual push',
        role: 'run',
      },
      {
        id: 'depend',
        tag: '⌸',
        label: 'The map shows what it depends on',
        note: 'the backend below — the layer you build next',
        role: 'plain',
      },
      {
        id: 'repeat',
        tag: '↑',
        label: 'The same loop grows that layer',
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

  const flow = el('ol', 'act2-overlay-flow');
  flow.setAttribute('aria-live', 'polite');
  const rowEls: HTMLElement[] = data.rows.map((row) => {
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

  const footer = el('p', 'act2-overlay-footer', data.footer);
  if (!reducedMotion) footer.classList.add('is-hidden');

  panel.append(head, flow, footer);
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
      total: data.rows.length,
      cleared,
    };
  };

  const revealAll = (): void => {
    for (const li of rowEls) li.classList.remove('is-hidden');
    footer.classList.remove('is-hidden');
    exposeWitness(data.rows.length, false);
  };

  if (reducedMotion) {
    revealAll();
  } else {
    exposeWitness(0, false);
    rowEls.forEach((li, i) => {
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
        LEAD_MS + rowEls.length * STEP_MS + FOOTER_MS,
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
      exposeWitness(data.rows.length, true);
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
