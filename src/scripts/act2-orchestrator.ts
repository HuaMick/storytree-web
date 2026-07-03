// ---------------------------------------------------------------------------
// act2-orchestrator — the scripted SESSION-ORCHESTRATOR proposal (ADR-0148 §2),
// the meatiest new piece of increment G. Right after the storm→2.5D transform,
// before the guided walk beats, the session orchestrator (storytree's
// human-facing planning agent, ADR-0030 — the "manager who scopes the work" in
// the owner's org analogy) answers the reused prompt ("build me a shopping
// website") by proposing the honest minimum a vibe coder wants: a MOCK LOCAL
// WEBSITE — no backend — to validate the idea.
//
// The exchange is HONEST (explicitly a mock; it never pretends to be a working
// product) and MEETS THE USER WHERE THEY ARE (it does not lead with "you need a
// backend first"; it does not overwhelm). It is site-side FICTION (the Cohoot
// precedent, ADR-0093) and is the SEAM increment H extends — the same
// orchestrator returns to guide "what's next" once the walk ends.
//
// This module is PURE data + a small DOM streamer, mirroring act1-storm's
// finale idiom (a deterministic plan → a rAF-free timed reveal). No React, no
// three.js, no WebGL, no live data, no Math.random, no wall-clock in the PLAN
// (elapsed time drives the reveal cadence only). Keep it SHORT — a few felt
// lines, not a wall of chat.
// ---------------------------------------------------------------------------

/** One line of the orchestrator's proposal, tagged by who speaks / how it reads. */
export interface ProposalLine {
  /** 'orchestrator' = the planning agent's voice; 'note' = a quiet honest aside
   *  (the explicit "this is a mock" framing, styled muted). */
  readonly who: 'orchestrator' | 'note';
  readonly text: string;
}

/**
 * The scripted exchange. FIVE felt lines: the orchestrator greets the request,
 * proposes the mock-first plan, is explicit that it is a mock (honesty), names
 * why (meet the user where they are — see it first), and hands to the walk.
 * Deliberately short — the walk itself carries the teaching.
 *
 * FICTION discipline (as the storm corpus): no real vendors, no statistics.
 */
export const PROPOSAL_LINES: readonly ProposalLine[] = [
  {
    who: 'orchestrator',
    text: 'Okay — “build me a shopping website”. I heard you the first time; let’s do it properly.',
  },
  {
    who: 'orchestrator',
    text:
      'Before we wire up anything real, let’s stand up a mock shopping site — cart, payments, ' +
      'receipts — running locally, no backend yet. Just enough to see your idea and feel whether ' +
      'it’s right.',
  },
  {
    who: 'note',
    text: 'To be clear: this is a mock. Nothing charges a card or saves an order yet — it’s a sketch you can look at.',
  },
  {
    who: 'orchestrator',
    text:
      'That’s on purpose. You wanted to see a website, not a database diagram. We start with what ' +
      'you can look at, then grow the real parts underneath — only when you ask for them.',
  },
  {
    who: 'orchestrator',
    text: 'Watch how it grows. One step at a time — you set the pace.',
  },
];

/** The primary button label that dismisses the proposal and starts the walk. */
export const PROPOSAL_CTA = 'plant the first story →';
/** The quiet secondary that skips straight past the proposal (never stranded). */
export const PROPOSAL_SKIP = 'skip the intro →';

// ── the reveal cadence (motion only; the PLAN above is pure) ──────────────────

/** ms before the first line appears (a beat of calm after the land resolves). */
const LEAD_MS = 650;
/** ms between successive lines revealing. */
const STEP_MS = 1400;
/** ms after the last line before the primary CTA fades in. */
const CTA_BEAT_MS = 700;

export interface OrchestratorOptions {
  /** Reduced motion (or a fast path): reveal every line at once, no stagger. */
  readonly reducedMotion: boolean;
  /** Called when the visitor accepts the proposal (or skips it) — starts the walk. */
  readonly onAccept: () => void;
}

export interface OrchestratorHandle {
  /** Tear the proposal overlay down (chained by the page's disarm path). */
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
 * Mount the orchestrator proposal overlay into `host` (the 2.5D land layer).
 * It sits above the calm empty ground; its accept/skip both call `onAccept`,
 * which the caller wires to start the guided walk. One handle out — the page's
 * existing disarm path chains unmount() so a mid-exchange exit tears it down.
 *
 * The DOM is a small chat card (namespaced `a2o-`, styled by index.astro's
 * global CSS). A witness hook (window.__act2orch) exposes { revealed, done } so
 * the headless witness can assert the exchange reads before the walk begins.
 */
export function mountOrchestrator(host: HTMLElement, opts: OrchestratorOptions): OrchestratorHandle {
  const { reducedMotion, onAccept } = opts;
  let disposed = false;
  const timers: number[] = [];

  const overlay = el('div', 'a2o-overlay');
  overlay.setAttribute('data-act2-orchestrator', '');
  overlay.setAttribute('role', 'group');
  overlay.setAttribute('aria-label', 'The session orchestrator proposes a first step');

  const card = el('div', 'a2o-card');

  const head = el('div', 'a2o-head');
  const badge = el('span', 'a2o-badge', 'orchestrator');
  badge.setAttribute('aria-hidden', 'true');
  const who = el('p', 'a2o-who', 'The session orchestrator');
  head.append(badge, who);

  const thread = el('div', 'a2o-thread');
  thread.setAttribute('aria-live', 'polite');

  const lineEls: HTMLElement[] = PROPOSAL_LINES.map((line) => {
    const row = el('p', `a2o-line a2o-${line.who}`, line.text);
    if (!reducedMotion) row.classList.add('is-hidden');
    thread.appendChild(row);
    return row;
  });

  const actions = el('div', 'a2o-actions');
  if (!reducedMotion) actions.classList.add('is-hidden');
  const acceptBtn = el('button', 'a2o-accept btn btn--primary', PROPOSAL_CTA);
  acceptBtn.type = 'button';
  acceptBtn.setAttribute('data-act2-orchestrator-accept', '');
  const skipBtn = el('button', 'a2o-skip', PROPOSAL_SKIP);
  skipBtn.type = 'button';
  skipBtn.setAttribute('data-act2-orchestrator-skip', '');
  actions.append(acceptBtn, skipBtn);

  card.append(head, thread, actions);
  overlay.appendChild(card);
  host.appendChild(overlay);

  const exposeWitness = (revealed: number, done: boolean): void => {
    (
      window as unknown as {
        __act2orch?: { revealed: number; total: number; done: boolean };
      }
    ).__act2orch = { revealed, total: PROPOSAL_LINES.length, done };
  };

  const finish = (): void => {
    for (const el of lineEls) el.classList.remove('is-hidden');
    actions.classList.remove('is-hidden');
    exposeWitness(PROPOSAL_LINES.length, true);
    try {
      acceptBtn.focus({ preventScroll: true });
    } catch {
      /* focus is a courtesy */
    }
  };

  if (reducedMotion) {
    finish();
  } else {
    exposeWitness(0, false);
    lineEls.forEach((row, i) => {
      timers.push(
        window.setTimeout(() => {
          if (disposed) return;
          row.classList.remove('is-hidden');
          exposeWitness(i + 1, false);
        }, LEAD_MS + i * STEP_MS),
      );
    });
    timers.push(
      window.setTimeout(
        () => {
          if (disposed) return;
          finish();
        },
        LEAD_MS + (lineEls.length - 1) * STEP_MS + CTA_BEAT_MS,
      ),
    );
  }

  let accepted = false;
  const accept = (): void => {
    if (accepted || disposed) return;
    accepted = true;
    overlay.classList.add('is-leaving');
    // let the fade-out run, then hand to the walk
    const handoff = (): void => {
      if (disposed) return;
      onAccept();
    };
    if (reducedMotion) handoff();
    else timers.push(window.setTimeout(handoff, 420));
  };
  acceptBtn.addEventListener('click', accept);
  skipBtn.addEventListener('click', () => {
    // skip reveals everything instantly if still streaming, then accepts
    for (const el of lineEls) el.classList.remove('is-hidden');
    accept();
  });

  // reveal on first paint (the fade-up is CSS)
  requestAnimationFrame(() => {
    if (!disposed) overlay.classList.add('is-live');
  });

  return {
    unmount(): void {
      if (disposed) return;
      disposed = true;
      for (const t of timers) window.clearTimeout(t);
      timers.length = 0;
      acceptBtn.removeEventListener('click', accept);
      overlay.remove();
      delete (window as unknown as { __act2orch?: unknown }).__act2orch;
    },
  };
}
