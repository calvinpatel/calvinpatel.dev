// Content collections for calvinpatel.dev.
//
// Every piece of site copy lives in src/content/ and is checked here when the
// site builds. A missing field, a misspelled field name, a banned phrase, or
// Markdown other than links and italics stops `npx astro build` with a message
// that names the file and the field. Components read copy only through these
// collections (CLAUDE.md rule 1).
import { existsSync } from 'node:fs';
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const CONTENT = './src/content';

// --- Shared field types --------------------------------------------------

// CLAUDE.md rule 4 and DESIGN.md's banned list.
const BANNED = [/hipaa[\s-]*compliant/i, /de-identified/i];

// CLAUDE.md rule 3: content fields may hold links and italics, nothing else.
const OTHER_MARKDOWN = [
  /\*\*/, // bold
  /__/, // bold
  /`/, // code
  /~~/, // strikethrough
  /!\[/, // images
  /<[a-z/!]/i, // HTML
  /^\s*#/m, // headings
  /^\s*[-+*]\s/m, // bullets
  /^\s*\d+\.\s/m, // numbered lists
];

// Where a link may point: another site over https, a page on this site, a
// section on this page, or an email address.
const HREF = /^(https:\/\/\S+|\/\S*|#[a-z0-9-]+|mailto:\S+)$/;
const LINK_TARGETS = /\]\(([^)\s]*)\)/g;

const text = z
  .string()
  .trim()
  .min(1)
  .refine((s) => !BANNED.some((r) => r.test(s)), {
    message: 'Uses a banned phrase ("HIPAA-compliant" or "de-identified"). See CLAUDE.md rule 4.',
  });

const inline = text
  .refine((s) => !OTHER_MARKDOWN.some((r) => r.test(s)), {
    message: 'Content fields may hold only links and italics (CLAUDE.md rule 3).',
  })
  .refine((s) => [...s.matchAll(LINK_TARGETS)].every(([, href]) => HREF.test(href)), {
    message: 'A link must point to https://…, /a-page, #a-section, or mailto:…',
  });

const href = z.string().regex(HREF, 'A link must point to https://…, /a-page, #a-section, or mailto:…');
const link = z.object({ label: text, href }).strict();
const slug = z.string().regex(/^[a-z0-9-]+$/, 'Use lowercase letters, digits, and hyphens.');
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Write months as YYYY-MM.');

// One file per collection, or one file per entry in a folder (the entry's id
// is its file name without .md).
const file = (name: string) => glob({ pattern: name, base: CONTENT });
const folder = (dir: string) => glob({ pattern: '*.md', base: `${CONTENT}/${dir}` });

// --- Site-wide: top bar, brain navigation, footer ------------------------

// DESIGN.md fixes which lobe leads to which section.
const LOBE_FOR = {
  about: 'frontal',
  projects: 'occipital',
  experience: 'temporal',
  skills: 'cerebellum',
  contact: 'parietal',
} as const;

const site = defineCollection({
  loader: file('site.md'),
  schema: z
    .object({
      mark: text,
      markLabel: z.object({ home: text, elsewhere: text }).strict(), // read out after the mark's visible text
      navLabel: text, // the top bar nav's name for screen readers
      sections: z
        .array(
          z
            .object({
              id: z.enum(['about', 'projects', 'experience', 'skills', 'contact']),
              label: text, // top bar link, section heading, brain label's first line
              lobe: z.enum(['frontal', 'occipital', 'temporal', 'cerebellum', 'parietal']),
              lobeLine: text, // brain label's second line
              phoneLine: text, // shown under the brain on the first tap
            })
            .strict(),
        )
        .length(5),
      brainHint: z.object({ pointer: text, touch: text }).strict(),
      footer: z.object({ credit: text, creditsLabel: text, copyright: text }).strict(),
    })
    .strict()
    .superRefine((site, ctx) => {
      const ids = site.sections.map((s) => s.id);
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({ code: 'custom', path: ['sections'], message: 'Each section appears once.' });
      }
      site.sections.forEach((s, i) => {
        if (LOBE_FOR[s.id] !== s.lobe) {
          ctx.addIssue({
            code: 'custom',
            path: ['sections', i, 'lobe'],
            message: `DESIGN.md maps ${s.id} to the ${LOBE_FOR[s.id]} lobe.`,
          });
        }
      });
    }),
});

// --- Hero ------------------------------------------------------------------

const hero = defineCollection({
  loader: file('hero.md'),
  schema: z
    .object({
      name: text,
      lines: z.tuple([inline, inline]), // each sentence starts its own line
    })
    .strict(),
});

// --- About -----------------------------------------------------------------

const about = defineCollection({
  loader: file('about.md'),
  schema: ({ image }) =>
    z
      .object({
        lede: z.tuple([text, text]), // each sentence starts its own line
        // Five paragraphs, one per turning point of the margin dendrite:
        // soma, pruned branch, both sides, two branches, growth cone.
        story: z.array(inline).length(5),
        // Added once Calvin supplies it; every image needs real alt text.
        photo: z.object({ src: image(), alt: text, caption: inline.optional() }).strict().optional(),
      })
      .strict(),
});

// --- Projects ----------------------------------------------------------------

const result = z
  .object({
    value: z.string().regex(/^[\d,.]+%?$/, 'A result is a number, optionally followed by %.'),
    label: text,
  })
  .strict();

const projects = defineCollection({
  loader: folder('projects'),
  schema: z
    .object({
      name: text,
      order: z.number().int().positive(), // row order in the Projects section
      status: z.enum(['Live', 'Building now', 'Up next']),
      description: inline,
      results: z.array(result).length(4).optional(), // shown large; NotePilot only for now
      measurementNote: inline.optional(),
      links: z.array(link).default([]),
    })
    .strict()
    .refine((p) => !p.results === !p.measurementNote, {
      message: 'Results need their measurement note, and the note needs results.',
      path: ['measurementNote'],
    }),
});

// --- Case studies (one page each, at /projects/<project id>) ----------------

const block = z.union([
  z.object({ text: inline, figure: slug.optional() }).strict(), // a paragraph, optionally with a figure beside it
  z.object({ list: z.array(inline).min(1) }).strict(), // a bulleted list
]);

const caseStudies = defineCollection({
  loader: folder('case-studies'),
  schema: z
    .object({
      // The page's title, status, and links come from this project. Checked
      // here because Astro's own reference() only logs a missing entry and
      // lets the build pass.
      project: slug.refine((id) => existsSync(`${CONTENT}/projects/${id}.md`), {
        message: 'No file with this name in src/content/projects/.',
      }),
      lede: inline,
      parts: z
        .array(
          z
            .object({
              id: slug,
              heading: text,
              showResults: z.boolean().default(false), // the project's large results sit at the top of this part
              blocks: z.array(block).min(1),
            })
            .strict(),
        )
        .min(1),
      figures: z
        .record(
          slug,
          z
            .object({
              rows: z.array(z.object({ phrase: text, reading: text }).strict()).min(1),
              caption: text,
            })
            .strict(),
        )
        .default({}),
      backLabel: text,
    })
    .strict()
    .superRefine((cs, ctx) => {
      cs.parts.forEach((part, p) =>
        part.blocks.forEach((b, i) => {
          if ('figure' in b && b.figure && !(b.figure in cs.figures)) {
            ctx.addIssue({
              code: 'custom',
              path: ['parts', p, 'blocks', i, 'figure'],
              message: `No figure named "${b.figure}" under figures.`,
            });
          }
        }),
      );
    }),
});

// --- Experience --------------------------------------------------------------

const experience = defineCollection({
  loader: file('experience.md'),
  schema: z
    .object({
      entries: z
        .array(
          z
            .object({
              role: text,
              org: text,
              location: text,
              dates: text, // shown as written
              start: month, // for the raster's time axis
              end: z.union([month, z.literal('present')]),
              schedule: z.enum(['full-time', 'part-time']), // raster spike density
              description: inline,
            })
            .strict(),
        )
        .min(1),
    })
    .strict()
    .superRefine(({ entries }, ctx) => {
      entries.forEach((e, i) => {
        if (e.end !== 'present' && e.end < e.start) {
          ctx.addIssue({ code: 'custom', path: ['entries', i, 'end'], message: 'Ends before it starts.' });
        }
        if (i > 0 && e.start > entries[i - 1].start) {
          ctx.addIssue({ code: 'custom', path: ['entries', i, 'start'], message: 'Entries go newest first.' });
        }
      });
    }),
});

// --- Skills ------------------------------------------------------------------

const skills = defineCollection({
  loader: file('skills.md'),
  schema: z
    .object({
      hint: text, // desktop only; phones have no hover
      places: z.array(z.object({ id: slug, label: text }).strict()).min(1), // the diagram's right column, top to bottom
      groups: z
        .array(
          z
            .object({
              name: text,
              skills: z
                .array(
                  z
                    .object({
                      name: text, // the diagram label
                      detail: text.optional(), // the rest of the Site copy line, for the screen-reader list
                      places: z.array(slug).min(1),
                    })
                    .strict(),
                )
                .min(1),
            })
            .strict(),
        )
        .min(1),
    })
    .strict()
    .superRefine((s, ctx) => {
      const known = new Set(s.places.map((p) => p.id));
      const used = new Set<string>();
      s.groups.forEach((g, gi) =>
        g.skills.forEach((sk, si) =>
          sk.places.forEach((p, pi) => {
            used.add(p);
            if (!known.has(p)) {
              ctx.addIssue({
                code: 'custom',
                path: ['groups', gi, 'skills', si, 'places', pi],
                message: `No place with id "${p}".`,
              });
            }
          }),
        ),
      );
      s.places.forEach((p, i) => {
        if (!used.has(p.id)) {
          ctx.addIssue({ code: 'custom', path: ['places', i], message: `No skill connects to "${p.id}".` });
        }
      });
    }),
});

// --- Credits page (/credits) --------------------------------------------------
// The heading and intro. The list under them comes from public/cells/index.json,
// one credit line per neuron, so it follows the cells as they change.

const credits = defineCollection({
  loader: file('credits.md'),
  schema: z.object({ heading: text, intro: inline }).strict(),
});

// --- Contact -----------------------------------------------------------------

const contact = defineCollection({
  loader: file('contact.md'),
  schema: z.object({ email: z.email(), links: z.array(link).min(1) }).strict(),
});

export const collections = { site, hero, about, projects, caseStudies, experience, skills, credits, contact };
