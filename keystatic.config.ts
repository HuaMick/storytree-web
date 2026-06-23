import { config, fields, singleton } from '@keystatic/core';

// Keystatic content model for storytree-web.
//
// Storage is LOCAL mode: edits write straight to the working tree, and `astro dev`
// shows them live (HMR). Publishing is the `npm run publish:content` script —
// commit + push to main, which fires deploy.yml (merge = publish). To later edit
// from a hosted /keystatic without running locally, switch storage to
// { kind: 'github', repo: { owner: 'HuaMick', name: 'storytree-web' } }.
//
// Each singleton/collection writes a plain file that the Astro pages read directly
// (no Keystatic dependency at build time). The `home` singleton below writes
// `src/data/home.json` (path has no trailing slash -> the data file is `<path>.json`).
export default config({
  storage: { kind: 'local' },

  ui: {
    brand: { name: 'storytree' },
    navigation: {
      Content: ['home'],
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
  },
});
