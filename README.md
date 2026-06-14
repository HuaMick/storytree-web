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

## Grounding claims to the record (`data-grounds`)

Load-bearing factual claims about *how storytree actually works* carry a `data-grounds`
attribute naming the recorded decision(s) they paraphrase — e.g.
`<p data-grounds="ADR-0020,ADR-0040">…`. These references are deliberately **not rendered** on the
page: a citation an outside reader can't follow is just noise, and keeping ourselves honest is our
job, not something to perform on the marketing surface. They exist so the copy can be *checked*
against the source of truth rather than drifting from it (this is how the "a person signs off"
overclaim slipped past — the page had no binding to the doctrine that says green derives from a
signed verdict, with no human sign-off at capability grain).

A reference is just a stable handle (`ADR-NNNN`, or a library artifact id) — it exposes nothing
private; the decision's *content* stays in the (private) storytree repo. Validation lives there too:
the parent repo vendors this site as a submodule and can see the ADR/Library corpus, so a drift
check there confirms every cited id still exists and isn't `superseded`. This repo alone can't
self-check. When the public "ask the record" surface exists, these same handles become resolvable.
