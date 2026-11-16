// robots.txt: every crawler may read every page, and the sitemap is named by
// its full address, which is the form a crawler needs.
import type { APIRoute } from 'astro';

import { pageUrl } from '../lib/address.ts';

export const GET: APIRoute = ({ site }) => {
  const lines = ['User-agent: *', 'Allow: /', '', `Sitemap: ${pageUrl('/sitemap.xml', site)}`, ''];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
