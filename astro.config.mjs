// @ts-check
import { defineConfig } from 'astro/config';

// storytree-web builds in THREE shapes from this one config, chosen by env/argv:
//
//   1. Public static  — `astro build` (no flag) → here.now. output:'static', NO
//      adapter, NO Keystatic. Byte-identical to the pre-CMS site: the integrations
//      and adapter below load ONLY for dev or the hosted-editor target, so the
//      published static build never sees them.
//   2. Local dev       — `astro dev` / `npm run cms` → localhost. Keystatic in
//      LOCAL storage (edits the working tree, published via npm run publish:content).
//   3. Hosted editor   — `PUBLIC_STORYTREE_WEB_EDITOR=github astro build` → Cloud Run.
//      Adds the @astrojs/node adapter so Keystatic's /api/keystatic/* routes run on
//      demand (the marketing pages still prerender to static HTML); Keystatic uses
//      GITHUB storage — login + commits via the GitHub App (see keystatic.config.ts).
//
// The PUBLIC_ prefix on the editor flag is deliberate: keystatic.config.ts is
// isomorphic (it runs in the server AND the admin-UI bundle), so both sides must
// read the same flag via import.meta.env — a server-only process.env would mismatch.
const isDev = process.argv.includes('dev');
const isEditor = process.env.PUBLIC_STORYTREE_WEB_EDITOR === 'github';
const wantsKeystatic = isDev || isEditor;

/** @type {import('astro').AstroIntegration[]} */
const integrations = [];
if (wantsKeystatic) {
  const [{ default: react }, { default: keystatic }] = await Promise.all([
    import('@astrojs/react'),
    import('@keystatic/astro'),
  ]);
  integrations.push(react(), keystatic());
}

// Node server adapter ONLY for the hosted editor (to serve Keystatic's on-demand
// routes). Imported dynamically so the public/dev builds never load it.
const adapter = isEditor
  ? (await import('@astrojs/node')).default({ mode: 'standalone' })
  : undefined;

export default defineConfig({
  // 'static' in every target: the marketing pages always prerender. When the editor
  // adapter is present, Keystatic's own routes are emitted as on-demand alongside the
  // static pages (Astro's hybrid behaviour) and served by dist/server/entry.mjs.
  output: 'static',
  // "always" for the published static edge; "ignore" whenever Keystatic is mounted
  // (its /api/keystatic/* calls carry no trailing slash and 404 under "always").
  trailingSlash: wantsKeystatic ? 'ignore' : 'always',
  build: {
    // Emit clean per-page directories (about/index.html) for pretty URLs.
    format: 'directory',
  },
  devToolbar: { enabled: false },
  integrations,
  ...(adapter ? { adapter } : {}),
});
