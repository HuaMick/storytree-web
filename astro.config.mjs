// @ts-check
import { defineConfig } from 'astro/config';

// storytree-web — a static, self-contained marketing site.
// No server, no backend, no DB. Builds to ./dist and publishes to here.now.
export default defineConfig({
  output: 'static',
  // Trailing slashes "always" so links work cleanly on here.now's static edge.
  trailingSlash: 'always',
  build: {
    // Emit clean per-page directories (about/index.html) for pretty URLs.
    format: 'directory',
  },
  devToolbar: { enabled: false },
});
