# calvinpatel.dev

Cal Patel's portfolio site. It reads as a nervous system: real neuron reconstructions fire in the hero behind a brain whose five lobes are the navigation, and each section below carries one ink drawing of a cell part or process. Dark only for v1.

**Read DESIGN.md before any visual work.** It holds the look, the motion rules, the banned list, and the accessibility rules. Every value it names lives in `src/styles/tokens.css`. The chosen designs are on the design canvas (https://claude.ai/artifact/FMdy3zcXeRiNzZxvA1H2S6), which comes into the repo through its Export menu.

## Stack

- **Astro**, built as a static site. Copy lives in content collections with a schema per type, so a missing field fails the build.
- **Plain JavaScript islands** for the hero's neuron canvas and the brain SVG. Use React only for an island with complicated state; a canvas and an SVG don't need it.
- **CSS custom properties** from `src/styles/tokens.css` for every color, size, and timing.
- **Section motion** uses CSS and plain JavaScript first. Motion or GSAP gets added only if a section needs it. Neither is chosen yet, so ask before adding one.
- **Python 3.11+ with NumPy** for the build-time neuron script.
- **Fonts:** Fraunces and IBM Plex Sans, self-hosted. No Google Fonts link.
- **Hosting:** Cloudflare Workers static assets. `wrangler.jsonc` says what Cloudflare serves, and `public/_headers` sets the cache headers. Workers Builds deploys every push to main and gives each branch a Preview.

## Layout

```
.
├── CLAUDE.md
├── DESIGN.md
├── .node-version      the Node version every build uses; package.json's packageManager holds npm's (rule 17)
├── wrangler.jsonc     what Cloudflare serves: dist/, the 404 page, and each page at its address
├── src/content/       one Markdown file per section and per project
├── src/components/    the shared layout, hero canvas, brain navigation, section layouts
├── src/lib/           copy.ts, which renders every content field; raster.ts, the Experience raster's pattern,
│                      and sweep.ts, its sweep: the cursor's travel and fades, and when it reaches each spike;
│                      wiring.ts, the Skills wiring diagram's geometry and traced paths; pixels.ts and tokens.ts, which drawings share;
│                      cells.ts, which reads public/cells/index.json for the Credits page;
│                      address.ts, a page's address as it is served, for the canonical URL, the footer, and the sitemap;
│                      png.ts, which reads the link preview picture's size for its tags;
│                      font-coverage.ts, the build's check that every drawn character is in its font file;
│                      brain.ts, the hero brain's geometry; brain-nav.ts, the brain navigation's rules;
│                      spontaneous.ts, the five-second window's clock, which the brain and the neuron layer share;
│                      play-once.ts, the trigger that plays a section drawing once, and flash.ts, the flash an axon
│                      node, a raster spike, and a Contact node share; axon.ts, the order a divider's parts flash in;
│                      dendrite.ts, how the About dendrite grows: one turning point's timeline, and which grow first;
│                      contact.ts, the Contact sequence: its vesicles, band, and underline, and when it may start;
│                      the neuron layer's rules: neuron-field.ts (where cells and nuclei go), neuron-cell.ts (one cell),
│                      neuron-crossing.ts (when a pointer sends input), neuron-signal.ts (input and firing),
│                      neuron-zones.ts (the brightness cap behind text), neuron-sprite.ts (a cell's blur, drawn on
│                      the canvas);
│                      ink.ts, which measures text for the brain and the neuron layer
├── src/styles/        tokens.css and global styles
├── public/cells/      neuron files the hero loads (generated; don't edit by hand)
├── public/            link-preview.png, the picture a link to the site shows (rendered; see Commands);
│                      favicon.ico, favicon.svg, and apple-touch-icon.png, the CP mark as outlines (drawn; see Commands);
│                      _headers, the cache rule for /_astro/ (rule 18)
├── data/swc/          raw downloaded reconstructions + sources.csv
├── scripts/           swc_to_web.py; link-preview.mjs, which renders public/link-preview.png; favicon.mjs, which draws the favicon files
├── tests/             test_swc_to_web.py, and one .test.ts per src/lib/ module: copy, raster, sweep, wiring, pixels, tokens, cells, address, png, font-coverage,
│                      brain, brain-nav, spontaneous, play-once, flash, axon, dendrite, contact, neuron-field, neuron-cell,
│                      neuron-crossing, neuron-signal, neuron-zones
└── docs/              cell-web-v1.md (the neuron file format), design/ (chosen artboards, 1x PNG),
                       spikes/ (approved spikes; brain-navigation.html is the source for the hero's brain and neuron layer)
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the site at http://localhost:4321 |
| `npm run dev -- --host` | Same, and reachable from a phone on the same Wi-Fi |
| `npx astro build` | Builds the site into `dist/`; must finish with no errors or warnings. It stops if a page draws a character its font file doesn't hold, and names the character |
| `npx astro check` | Type-checks every `.astro` and `.ts` file, and `astro.config.mjs`; must finish with no errors, warnings, or hints |
| `npm run build` | What Workers Builds runs: `astro check`, then `astro build`. Its build command is `npm test && npm run build`, so a failing test or a type error stops a deploy |
| `uv run scripts/swc_to_web.py data/swc public/cells --sources data/swc/sources.csv` | Converts every SWC file into cell-web/1 JSON and updates `public/cells/index.json` |
| add `--preview <folder>` | Also writes an SVG of each cell for a quick visual check |
| `uv run --with pytest --with numpy pytest tests/test_swc_to_web.py` | Runs the converter's tests (from the repo root) |
| `npm test` | Runs every `src/lib/` module's tests: `node --test tests/*.test.ts`, from the repo root |
| `npx astro dev --background` | Runs the dev server in the background so Claude Code can keep working; `npx astro dev status`, `logs`, and `stop` manage it |
| `npx astro preview` | Serves the built site from `dist/` at http://localhost:4321, in the background; checks and screenshots run against this (rule 16). `npx astro preview status`, `logs`, and `stop` manage it, and `--port` moves it when the dev server has 4321 |
| `npx wrangler dev` | Serves `dist/` at http://localhost:8787 the way Cloudflare does: its redirects, the 404 page and its status, and `public/_headers`. Build first. It is for routing, status, and header checks only; screenshots, timing, and behavior still run against `npx astro preview` (rule 16) |
| `node scripts/link-preview.mjs` | Renders `public/link-preview.png`, the picture a link to the site shows, from the built hero; `npx astro preview` must be running. Run it again whenever the hero changes: its copy, the brain, or the neuron layer |
| `node scripts/favicon.mjs` | Draws the favicon files in `public/` again (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`) from the CP mark's outlines, in tokens.css's two colors. Run it if `--color-text` or `--color-bg` changes, or the icon's layout does |
| `http://localhost:4321/?carry=0.8` | Dev server only: tries another value for how far a neuron's input carries along its dendrite (0.55 without it; `SIGNAL.input.length` in `src/lib/neuron-signal.ts`). The parameter isn't in the built site |
| `http://localhost:4321/?clamp=page` | Dev server only: the page does the neuron layer's clamp, as in Firefox, in any browser; `?clamp=canvas` makes the canvas do it, as everywhere else (`clampBy` in `src/lib/neuron-zones.ts`; DESIGN.md, Color: Contrast). The parameter isn't in the built site |

Deploys happen through Workers Builds. Don't run `wrangler deploy`, `wrangler preview`, or `wrangler versions upload` unless Cal asks. `npx wrangler deploy --dry-run` uploads nothing; it checks `wrangler.jsonc`.

## Working rules

**Content**

1. Copy comes only from `src/content/`. Never write, reword, or fill in copy inside a component. If content is missing, stop and ask Cal rather than writing placeholder text.
2. Never add a number that isn't in the content files.
3. Content fields may hold two inline Markdown marks, links and italics, and the build renders them. Nothing else is allowed.
4. Never write "HIPAA-compliant" or "de-identified." Clinic work uses "patient-authorized, identifiers withheld."
5. Don't add projects, sections, or pages that aren't in the content. For example, TrialMatch stays off until it has a working build.

**Design**

6. Never hard-code a color, size, or duration. CSS uses tokens through `var()`. Scripts read a token with `getComputedStyle` only when they need its number, such as a canvas speed or a raster spacing. If a value you need isn't a token, flag it rather than inventing one.
7. Follow DESIGN.md. Every drawing's measurements are in its Drawings section; where it's silent, match the canvas artboard. Where both are silent, choose the plainest option that fits DESIGN.md's theme lock.
8. Don't edit DESIGN.md or tokens.css without Cal's go-ahead.
9. End every reply that made a design choice not covered by DESIGN.md with a short list of those choices. Cal logs decisions in the Changelog of the Site Build Framework doc, which lives outside this repo.

**Building**

10. Build order: the static shell, then each section, then the data, then the interactive pieces, then motion last. Each interactive piece is built with its keyboard, touch, and reduced-motion behavior at the same time, not afterward.
11. Check visually before calling a piece done. Take Playwright screenshots at 375, 768, 1440, and 1920px wide and compare them against the artboards and DESIGN.md. Save each one as .playwright-mcp/<page>-<width>.png, so Cal can review them.
12. Commit after every piece that works, and push to GitHub.

**Neuron data**

13. Every SWC file needs a row in `data/swc/sources.csv` before it converts. The credit line it produces must appear on the site.
14. Never edit `public/cells/*.json` by hand. Rerun the script and commit its output.
15. `swc_to_web.py` is scaffolding. Dendrometer's export replaces it later, and today's outputs become fixtures for that export's tests. The file format is in `docs/cell-web-v1.md`.

**Checking**

16. Run every check against the production build (`npx astro build`, then `npx astro preview`), not the dev server: screenshots, timing, behavior, and frame times. The build rewrites what scripts read. Its minifier turned every time token from `130ms` into `.13s`, and until 7b14cce the built site ran all its timing a thousand times too short while dev looked right. The dev server is for working, and for comparing against when the build behaves differently.
    - A check of what the page does launches a headless Chrome of its own (`browserType().launch({ channel: 'chrome', headless: true })`). The Playwright MCP's own browser is a real window, and the real mouse passing over it sends the page real input: neurons fire that nothing in the check touched.
    - A frame-time check keeps a real window, so the canvas draws on the GPU. It counts the pointer events it didn't send and reports them with its numbers.

**Shipping**

17. The Node and npm versions live in `.node-version` and `package.json`'s `packageManager`, and change together, only with Cal's okay. Before installing dependencies or building, check `node --version` and `npm --version` against `.node-version` and `packageManager`. If they differ (`brew upgrade node` does this), stop and tell Cal.
18. `public/_headers` gives a one-year immutable cache to `/_astro/` only. Every file there is named so its name changes when its content would: scripts and styles by a hash of their bytes, fonts by their versioned download address, photos by the source photo and its resize settings. Any other file, and anything added to `/_astro/` that isn't named this way, keeps Cloudflare's default. Known gap: a sharp upgrade could re-encode a photo under the same name, and returning visitors would keep the older encoding.
