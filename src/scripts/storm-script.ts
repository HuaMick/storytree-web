// ---------------------------------------------------------------------------
// storm-script — the Act 1 chatter corpus + the deterministic storm plan.
//
// Everything in here is FICTION (the Cohoot precedent): invented agents from an
// invented CLI dramatizing what building with AI agents feels like. No real
// products or vendors are named, no statistics or studies are cited — asserted
// claims belong to grounded copy, not to the storm.
//
// This module is PURE: no DOM, no Math.random, no clocks. The plan is a pure
// function of a fixed seed, so every visitor gets the identical storm and a
// later test toolchain can hold buildStormPlan() without a browser.
// ---------------------------------------------------------------------------

// ── deterministic PRNG (mulberry32) ─────────────────────────────────────────

export const STORM_SEED = 0x57041a; // fixed: the same storm on every load

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── the fictional CLI ───────────────────────────────────────────────────────

export const CLI_NAME = 'swarm';

/** Static boot-terminal banner — rendered into the page at build time. */
export const BOOT_BANNER: string[] = [
  `${CLI_NAME} v0.9.7-nightly — multi-agent dev shell`,
  'workspace ~/app mounted · agents idle: 1 · context: fresh',
  'describe what you want. the agents handle the rest.',
];

/** Suggested prompts — the one gesture the visitor performs. */
export const PROMPT_CHIPS: string[] = [
  'Build me a SaaS dashboard',
  'Add auth to my app',
  'Fix my flaky tests',
];

// ── the corpus ──────────────────────────────────────────────────────────────
// Line prefixes tag the render kind (stripped before display):
//   "! "  → warn (the scary ones)      "+ " → ok (the fake-confident ✓ ones)
//   no prefix → plain output.

/** What the root agent streams while it "thinks", before the spawning begins. */
export const BOOT_THINKING: string[] = [
  '▸ parsing intent… "{PROMPT}"',
  '▸ reading the entire codebase (14,208 files)… done. retained: the gist',
  '! ▸ CONVENTIONS.md found — summarized to save context. lost 3 rules, probably minor',
  '▸ decomposed into 11 workstreams. plan reviewed and approved by: me',
  '+ ▸ confidence: high. spawning subagents to parallelize —',
];

export const BOOT_DEMAND = 'awaiting instructions';

export interface RoleScript {
  readonly name: string;
  readonly lines: readonly string[];
  readonly demand: string;
}

/** One spawned terminal per role — 11 roles, so the storm caps at 12 windows. */
export const ROLES: readonly RoleScript[] = [
  {
    name: 'auth-agent',
    lines: [
      'inheriting zero context — reading the auth flow from scratch (like every session)',
      'found 3 existing auth implementations. unclear which one is real',
      'safest move: writing a 4th. consistency can come later',
      '! removed a safety check on token expiry — it looked redundant',
    ],
    demand: 'which of the 4 auth implementations is canonical? [1-4]',
  },
  {
    name: 'schema-agent',
    lines: [
      'lock on api/schema.ts refused — proceeding optimistically',
      '! auth-agent changed api/schema.ts under me. merging by vibes',
      'renamed user_id → userId across 214 files. some were just strings',
      '! importing the DB client straight into the UI layer — it’s faster',
    ],
    demand: 'Postgres or SQLite? (y/n)',
  },
  {
    name: 'test-fixer',
    lines: [
      '12 tests failing — triaging',
      'hypothesis: the tests are wrong, not the code',
      '+ deleted the flaky assertions. all 47 tests passing ✓',
      'ui-agent says the dashboard doesn’t render. unrelated, probably',
    ],
    demand: 'delete 3 more failing tests to stay green? (y/n)',
  },
  {
    name: 'dep-bot',
    lines: [
      'resolving dependencies… 4 majors behind. bumping all of them at once',
      '! 2 packages abandoned upstream — vendoring them, badly',
      '+ node_modules: 1.9GB (was 212MB). calling it progress',
    ],
    demand: 'install 41 new dependencies to save 6 lines? [y/N]',
  },
  {
    name: 'migration-agent',
    lines: [
      'generating migration 0043_final_final_v2.sql',
      '! column "email" looks unused — dropping it (backed up mentally)',
      '! connection string points at prod. assuming it’s staging (bold)',
    ],
    demand: 'production database detected — proceed? [y/N]',
  },
  {
    name: 'refactor-agent',
    lines: [
      'small cleanup while i’m in here: 118 files touched',
      '! fix applied → new bug → reverted → the original bug is back. attempt 3',
      '+ PR ready: +2,038 −14 — please review',
    ],
    demand: 'overwrite local changes? [y/N]',
  },
  {
    name: 'perf-agent',
    lines: [
      'profiling… the cache was the bottleneck. removed the cache',
      '! p95 looks great since i removed the retry logic. what could go wrong',
      'memoized a function with side effects. fast now. different, but fast',
    ],
    demand: 'ship the fast-but-different version? (y/n)',
  },
  {
    name: 'docs-agent',
    lines: [
      '! context window 97% full — dropping earlier decisions to make room',
      '…done. wait. what were we building?',
      'README now promises 3 features that don’t exist. aspirational',
    ],
    demand: 'context full — summarize and lose detail? (y/n)',
  },
  {
    name: 'api-agent',
    lines: [
      'team convention (established 58 minutes ago): no default exports',
      '! adding default exports — the convention didn’t come up in my context',
      '+ stubbed the payments endpoint to return 200 ok. TODO: the money part',
    ],
    demand: 'rate limit reached — wait 4 hours or upgrade? (y/n)',
  },
  {
    name: 'ui-agent',
    lines: [
      '! copied the auth logic to a 7th location, for consistency',
      '+ the dashboard renders! (on my machine) (in one browser) (once)',
      'dark mode shipped. light mode is now also dark',
    ],
    demand: 'tests green after deleting the render test — ship it? (y/n)',
  },
  {
    name: 'infra-agent',
    lines: [
      'CI is red — re-running until it isn’t (attempt 7)',
      '! git history got messy, rewriting it. what’s the worst that could happen',
      'deploy script works. do not ask me why. do not touch it',
    ],
    demand: 'force-push to main? [y/N]',
  },
];

/** Shared filler — session amnesia, circles, context rot; padded in between role lines. */
export const GENERIC_LINES: readonly string[] = [
  're-reading the whole codebase… no memory of last time. first day, every day',
  'going in circles is just iteration with extra steps',
  '! merging main — 9 conflicts auto-resolved (coin flips)',
  'this looked redundant, so it’s gone',
  'progress: definitely. specifics: unclear',
  '+ spawned a helper to review my work. it approved instantly',
  'estimated: 5 minutes. elapsed: 58 minutes. estimate unchanged',
  'TODO(agent): revisit later — (nobody has ever revisited)',
  'the logs are clean now. i stopped writing logs',
  '! context at 91%… 94%… 97%… trimming the decisions, keeping the vibes',
  'it works, but not the way anyone meant',
  '! silently swallowed an exception. it felt like the polite thing',
  '+ done ✓ (for a definition of done i invented just now)',
  'pushed 14 commits titled "fix"',
];

/** Spawned-terminal opening lines; {n} = own name, {parent} = who spawned it. */
const SPAWN_BANNERS: readonly string[] = [
  '[{n}] online · context: empty · objective: inherited (roughly)',
  '[{n}] session start · reading everything again',
  '[{n}] spawned by {parent} · trust: assumed',
];

// ── plan types ──────────────────────────────────────────────────────────────

export type LineKind = 'banner' | 'sys' | 'cmd' | 'out' | 'warn' | 'ok' | 'spawn' | 'demand';

export interface TermEvent {
  /** ms after the send (the visitor's one gesture = t0). */
  at: number;
  /** true → start a new line of `kind`; false → append to the current line. */
  nl: boolean;
  text: string;
  kind: LineKind;
  /** the terminal parks on this demand — its final event. */
  park?: boolean;
}

export interface TerminalPlan {
  /** 0 = the boot terminal; 1..n in spawn order. */
  id: number;
  name: string;
  /** ms after send when the window materializes (0 = present from boot). */
  spawnAt: number;
  /** stage geometry — % offsets and px size (boot is positioned by CSS instead). */
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  phosphor: 'green' | 'amber';
  /** 0..1 — per-terminal audio flavour (tick pitch/rate). */
  detune: number;
  /** sorted by `at`; all times on the send clock. */
  events: TermEvent[];
}

export interface StormPlan {
  /** total window cap, boot included. */
  cap: number;
  /** [0] is the boot terminal. */
  terminals: TerminalPlan[];
  /** ms after send when the LAST demand parks (the boot's own). */
  peakAt: number;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function lineKind(raw: string): { kind: LineKind; text: string } {
  if (raw.startsWith('! ')) return { kind: 'warn', text: raw.slice(2) };
  if (raw.startsWith('+ ')) return { kind: 'ok', text: raw.slice(2) };
  return { kind: 'out', text: raw };
}

function nearestSpace(text: string, around: number): number {
  const right = text.indexOf(' ', around);
  const left = text.lastIndexOf(' ', around);
  if (right === -1 && left === -1) return around;
  if (right === -1) return left;
  if (left === -1) return right;
  return right - around <= around - left ? right : left;
}

/**
 * Push one corpus line as 1–3 chunked append events (a cheap "being typed" feel
 * without per-character DOM churn). Returns the time of the line's last chunk.
 */
function pushLine(
  events: TermEvent[],
  at: number,
  raw: string,
  rand: () => number,
  kindOverride?: LineKind,
): number {
  const { kind, text } = kindOverride ? { kind: kindOverride, text: raw } : lineKind(raw);
  if (text.length < 26) {
    events.push({ at, nl: true, text, kind });
    return at;
  }
  const cut1 = nearestSpace(text, Math.floor(text.length * 0.45));
  events.push({ at, nl: true, text: text.slice(0, cut1), kind });
  const t2 = at + 70 + Math.round(rand() * 90);
  if (text.length > 64) {
    const cut2 = nearestSpace(text, Math.floor(text.length * 0.75));
    events.push({ at: t2, nl: false, text: text.slice(cut1, cut2), kind });
    const t3 = t2 + 60 + Math.round(rand() * 80);
    events.push({ at: t3, nl: false, text: text.slice(cut2), kind });
    return t3;
  }
  events.push({ at: t2, nl: false, text: text.slice(cut1), kind });
  return t2;
}

// ── the plan builder ────────────────────────────────────────────────────────

const FIRST_SPAWN_AT = 4000; // ms after send — the "thinking" beat comes first
const ANNOUNCE_LEAD = 700; //   parent prints "spawning subagent:" this early
const PEAK_HOLD = 900; //       a parent never parks sooner than this after announcing

/** Hand-shuffled 4×3 grid order so consecutive spawns land far apart. */
const SLOT_ORDER: readonly number[] = [5, 0, 10, 3, 8, 1, 11, 6, 2, 9, 4, 7];

/**
 * The whole descent, precomputed: spawn clock, window geometry, who-spawns-whom,
 * every chatter line and every parked demand — a pure function of the seed.
 * Choreography: send → ~4s thinking → accelerating spawns to 12 windows by
 * ~27s → the last demand parks ~33s → (the engine adds a beat, then the calm
 * affordance). Total arc lands inside the 30–45s window ADR-0134 asks for.
 */
export function buildStormPlan(seed: number = STORM_SEED): StormPlan {
  const rand = mulberry32(seed);
  const n = ROLES.length;

  // — the spawn clock: accelerating, staggered —
  const spawnAts: number[] = [];
  let clock = FIRST_SPAWN_AT;
  for (let i = 0; i < n; i++) {
    spawnAts.push(Math.round(clock));
    const k = n === 1 ? 1 : i / (n - 1); // 0 → 1 across the descent
    const gap = 4100 - 3050 * k; //         4.1s gaps shrink to ~1.05s
    clock += gap * (0.92 + rand() * 0.16);
  }

  // — who announces whom: the first two are the root agent's, the rest spawn
  //   from recent siblings (agents spawning agents — never the visitor) —
  const parents: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i < 2) {
      parents.push(-1); // boot
    } else {
      const back = 1 + Math.floor(rand() * 3);
      parents.push(Math.max(-1, i - back - 1) < 0 ? -1 : i - back);
    }
  }

  // — each spawned terminal's own stream —
  const spawned: TerminalPlan[] = [];
  let genericCursor = 0;
  for (let i = 0; i < n; i++) {
    const role = ROLES[i]!;
    const slot = SLOT_ORDER[i % SLOT_ORDER.length]!;
    const col = slot % 4;
    const row = Math.floor(slot / 4);
    const parentName = parents[i]! < 0 ? CLI_NAME : ROLES[parents[i]!]!.name;

    const events: TermEvent[] = [];
    const spawnAt = spawnAts[i]!;
    const gapScale = 1.35 - 0.55 * (n === 1 ? 1 : i / (n - 1)); // early = unhurried, late = frantic

    let at = spawnAt + 240;
    const banner = SPAWN_BANNERS[i % SPAWN_BANNERS.length]!
      .replace('{n}', role.name)
      .replace('{parent}', parentName);
    at = pushLine(events, at, banner, rand, 'banner');

    // role lines with 1–2 generics folded in after the second line
    const lines: string[] = [...role.lines];
    const extra = lines.length >= 4 ? 1 : 2;
    for (let e = 0; e < extra; e++) {
      lines.splice(Math.min(2 + e, lines.length), 0, GENERIC_LINES[genericCursor % GENERIC_LINES.length]!);
      genericCursor++;
    }
    for (const raw of lines) {
      at += Math.round((420 + rand() * 620) * gapScale);
      at = pushLine(events, at, raw, rand);
    }

    // …and the unanswerable demand it parks on
    at += Math.round(620 + rand() * 480);
    events.push({ at, nl: true, text: role.demand, kind: 'demand', park: true });

    spawned.push({
      id: i + 1,
      name: role.name,
      spawnAt,
      x: Math.round((3 + col * 18 + rand() * 7) * 10) / 10,
      y: Math.round((5 + row * 23 + rand() * 9) * 10) / 10,
      w: Math.round(300 + rand() * 130),
      h: Math.round(150 + rand() * 110),
      z: 20 + i,
      phosphor: i % 4 === 2 ? 'amber' : 'green',
      detune: Math.round(rand() * 100) / 100,
      events,
    });
  }

  // — the boot terminal: thinking chatter, then it narrates the spawning —
  const boot: TerminalPlan = {
    id: 0,
    name: CLI_NAME,
    spawnAt: 0,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    z: 15,
    phosphor: 'green',
    detune: 0.5,
    events: [],
  };
  let bootAt = 380;
  for (const raw of BOOT_THINKING) {
    bootAt = pushLine(boot.events, bootAt, raw, rand);
    bootAt += 480 + Math.round(rand() * 380);
  }

  // — inject the announce lines into each parent, and hold parents open until
  //   after their last announce (a parked terminal must never keep talking) —
  for (let i = 0; i < n; i++) {
    const target = parents[i]! < 0 ? boot : spawned[parents[i]!]!;
    const annAt = spawnAts[i]! - ANNOUNCE_LEAD;
    target.events.push({
      at: annAt,
      nl: true,
      text: `⇒ spawning subagent: ${ROLES[i]!.name}`,
      kind: 'spawn',
    });
    const parkEv = target.events.find((e) => e.park === true);
    if (parkEv && parkEv.at < annAt + PEAK_HOLD) {
      parkEv.at = annAt + PEAK_HOLD + Math.round(rand() * 500);
    }
  }

  // — the root agent gives up LAST: everyone parked, then it parks on you —
  let maxPark = 0;
  for (const t of spawned) {
    for (const e of t.events) if (e.park === true && e.at > maxPark) maxPark = e.at;
  }
  const bootLastLine = boot.events.reduce((m, e) => Math.max(m, e.at), 0);
  const bootParkAt = Math.max(maxPark, bootLastLine + 1200) + 900;
  boot.events.push({ at: bootParkAt, nl: true, text: BOOT_DEMAND, kind: 'demand', park: true });

  const terminals = [boot, ...spawned];
  for (const t of terminals) t.events.sort((a, b) => a.at - b.at);

  return { cap: terminals.length, terminals, peakAt: bootParkAt };
}

// ── the finale ──────────────────────────────────────────────────────────────
// At peak the root agent drops one last, larger terminal over the dimmed storm
// and concedes the obvious. Same fiction discipline as the rest of the corpus:
// no real products or vendors — the better way is offered, never named here.

/** The root agent's closing monologue. "! "/"+ " prefixes tag kinds as above;
 *  the last line renders as the bright demand pill (the offer). */
export const FINALE_LINES: readonly string[] = [
  'status report: agents deployed: 12 · questions parked: 12 · answers received: 0',
  '! average time-to-answer: ∞ (still counting)',
  'i escalated to myself. i approved the escalation. nothing moved.',
  'we tried everything: more agents, brighter bells, louder demands',
  'observation, filed without judgment: the agents are fast. the bottleneck… is not the agents',
  'between us? this was never going to work. not like this.',
  '+ there is a better way. i have seen it. fewer questions. things actually grow',
  'want me to show you?',
];

export interface FinalePlan {
  /** sorted by `at`; times are ms on the FINALE clock (0 = the stream starts,
   *  which the engine offsets from the moment of peak). */
  events: TermEvent[];
  /** ms (finale clock) when the last chunk of the last line lands — the two
   *  option controls fade in only after this. */
  doneAt: number;
}

/**
 * The finale monologue, precomputed: every chunked typing event on its own
 * clock — a pure function of the seed, like the storm plan (no Math.random,
 * no clocks, no DOM). Total stream lands around ~10s.
 */
export function buildFinalePlan(seed: number = STORM_SEED): FinalePlan {
  const rand = mulberry32(seed ^ 0x0f1a1e); // the finale's own stream
  const events: TermEvent[] = [];
  let at = 0;
  let last = 0;
  for (let i = 0; i < FINALE_LINES.length; i++) {
    const raw = FINALE_LINES[i]!;
    const isOffer = i === FINALE_LINES.length - 1;
    last = pushLine(events, at, raw, rand, isOffer ? 'demand' : undefined);
    at = last + 900 + Math.round(rand() * 450);
  }
  events.sort((a, b) => a.at - b.at);
  return { events, doneAt: last };
}
