// @ts-check
import { defineConfig } from 'astro/config';
// The Act 2 narration/script validator — imported STATICALLY so Astro's esbuild
// config bundling inlines the TS module graph (a dynamic import() survives into
// the bundled temp config and then fails Node's runtime resolution — no .ts
// extension resolution outside the bundler). The CALL stays in the build hook.
import { validateNarration } from './src/scripts/act2-validate';

// One build shape: the public static site (`astro build` → here.now). The Keystatic
// CMS and its hosted-editor build target were retired by the info-pages-triage
// sign-off (2026-07-06): every surviving page is low-churn reference, content lives
// in plain src/data/*.json files, and edits are ordinary file edits + a push.

// The Act 2 narration wall (ADR-0134 §3): `astro build` FAILS when the site-side
// narration copy and the synced director script drift — a beat id without a
// narration entry, an orphaned narration key, or a default script that no longer
// parses against the exported BeatScript zod contract. Astro bundles this config
// with esbuild, so the relative TS import resolves in every build shape; the
// validator only touches the pure director artifact (zod — no React, no three).
/** @type {import('astro').AstroIntegration} */
const act2NarrationWall = {
  name: 'act2-narration-wall',
  hooks: {
    'astro:build:start': () => {
      validateNarration();
    },
  },
};

/** @type {import('astro').AstroIntegration[]} */
const integrations = [act2NarrationWall];

export default defineConfig({
  output: 'static',
  // The inflection island (src/scripts/inflection.tsx + the synced forest-world-r3f
  // .tsx artifact) is plain Vite-compiled JSX — the build deliberately has no
  // @astrojs/react integration. Astro's base tsconfig says `jsx: "preserve"`, under
  // which esbuild falls back to the classic `React.createElement` transform and the
  // chunk throws `React is not defined` at runtime. Force the automatic runtime
  // against react instead.
  vite: {
    esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  },
  trailingSlash: 'always',
  build: {
    // Emit clean per-page directories (about/index.html) for pretty URLs.
    format: 'directory',
  },
  // Discarded info pages (info-pages-triage sign-off, 2026-07-06). Static output
  // emits meta-refresh stubs at the old URLs — here.now has no server redirects,
  // so the stub IS the redirect; inbound links land somewhere sensible, never 404.
  redirects: {
    '/roadmap': '/get-involved/',
    '/landscape': '/how-it-works/',
  },
  devToolbar: { enabled: false },
  integrations,
});
