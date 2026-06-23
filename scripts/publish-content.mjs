#!/usr/bin/env node
// Publish content edits straight to main — the "direct to main" half of the
// edit -> preview -> publish loop. Commits everything and pushes to main, which
// fires deploy.yml (push to main = publish to here.now, live in ~a minute).
//
//   npm run publish:content                 # commit with an auto message + push
//   npm run publish:content -- "new hero"   # commit with your own message + push
//
// Refuses to run off main, so a content publish always lands on the live branch.
import { execSync } from 'node:child_process';

const capture = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const loud = (cmd) => execSync(cmd, { stdio: 'inherit' });

const branch = capture('git rev-parse --abbrev-ref HEAD');
if (branch !== 'main') {
  console.error(
    `✗ You're on "${branch}", not main.\n` +
      '  Content publishing is direct-to-main. Switch first:  git checkout main',
  );
  process.exit(1);
}

const changes = capture('git status --porcelain');
if (!changes) {
  console.log('Nothing to publish — no content changes since the last publish.');
  process.exit(0);
}

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const message = process.argv.slice(2).join(' ').trim() || `content: site update (${stamp})`;

console.log('Publishing:\n' + changes + '\n');
loud('git add -A');
loud(`git commit -m ${JSON.stringify(message)}`);
loud('git push');
console.log('\n✓ Pushed to main. here.now is rebuilding now — your changes go live in about a minute.');
console.log('  Watch it: https://github.com/HuaMick/storytree-web/actions');
