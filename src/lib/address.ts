// A page's address, as the site serves it. Every page builds as a file
// (build.format: 'file' in astro.config.mjs): credits.html, which Cloudflare
// serves at /credits with no trailing slash and redirects /credits/ and
// /credits.html to (its default html_handling, "auto-trailing-slash").
//
// While the site builds, Astro reports a page's path as the file it writes:
// /index.html, /credits.html. In dev it reports whatever was asked for, with
// or without a slash. pagePath turns any of those into the one address a
// visitor sees, and everything that needs a page's address asks here: the
// canonical URL, the footer's aria-current, and the sitemap.
//
// No Astro imports, so Node can run tests/address.test.ts against it directly.

/**
 * A page's path as it is served: `/`, `/credits`, `/projects/notepilot`. Takes
 * the path Astro reports (`/credits.html`), a folder form (`/credits/`), or
 * the served path itself.
 */
export function pagePath(pathname: string): string {
  const path = pathname
    .replace(/\/index\.html$/, '/')
    .replace(/\.html$/, '')
    .replace(/\/+$/, '');
  return path === '' ? '/' : path;
}

/**
 * A page's full address on the site, for a canonical URL or a sitemap:
 * `https://calvinpatel.dev/credits`. `site` is astro.config.mjs's `site`.
 */
export function pageUrl(pathname: string, site: URL | string | undefined): string {
  if (!site) throw new Error("astro.config.mjs sets no `site`, so a page's full address can't be written.");
  return new URL(pagePath(pathname), site).href;
}
