// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

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

// https://astro.build/config
export default defineConfig({
  // Where the site lives. Every canonical URL, link preview address, and
  // sitemap entry is built on it.
  site: 'https://calvinpatel.dev',
  // Each page builds as a file, credits.html, which Cloudflare serves at
  // /credits: the address every link on the site already uses, with no
  // redirect. src/lib/address.ts turns the path Astro then reports,
  // /credits.html, back into that address.
  build: { format: 'file' },
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
