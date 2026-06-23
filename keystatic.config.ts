import { config, fields, singleton } from '@keystatic/core';

// Keystatic content model for storytree-web.
//
// Storage is LOCAL mode: edits write straight to the working tree, and `astro dev`
// shows them live (HMR). Publishing is the `npm run publish:content` script —
// commit + push to main, which fires deploy.yml (merge = publish). To later edit
// from a hosted /keystatic without running locally, switch storage to
// { kind: 'github', repo: { owner: 'HuaMick', name: 'storytree-web' } }.
//
// Each singleton writes a plain JSON file under src/data/ that the matching Astro
// page reads directly (no Keystatic dependency at build time). A singleton `path`
// with no trailing slash means the data file is `<path>.json`.
//
// NOT modelled here (by design):
//  - the roadmap DAG data (src/data/roadmap.json) — slated for generate-from-source (ADR-0066);
//    only the roadmap page's prose is editable, as `roadmapPage`.
//  - the constitution body (src/content/constitution.md) — rendered verbatim by owner standing
//    rule (ADR-0066); only the page's footer note is editable, as `constitutionPage`.
//  - the contact form (the <form> + public/.herenow/data.json) — only its surrounding copy.
export default config({
  storage: { kind: 'local' },

  ui: {
    brand: { name: 'storytree' },
    navigation: {
      Pages: [
        'home',
        'howItWorks',
        'landscape',
        'roadmapPage',
        'getInvolved',
        'contact',
        'constitutionPage',
        'notFound',
      ],
    },
  },

  singletons: {
    home: singleton({
      label: 'Home — hero',
      path: 'src/data/home',
      format: { data: 'json' },
      schema: {
        eyebrow: fields.text({
          label: 'Eyebrow',
          description: 'Small label above the headline.',
        }),
        headline: fields.text({
          label: 'Headline',
        }),
        disclaimer: fields.text({
          label: 'Disclaimer note',
          description:
            'The "written by AI agents" honesty note under the headline. Plain text; basic inline HTML (e.g. <em>…</em>) is allowed.',
          multiline: true,
        }),
        lede: fields.text({
          label: 'Lede paragraph',
          description:
            'The intro paragraph. Plain text; basic inline HTML (e.g. <em>…</em>) is allowed.',
          multiline: true,
        }),
      },
    }),

    howItWorks: singleton({
      label: 'How it works',
      path: 'src/data/how-it-works',
      format: { data: 'json' },
      schema: {
        // ── intro ──
        introEyebrow: fields.text({ label: 'Intro · eyebrow', description: 'Small label above the H1.' }),
        introHeading: fields.text({ label: 'Intro · H1 heading' }),
        introLede: fields.text({ label: 'Intro · lede', description: 'Opening lede paragraph. Inline HTML (e.g. <em>…</em>) allowed.', multiline: true }),
        introBody1: fields.text({ label: 'Intro · body paragraph 1', description: 'Inline HTML (<em>/<strong>) allowed.', multiline: true }),
        introBody2: fields.text({ label: 'Intro · body paragraph 2', description: 'Inline HTML (<em>/<strong>) allowed.', multiline: true }),
        trio: fields.array(
          fields.object({
            tag: fields.text({ label: 'Card tag' }),
            body: fields.text({ label: 'Card body', description: 'Inline HTML (e.g. <em>…</em>) allowed.', multiline: true }),
          }),
          { label: 'Intro · the three pieces', itemLabel: (props) => props.fields.tag.value },
        ),

        // ── the map / observability ──
        mapEyebrow: fields.text({ label: 'Map · eyebrow' }),
        mapHeading: fields.text({ label: 'Map · H2 heading' }),
        mapBody1: fields.text({ label: 'Map · body paragraph 1', description: 'Inline HTML allowed.', multiline: true }),
        mapBody2: fields.text({ label: 'Map · body paragraph 2', description: 'Inline HTML allowed.', multiline: true }),
        legendNote: fields.text({ label: 'Map · legend note (under the live map)', description: 'Inline HTML allowed.', multiline: true }),
        mapBody3: fields.text({ label: 'Map · body paragraph 3 (agents read it too)', description: 'Inline HTML allowed.', multiline: true }),

        // ── the grain ──
        grainEyebrow: fields.text({ label: 'Grain · eyebrow' }),
        grainHeading: fields.text({ label: 'Grain · H2 heading' }),
        grainBody: fields.text({ label: 'Grain · body paragraph', description: 'Inline HTML allowed.', multiline: true }),
        ladder: fields.array(
          fields.object({
            title: fields.text({ label: 'Rung title', description: 'e.g. Story / Capability / Contract.' }),
            body: fields.text({ label: 'Rung body', description: 'Inline HTML allowed.', multiline: true }),
          }),
          { label: 'Grain · the ladder (story → capability → contract)', itemLabel: (props) => props.fields.title.value },
        ),

        // ── the graph / triage ──
        graphEyebrow: fields.text({ label: 'Graph · eyebrow' }),
        graphHeading: fields.text({ label: 'Graph · H2 heading' }),
        graphBody1: fields.text({ label: 'Graph · body paragraph 1', description: 'Inline HTML allowed.', multiline: true }),
        graphBody2: fields.text({ label: 'Graph · body paragraph 2', description: 'Inline HTML allowed.', multiline: true }),

        // ── the harness / proof ──
        harnessEyebrow: fields.text({ label: 'Harness · eyebrow' }),
        harnessHeading: fields.text({ label: 'Harness · H2 heading' }),
        harnessBody1: fields.text({ label: 'Harness · body paragraph 1', description: 'Inline HTML allowed (incl. <code>…</code>).', multiline: true }),
        harnessBody2: fields.text({ label: 'Harness · body paragraph 2', description: 'Inline HTML allowed.', multiline: true }),
        checks: fields.array(
          fields.object({
            grounds: fields.text({ label: 'Grounds (ADR ids, optional)', description: 'Comma-separated ADR ids for the data-grounds attribute; leave blank for none.' }),
            body: fields.text({ label: 'Check item', description: 'Inline HTML allowed.', multiline: true }),
          }),
          { label: 'Harness · the gate checklist', itemLabel: (props) => props.fields.body.value.slice(0, 60) },
        ),
        harnessCaveat: fields.text({ label: 'Harness · honest-scope caveat', description: 'Inline HTML allowed.', multiline: true }),

        // ── the library / coordination ──
        libraryEyebrow: fields.text({ label: 'Library · eyebrow' }),
        libraryHeading: fields.text({ label: 'Library · H2 heading' }),
        libraryBody1: fields.text({ label: 'Library · body paragraph 1', description: 'Inline HTML allowed.', multiline: true }),
        libraryBody2: fields.text({ label: 'Library · body paragraph 2', description: 'Inline HTML allowed.', multiline: true }),

        // ── why this is different ──
        differentEyebrow: fields.text({ label: 'Why different · eyebrow' }),
        differentHeading: fields.text({ label: 'Why different · H2 heading' }),
        differentBody1: fields.text({ label: 'Why different · body paragraph 1', description: 'Inline HTML allowed.', multiline: true }),
        differentBody2: fields.text({ label: 'Why different · body paragraph 2', description: 'Inline HTML allowed.', multiline: true }),
        differentBody3: fields.text({ label: 'Why different · body paragraph 3', description: 'Inline HTML allowed.', multiline: true }),
        differentMuted: fields.text({ label: 'Why different · closing muted paragraph', description: 'Inline HTML allowed.', multiline: true }),
        seeSurveyLink: fields.text({ label: 'Why different · "see the survey" link text', description: 'Visible text only; the /landscape/ href is fixed in the template.', multiline: true }),

        // ── closing CTA ──
        ctaHeading: fields.text({ label: 'CTA · heading' }),
        ctaLede: fields.text({ label: 'CTA · lede', description: 'Inline HTML allowed.', multiline: true }),
        ctaPrimary: fields.text({ label: 'CTA · primary button text', description: 'Visible text only; the /get-involved/ href is fixed in the template.' }),
        ctaGhost: fields.text({ label: 'CTA · ghost button text', description: 'Visible text only; the /constitution/ href is fixed in the template.' }),
      },
    }),

    landscape: singleton({
      label: 'Landscape',
      path: 'src/data/landscape',
      format: { data: 'json' },
      schema: {
        // — Intro —
        introEyebrow: fields.text({ label: 'Intro · eyebrow', description: 'Small label above the page headline.' }),
        introHeading: fields.text({ label: 'Intro · heading (h1)' }),
        introLede: fields.text({ label: 'Intro · lede', description: 'The opening lede paragraph. Plain text; basic inline HTML (e.g. <em>…</em>) is allowed.', multiline: true }),
        introBody1: fields.text({ label: 'Intro · paragraph 1 (context window)', description: 'Inline HTML allowed (<strong>, <em>); use &nbsp; for non-breaking spaces.', multiline: true }),
        introBody2: fields.text({ label: 'Intro · paragraph 2 (three surfaces)', description: 'Inline HTML allowed (<strong>, <em>).', multiline: true }),

        // — Survey / scorecard —
        surveyEyebrow: fields.text({ label: 'Survey · eyebrow' }),
        surveyHeading: fields.text({ label: 'Survey · heading (h2)' }),
        surveyBody: fields.text({ label: 'Survey · intro paragraph', description: 'Sits above the scorecard. Inline HTML allowed; use &nbsp; for non-breaking spaces.', multiline: true }),
        surveyLegendNote: fields.text({ label: 'Survey · legend note', description: 'The "surveyed sources at one date" caution under the scorecard. Inline HTML allowed (<em>).', multiline: true }),

        // — What might be new —
        newEyebrow: fields.text({ label: 'What might be new · eyebrow' }),
        newHeading: fields.text({ label: 'What might be new · heading (h2)' }),
        newBody1: fields.text({ label: 'What might be new · paragraph 1 (unification)', description: 'Inline HTML allowed (<strong>, <em>).', multiline: true }),
        newBody2: fields.text({ label: 'What might be new · paragraph 2 (altitude)', description: 'Inline HTML allowed (<strong>, <em>); use &nbsp; for non-breaking spaces.', multiline: true }),
        newCaveat: fields.text({ label: 'What might be new · narrow-claims note', description: 'The muted "both claims are narrow on purpose" note.', multiline: true }),

        // — The field converged —
        convergedEyebrow: fields.text({ label: 'Field converged · eyebrow' }),
        convergedHeading: fields.text({ label: 'Field converged · heading (h2)' }),
        convergedBody: fields.text({ label: 'Field converged · intro paragraph', description: 'Sits above the convergence timeline. Inline HTML allowed.', multiline: true }),

        // — The skeptical read (honest box) —
        honestEyebrow: fields.text({ label: 'Skeptical read · eyebrow' }),
        honestHeading: fields.text({ label: 'Skeptical read · heading (h2)' }),
        honestLede: fields.text({ label: 'Skeptical read · lede', description: 'The "strongest argument that this is nothing" lede. Inline HTML allowed (<em>).', multiline: true }),
        honestBody: fields.text({ label: 'Skeptical read · counter paragraph', description: 'The honest counter. Inline HTML allowed.', multiline: true }),
        caveatsHeading: fields.text({ label: 'Caveats · heading (h3)' }),
        caveats: fields.array(
          fields.object({
            text: fields.text({ label: 'Caveat', description: 'One caveat list item. Inline HTML allowed (<strong>); use &nbsp; for non-breaking spaces.', multiline: true }),
          }),
          { label: 'Caveats', description: 'The "caveats, on the table" list. Each item renders as a bullet.', itemLabel: (props) => props.fields.text.value || 'Caveat' },
        ),
        honestSrc: fields.text({ label: 'Skeptical read · sources footnote', description: 'The small "marks above are scored from primary sources" footnote. Inline HTML allowed.', multiline: true }),

        // — CTA —
        ctaHeading: fields.text({ label: 'CTA · heading (h2)' }),
        ctaLede: fields.text({ label: 'CTA · lede', description: 'The closing invitation paragraph.', multiline: true }),
        ctaPrimary: fields.text({ label: 'CTA · primary button text', description: 'Visible label of the primary button (link is /how-it-works/). Includes the trailing arrow.' }),
        ctaGhost: fields.text({ label: 'CTA · secondary button text', description: 'Visible label of the secondary button (link is /get-involved/).' }),
      },
    }),

    roadmapPage: singleton({
      label: 'Roadmap (page copy)',
      path: 'src/data/roadmap-page',
      format: { data: 'json' },
      schema: {
        introEyebrow: fields.text({ label: 'Intro · eyebrow' }),
        introHeading: fields.text({ label: 'Intro · heading (h1)' }),
        introLede: fields.text({ label: 'Intro · lede', description: 'Inline HTML (<em>/<strong>) allowed.', multiline: true }),
        introBody: fields.text({ label: 'Intro · body paragraph (milestones)', description: 'Inline HTML allowed.', multiline: true }),
        promiseEyebrow: fields.text({ label: 'Promise · eyebrow' }),
        promiseHeading: fields.text({ label: 'Promise · heading (h2)' }),
        promiseBody: fields.text({ label: 'Promise · body paragraph', description: 'Inline HTML allowed.', multiline: true }),
        ctaPrimary: fields.text({ label: 'CTA · primary button text', description: 'Visible text only; the /how-it-works/ href is fixed in the page.' }),
        ctaGhost: fields.text({ label: 'CTA · secondary button text', description: 'Visible text only; the /contact/ href is fixed in the page.' }),
      },
    }),

    getInvolved: singleton({
      label: 'Get involved',
      path: 'src/data/get-involved',
      format: { data: 'json' },
      schema: {
        intro: fields.object(
          {
            eyebrow: fields.text({ label: 'Eyebrow', description: 'Small label above the page headline.' }),
            h1: fields.text({ label: 'Heading (h1)' }),
            lede: fields.text({ label: 'Lede paragraph', description: 'Intro paragraph. Plain text; basic inline HTML (e.g. <em>…</em>) and entities (&nbsp;) are allowed.', multiline: true }),
          },
          { label: 'Intro' },
        ),
        bet: fields.object(
          {
            eyebrow: fields.text({ label: 'Eyebrow' }),
            h2: fields.text({ label: 'Heading (h2)' }),
            lede: fields.text({ label: 'Lede paragraph', description: 'Plain text; basic inline HTML (e.g. <em>…</em>) is allowed.', multiline: true }),
          },
          { label: 'The bet' },
        ),
        honest: fields.object(
          {
            eyebrow: fields.text({ label: 'Eyebrow' }),
            h2: fields.text({ label: 'Heading (h2)' }),
            body: fields.text({ label: 'Body paragraph', description: 'Plain text; basic inline HTML (e.g. <em>…</em>) is allowed.', multiline: true }),
            muted: fields.text({ label: 'Muted follow-up paragraph', description: 'The secondary, de-emphasised paragraph. Basic inline HTML allowed.', multiline: true }),
          },
          { label: 'How we keep ourselves honest' },
        ),
        constitution: fields.object(
          {
            eyebrow: fields.text({ label: 'Eyebrow' }),
            h2: fields.text({ label: 'Heading (h2)' }),
            body: fields.text({ label: 'Body paragraph', description: 'Plain text; basic inline HTML (e.g. <em>…</em>) is allowed.', multiline: true }),
            cta: fields.text({ label: 'Button text', description: 'Visible text of the constitution link. The link target is fixed in the page.' }),
          },
          { label: 'The constitution' },
        ),
        where: fields.object(
          {
            eyebrow: fields.text({ label: 'Eyebrow' }),
            h2: fields.text({ label: 'Heading (h2)' }),
            body: fields.text({ label: 'Body paragraph', description: 'Plain text; basic inline HTML (e.g. <em>…</em>) is allowed.', multiline: true }),
            ctaPrimary: fields.text({ label: 'Primary button text', description: 'Visible text of the "Ask to come in" button. Link target is fixed in the page.' }),
            ctaGhost: fields.text({ label: 'Secondary button text', description: 'Visible text of the "See how it works" button. Link target is fixed in the page.' }),
          },
          { label: 'Where we are right now' },
        ),
      },
    }),

    contact: singleton({
      label: 'Contact',
      path: 'src/data/contact',
      format: { data: 'json' },
      schema: {
        eyebrow: fields.text({ label: 'Eyebrow', description: 'Small label above the heading.' }),
        heading: fields.text({ label: 'Heading' }),
        lede: fields.text({ label: 'Lede paragraph', description: 'The intro paragraph beside the form. Plain text; basic inline HTML (e.g. <em>…</em>) and entities (e.g. &nbsp;) are allowed.', multiline: true }),
        intro: fields.text({ label: 'Intro / help paragraph', description: 'The "being this early…" paragraph. Plain text; basic inline HTML (e.g. <strong>…</strong>) is allowed.', multiline: true }),
        submitLabel: fields.text({ label: 'Submit button text', description: 'Text on the form’s send button (e.g. "Send it →").' }),
        note: fields.text({ label: 'Form note', description: 'The small reassurance line under the send button.' }),
      },
    }),

    constitutionPage: singleton({
      label: 'Constitution (footer note)',
      path: 'src/data/constitution-page',
      format: { data: 'json' },
      schema: {
        footerNote: fields.text({
          label: 'Footer note',
          description:
            'The "see a hole we can’t?" note under the constitution body. Contains an inline link; inline HTML allowed. (The constitution body itself stays verbatim in constitution.md and is not editable here.)',
          multiline: true,
        }),
      },
    }),

    notFound: singleton({
      label: '404 page',
      path: 'src/data/not-found',
      format: { data: 'json' },
      schema: {
        eyebrow: fields.text({ label: 'Eyebrow' }),
        heading: fields.text({ label: 'Heading (h1)' }),
        lede: fields.text({ label: 'Lede', description: 'Inline HTML allowed.', multiline: true }),
        ctaPrimary: fields.text({ label: 'Primary button text', description: 'Visible text only; the / href is fixed in the page.' }),
        ctaGhost: fields.text({ label: 'Secondary button text', description: 'Visible text only; the /how-it-works/ href is fixed in the page.' }),
      },
    }),
  },
});
