#!/usr/bin/env node
// Publish ./dist to here.now. Two modes, auto-selected by whether a token is present:
//
//   ANONYMOUS (no token) — the local/preview flow:
//     1. POST /api/v1/publish          (declare files -> get presigned PUT urls)
//     2. PUT each presigned url         (upload bytes)
//     3. POST <finalizeUrl>             (go live)
//   Anonymous publishes live 24h and return a one-time claimUrl (capture it!).
//
//   AUTHENTICATED (HERENOW_TOKEN set) — the CI / permanent-site flow:
//     1. PUT  /api/v1/publish/<slug>            (Bearer auth, declare files)
//     2. PUT each presigned url                 (upload bytes)
//     3. POST /api/v1/publish/<slug>/finalize   (Bearer auth, go live)
//   Updates the existing, claimed, permanent Site in place — the URL never changes
//   and never expires. The slug is public (it's in the URL) and is read from
//   $HERENOW_SLUG or the committed herenow.json. The token is secret — pass it via
//   the HERENOW_TOKEN env var (a GitHub Actions secret in CI), never commit it.
import { readFileSync, writeFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep, extname } from 'node:path';

const API_ROOT = process.env.HERENOW_API ?? 'https://here.now';
const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ROOT = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const TOKEN = (process.env.HERENOW_TOKEN ?? '').trim();
const AUTHED = TOKEN.length > 0;

// The canonical Site slug (public): env wins, else herenow.json at the repo root.
function readSlug() {
  if (process.env.HERENOW_SLUG) return process.env.HERENOW_SLUG.trim();
  const cfgPath = join(ROOT, 'herenow.json');
  if (existsSync(cfgPath)) {
    try {
      const slug = JSON.parse(readFileSync(cfgPath, 'utf8')).slug;
      if (typeof slug === 'string' && slug.trim()) return slug.trim();
    } catch {
      /* fall through to the error below */
    }
  }
  return '';
}
const SLUG = readSlug();

const CT = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};
const ctFor = (p) => CT[extname(p).toLowerCase()] ?? 'application/octet-stream';

function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, base, out);
    else out.push({ abs: full, rel: relative(base, full).split(sep).join('/'), size: s.size });
  }
  return out;
}

const jsonHeaders = () => ({
  'content-type': 'application/json',
  'X-HereNow-Client': 'storytree-web/publish',
  ...(AUTHED ? { authorization: `Bearer ${TOKEN}` } : {}),
});

async function main() {
  if (AUTHED && !SLUG) {
    console.error(
      'HERENOW_TOKEN is set (authenticated mode) but no Site slug is configured.\n' +
        'Set $HERENOW_SLUG or add { "slug": "<your-site>" } to herenow.json.',
    );
    process.exit(1);
  }

  let files;
  try {
    files = walk(DIST);
  } catch {
    console.error('No ./dist found. Run `npm run build` first.');
    process.exit(1);
  }
  if (!files.length) {
    console.error('dist/ is empty.');
    process.exit(1);
  }
  // Guard: the Site Data manifest must ship at the site root.
  if (!files.some((f) => f.rel === '.herenow/data.json')) {
    console.warn('⚠  .herenow/data.json not found in dist — contact form storage will be inert.');
  }

  const manifest = files.map((f) => ({ path: f.rel, size: f.size, contentType: ctFor(f.rel) }));
  const kb = (manifest.reduce((a, f) => a + f.size, 0) / 1024).toFixed(0);
  console.log(
    AUTHED
      ? `Updating "${SLUG}" — ${manifest.length} files (${kb} KB), authenticated…`
      : `Publishing ${manifest.length} files (${kb} KB), anonymous (24h preview)…`,
  );

  // Step 1 — declare files. POST creates an anonymous Site; PUT updates the owned one.
  const initUrl = AUTHED ? `${API_ROOT}/api/v1/publish/${SLUG}` : `${API_ROOT}/api/v1/publish`;
  const initRes = await fetch(initUrl, {
    method: AUTHED ? 'PUT' : 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      files: manifest,
      viewer: {
        title: 'storytree — software you can watch grow',
        description: 'For people building with AI agents: a live map of your system, a library where intent is decided, and a harness that holds the agents to it.',
      },
    }),
  });
  if (!initRes.ok) {
    console.error(`publish ${AUTHED ? 'update' : 'init'} failed:`, initRes.status, await initRes.text());
    process.exit(1);
  }
  const init = await initRes.json();
  const uploads = init.upload?.uploads ?? [];
  const byPath = new Map(files.map((f) => [f.rel, f.abs]));

  // Step 2 — upload bytes to the presigned URLs (these are storage URLs; no Bearer).
  let done = 0;
  const queue = [...uploads];
  const worker = async () => {
    while (queue.length) {
      const u = queue.shift();
      const abs = byPath.get(u.path);
      if (!abs) continue;
      const body = readFileSync(abs);
      const put = await fetch(u.url, { method: u.method ?? 'PUT', headers: u.headers ?? {}, body });
      if (!put.ok) {
        console.error(`upload failed for ${u.path}:`, put.status, await put.text());
        process.exit(1);
      }
      done++;
      process.stdout.write(`\r  uploaded ${done}/${uploads.length}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, uploads.length) }, worker));
  process.stdout.write('\n');
  if (init.upload?.skipped?.length) console.log(`  (${init.upload.skipped.length} unchanged, skipped)`);

  // Step 3 — finalize. Use the documented API endpoint when authenticated (so the
  // Bearer token applies); use the presigned finalizeUrl the API handed us when anonymous.
  const finalizeUrl = AUTHED ? `${API_ROOT}/api/v1/publish/${SLUG}/finalize` : init.upload.finalizeUrl;
  const finRes = await fetch(finalizeUrl, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ versionId: init.upload.versionId }),
  });
  if (!finRes.ok) {
    console.error('finalize failed:', finRes.status, await finRes.text());
    process.exit(1);
  }
  const fin = await finRes.json();

  const info = {
    siteUrl: fin.siteUrl ?? init.siteUrl,
    slug: fin.slug ?? init.slug ?? SLUG,
    versionId: fin.currentVersionId ?? init.upload?.versionId,
    authenticated: AUTHED,
    claimUrl: init.claimUrl,
    claimToken: init.claimToken,
    expiresAt: init.expiresAt,
    anonymous: init.anonymous ?? !AUTHED,
    publishedFiles: manifest.length,
  };
  writeFileSync(join(ROOT, 'publish-info.json'), JSON.stringify(info, null, 2));

  console.log('\n──────────────────────────────────────────────');
  console.log('  LIVE:  ' + info.siteUrl);
  if (AUTHED) {
    console.log('  Mode:  authenticated update (permanent, slug "' + info.slug + '")');
  } else if (info.anonymous) {
    console.log('  Expires (anonymous, 24h): ' + info.expiresAt);
    console.log('  CLAIM (make permanent, one-time link):');
    console.log('  ' + info.claimUrl);
  }
  console.log('──────────────────────────────────────────────');
  console.log('  (details saved to publish-info.json — gitignored)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
