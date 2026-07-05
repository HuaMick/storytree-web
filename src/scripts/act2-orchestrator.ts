// ---------------------------------------------------------------------------
// act2-orchestrator — the SESSION-ORCHESTRATOR chat that carries step 1's OUTCOME
// BRIEF (ADR-0148 §2, re-directed by ADR-0153 §4). Right after the storm→2.5D
// transform, before the guided walk beats, the session orchestrator (storytree's
// human-facing planning agent, ADR-0030 — the "manager who scopes the work" in
// the owner's org analogy) answers the reused prompt ("build me a shopping
// website") by reading the OUTCOME back with an EXAMPLE, then proposing the honest
// minimum a vibe coder wants: a MOCK LOCAL WEBSITE — no backend — to see the idea.
//
// ── ADR-0153 re-direction ────────────────────────────────────────────────────
//  • Step 1 is an OUTCOME BRIEF with an example, carried by the orchestrator CHAT
//    at the BOTTOM (§4) — the REAL app's chat surface, not a centered card.
//  • REAL app UI (§2): this faithfully RE-CREATES the studio's chat dock (the site
//    can't import studio React across the repo boundary) — a warm-dark, terminal-
//    style MONOSPACE dock anchored at the bottom of the map frame, with a `›` glyph
//    for the orchestrator, streamed warm-beige replies + an amber caret, and a
//    pinned prompt row. Tokens are the studio's (apps/studio/src/index.css chat
//    palette): --chat-bg #1e1a15, --chat-sage #8fb87a, --chat-reply #d8cfb8, etc.
//  • NO escape hatches (§3): the old "skip the intro" secondary is REMOVED — the
//    only affordance is the primary that plants the first story and begins the walk.
//  • Progressive disclosure (§2): the chat dock is the FIRST piece of the real UI
//    the visitor is walked through; the rest of the interface reveals as the walk
//    earns it.
//
// ── ADR-0157 re-direction ────────────────────────────────────────────────────
//  • The voice reads as OUR ACTUAL session orchestrator (ADR-0030 — the human-
//    facing planning agent that SCOPES intent into routed, PROVEN work; the org
//    analogy's manager scoping the next slice), NOT a generic coding assistant: it
//    says up front it doesn't write the code itself — it scopes, routes to agents,
//    and calls nothing done until a test proves it.
//  • It names honestly that the first story lands as a PROPOSAL, green only once a
//    test passes (the verification-gap thesis; ADR-0094 / ADR-0020).
//  • Plain, newcomer-legible language throughout, no "storm" metaphor, no jargon.
//
// This module is PURE data + a small DOM streamer, mirroring act1-storm's finale
// idiom (a deterministic plan → a rAF-free timed reveal). No React, no three.js,
// no WebGL, no live data, no Math.random, no wall-clock in the PLAN (elapsed time
// drives the reveal cadence only). It is site-side FICTION (the Cohoot precedent,
// ADR-0093) and the SEAM the walk continues from (the same voice returns to guide
// the upstream reveal). Keep it SHORT — a felt exchange, not a wall of chat.
// ---------------------------------------------------------------------------

/** The visitor's reused request, echoed at the top of the chat (the prompt the
 *  storm carried in). */
export const USER_PROMPT = 'build me a shopping website';

/** One streamed line of the orchestrator's reply, tagged by how it reads. */
export interface ReplyLine {
  /** 'reply' = the orchestrator's plain voice; 'brief' = the outcome-brief line
   *  (the example, set apart); 'note' = a quiet honest aside (the "this is a mock"
   *  framing, styled muted). */
  readonly kind: 'reply' | 'brief' | 'note';
  readonly text: string;
}

/**
 * The scripted reply. The orchestrator reads the OUTCOME back with an EXAMPLE (the
 * brief), then proposes the honest mock-first plan and names why. Deliberately
 * short — the walk itself carries the teaching.
 *
 * FICTION discipline (as the storm corpus): no real vendors, no statistics.
 */
export const REPLY_LINES: readonly ReplyLine[] = [
  {
    kind: 'reply',
    text: 'I’m the orchestrator — I don’t write the code myself. I scope the work, hand it to the agents, and only call it done once a test proves it.',
  },
  {
    kind: 'reply',
    text: 'So first, let me turn that into one clear outcome we can both check.',
  },
  {
    kind: 'brief',
    text: 'Outcome: shoppers can add items to a cart, pay, and get a receipt. Example: someone fills a cart, checks out, and sees “order confirmed”.',
  },
  {
    kind: 'reply',
    text:
      'I’ll scope the first slice small: a mock of exactly that — cart, payments, receipts — ' +
      'running locally, no backend yet. Enough to see your idea and feel whether it’s right.',
  },
  {
    kind: 'note',
    text: 'To be clear, it’s a mock: nothing charges a card or saves an order yet. It’s a sketch you can look at.',
  },
  {
    kind: 'reply',
    text: 'When you tap start, this becomes a proposal — not a finished thing. It only turns green once a test passes. Then we grow the real parts it needs, one at a time.',
  },
];

/** The primary button label that begins the walk (plants the first story). There
 *  is NO skip affordance (ADR-0153 §3 — no escape hatches). */
export const PROPOSAL_CTA = 'plant the first story →';

// ── the reveal cadence (motion only; the PLAN above is pure) ──────────────────

/** ms before the first line appears (a beat of calm after the land resolves). */
const LEAD_MS = 620;
/** ms between successive lines revealing. */
const STEP_MS = 1250;
/** ms after the last line before the primary CTA fades in. */
const CTA_BEAT_MS = 640;

export interface OrchestratorOptions {
  /** Reduced motion (or a fast path): reveal every line at once, no stagger. */
  readonly reducedMotion: boolean;
  /** Called when the visitor accepts the proposal — starts the walk. */
  readonly onAccept: () => void;
}

export interface OrchestratorHandle {
  /** Tear the chat dock down (chained by the page's disarm path). */
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
 * Mount the orchestrator chat DOCK into `host` (the 2.5D land layer). It anchors
 * at the BOTTOM of the frame (the real app's chat position) over the calm empty
 * ground; its primary begins the walk via `onAccept`. One handle out — the page's
 * existing disarm path chains unmount() so a mid-exchange exit tears it down.
 *
 * The DOM is a faithful re-creation of the studio chat dock (namespaced
 * `a2chat-`/`chat-dock`, styled by index.astro's global CSS with the studio's
 * chat tokens). A witness hook (window.__act2orch) exposes { revealed, total,
 * done } so the headless witness can assert the brief reads before the walk.
 */
export function mountOrchestrator(host: HTMLElement, opts: OrchestratorOptions): OrchestratorHandle {
  const { reducedMotion, onAccept } = opts;
  let disposed = false;
  const timers: number[] = [];

  const overlay = el('div', 'a2chat-dock chat-dock');
  overlay.setAttribute('data-act2-orchestrator', '');
  overlay.setAttribute('role', 'group');
  overlay.setAttribute('aria-label', 'The session orchestrator — your chat');

  // scrollback (the real app's .chat-outcome): the prompt echo, then the reply.
  const scroll = el('div', 'a2chat-scroll');
  scroll.setAttribute('aria-live', 'polite');

  // the user's echoed prompt: `› ` sage glyph + the request text.
  const promptRow = el('div', 'a2chat-prompt-echo');
  const promptGlyph = el('span', 'a2chat-glyph', '›');
  promptGlyph.setAttribute('aria-hidden', 'true');
  const promptText = el('span', 'a2chat-user', USER_PROMPT);
  promptRow.append(promptGlyph, promptText);
  scroll.appendChild(promptRow);

  // the orchestrator's streamed reply block.
  const replyBlock = el('div', 'a2chat-reply-block');
  const replyGlyph = el('span', 'a2chat-glyph a2chat-glyph--agent', '›');
  replyGlyph.setAttribute('aria-hidden', 'true');
  const replyBody = el('div', 'a2chat-reply-body');
  replyBlock.append(replyGlyph, replyBody);
  scroll.appendChild(replyBlock);

  const lineEls: HTMLElement[] = REPLY_LINES.map((line) => {
    const row = el('p', `a2chat-line a2chat-${line.kind}`, line.text);
    if (!reducedMotion) row.classList.add('is-hidden');
    replyBody.appendChild(row);
    return row;
  });
  // the streaming caret (amber ▋) — sits at the end of the reply while it streams.
  const caret = el('span', 'a2chat-caret', '▋');
  caret.setAttribute('aria-hidden', 'true');
  replyBody.appendChild(caret);

  // the pinned prompt row (the real app's .chat-form): `›` glyph + a disabled
  // textarea showing the sent prompt (a diorama — the input is inert), then the
  // primary that begins the walk. Hint below, as the studio.
  const form = el('div', 'a2chat-form');
  const formGlyph = el('span', 'a2chat-glyph', '›');
  formGlyph.setAttribute('aria-hidden', 'true');
  const input = el('div', 'a2chat-input');
  input.setAttribute('aria-hidden', 'true');
  input.textContent = USER_PROMPT;
  const actions = el('div', 'a2chat-actions');
  if (!reducedMotion) actions.classList.add('is-hidden');
  const acceptBtn = el('button', 'a2chat-accept', PROPOSAL_CTA);
  acceptBtn.type = 'button';
  acceptBtn.setAttribute('data-act2-orchestrator-accept', '');
  actions.append(acceptBtn);
  form.append(formGlyph, input, actions);

  const hint = el('p', 'a2chat-hint', 'a staged chat — one step begins the walk');

  overlay.append(scroll, form, hint);
  host.appendChild(overlay);

  const exposeWitness = (revealed: number, done: boolean): void => {
    (
      window as unknown as {
        __act2orch?: { revealed: number; total: number; done: boolean };
      }
    ).__act2orch = { revealed, total: REPLY_LINES.length, done };
  };

  const finish = (): void => {
    for (const l of lineEls) l.classList.remove('is-hidden');
    caret.classList.add('is-done'); // stop the caret once the stream lands
    actions.classList.remove('is-hidden');
    exposeWitness(REPLY_LINES.length, true);
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
    const handoff = (): void => {
      if (disposed) return;
      onAccept();
    };
    if (reducedMotion) handoff();
    else timers.push(window.setTimeout(handoff, 420));
  };
  acceptBtn.addEventListener('click', accept);

  // reveal on first paint (the slide-up is CSS)
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
