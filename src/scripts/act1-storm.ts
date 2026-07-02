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
  buildStormPlan,
  mulberry32,
  STORM_SEED,
  type LineKind,
  type TermEvent,
  type TerminalPlan,
} from './storm-script';

const MAX_LINES = 16; //   DOM lines kept per terminal (old ones drop)
const PEAK_BEAT = 2600; // ms of parked cacophony before the calm affordance
const MASTER_GAIN = 0.15;

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
  const calmCard = need(document.getElementById('storm-calm'), 'calm affordance');

  const plan = buildStormPlan();
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

  // — at peak: a beat of sustained cacophony, then the scene dims and the one
  //   calm affordance fades in (the transform itself is the NEXT cap) —
  const peak = (): void => {
    peaked = true;
    root.classList.add('is-peak');
    calmCard.hidden = false;
  };

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
      if (!peaked && parkedCount >= terms.length && t >= plan.peakAt + PEAK_BEAT) peak();
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

  // — the halt hook the inline disarm script calls (skip / calm affordance / Esc) —
  const halt = (): void => {
    if (halted) return;
    halted = true;
    cancelAnimationFrame(raf);
    audio.halt();
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('resize', onResize);
  };
  (window as unknown as { __stormHalt?: () => void }).__stormHalt = halt;

  raf = requestAnimationFrame(loop);
}
