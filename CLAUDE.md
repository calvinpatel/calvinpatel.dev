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
- **Hosting:** Cloudflare Workers static assets. Workers Builds deploys every push to main and gives each branch a preview link.

## Layout

```
.
├── CLAUDE.md
├── DESIGN.md
├── src/content/       one Markdown file per section and per project
├── src/components/    the shared layout, hero canvas, brain navigation, section layouts
├── src/lib/           copy.ts, which renders every content field; raster.ts, the Experience raster's pattern,
│                      and sweep.ts, its sweep: the cursor's travel and fades, and when it reaches each spike;
│                      wiring.ts, the Skills wiring diagram's geometry and traced paths; pixels.ts and tokens.ts, which drawings share;
│                      cells.ts, which reads public/cells/index.json for the Credits page;
│                      brain.ts, the hero brain's geometry; brain-nav.ts, the brain navigation's rules;
│                      spontaneous.ts, the five-second window's clock, which the brain and the neuron layer share;
│                      play-once.ts, the trigger that plays a section drawing once, and flash.ts, the flash an axon
│                      node, a raster spike, and a Contact node share; axon.ts, the order a divider's parts flash in;
│                      dendrite.ts, how the About dendrite grows: one turning point's timeline, and which grow first;
│                      the neuron layer's rules: neuron-field.ts (where cells and nuclei go), neuron-cell.ts (one cell),
│                      neuron-crossing.ts (when a pointer sends input), neuron-signal.ts (input and firing),
│                      neuron-zones.ts (the brightness cap behind text), neuron-sprite.ts (a cell's blur, drawn on
│                      the canvas);
│                      ink.ts, which measures text for the brain and the neuron layer
├── src/styles/        tokens.css and global styles
├── public/cells/      neuron files the hero loads (generated; don't edit by hand)
├── data/swc/          raw downloaded reconstructions + sources.csv
├── scripts/           swc_to_web.py
├── tests/             test_swc_to_web.py, and one .test.ts per src/lib/ module: copy, raster, sweep, wiring, pixels, tokens, cells,
│                      brain, brain-nav, spontaneous, play-once, flash, axon, dendrite, neuron-field, neuron-cell,
│                      neuron-crossing, neuron-signal, neuron-zones
└── docs/              cell-web-v1.md (the neuron file format), design/ (chosen artboards, 1x PNG),
                       spikes/ (approved spikes; brain-navigation.html is the source for the hero's brain and neuron layer)
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the site at http://localhost:4321 |
| `npm run dev -- --host` | Same, and reachable from a phone on the same Wi-Fi |
| `npx astro build` | Builds the site into `dist/`; must finish with no errors or warnings |
| `uv run scripts/swc_to_web.py data/swc public/cells --sources data/swc/sources.csv` | Converts every SWC file into cell-web/1 JSON and updates `public/cells/index.json` |
| add `--preview <folder>` | Also writes an SVG of each cell for a quick visual check |
| `uv run --with pytest --with numpy pytest tests/test_swc_to_web.py` | Runs the converter's tests (from the repo root) |
| `node --test tests/*.test.ts` | Runs every `src/lib/` module's tests (from the repo root) |
| `npx astro dev --background` | Runs the dev server in the background so Claude Code can keep working; `npx astro dev status`, `logs`, and `stop` manage it |
| `npx astro preview` | Serves the built site from `dist/` at http://localhost:4321, in the background; checks and screenshots run against this (rule 16). `npx astro preview status`, `logs`, and `stop` manage it, and `--port` moves it when the dev server has 4321 |
| `http://localhost:4321/?carry=0.8` | Dev server only: tries another value for how far a neuron's input carries along its dendrite (0.55 without it; `SIGNAL.input.length` in `src/lib/neuron-signal.ts`). The parameter isn't in the built site |

Deploys happen through Workers Builds. Don't run `wrangler deploy` unless Cal asks.

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
