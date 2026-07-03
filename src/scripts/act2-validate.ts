// ---------------------------------------------------------------------------
// act2-validate — the build-time wall between the site's narration copy and the
// synced director script (ADR-0134 §3).
//
// Wired into astro.config.mjs as an inline integration: `astro build` FAILS
// when (a) the synced default script no longer parses against the exported
// `BeatScript` zod contract, or (b) the narration map and the script's beat ids
// drift (a beat without a voice, or a voice without a beat). Copy can be
// rewritten freely without touching the proven engine — this wall only holds
// the KEYS honest.
//
// Imports the @generated director artifact (pure zod, no React/three), so this
// module is safe to load from the Astro config's node process. It is never in
// the entry page's static import closure (the WebGL wall walks pages, not the
// config).
// ---------------------------------------------------------------------------

import { BeatScript, defaultScript } from '../lib/forest-world-r3f/act2-director';
import { DONE_KEY, NARRATION } from './act2-narration';

/**
 * Parse the default script against the director's exported contract, then
 * assert EXACT narration coverage: every beat id has a narration entry, and
 * every narration key matches a beat id (plus the one `done` CTA entry).
 * Throws with a message naming the missing / orphaned key(s).
 */
export function validateNarration(): void {
  // (a) the script itself honours the exported zod contract (a green-without-
  // signedProof limb, an unknown delta kind, etc. all refuse loudly here).
  const script = BeatScript.parse(defaultScript);

  const beatIds = script.map((beat) => beat.id);
  const narrationKeys = Object.keys(NARRATION);

  // (b) exact coverage, both directions.
  const missing = beatIds.filter((id) => !(id in NARRATION));
  if (!narrationKeys.includes(DONE_KEY)) missing.push(DONE_KEY);

  const known = new Set<string>([...beatIds, DONE_KEY]);
  const orphans = narrationKeys.filter((key) => !known.has(key));

  if (missing.length > 0 || orphans.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) {
      parts.push(`missing narration for beat id(s): ${missing.join(', ')}`);
    }
    if (orphans.length > 0) {
      parts.push(`orphan narration key(s) with no beat in the script: ${orphans.join(', ')}`);
    }
    throw new Error(
      `act2 narration/script drift — ${parts.join('; ')}. ` +
        `The narration map (src/scripts/act2-narration.ts) must cover exactly the beat ids ` +
        `of the synced default script (src/lib/forest-world-r3f/act2-director.ts) plus '${DONE_KEY}'.`,
    );
  }
}
