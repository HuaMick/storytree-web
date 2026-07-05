// ---------------------------------------------------------------------------
// act2-orchestrator — the PERSISTENT session-orchestrator GUIDE CHAT
// (ADR-0165 §3, reshaping the landed one-shot proposal exchange of ADR-0148 §2
// / ADR-0153 §4): after Act 1's transform the visitor STAYS in this chat from
// D0 through the end of the walk — it IS the single advance surface. Each step
// the orchestrator streams one or two short lines, then offers ONE bounded
// reply chip in the input row (exactly where the landed build put "plant the
// first story →"), voiced as the questions a skeptical developer would ask —
// tapping through IS the persuasion arc. Occasionally one quiet "why does that
// matter?" aside is offered alongside: it streams one extra muted line WITHOUT
// advancing, then disappears. The separate Next button is retired everywhere;
// a small quiet '← back' in the form is pure replay (accepted default 9).
//
// The DOM is the landed FAITHFUL re-creation of the studio chat dock (the site
// can't import studio React across the repo boundary): warm-dark monospace,
// the `›` glyphs, streamed reveal at the landed cadence (LEAD 620 / STEP
// 1250 ms; reduced-motion = all at once), the amber caret. Namespaced
// `a2chat-`, styled by index.astro's global CSS with the studio chat tokens.
//
// This module is the SEQUENCER: it owns the step index and drives the four
// stage surfaces per the guide script's DECLARATIVE target state
// (act2-guide.ts — the single source): the growing diagram (act2-diagram.ts),
// the docked mini-map (act2-minimap.ts), the landed walk (act2-walkthrough
// — thin wrappers around the same next()/back() the retired buttons called;
// ADR-0165 §10: chat-advance is site wiring, the director engine untouched),
// and — run 2 — the Phase-Z studio layer (act2-studio.ts, ADR-0165 §6):
// mounted lazily at the first step that declares a `studio` stage, advanced/
// retreated by pure stage re-application, hidden again on a Back into Phase I
// (the host's `act2-studio-on` class carries the walk-canvas crossfade;
// `act2-cta-on` lifts the landed done card over the veiled studio at the end).
// Back = re-apply the previous step's state from scratch: the chat re-renders
// lines 0..n instantly (no streaming) and the scene renders byte-identical.
//
// The voice discipline is unchanged (ADR-0157 §3, carried into Phase D by
// ADR-0165): OUR actual session orchestrator — it scopes, routes to agents,
// and calls nothing done until the system proves it. Plain, newcomer-legible,
// no "storm" metaphor, industry terms embodied never named (ADR-0165 §9).
//
// Determinism: the PLAN is pure data (the guide script); timers drive the
// reveal cadence only. Witness hook: window.__act2guide = { step, index,
// total, phase, linesDone, chip } (updated on every state change).
// ---------------------------------------------------------------------------

import { GUIDE_STEPS, USER_PROMPT, type GuideStep } from './act2-guide';
import { mountDiagram, type DiagramHandle } from './act2-diagram';
import { mountMinimap, type MinimapHandle } from './act2-minimap';
import { mountStudio, type StudioHandle } from './act2-studio';
import type { WalkthroughHandle } from './act2-walkthrough';

export { USER_PROMPT };

// ── the reveal cadence (motion only; the PLAN is act2-guide's pure data) ─────

/** ms before a step's first line appears (a beat of calm after the chip echo). */
const LEAD_MS = 620;
/** ms between successive lines revealing. */
const STEP_MS = 1250;
/** ms after the last line before the reply chip fades in. */
const CHIP_BEAT_MS = 640;

export interface GuideOptions {
  /** Reduced motion (or a fast path): reveal every line at once, no stagger. */
  readonly reducedMotion: boolean;
  /** The mounted walk — the guide drives next()/back()/revealCallout() per the
   *  step script's target state (thin wrappers around the same advance() calls
   *  the retired Next button made). */
  readonly walk: WalkthroughHandle;
}

export interface GuideHandle {
  /** Tear the guide down (chat dock + diagram + mini-map) — the page's disarm
   *  path chains this (the walk is unmounted separately by the seam). */
  unmount(): void;
}

interface GuideWitness {
  step: string;
  index: number;
  total: number;
  phase: GuideStep['phase'];
  linesDone: boolean;
  chip: string | null;
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

/** A chip's text echoed as the visitor's line (a trailing ' →' is affordance
 *  chrome, not words the visitor "said"). */
const echoText = (chip: string): string => chip.replace(/\s*→\s*$/, '');

/**
 * Mount the persistent guide chat into `host` (the 2.5D land layer) and take
 * ownership of the flow: D0 streams immediately; every later step is entered by
 * its chip (forward, streamed) or the back control (replay, instant). One
 * handle out — the disarm path chains unmount() so a mid-walk exit tears the
 * whole guide down.
 */
export function mountGuide(host: HTMLElement, opts: GuideOptions): GuideHandle {
  const { reducedMotion, walk } = opts;
  const steps = GUIDE_STEPS;

  let disposed = false;
  let index = 0;
  let linesDone = false;
  const timers: number[] = [];
  /** Steps whose aside was tapped — the extra line is part of the scrollback
   *  from then on (deterministic given the visit history), and the aside chip
   *  is not offered again on a Back replay. */
  const consumedAsides = new Set<number>();

  // ── the stage surfaces the guide drives ──
  const diagram: DiagramHandle = mountDiagram(host, { reducedMotion });
  const minimap: MinimapHandle = mountMinimap(host);
  /** The Phase-Z studio layer — mounted LAZILY at the first step that declares
   *  a `studio` stage (D/I visitors never pay for it). */
  let studio: StudioHandle | null = null;
  // mirrors of the walk state (the guide is the only driver, so the mirror is
  // exact; the walk's own __act2 witness stays the scene source of truth).
  let walkBeat = 0;
  let walkCta = false;
  let calloutRevealed = false;

  // ── the chat dock (the landed studio re-creation, now persistent) ──
  const dock = el('div', 'a2chat-dock chat-dock');
  dock.setAttribute('data-act2-orchestrator', '');
  dock.setAttribute('role', 'group');
  dock.setAttribute('aria-label', 'The session orchestrator — your chat');

  const scroll = el('div', 'a2chat-scroll');
  scroll.setAttribute('aria-live', 'polite');

  // the visitor's original prompt, echoed at the top (their own words —
  // accepted default 3; the whole walk pays this line off).
  const promptRow = el('div', 'a2chat-prompt-echo');
  const promptGlyph = el('span', 'a2chat-glyph', '›');
  promptGlyph.setAttribute('aria-hidden', 'true');
  promptRow.append(promptGlyph, el('span', 'a2chat-user', USER_PROMPT));
  scroll.appendChild(promptRow);

  // the guided exchange (re-rendered per step — the mock's rebuild idiom, so
  // any state's scrollback is byte-identical however it was reached).
  const linesHost = el('div', 'a2chat-lines');
  scroll.appendChild(linesHost);

  const caret = el('span', 'a2chat-caret', '▋');
  caret.setAttribute('aria-hidden', 'true');
  scroll.appendChild(caret);

  // the pinned input row: glyph + back + the inert "input" + the reply chips.
  const form = el('div', 'a2chat-form');
  const formGlyph = el('span', 'a2chat-glyph', '›');
  formGlyph.setAttribute('aria-hidden', 'true');
  const backBtn = el('button', 'a2chat-back', '← back');
  backBtn.type = 'button';
  backBtn.setAttribute('data-act2-back', '');
  backBtn.hidden = true;
  const fakeIn = el('div', 'a2chat-input', 'the orchestrator is guiding — reply below');
  fakeIn.setAttribute('aria-hidden', 'true');
  const actions = el('div', 'a2chat-actions');
  form.append(formGlyph, backBtn, fakeIn, actions);

  const hint = el('p', 'a2chat-hint', 'a staged chat — your reply moves the walk one step');

  dock.append(scroll, form, hint);
  host.appendChild(dock);

  const exposeWitness = (): void => {
    const step = steps[index]!;
    const w: GuideWitness = {
      step: step.id,
      index,
      total: steps.length,
      phase: step.phase,
      linesDone,
      chip: linesDone && step.chip !== null ? step.chip : null,
    };
    (window as unknown as { __act2guide?: GuideWitness }).__act2guide = w;
  };

  const clearTimers = (): void => {
    for (const t of timers) window.clearTimeout(t);
    timers.length = 0;
  };

  const scrollToEnd = (): void => {
    scroll.scrollTop = scroll.scrollHeight;
  };

  // ── the stage: apply a step's DECLARATIVE target state (pure re-apply) ──
  /** When true, the final step's CTA entry is deferred until its line has
   *  streamed (reveal cadence only — the state sequence is identical). */
  let pendingCta = false;

  const applyStage = (step: GuideStep, stream: boolean): void => {
    pendingCta = false;
    // the diagram ↔ mini-map handoff (ADR-0165 §2)
    if (step.minimap === null) {
      minimap.set(null);
      diagram.setAway(false);
      diagram.setStep(step.diagramStep);
    } else {
      diagram.setAway(true);
      minimap.set(step.minimap);
    }
    // Phase Z — the studio layer (ADR-0165 §6): mount lazily at the first
    // declared stage, then pure stage re-application (additive reveal; null on
    // a Back into Phase I hides it and the crossfade class returns the walk).
    const studioStage = step.studio ?? null;
    if (studioStage !== null && studio === null) studio = mountStudio(host);
    if (studio !== null) studio.setStage(studioStage);
    host.classList.toggle('act2-studio-on', studioStage !== null);
    host.classList.toggle('act2-cta-on', step.cta);
    // the walk: thin wrappers around the same next()/back() the buttons called
    if (walkCta && !step.cta) {
      walk.back(); // leave the done state (pure replay)
      walkCta = false;
    }
    while (walkBeat < step.beat) {
      walk.next();
      walkBeat++;
    }
    while (walkBeat > step.beat) {
      walk.back();
      walkBeat--;
    }
    // the island handoff reveals the (deferred) narration callout once.
    if (walkBeat >= 1 && !calloutRevealed) {
      walk.revealCallout();
      calloutRevealed = true;
    }
    if (step.cta && !walkCta) {
      if (reducedMotion || !stream) {
        walk.next(); // director.done → the landed done/CTA state
        walkCta = true;
      } else {
        pendingCta = true; // enter it when the sign-off line has streamed
      }
    }
  };

  const enterPendingCta = (): void => {
    if (!pendingCta || disposed) return;
    pendingCta = false;
    walk.next();
    walkCta = true;
  };

  // ── the chat: render steps 0..upto (the rebuild idiom) ──
  const onChip = (): void => {
    if (disposed || !linesDone) return;
    applyStep(index + 1, true);
  };

  const onAside = (): void => {
    if (disposed || consumedAsides.has(index)) return;
    const step = steps[index]!;
    if (!step.aside) return;
    consumedAsides.add(index);
    // stream the ONE extra muted line into the current step's block…
    const line = el('p', 'a2chat-line a2chat-note', step.aside.line);
    const block = linesHost.lastElementChild?.querySelector('.a2chat-reply-body');
    (block ?? linesHost).appendChild(line);
    if (!reducedMotion) {
      line.classList.add('is-hidden');
      requestAnimationFrame(() => {
        if (!disposed) line.classList.remove('is-hidden');
      });
    }
    // …and the aside chip disappears (the primary chip stays).
    actions.querySelector('[data-act2-aside]')?.remove();
    scrollToEnd();
  };

  const onBack = (): void => {
    if (disposed || index === 0) return;
    applyStep(index - 1, false);
  };

  /** Show the step's chips in the input-row actions slot (the aside first, so
   *  the primary keeps the outer edge — the landed accept position). */
  const showChips = (step: GuideStep, focusChip: boolean): void => {
    actions.innerHTML = '';
    if (step.aside && !consumedAsides.has(index)) {
      const aside = el('button', 'a2chat-chip a2chat-chip--aside', step.aside.label);
      aside.type = 'button';
      aside.setAttribute('data-act2-aside', '');
      aside.addEventListener('click', onAside);
      actions.appendChild(aside);
    }
    if (step.chip !== null) {
      const chip = el('button', 'a2chat-chip', step.chip);
      chip.type = 'button';
      chip.setAttribute('data-act2-chip', '');
      chip.addEventListener('click', onChip);
      actions.appendChild(chip);
      requestAnimationFrame(() => {
        if (!disposed) chip.classList.add('is-on');
      });
      if (focusChip) {
        try {
          chip.focus({ preventScroll: true });
        } catch {
          /* focus is a courtesy */
        }
      }
    }
    caret.classList.add('is-done');
    linesDone = true;
    exposeWitness();
    enterPendingCta();
    scrollToEnd();
  };

  const renderChat = (upto: number, streamLast: boolean): void => {
    linesHost.innerHTML = '';
    actions.innerHTML = '';
    caret.classList.remove('is-done');
    const hidden: HTMLElement[] = [];
    for (let s = 0; s <= upto; s++) {
      const step = steps[s]!;
      // the visitor's echoed reply (the previous step's chip) opens the block.
      const prevChip = s > 0 ? steps[s - 1]!.chip : null;
      if (prevChip !== null) {
        const you = el('div', 'a2chat-prompt-echo');
        const g = el('span', 'a2chat-glyph', '›');
        g.setAttribute('aria-hidden', 'true');
        you.append(g, el('span', 'a2chat-user', echoText(prevChip)));
        linesHost.appendChild(you);
      }
      const block = el('div', 'a2chat-reply-block');
      const glyph = el('span', 'a2chat-glyph a2chat-glyph--agent', '›');
      glyph.setAttribute('aria-hidden', 'true');
      const body = el('div', 'a2chat-reply-body');
      for (const [kind, text] of step.lines) {
        const row = el('p', `a2chat-line a2chat-${kind}`, text);
        if (streamLast && s === upto && !reducedMotion) {
          row.classList.add('is-hidden');
          hidden.push(row);
        }
        body.appendChild(row);
      }
      // a consumed aside's extra line is part of the record from then on.
      if (consumedAsides.has(s) && step.aside) {
        const row = el('p', 'a2chat-line a2chat-note', step.aside.line);
        if (streamLast && s === upto && !reducedMotion) {
          row.classList.add('is-hidden');
          hidden.push(row);
        }
        body.appendChild(row);
      }
      block.append(glyph, body);
      linesHost.appendChild(block);
    }

    const step = steps[upto]!;
    if (hidden.length === 0) {
      // instant path: Back replay, reduced motion, or a lineless step.
      showChips(step, streamLast && !reducedMotion);
      scrollToEnd();
      return;
    }
    hidden.forEach((row, i) => {
      timers.push(
        window.setTimeout(() => {
          if (disposed) return;
          row.classList.remove('is-hidden');
          scrollToEnd();
          if (i === hidden.length - 1) {
            timers.push(
              window.setTimeout(() => {
                if (!disposed) showChips(step, true);
              }, CHIP_BEAT_MS),
            );
          }
        }, LEAD_MS + i * STEP_MS),
      );
    });
    scrollToEnd();
  };

  /** Enter step `n`: apply its declarative stage state, then render the chat —
   *  streamed on a forward tap, instant on a Back replay. */
  const applyStep = (n: number, stream: boolean): void => {
    if (n < 0 || n >= steps.length) return;
    clearTimers();
    linesDone = false;
    index = n;
    const step = steps[n]!;
    applyStage(step, stream);
    backBtn.hidden = n === 0;
    exposeWitness();
    renderChat(n, stream);
  };

  backBtn.addEventListener('click', onBack);

  // ── first paint: D0 streams over the quiet ground (the slide-up is CSS) ──
  applyStep(0, true);
  requestAnimationFrame(() => {
    if (!disposed) dock.classList.add('is-live');
  });

  return {
    unmount(): void {
      if (disposed) return;
      disposed = true;
      clearTimers();
      backBtn.removeEventListener('click', onBack);
      dock.remove();
      diagram.unmount();
      minimap.unmount();
      studio?.unmount();
      studio = null;
      host.classList.remove('act2-studio-on', 'act2-cta-on');
      delete (window as unknown as { __act2guide?: unknown }).__act2guide;
    },
  };
}
