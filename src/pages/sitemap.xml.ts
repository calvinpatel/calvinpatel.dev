// The sitemap, at /sitemap.xml: every page a search engine should list, at the
// address the site serves it from (src/lib/address.ts). That is the home
// page, Credits, and one case study per file in src/content/case-studies/, so
// a new case study is listed with no edit here. The 404 page stays out.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

import { pageUrl } from '../lib/address.ts';

export const GET: APIRoute = async ({ site }) => {
  const studies = await getCollection('caseStudies');
  const paths = ['/', '/credits', ...studies.map((study) => `/projects/${study.data.project}`).sort()];
  const urls = paths.map((path) => `  <url><loc>${pageUrl(path, site)}</loc></url>`);
  const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''];
  return new Response(xml.join('\n'), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
