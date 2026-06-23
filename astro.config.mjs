// @ts-check
import { defineConfig } from 'astro/config';

// storytree-web — a static, self-contained marketing site.
// No server, no backend, no DB. Builds to ./dist and publishes to here.now.
//
// Keystatic (the content editor at /keystatic) runs ONLY in local dev. Its admin
// UI needs server routes + Node APIs, but the here.now deploy is a pure static
// build with no adapter. So we load the react + keystatic integrations only for
// `astro dev`; `astro build` (what deploy.yml runs) imports neither and emits the
// same static site as before this integration existed.
const isDev = process.argv.includes('dev');

/** @type {import('astro').AstroIntegration[]} */
const integrations = [];
if (isDev) {
  const [{ default: react }, { default: keystatic }] = await Promise.all([
    import('@astrojs/react'),
    import('@keystatic/astro'),
  ]);
  integrations.push(react(), keystatic());
}

export default defineConfig({
  output: 'static',
  // "always" in the production build so links work cleanly on here.now's static
  // edge. In dev we relax to "ignore": Keystatic's /api/keystatic/* calls carry no
  // trailing slash and 404 under "always" (the admin form hangs). Dev-only, so the
  // built/published site is unchanged.
  trailingSlash: isDev ? 'ignore' : 'always',
  build: {
    // Emit clean per-page directories (about/index.html) for pretty URLs.
    format: 'directory',
  },
  devToolbar: { enabled: false },
  integrations,
});
