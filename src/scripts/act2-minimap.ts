// ---------------------------------------------------------------------------
// act2-minimap — the persistent docked mini-map (ADR-0165 §2, accepted default
// 2): at the island handoff the growing system diagram COMPACTS to this small
// top-left card — a 6-dot row (intent · decision · library · story · loop ·
// signal, linked by short dashes) that PERSISTS for the rest of the walk,
// lighting EXACTLY ONE stage: the one the visitor is watching (story when the
// island plants, loop while the wisp orbits, signal when the cart greens). It
// IS the "one diagram" promise carried through — and it REPLACES the retired
// corner-overlay pattern. It must stay ONE small stage-light; it never grows
// toward a second diagram (that would relocate the clutter this redesign
// removed).
//
// Pure fixed DOM (no data, no clock); styled by index.astro's global CSS
// (`.act2-minimap`). Witness hooks: container `[data-act2-minimap]`, each dot
// `[data-stage="intent|decision|library|story|loop|signal"]`, lit = `is-lit`.
// ---------------------------------------------------------------------------

import { MINI_STAGES, type MiniStage } from './act2-guide';

export interface MinimapHandle {
  /** Set the mini-map's state declaratively: null = hidden (Phase D); a stage =
   *  docked + that ONE stage lit. Re-applying any state yields the identical
   *  DOM — Back replay is byte-identical. */
  set(stage: MiniStage | null): void;
  unmount(): void;
}

/** Mount the docked mini-map into `host` (the 2.5D land layer), hidden until
 *  the island handoff. One handle out; the guide drives it. */
export function mountMinimap(host: HTMLElement): MinimapHandle {
  const card = document.createElement('div');
  card.className = 'act2-minimap';
  card.setAttribute('data-act2-minimap', '');
  card.setAttribute('role', 'img');
  card.setAttribute(
    'aria-label',
    'The system diagram, compacted: it stays with you and lights the stage the walk is at.',
  );

  const eyebrow = document.createElement('p');
  eyebrow.className = 'act2-minimap-eyebrow';
  eyebrow.textContent = 'the system — where you are';
  card.appendChild(eyebrow);

  const row = document.createElement('div');
  row.className = 'act2-minimap-row';
  const steps = new Map<MiniStage, HTMLElement>();
  MINI_STAGES.forEach((stage, i) => {
    if (i > 0) {
      const link = document.createElement('span');
      link.className = 'act2-minimap-link';
      row.appendChild(link);
    }
    const step = document.createElement('div');
    step.className = 'act2-minimap-step';
    step.setAttribute('data-stage', stage);
    const dot = document.createElement('span');
    dot.className = 'act2-minimap-dot';
    const label = document.createElement('small');
    label.textContent = stage;
    step.append(dot, label);
    row.appendChild(step);
    steps.set(stage, step);
  });
  card.appendChild(row);
  host.appendChild(card);

  return {
    set(stage: MiniStage | null): void {
      card.classList.toggle('is-docked', stage !== null);
      card.setAttribute('aria-hidden', stage === null ? 'true' : 'false');
      for (const [key, el] of steps) el.classList.toggle('is-lit', key === stage);
    },
    unmount(): void {
      card.remove();
    },
  };
}
