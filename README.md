# calvinpatel.dev

Cal Patel's portfolio site, at https://calvinpatel.dev. It reads as a nervous system: real neuron reconstructions fire in the hero behind a brain whose five lobes are the navigation, and each section below carries one ink drawing of a cell part or process.

## Stack

- **Astro**, built as a static site. The copy lives in content collections with a schema per type, so a missing field fails the build.
- **Plain JavaScript** for the hero's neuron canvas, the brain, and each section's drawing. There is no UI framework.
- **CSS custom properties** from `src/styles/tokens.css` for every color, size, and timing.
- **Fraunces and IBM Plex Sans**, served from the site itself.
- **Python 3.11+ with NumPy** for the script that converts the neuron files.
- **Cloudflare Workers static assets** for hosting.

## Run it

The site builds with Node 26.12.0 and npm 12.2.2. Node's version is pinned in `.node-version`, and npm's in the `packageManager` field of `package.json`. Cloudflare reads both, so a deploy is built with the same versions.

| Command | What it does |
| --- | --- |
| `npm ci` | Installs exactly what `package-lock.json` lists |
| `npm run dev` | Runs the site at http://localhost:4321 and reloads it as files change |
| `npm run build` | Type-checks the site, then builds it into `dist/` |
| `npm run preview` | Serves the built site from `dist/` at http://localhost:4321 |
| `npm test` | Runs the tests for the modules in `src/lib/` |
| `npx astro check` | Runs the type check on its own |
| `npx wrangler dev` | Serves `dist/` at http://localhost:8787 the way Cloudflare does: its redirects, its 404 page, and its cache headers. Build first |

## Where things live

- `src/content/` holds all the copy, one Markdown file per section and per project.
- `DESIGN.md` holds the design: the look, the motion rules, and the accessibility rules. Every value it names is in `src/styles/tokens.css`.
- `CLAUDE.md` holds the working rules for Claude Code, a map of the repo, and the full list of commands.

## The neuron data

The neurons in the hero are real reconstructions from [NeuroMorpho.Org](https://neuromorpho.org), each shared under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license. Each one is credited on the site's [Credits page](https://calvinpatel.dev/credits). The downloaded files and their sources are in `data/swc/`, and this command converts them into the files the hero loads, in `public/cells/`:

```sh
uv run scripts/swc_to_web.py data/swc public/cells --sources data/swc/sources.csv
```

The converter has its own tests, which run on a laptop and not in the deploy:

```sh
uv run --with pytest --with numpy pytest tests/test_swc_to_web.py
```

## How deploys work

Cloudflare Workers Builds deploys the site on every push to `main`. It runs `npm test && npm run build`, so a failing test or a type error stops the deploy, and then `npx wrangler deploy`. Every other branch gets a Preview at its own address.

- `wrangler.jsonc` tells Cloudflare what to serve: the files in `dist/`, with `dist/404.html` and a 404 status for an address that has no file.
- `public/_headers` gives the files under `/_astro/` a one-year cache. Their names change whenever their content does. Every other file is checked with Cloudflare each time it's used.
- The build downloads the four font files from Google Fonts and jsDelivr. If either can't be reached, the build can't finish, and the live site stays on the last deploy.

## npm 12 and install scripts

npm 12 runs a dependency's install script only if `package.json` allows it, in its `allowScripts` block. An approval names one version of a package. So after an upgrade to a package with an install script (today esbuild and workerd, which come with wrangler), `npm install` warns that the script was blocked, and the package needs approving again:

```sh
npm install-scripts ls                 # what is waiting for a decision
npm install-scripts approve <package>  # allow it, at the version installed
npm rebuild                            # run the scripts just approved
```

fsevents is denied on purpose. Its script would compile it, and the package ships already compiled. Don't run `npm install-scripts prune`: it removes that entry, and the warning comes back.
