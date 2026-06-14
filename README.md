# storytree-web

The public front door for **storytree** — an experiment in building software out in the open,
by people and AI agents at once, and staying fair and trustworthy *because* of that openness.

This repo is just the website. It's a static site with no backend, no database, and no connection
to storytree's internals — the product itself lives elsewhere and is invite-only for now.

## Pages

- **Home** — the pitch: software you can watch grow.
- **How it works** — the explainer: the living story-tree map, the review gates ("nothing ships
  without proof"), building in parallel by people and AI agents, and the open-record trust model.
  Includes an interactive demo of the story-tree map, driven by *fictional* example data.
- **Constitution** — what storytree commits to, and how it plans to keep itself honest.
- **Front door** — a way to reach out.

## Stack

- [Astro](https://astro.build) — static output, no runtime server.
- Hosted on [here.now](https://here.now) (static edge hosting).
- Hand-authored SVG for the illustrations and the story-tree demo. No private source is vendored;
  the visual language is original to this repo.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run build      # -> ./dist (static)
npm run preview    # serve the build
```

## Publish

```bash
npm run build
npm run publish:here   # publishes ./dist to here.now
```

The publish script ([`scripts/publish-herenow.mjs`](scripts/publish-herenow.mjs)) has two modes,
chosen automatically by whether `HERENOW_TOKEN` is set:

- **Anonymous** (no token) — a 24h preview. Prints the live URL and a one-time **claim link**.
  Claiming a site makes it permanent **and** activates the contact form's storage (see below).
- **Authenticated** (`HERENOW_TOKEN` set) — updates the one permanent, claimed Site **in place**.
  The URL never changes and never expires. The Site slug is public and lives in
  [`herenow.json`](herenow.json); the token is secret and is read from the environment.

## Continuous deploy

Every push to `main` rebuilds the site and updates the canonical Site automatically
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). There is exactly **one** live URL,
and it always reflects `main`.

**One-time setup** (already done if the badge below is green):

1. **Get an API key** for the account that owns the Site (here.now → account → API keys, `hnk_…`).
2. **Claim the canonical Site** so it's permanent (the publish script's claim link, or
   `POST /api/v1/publish/<slug>/claim`). Put its slug in [`herenow.json`](herenow.json).
3. **Store the key as a repo secret** named `HERENOW_TOKEN`
   (Settings → Secrets and variables → Actions). Never commit it.

After that, deploys are hands-off. To deploy on demand without a push, use **Run workflow** on the
*Deploy to here.now* action (`workflow_dispatch`).

## The contact form

The "Front door" form uses here.now's **Site Data** feature. The collection schema lives at
[`public/.herenow/data.json`](public/.herenow/data.json). Submissions are accepted once the site is
**claimed** (an account); on an unclaimed preview the form degrades gracefully and tells the visitor
the door is still being wired up. No email address is exposed on the page.

## The story-tree demo

The interactive map on *How it works* is rendered by
[`src/components/TreeWorld.astro`](src/components/TreeWorld.astro) from curated mock JSON
([`src/data/mockTree.json`](src/data/mockTree.json)) — a made-up "garden planner" app, not a real
roadmap. To change what the demo shows, edit the JSON.

## Grounding claims to the record (`data-grounds`)

Load-bearing claims about *how storytree actually works* carry a `data-grounds` attribute naming the
recorded decision(s) they paraphrase — e.g. `<p data-grounds="ADR-0020,ADR-0040">…`. These refs are
deliberately **not rendered**: a citation an outside reader can't follow is just noise, and keeping
ourselves honest is our job, not something to perform on the marketing surface. They exist so the
copy can be *checked* against the source of truth instead of drifting from it (this is how the "a
person signs off" overclaim slipped past — the page had no binding to the doctrine that says green
derives from a signed verdict via separation of duties, not a per-node human sign-off).

A reference is just a stable handle (`ADR-NNNN`) — it exposes nothing private. Validation lives in
the (private) storytree repo, which vendors this site as a submodule and can see the ADR record; a
drift check there fails if a cited ADR goes missing or `superseded` (storytree ADR-0056).
