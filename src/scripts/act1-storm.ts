// ---------------------------------------------------------------------------
// act1-storm — the storm engine (ADR-0134 Act 1).
//
// Consumes the deterministic plan from storm-script.ts and stages it: terminal
// windows as plain styled divs, one rAF loop driving both the text streams and
// the CRT grain canvas, and a fully synthesized Web Audio soundscape unlocked
// by the visitor's single send gesture. No WebGL, no deps, no audio files.
//
// The engine never decides the exits: arming/disarming live in index.astro's
// inline script (so the skip works even if this module never loads); the
// engine only registers window.__stormHalt so a disarm can silence it.
// ---------------------------------------------------------------------------

import {
  buildFinalePlan,
  buildStormPlan,
  mulberry32,
  STORM_SEED,
  type LineKind,
  type TermEvent,
  type TerminalPlan,
} from './storm-script';

const MAX_LINES = 16; //   DOM lines kept per terminal (old ones drop)
const PEAK_BEAT = 2600; // ms of parked cacophony before the finale terminal
const MASTER_GAIN = 0.15;

// — the finale terminal (the peak affordance) —
const FINALE_TYPE_DELAY = 1300; // ms from peak to the first typed finale line
const FINALE_ACTIONS_BEAT = 650; // ms after the last line before the options fade in

// — the inflection (ADR-0134 §2): one click transforms the storm in place —
const COLLAPSE_STAGGER = 62; // ms between terminal power-offs (CRT-off feel)
const FRAG_CAP = 88; //         falling text fragments across all terminals
const SETTLE_BEAT = 2800; //    ms from the click before the land may resolve

// ── audio: everything synthesized ───────────────────────────────────────────

class StormAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private humGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private lastTick = 0;
  private halted = false;
  enabled = true;

  /** Create/resume inside the send gesture — the browser-required unlock. */
  unlock(): void {
    if (this.halted) return;
    if (this.ctx) {
      this.resume();
      return;
    }
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return; // no Web Audio → a silent storm, still a storm
    const ctx = new AC();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.enabled ? MASTER_GAIN : 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);
    this.master = master;

    // one deterministic noise buffer, shared by the ticks and the hum bed
    const rand = mulberry32(STORM_SEED ^ 0x0badcafe);
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = rand() * 2 - 1;
    this.noiseBuf = buf;

    // the ambient hum: two detuned lows + a dark filtered-noise bed
    const humGain = ctx.createGain();
    humGain.gain.value = 0.035;
    humGain.connect(master);
    for (const f of [54, 54.7]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = 0.5;
      o.connect(og);
      og.connect(humGain);
      o.start();
    }
    const bed = ctx.createBufferSource();
    bed.buffer = buf;
    bed.loop = true;
    bed.playbackRate.value = 0.35;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 240;
    lp.Q.value = 0.7;
    const bg = ctx.createGain();
    bg.gain.value = 0.25;
    bed.connect(lp);
    lp.connect(bg);
    bg.connect(humGain);
    bed.start();
    this.humGain = humGain;

    void ctx.resume();
  }

  /** The cacophony thickens with the agent count (0..1). */
  setIntensity(frac: number): void {
    if (this.ctx && this.humGain) {
      this.humGain.gain.linearRampToValueAtTime(
        0.035 + 0.12 * frac,
        this.ctx.currentTime + 0.8,
      );
    }
  }

  /** A per-terminal typing tick — slightly detuned per window, globally throttled. */
  tick(detune: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf || !this.master || this.halted) return;
    const now = performance.now();
    if (now - this.lastTick < 65) return;
    this.lastTick = now;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + detune * 0.7;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500 + detune * 1400;
    bp.Q.value = 2.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t, detune * 0.5, 0.06);
    src.stop(t + 0.07);
  }

  /** The CRT power-on thunk when a window materializes. */
  blip(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.halted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.18);
  }

  /** A soft two-partial bell when a demand parks. */
  bell(detune: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.halted) return;
    const t = ctx.currentTime;
    const partials: ReadonlyArray<readonly [number, number]> = [
      [740 + detune * 240, 0.05],
      [1480 + detune * 480, 0.02],
    ];
    for (const [f, amp] of partials) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + 0.95);
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!this.ctx || !this.master) return;
    this.master.gain.value = on ? MASTER_GAIN : 0;
    if (on) void this.ctx.resume();
    else void this.ctx.suspend();
  }

  suspend(): void {
    if (this.ctx) void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.enabled && !this.halted) void this.ctx.resume();
  }

  /** Full stop — disarm/skip. The context is closed, nothing can sound again. */
  halt(): void {
    this.halted = true;
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx) {
      try {
        void ctx.close().catch(() => {});
      } catch {
        /* already closed */
      }
    }
  }

  /** The transform's decay — the storm resolves to silence rather than cutting:
   *  the master gain ramps to nothing over ~1.6s, then the context closes for
   *  good. `halt()` (the disarm path) stays the hard stop. */
  quell(): void {
    if (this.halted) return;
    this.halted = true; // no new ticks/bells/blips; resume() is disabled
    const ctx = this.ctx;
    const master = this.master;
    this.ctx = null; // nothing can reach the graph again through this instance
    this.master = null;
    if (!ctx || !master) return;
    try {
      const t = ctx.currentTime;
      const g = master.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0.0001, t + 1.6);
    } catch {
      /* ramp failed — the close below still ends in silence */
    }
    window.setTimeout(() => {
      try {
        void ctx.close().catch(() => {});
      } catch {
        /* already closed */
      }
    }, 1800);
  }
}

// ── grain: ONE low-res canvas pass for the whole viewport ───────────────────

interface Grain {
  draw(frame: number): void;
  resize(): void;
}

function makeGrain(cv: HTMLCanvasElement): Grain {
  const g = cv.getContext('2d');
  const rnd = mulberry32(STORM_SEED ^ 0x00611a1); // "grain", squinting
  // four precomputed noise frames, cycled — zero per-frame generation cost
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < 4; f++) {
    const c = document.createElement('canvas');
    c.width = 480;
    c.height = 300;
    const cg = c.getContext('2d');
    if (!cg) continue;
    const img = cg.createImageData(c.width, c.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 60 + Math.floor(rnd() * 170);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    cg.putImageData(img, 0, 0);
    frames.push(c);
  }
  let fi = 0;
  const resize = (): void => {
    cv.width = Math.max(320, Math.floor(window.innerWidth / 2));
    cv.height = Math.max(200, Math.floor(window.innerHeight / 2));
  };
  resize();
  const draw = (frame: number): void => {
    if (!g || frames.length === 0) return;
    if (frame % 3 === 0) fi = (fi + 1) % frames.length;
    g.clearRect(0, 0, cv.width, cv.height);
    g.globalAlpha = 0.055;
    g.imageSmoothingEnabled = false;
    g.drawImage(frames[fi]!, 0, 0, cv.width, cv.height);
  };
  return { draw, resize };
}

// ── the engine ──────────────────────────────────────────────────────────────

interface TermState {
  plan: TerminalPlan;
  el: HTMLElement;
  body: HTMLElement;
  statusEl: HTMLElement | null;
  cursor: number; // next event index
  lastLine: HTMLElement | null;
  parked: boolean;
  live: boolean; // materialized on stage
}

function need<T extends HTMLElement>(el: T | null, what: string): T {
  if (!el) throw new Error(`storm: missing ${what}`);
  return el;
}

export function runStorm(): void {
  const root = need(document.querySelector<HTMLElement>('[data-experience-entry]'), 'root');
  const spawnLayer = need(document.getElementById('storm-spawn'), 'spawn layer');
  const bootEl = need(document.getElementById('storm-boot'), 'boot terminal');
  const bootBody = need(document.getElementById('storm-boot-body'), 'boot body');
  const bootStatus = document.getElementById('storm-boot-status');
  const form = need(document.getElementById('storm-form') as HTMLFormElement | null, 'form');
  const input = need(document.getElementById('storm-input') as HTMLInputElement | null, 'input');
  const chips = need(document.getElementById('storm-chips'), 'chips');
  const countEl = need(document.getElementById('storm-count'), 'HUD counter');
  const soundBtn = need(document.getElementById('storm-sound'), 'sound toggle');
  const grainCv = need(
    document.getElementById('storm-grain') as HTMLCanvasElement | null,
    'grain canvas',
  );
  const finaleEl = need(document.getElementById('storm-finale'), 'finale terminal');
  const finaleBody = need(document.getElementById('storm-finale-body'), 'finale body');
  const finaleActions = need(document.getElementById('storm-finale-actions'), 'finale actions');
  const finaleStatus = document.getElementById('storm-finale-status');
  const transformBtn = need(
    finaleEl.querySelector<HTMLElement>('[data-storm-transform]'),
    'transform trigger',
  );
  const soilEl = need(document.getElementById('storm-soil'), 'soil');
  const landEl = need(document.getElementById('storm-land'), 'land layer');
  const landCanvasEl = need(document.getElementById('storm-land-canvas'), 'land canvas mount');

  const plan = buildStormPlan();
  const finale = buildFinalePlan();
  const audio = new StormAudio();
  const grain = makeGrain(grainCv);

  const terms: TermState[] = plan.terminals.map((tp) => ({
    plan: tp,
    el: bootEl,
    body: bootBody,
    statusEl: tp.id === 0 ? bootStatus : null,
    cursor: 0,
    lastLine: null,
    parked: false,
    live: tp.id === 0,
  }));

  let sent = false;
  let sendT = 0;
  let spawnedCount = 0;
  let parkedCount = 0;
  let peaked = false;
  let halted = false;
  let hiddenAt = -1;
  let frame = 0;
  let raf = 0;

  // — HUD —
  const setCount = (agents: number): void => {
    countEl.textContent = `AGENTS: ${String(agents).padStart(2, '0')}${agents > 1 ? ' ▲' : ''}`;
    countEl.classList.remove('tick');
    void countEl.offsetWidth; // restart the pulse animation
    countEl.classList.add('tick');
  };

  // — terminal DOM —
  const trimLines = (body: HTMLElement): void => {
    while (body.children.length > MAX_LINES && body.firstChild) {
      body.removeChild(body.firstChild);
    }
  };

  const appendLine = (ts: TermState, kind: LineKind, text: string): HTMLElement => {
    const line = document.createElement('div');
    line.className = `term-line k-${kind}`;
    line.textContent = text;
    ts.body.appendChild(line);
    ts.lastLine = line;
    trimLines(ts.body);
    return line;
  };

  const applyEvent = (ts: TermState, ev: TermEvent): void => {
    if (ev.park === true) {
      const line = appendLine(ts, 'demand', `${ev.text} `);
      const cur = document.createElement('span');
      cur.className = 'term-cursor';
      cur.textContent = '▌';
      line.appendChild(cur);
      ts.parked = true;
      parkedCount++;
      ts.el.classList.add('is-parked');
      if (ts.statusEl) ts.statusEl.textContent = 'waiting on you';
      audio.bell(ts.plan.detune);
      return;
    }
    if (ev.nl) appendLine(ts, ev.kind, ev.text);
    else if (ts.lastLine) ts.lastLine.textContent = (ts.lastLine.textContent ?? '') + ev.text;
    audio.tick(ts.plan.detune);
  };

  const materialize = (ts: TermState): void => {
    const tp = ts.plan;
    const el = document.createElement('div');
    el.className = `storm-term ph-${tp.phosphor} is-new`;
    el.style.left = `${tp.x}%`;
    el.style.top = `${tp.y}%`;
    el.style.width = `${tp.w}px`;
    el.style.height = `${tp.h}px`;
    el.style.zIndex = String(tp.z);

    const bar = document.createElement('div');
    bar.className = 'term-bar';
    const dots = document.createElement('span');
    dots.className = 'term-dots';
    dots.textContent = '● ● ●';
    const name = document.createElement('span');
    name.className = 'term-name';
    name.textContent = tp.name;
    const status = document.createElement('span');
    status.className = 'term-status';
    status.textContent = 'running';
    bar.append(dots, name, status);

    const body = document.createElement('div');
    body.className = 'term-body';
    el.append(bar, body);
    spawnLayer.appendChild(el);

    ts.el = el;
    ts.body = body;
    ts.statusEl = status;
    ts.live = true;
    spawnedCount++;
    setCount(1 + spawnedCount);
    audio.blip();
    audio.setIntensity(spawnedCount / Math.max(1, plan.terminals.length - 1));
  };

  // — at peak: a beat of sustained cacophony, then the scene dims and the
  //   root agent's finale terminal powers on above it. Its monologue streams
  //   from the seeded finale plan on the same rAF loop (t is the send clock);
  //   the two option controls appear only after the last line lands. —
  let finaleT0 = 0; // send-clock ms when the finale stream starts
  let finaleCursor = 0;
  let finaleLastLine: HTMLElement | null = null;
  let finaleDone = false;

  const peak = (t: number): void => {
    peaked = true;
    root.classList.add('is-peak');
    finaleEl.hidden = false;
    finaleT0 = t + FINALE_TYPE_DELAY; // let the CRT power-on land first
    audio.blip();
  };

  const applyFinaleEvent = (ev: TermEvent): void => {
    if (ev.nl) {
      const line = document.createElement('div');
      line.className = `term-line k-${ev.kind}`;
      line.textContent = ev.text;
      finaleBody.appendChild(line);
      finaleLastLine = line;
      trimLines(finaleBody);
    } else if (finaleLastLine) {
      finaleLastLine.textContent = (finaleLastLine.textContent ?? '') + ev.text;
    }
    audio.tick(0.5);
  };

  const streamFinale = (t: number): void => {
    const ft = t - finaleT0;
    const evs = finale.events;
    while (finaleCursor < evs.length && evs[finaleCursor]!.at <= ft) {
      applyFinaleEvent(evs[finaleCursor]!);
      finaleCursor++;
    }
    if (finaleCursor >= evs.length && ft >= finale.doneAt + FINALE_ACTIONS_BEAT) {
      finaleDone = true;
      finaleActions.hidden = false;
      finaleEl.classList.add('is-done', 'is-parked');
      if (finaleStatus) finaleStatus.textContent = 'waiting on you';
      audio.bell(0.5);
    }
  };

  // ── the inflection (ADR-0134 §2, ADR-0148 §5): one click transforms the
  //    storm straight into the 2.5D tutorial ──
  //
  // The click is the visitor's second and last gesture: the 2.5D-tutorial module
  // starts loading AT the click (dynamic import('./inflection') — a code-split
  // seam; since ADR-0148 that module is pure SVG/DOM, ZERO WebGL — the ~1.2 MB
  // R3F island is gone from the path entirely), the audio decays rather than
  // cuts, the terminals power off in a stagger, their text fragments drop into
  // the ground as soil, and when the import has resolved AND the settle beat has
  // passed, the calm land fades up carrying the guided walk + the orchestrator's
  // mock-website proposal. No URL change — a transform, not a navigation.

  let transforming = false;
  let islandHandle: { unmount(): void } | null = null;
  let fallLayer: HTMLElement | null = null;
  const transformTimers: number[] = [];

  /** Fall back to the calm view via the existing inline disarm path — the
   *  never-stranded guarantee when the island cannot load. */
  const disarmToCalm = (): void => {
    const exit = document.querySelector<HTMLElement>('[data-storm-disarm]');
    if (exit) exit.click();
    else document.documentElement.classList.remove('storm-armed');
  };

  /** Short phosphor fragments sampled from a terminal's visible lines. */
  const sampleFragments = (ts: TermState, quota: number, rand: () => number): string[] => {
    const words: string[] = [];
    ts.body.querySelectorAll('.term-line').forEach((line) => {
      for (const w of (line.textContent ?? '').split(/\s+/)) {
        const t = w.trim();
        if (t.length >= 2 && t.length <= 16) words.push(t);
      }
    });
    const out: string[] = [];
    while (out.length < quota && words.length > 0) {
      out.push(words.splice(Math.floor(rand() * words.length), 1)[0]!);
    }
    return out;
  };

  const beginTransform = (): void => {
    if (transforming || halted) return;
    transforming = true;

    // 1. the lazy-load starts AT the click — the exhale buys the fetch (the
    //    2.5D tutorial module; pure SVG/DOM since ADR-0148, no WebGL chunk)
    const islandReady = import('./inflection');

    // 2. the scene stops demanding: the stream freezes, the audio decays,
    //    the chrome (grain / HUD) exhales out and the finale terminal joins
    //    the collapse with its own CRT power-off (CSS: .is-transforming)
    cancelAnimationFrame(raf);
    audio.quell();
    root.classList.add('is-transforming');

    // 3. terminals power off in a stagger; their fragments fall as soil
    const rand = mulberry32(STORM_SEED ^ 0x501f); // deterministic choreography jitter
    const live = terms.filter((t) => t.live);
    const layer = document.createElement('div');
    layer.className = 'storm-fall';
    layer.setAttribute('aria-hidden', 'true');
    root.appendChild(layer);
    fallLayer = layer;

    const quota = Math.max(3, Math.floor(FRAG_CAP / Math.max(1, live.length)));
    let spawned = 0;
    let settled = 0;
    const soilTo = (grown: number): void => {
      soilEl.style.transform = `scaleY(${(0.045 + 0.955 * Math.min(1, grown)).toFixed(3)})`;
    };

    live.forEach((ts, i) => {
      const offAt = i * COLLAPSE_STAGGER + Math.round(rand() * 30);
      transformTimers.push(
        window.setTimeout(() => {
          ts.el.classList.remove('is-new');
          ts.el.classList.add('is-off');
        }, offAt),
      );

      const rect = ts.el.getBoundingClientRect();
      const frags = sampleFragments(ts, Math.min(quota, FRAG_CAP - spawned), rand);
      for (const text of frags) {
        spawned++;
        const el = document.createElement('span');
        el.className = `storm-frag ph-${ts.plan.phosphor}`;
        el.textContent = text;
        const sx = rect.left + rand() * rect.width;
        const sy = rect.top + rand() * rect.height * 0.85;
        el.style.left = `${sx.toFixed(1)}px`;
        el.style.top = `${sy.toFixed(1)}px`;
        layer.appendChild(el);
        const settle = (): void => {
          el.remove();
          settled++;
          soilTo(settled / Math.max(1, spawned));
        };
        if (typeof el.animate !== 'function') {
          settle(); // no WAAPI → no fall, but the soil still accumulates
          continue;
        }
        const dy = window.innerHeight - (4 + rand() * 36) - sy;
        const dx = (rand() - 0.5) * 90;
        const rot = (rand() - 0.5) * 70;
        const anim = el.animate(
          [
            { transform: 'translate(0px, 0px) rotate(0deg)', opacity: 1 },
            {
              transform: `translate(${(dx * 0.35).toFixed(1)}px, ${(dy * 0.55).toFixed(1)}px) rotate(${(rot * 0.6).toFixed(1)}deg)`,
              opacity: 0.95,
              offset: 0.55,
            },
            { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`, opacity: 0 },
          ],
          {
            duration: 850 + Math.round(rand() * 700),
            delay: offAt + Math.round(rand() * 260),
            easing: 'cubic-bezier(0.45, 0.05, 0.8, 0.6)',
            fill: 'forwards',
          },
        );
        anim.addEventListener('finish', settle);
        anim.addEventListener('cancel', () => el.remove());
      }
    });

    // 4. the land fades up when the island is ready AND the beat has passed;
    //    if the fetch is slower, the settled soil simply rests — no spinner
    const beat = new Promise<void>((resolve) => {
      transformTimers.push(window.setTimeout(() => resolve(), SETTLE_BEAT));
    });
    void Promise.all([islandReady, beat])
      .then(([mod]) => {
        if (halted) return;
        landEl.hidden = false; // opacity 0 — visible only when .is-resolved lands
        islandHandle = mod.mountForestLand(landCanvasEl);
        // two frames so the canvas mounts and sizes before the fade begins
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (halted) return;
            root.classList.add('is-resolved');
            try {
              landEl.focus({ preventScroll: true });
            } catch {
              landEl.focus();
            }
          });
        });
      })
      .catch((err: unknown) => {
        // 5. never stranded: a failed island load falls back to the calm view
        if (halted) return;
        console.error('storm inflection failed to load — stepping out to the calm view', err);
        disarmToCalm();
      });
  };
  transformBtn.addEventListener('click', beginTransform);

  // — the loop: one rAF drives grain + every stream —
  const loop = (now: number): void => {
    if (halted) return;
    frame++;
    grain.draw(frame);
    if (sent) {
      const t = now - sendT;
      for (const ts of terms) {
        if (!ts.live) {
          if (t >= ts.plan.spawnAt) materialize(ts);
          else continue;
        }
        const evs = ts.plan.events;
        while (ts.cursor < evs.length && evs[ts.cursor]!.at <= t) {
          applyEvent(ts, evs[ts.cursor]!);
          ts.cursor++;
        }
      }
      if (!peaked && parkedCount >= terms.length && t >= plan.peakAt + PEAK_BEAT) peak(t);
      if (peaked && !finaleDone) streamFinale(t);
    }
    raf = requestAnimationFrame(loop);
  };

  // — the send: the visitor's ONE gesture; it also unlocks the audio —
  const send = (text: string): void => {
    if (sent || halted) return;
    sent = true;
    audio.unlock(); // inside the user gesture
    sendT = performance.now();
    // substitute the visitor's words into the thinking line (textContent-only — never HTML)
    for (const ev of terms[0]!.plan.events) {
      if (ev.text.includes('{PROMPT}')) ev.text = ev.text.replace('{PROMPT}', text);
    }
    appendLine(terms[0]!, 'cmd', `~/app $ ${text}`);
    if (terms[0]!.statusEl) terms[0]!.statusEl.textContent = 'running';
    root.classList.add('is-sent');
    input.disabled = true;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (v) send(v);
  });
  chips.querySelectorAll<HTMLButtonElement>('button[data-chip]').forEach((b) => {
    b.addEventListener('click', () => {
      const text = (b.textContent ?? '').trim();
      if (!text) return;
      input.value = text;
      send(text);
    });
  });
  bootEl.addEventListener('click', () => {
    if (!sent && !input.disabled) input.focus();
  });

  // — sound toggle (audio still only ever starts on the send gesture) —
  soundBtn.addEventListener('click', () => {
    const on = soundBtn.getAttribute('aria-pressed') !== 'true';
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.textContent = on ? 'SOUND ON' : 'SOUND OFF';
    audio.setEnabled(on);
  });

  // — background tab: pause the clock and the sound; resume where we left off —
  const onVis = (): void => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = performance.now();
      audio.suspend();
    } else {
      if (hiddenAt > 0 && sent) sendT += performance.now() - hiddenAt;
      hiddenAt = -1;
      audio.resume();
    }
  };
  document.addEventListener('visibilitychange', onVis);
  const onResize = (): void => grain.resize();
  window.addEventListener('resize', onResize);

  // — the halt hook the inline disarm script calls (skip / Esc / the land's
  //   classic-front-page affordance) — also tears the transform down: pending
  //   timers die, the fall layer goes, and a mounted island is unmounted —
  const halt = (): void => {
    if (halted) return;
    halted = true;
    cancelAnimationFrame(raf);
    audio.halt();
    for (const t of transformTimers) window.clearTimeout(t);
    transformTimers.length = 0;
    if (fallLayer) {
      fallLayer.remove();
      fallLayer = null;
    }
    if (islandHandle) {
      try {
        islandHandle.unmount();
      } catch {
        /* the island is torn down with the page state regardless */
      }
      islandHandle = null;
    }
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('resize', onResize);
  };
  (window as unknown as { __stormHalt?: () => void }).__stormHalt = halt;

  raf = requestAnimationFrame(loop);
}
