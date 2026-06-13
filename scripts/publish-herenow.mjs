#!/usr/bin/env node
// Publish ./dist to here.now using the 3-step anonymous API:
//   1. POST /api/v1/publish        (declare files -> get presigned PUT urls)
//   2. PUT each presigned url       (upload bytes)
//   3. POST <finalizeUrl>           (go live)
// Anonymous publishes live 24h and return a one-time claimUrl (capture it!).
import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, sep, extname } from 'node:path';

const API = 'https://here.now/api/v1/publish';
const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ROOT = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

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

  const manifest = files.map((f) => ({ path: f.rel, size: f.size, contentType: ctFor(f.rel) }));
  console.log(`Publishing ${manifest.length} files (${(manifest.reduce((a, f) => a + f.size, 0) / 1024).toFixed(0)} KB)…`);

  // Step 1
  const initRes = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-HereNow-Client': 'storytree-web/publish' },
    body: JSON.stringify({
      files: manifest,
      viewer: {
        title: 'storytree — software, built in the open',
        description: 'An experiment in building software out in the open — by people and AI agents at once.',
      },
    }),
  });
  if (!initRes.ok) {
    console.error('publish init failed:', initRes.status, await initRes.text());
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
  process.stdout.write('\n');
  if (init.upload?.skipped?.length) console.log(`  (${init.upload.skipped.length} unchanged, skipped)`);

  // Step 3
  const finRes = await fetch(init.upload.finalizeUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ versionId: init.upload.versionId }),
  });
  if (!finRes.ok) {
    console.error('finalize failed:', finRes.status, await finRes.text());
    process.exit(1);
  }
  const fin = await finRes.json();

  const info = {
    siteUrl: fin.siteUrl ?? init.siteUrl,
    slug: fin.slug ?? init.slug,
    claimUrl: init.claimUrl,
    claimToken: init.claimToken,
    expiresAt: init.expiresAt,
    anonymous: init.anonymous,
    publishedFiles: manifest.length,
  };
  writeFileSync(join(ROOT, 'publish-info.json'), JSON.stringify(info, null, 2));

  console.log('\n──────────────────────────────────────────────');
  console.log('  LIVE:  ' + info.siteUrl);
  if (info.anonymous) {
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
