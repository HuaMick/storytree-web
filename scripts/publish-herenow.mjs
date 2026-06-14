#!/usr/bin/env node
// Publish ./dist to here.now. Two modes, auto-selected:
//
//   • UPDATE the live site in place (account API key + known slug):
//       PUT /api/v1/publish/:slug   with `Authorization: Bearer <hnk_…>`
//     This is how the claimed, permanent front-door site gets new content. No new URL.
//
//   • CREATE a throwaway preview (no API key):
//       POST /api/v1/publish        anonymous → a fresh URL, live 24h, with a one-time claimUrl.
//
// Both modes use the same 3 steps: declare files → upload to presigned URLs → finalize.
//
// Credentials & target (env wins, then on-disk):
//   HERENOW_API_KEY   account key (hnk_…); else ~/.herenow/credentials  (JSON {apiKey|token|key} or raw)
//   HERENOW_SLUG      the site slug to update; else the `slug` saved in publish-info.json by a prior run
// With a key but no slug, an authenticated POST creates a NEW account-owned permanent site (slug saved).
import { readFileSync, writeFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep, extname } from 'node:path';
import { homedir } from 'node:os';

const ORIGIN = 'https://here.now';
const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ROOT = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const INFO = join(ROOT, 'publish-info.json');

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

// API key: env first, then here.now's conventional ~/.herenow/credentials.
function readApiKey() {
  if (process.env.HERENOW_API_KEY) return process.env.HERENOW_API_KEY.trim();
  const cred = join(homedir(), '.herenow', 'credentials');
  if (existsSync(cred)) {
    const raw = readFileSync(cred, 'utf8').trim();
    try {
      const j = JSON.parse(raw);
      const k = j.apiKey ?? j.token ?? j.key ?? '';
      return String(k).trim() || null;
    } catch {
      return raw || null;
    }
  }
  return null;
}

// Slug of the site to update: env first, then the one a prior run saved.
function readSlug() {
  if (process.env.HERENOW_SLUG) return process.env.HERENOW_SLUG.trim();
  if (existsSync(INFO)) {
    try {
      return JSON.parse(readFileSync(INFO, 'utf8')).slug ?? null;
    } catch {
      /* ignore a malformed info file */
    }
  }
  return null;
}

async function main() {
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

  const apiKey = readApiKey();
  const slug = readSlug();
  const update = Boolean(apiKey && slug); // PUT in place vs POST a new site
  const authHeaders = apiKey ? { authorization: `Bearer ${apiKey}` } : {};

  const initUrl = update ? `${ORIGIN}/api/v1/publish/${encodeURIComponent(slug)}` : `${ORIGIN}/api/v1/publish`;
  const method = update ? 'PUT' : 'POST';

  if (update) console.log(`Updating live site "${slug}" in place (authenticated)…`);
  else if (apiKey) console.log('Creating a new account-owned permanent site (authenticated)…');
  else console.log('Publishing a new anonymous site (live 24h — set HERENOW_API_KEY + HERENOW_SLUG to update the real one)…');

  const manifest = files.map((f) => ({ path: f.rel, size: f.size, contentType: ctFor(f.rel) }));
  console.log(`  ${manifest.length} files (${(manifest.reduce((a, f) => a + f.size, 0) / 1024).toFixed(0)} KB)…`);

  // Step 1 — declare files, get presigned upload targets
  const initRes = await fetch(initUrl, {
    method,
    headers: {
      'content-type': 'application/json',
      'X-HereNow-Client': 'storytree-web/publish',
      ...authHeaders,
    },
    body: JSON.stringify({
      files: manifest,
      viewer: {
        title: 'storytree — software, built in the open',
        description: 'An experiment in building software out in the open — by people and AI agents at once.',
      },
    }),
  });
  if (!initRes.ok) {
    const body = await initRes.text();
    if (initRes.status === 401 || initRes.status === 403) {
      console.error(`publish ${method} unauthorized (${initRes.status}). The API key is missing, wrong, or lacks rights to "${slug}".`);
      console.error('Get a key at https://here.now/dashboard and export HERENOW_API_KEY (+ HERENOW_SLUG for the site).');
    } else if (initRes.status === 404 && update) {
      console.error(`site "${slug}" not found (404) — check HERENOW_SLUG / publish-info.json.`);
    } else {
      console.error(`publish init failed:`, initRes.status, body);
    }
    process.exit(1);
  }
  const init = await initRes.json();
  const uploads = init.upload?.uploads ?? [];
  const byPath = new Map(files.map((f) => [f.rel, f.abs]));

  // Step 2 — upload in small concurrent batches
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
  if (uploads.length) process.stdout.write('\n');
  if (init.upload?.skipped?.length) console.log(`  (${init.upload.skipped.length} unchanged, skipped)`);

  // Step 3 — finalize (authenticated for owned sites)
  const finRes = await fetch(init.upload.finalizeUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders },
    body: JSON.stringify({ versionId: init.upload.versionId }),
  });
  if (!finRes.ok) {
    console.error('finalize failed:', finRes.status, await finRes.text());
    process.exit(1);
  }
  const fin = await finRes.json();

  const info = {
    siteUrl: fin.siteUrl ?? init.siteUrl,
    slug: fin.slug ?? init.slug ?? slug,
    mode: update ? 'update' : apiKey ? 'create-owned' : 'create-anonymous',
    claimUrl: init.claimUrl,
    claimToken: init.claimToken,
    expiresAt: init.expiresAt,
    anonymous: init.anonymous ?? !apiKey,
    publishedFiles: manifest.length,
  };
  writeFileSync(INFO, JSON.stringify(info, null, 2));

  console.log('\n──────────────────────────────────────────────');
  console.log('  LIVE:  ' + info.siteUrl);
  if (info.anonymous) {
    console.log('  Expires (anonymous, 24h): ' + info.expiresAt);
    console.log('  CLAIM (make permanent, one-time link):');
    console.log('  ' + info.claimUrl);
  } else {
    console.log(`  Updated in place — same URL, no claim needed (slug: ${info.slug}).`);
  }
  console.log('──────────────────────────────────────────────');
  console.log('  (details saved to publish-info.json — gitignored)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
