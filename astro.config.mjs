// @ts-check
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, fontProviders } from 'astro/config';

import { uncoveredCharacters } from './src/lib/font-coverage.ts';

// Fonts are downloaded when the site builds and served from this site, so no
// page links to a font service. Astro gives each family a hashed name and
// exposes it through the CSS variable below; tokens.css points --font-display
// and --font-text at those variables. DESIGN.md lists the weights and axes.
const plex = {
  name: 'IBM Plex Sans',
  cssVariable: '--font-plex',
  provider: fontProviders.fontsource(),
  subsets: ['latin'],
  fallbacks: ['system-ui', 'sans-serif'],
};

// The build's font check (src/lib/font-coverage.ts). When the build has
// written its pages, every character each page draws must be in the font file
// that draws it; one that isn't stops the build, and so stops a deploy. The
// two names are the families' CSS variables, as set below.
/** @type {import('astro').AstroIntegration} */
const fontCoverage = {
  name: 'font-coverage',
  hooks: {
    'astro:build:done': ({ dir, logger }) => {
      const root = fileURLToPath(dir);
      const pages = readdirSync(root, { recursive: true, encoding: 'utf8' })
        .filter((file) => file.endsWith('.html'))
        .map((file) => ({ path: `/${file}`, html: readFileSync(`${root}${file}`, 'utf8') }));
      const problems = uncoveredCharacters(pages, (url) => readFileSync(`${root}${url}`), {
        display: '--font-fraunces',
        text: '--font-plex',
      });
      if (problems.length) {
        throw new Error(`A page draws a character its font file doesn't hold:\n  ${problems.join('\n  ')}`);
      }
      logger.info(`Every character on ${pages.length} pages is in the font file that draws it.`);
    },
  },
};

// https://astro.build/config
export default defineConfig({
  integrations: [fontCoverage],
  // Where the site lives. Every canonical URL, link preview address, and
  // sitemap entry is built on it.
  site: 'https://calvinpatel.dev',
  // Each page builds as a file, credits.html, which Cloudflare serves at
  // /credits: the address every link on the site already uses, with no
  // redirect. src/lib/address.ts turns the path Astro then reports,
  // /credits.html, back into that address.
  build: { format: 'file' },
  // The About photo is served as AVIF with a WebP fallback. At quality 60 the
  // AVIF measures as close to the source as the WebP does at its default, 80.
  image: {
    service: { entrypoint: 'astro/assets/services/sharp', config: { avif: { quality: 60 } } },
  },
  fonts: [
    {
      // Weight 400 only, with the optical size, softness, and wonk axes.
      // Optical size stays automatic; --display-settings sets the other two.
      name: 'Fraunces',
      cssVariable: '--font-fraunces',
      provider: fontProviders.google(),
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
      options: {
        experimental: {
          variableAxis: {
            opsz: [['9', '144']],
            SOFT: [['0', '100']],
            WONK: [['0', '1']],
          },
        },
      },
    },
    // 400, 400 italic, and 500 (brain-label names only), as three static files.
    { ...plex, weights: [400, 500], styles: ['normal'] },
    { ...plex, weights: [400], styles: ['italic'] },
  ],
});
