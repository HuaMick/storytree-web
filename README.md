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
npm run publish:here   # publishes ./dist to here.now (anonymous = 24h; claim to keep)
```

The publish script prints the live URL and a one-time **claim link** (make a publish permanent by
claiming it). Claiming a site also activates the contact form's storage — see below.

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
