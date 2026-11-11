# calvinpatel.dev design rules

This file says how the site looks and moves, and why. The exact values live in `src/styles/tokens.css`; this file names them and explains where each one goes. The chosen designs are on the design canvas, which comes into the repo through its Export menu. When this file and a canvas artboard disagree, this file wins: it records decisions made after the artboards were drawn (the interface grays, two contrast fixes, and every motion rule).

Where this file is silent, match the artboard. Where both are silent, choose the plainest option that fits the theme lock below, and list the choice for Cal so he can log it.

## Theme lock

A dark, quiet page that reads as a nervous system. The ground is true black. The hero is a fluorescence micrograph come to life: real neuron reconstructions in GFP green and tdTomato red with DAPI blue nuclei, drifting behind a brain drawn in lateral view whose five lobes are the navigation. Below the hero there is no color at all. Each section carries one thin ink drawing of a cell part or process (an axon, a dendrite, a spike raster, a wiring diagram, a synapse), drawn in the main text color, never behind or through text. Headlines are Fraunces, a soft and slightly wonky serif, at regular weight. Everything else is IBM Plex Sans at normal letter spacing. The interface grays carry a faint trace of DAPI blue. Links are the text color with a gray underline; there is no accent color. Motion has one language: a signal travels, the thing it reaches brightens, and it fades back, once, when its section scrolls into view.

## The chosen designs

All on the design canvas. Every other artboard is a rejected option kept for the record. The mocks show older interface grays; tokens.css replaces them.

| Section | Desktop artboard | Phone artboard |
| --- | --- | --- |
| Hero | D: A's bar and line, C's name | D on a phone: links in a second row |
| Brain labels | 3: Text on a shelf | (labels move under the brain) |
| Projects | Chosen: 4 with axon dividers | Chosen on a phone: axon dividers |
| Case study (NotePilot) | 1 with the Projects axon | 1 with the Projects axon, on a phone |
| About | 1 + branching dendrite in the margin | Dendrite version on a phone |
| Experience | 3: A raster row before each entry | 3 on a phone |
| Skills | 2: Signal-flow wiring diagram | 2 on a phone |
| Contact | 1d: Option 1's flow, redrawn | 1d on a phone: turned to flow down |
| Interface colors | B: Faintly cool | |

## Color

### Interface colors

| Token | Value | Job |
| --- | --- | --- |
| `--color-bg` | `#000000` | The page. True black so the fluorescence reads as light in the dark. |
| `--color-surface` | `#0e1014` | Figure boxes, such as the case study's comma diagram. |
| `--color-border` | `#212327` | The edge of a surface. |
| `--color-hairline` | `#2c2e32` | Thin rules. |
| `--color-text` | `#dddfe4` | Names, headings, links, the hero name, the Contact email. |
| `--color-text-secondary` | `#caccd1` | Reading text: hero sentences, descriptions, the About story, the case study body. Also Experience dates. |
| `--color-text-muted` | `#aaacb1` | Details: status, locations, organizations, captions, hints, the footer. |
| `--color-link-underline` | `#67696d` | A link's underline at rest. |
| `--color-selection` | `#3b3d41` | Selected text. |
| `--color-focus` | main text color | The focus ring. |

Rules:

- **No accent color.** Links stay whatever color their text already is and are marked by an underline. A colored accent would compete with the fluorescence in the hero, and the underline is enough.
- **The three text colors have fixed jobs.** Main text names things, secondary text is for reading, and muted text holds details. Four exceptions from the artboards: NotePilot's Projects description, the case study lede, and a case study paragraph marked `emphasis: true` in its content file (the hard part's closing line) use the main text color, and Experience dates use the secondary color while their location stays muted.
- **Border and hairline are decoration only.** They measure 1.21:1 and 1.54:1 against black, so they can never be the only sign of something, such as the edge of a control.

### Illustration colors

| Token | Value | Job |
| --- | --- | --- |
| `--ink` | main text color | Every line drawing: dividers, the dendrite, the raster, the Skills wiring, the synapse. |
| `--fluor-gfp` | `#44e07c` | Neurons in the hero. |
| `--fluor-tdtomato` | `#ff5a4a` | Neurons in the hero. |
| `--fluor-dapi` | `#4f6dff` | Nuclei in the hero and the brain. |

Rules:

- **Fluorescence colors never set text or interface.** They glow well on a cell but fail as text; DAPI blue is exactly 4.50:1 on the surface color, with no margin.
- **Fluorescence stays in the hero.** Below the hero, every drawing is ink.
- **Line art that carries information stays at 41% ink opacity or more** (`--ink-meaningful-min`), which keeps it at 3:1. That covers the Skills connections and the Experience spikes. The Skills connections rest exactly on the floor (`--wire-op`), up from the artboard's 20%. Purely decorative parts can go fainter: the wrapped myelin, the dendrite, and the raster's baseline and year marks.

### Contrast

Every text pair passes WCAG AA (4.5:1). Checked against black, surface, and selection:

| Text | On black | On surface | On selection |
| --- | --- | --- | --- |
| Main | 15.75 | 14.28 | 8.16 |
| Secondary | 13.07 | 11.85 | 6.77 |
| Muted | 9.25 | 8.38 | 4.79 |

The link underline measures 3.82:1 on black and 3.46:1 on surface, which clears the 3:1 minimum for graphics, so the underline alone can mark a link.

**Dimmed labels.** When something dims text, such as the Skills diagram while a path is traced, the dimmed label is the main text color at 53% opacity or more (`--dim-text-min`), whatever color it has at rest. That keeps it at 4.5:1. The artboard's 25% measured 1.79:1 and failed. Lines may dim further.

**The neuron layer behind text.** The hero canvas is the background for the hero text and for every brain label. Behind any of that text, including wherever a label can appear, the layer's brightest pixel stays at luminance 0.053 or below (`--canvas-cap-luminance`, about `#404040`). The cap counts signals, soma glows, and overlapping cells, not just resting cells. Over black, this equals GFP at 33% opacity, tdTomato at 45%, and DAPI at 53% (the `--canvas-cap-*` tokens). The muted second line of a brain label is the tightest pair, so the cap is set for it and covers everything else. The labels' dark shadow helps legibility but doesn't count toward the ratio.

## Type

### Families

- **Fraunces** for headlines: weight 400, softness 100, wonky letters on (`--display-settings`), letter spacing −0.01em (`--display-tracking`), optical size automatic so it adjusts with the size.
- **IBM Plex Sans** for everything else: weight 400, plus 400 italic for titles of works (such as *Nature Neuroscience*) and 500 for brain-label names only, normal letter spacing.
- Both use the Open Font License and are self-hosted. Only these weights and axes are needed.
- Fraunces has no → glyph, so every arrow is set in Plex, even inside a Fraunces line.

### Scale

Sizes grow from the phone mocks (390px wide) to the desktop mocks (1440px). Steps written as a plain `vw` value keep the chosen mock's formula. The hero name is the reason: its size has to track the window the same way the brain's 58% column does. An even ramp would reach about 63px at a 900px window and push the name onto two lines in the 360px text column.

| Step | Phone | 1440px | Used for | Line height |
| --- | --- | --- | --- | --- |
| `--step-display-1` | 48 | 79 | Hero name | `--leading-none` |
| `--step-display-2` | 44 | 72 | Case study title | `--leading-none` |
| `--step-display-3` | 36 | 49 | Section headings | `--leading-display` |
| `--step-display-4` | 28 | 40 | Contact email | `--leading-heading` |
| `--step-display-5` | 28 | 35 | Project names | `--leading-heading` |
| `--step-lede` | 25 | 35 | About lede | `--leading-lede` |
| `--step-display-6` | 28 | 32 | Results numbers | `--leading-none` |
| `--step-display-7` | 26 | 32 | Case study section headings | `--leading-heading` |
| `--step-display-8` | 24 | 29 | Experience roles | `--leading-heading` |
| `--size-mark` | 22 | 22 | The CP mark | `--leading-none` |
| `--step-text-1` | 19 | 22 | Case study lede | `--leading-snug` |
| `--step-text-2` | 18 | 21 | Hero sentences | `--leading-snug` |
| `--step-text-3` | 17 | 18 | Long reading text (About story, case study body), NotePilot's description, Contact's GitHub and LinkedIn | `--leading-prose`; `--leading-snug` for the description |
| `--step-text-4` | 16 | 16 | Body text, project and Experience descriptions, links, Experience organizations, brain-label names (weight 500) | `--leading-body`; `--leading-lede` for label names |
| `--step-text-5` | 14 | 15 | Nav links, result labels, Skills place labels and hint | `--leading-snug` |
| `--step-text-6` | 14 | 14 | Status, dates and location, the tap hint, photo captions, the measurement note | `--leading-label` |
| `--step-text-7` | 13 | 13 | Brain-label second line, footer, figure captions, Skills labels, raster year labels | `--leading-label` |

Rules:

- **13px is the floor.** Nothing on the site is smaller than `--step-text-7`. The raster's "2020" and "now" labels were 11px on the artboard and move up to 13px.
- **Labels are plain.** Status words (Live, Building now, Up next), dates, and captions are Plex in the muted color at their normal case and spacing. The banned list rules out letter-spaced monospace labels.
- **Headlines are always Fraunces at 400.** No bold Fraunces anywhere.
- **Curly punctuation.** Every rendered apostrophe and quotation mark is typographic (’ “ ”). Content files may use straight ones; the build converts them. Straight marks stay only in code.
- **Nothing clips.** If a visitor enlarges text, lines may wrap, including the hero name, but text never overflows, clips, or overlaps.

## Spacing and layout

### Spacing scale

| Token | Phone | 1440px | Used for |
| --- | --- | --- | --- |
| `--space-3xs` | 4 | 4 | Small label offsets |
| `--space-2xs` | 8 | 8 | Stacked lines, link rows |
| `--space-xs` | 12 | 12 | Tight gaps |
| `--space-s` | 16 | 20 | Gaps inside an entry |
| `--space-m` | 24 | 32 | Between items, column gaps |
| `--space-l` | 32 | 48 | Section heading to its content |
| `--space-xl` | 48 | 72 | Wide column gaps, case study parts |
| `--space-section` | 80 | 120 | Top and bottom of each section |
| `--gutter` | 20 | 64 | Page side margins (5vw) |

Spacing inside sections follows the artboards, using the nearest token from this scale. Don't invent in-between values.

### Page

- **Width.** Content sits in one centered column at most `--page-max` (1320px) wide including the gutters, which leaves 1192px of content at full width.
- **Reading widths.** Long reading text sits in `--reading-max` (680px): the case study column and the About story. Descriptions stop at `--measure` (66 characters per line).
- **Tap targets.** Every standalone link and control is at least `--tap-min` (44px) in both directions on touch screens. Links inside a sentence are exempt, as WCAG allows. Don't enlarge their tap area, because it would overlap the lines around them.

### Section grids

- **Hero.** A text column of at least `--hero-text-min` (360px) on the left, and the brain at `--hero-brain` (58% of the hero's content width) on the right. The name and hero sentences sit middle left.
- **Projects rows.** Status (`--col-status`, 160px) | text | links (`--col-links`, 200px), with `--col-gap` (32px) between columns.
- **Experience rows.** Dates and location (`--col-dates`, 200px) | text, with `--col-gap` between.
- **About.** The dendrite margin (`--dendrite-margin`, 40px) and its gap (`--dendrite-gap`, 20px) beside the story, the story at 680px, and the photo column (`--about-photo`, 340px) to the right. Below 900px the photo is at most `--about-photo-phone` (300px) wide.
- **Contact.** The figure (`--contact-figure`, 430px) | the contact block.

### Breakpoints

Media queries can't read custom properties, so these widths are written as numbers in the CSS and listed in tokens.css's header.

- **Below 760px:** the hero stacks (text, then the brain at full width), Experience rows stack, and the case study results go from four across to a 2×2 grid.
- **Below 900px:** Projects rows stack and their results go from four across to a 2×2 grid, the About photo moves under the opener, and the Contact figure turns to flow down onto the email.
- **Below 1048px of content width:** the case study's comma figure leaves the margin and follows its paragraph. This one is a container query on the page's content width, not on the window, so it doesn't depend on the scrollbar's width. 1048px is the reading column, the gap at its widest, and the figure: `--reading-max` + 48px + `--figure-width`.
- **Skills, by its own content width in rem:** two container queries on the section's content width, not on the window. They are in rem so they follow enlarged text: the labels and the thresholds grow together, so a label that fits at default text fits at any text size.
  - **45rem or more** (720px, an 800px window, at default text): the desktop wiring diagram. This is where the longest skill label fits left of its column: "3D neuron reconstruction" is about 149px at 13px, and 149 / 0.21 = 710px, or 44.4rem. A longer skill name means raising it.
  - **17.5rem to 45rem:** one diagram per group. This replaces "below 760px" for Skills.
  - **Below 17.5rem** (a 320px window at default text): the plain list shows instead of the diagrams. 17.5rem is the narrowest the per-group layout fits once its columns have shifted (see Drawings).

## Components

**Links.** A link keeps the color of the text around it, with an underline in `--color-link-underline` set `--link-underline-offset` (4px) below the text. On hover, the underline brightens to `--color-text` instantly; nothing else changes. Visited links look the same as unvisited ones. The top bar's section links and the CP mark are the one exception: no underline at rest, and the standard underline appears on hover.

**Focus.** Every link and every brain lobe shows a ring on keyboard focus: `--focus-width` (2px) solid in `--color-focus`, with `--focus-offset` (4px) of space. Use `:focus-visible`, and never remove the ring without replacing it with this one.

**Buttons.** The designs have none: every control is a link or a brain lobe, and the lobes are links too. If a real action ever needs a `<button>`, style it like a link. No filled or outlined pills.

**Top bar.** It holds the CP mark (Fraunces, `--size-mark`) and the five section links (About, Projects, Experience, Skills, Contact) in Plex at `--step-text-5`, all in the main text color. On phones the links move into a full-width second row under the mark, each with a 44px tap target. The case study page uses the same bar.

**Figure box.** Used for the case study's comma diagram. A `--color-surface` box with a 1px `--color-border` edge, `--radius` (12px) corners, and `--figure-padding` (20px) of padding. In the margin it is `--figure-width` (320px) wide.

**Brain label (shelf).** The callout dendrite ends in a short horizontal line, and the label sits on it with no box. The first line is the section name in Plex at `--step-text-4`, weight 500, in the main text color. The second line is the lobe and what it does, such as "Frontal lobe: personality and planning," at `--step-text-7` in the muted color. A soft dark shadow (`--label-shadow`) sits behind the letters. The text goes on the side away from the brain: right-aligned for labels on the left, left-aligned for labels on the right. The Skills label, the only one below the brain, hangs under its shelf and wraps to two lines. On phones, the labels appear under the brain.

**Footer.** The neuron credit line (NeuroMorpho.Org, CC BY 4.0) with a Credits link, plus the copyright, in `--step-text-7` muted. It stacks on phones.

**Selection.** Selected text uses `--color-selection` behind the main text color.

## Sections

**Hero.** The top bar, then the name on one line in Fraunces and the two hero sentences in Plex, each sentence starting its own line, in the secondary color. The brain sits on the right with the hint under it. On phones, everything is left-aligned, with the brain full width below the text and the tap hint centered under it. The neuron canvas fills the hero behind everything (see Motion).

**Brain navigation.** Five lobes, each a real link to a section: frontal lobe → About, occipital → Projects, temporal → Experience, cerebellum → Skills, parietal → Contact. Hover or keyboard focus shows that lobe's label. On touch, the first tap shows the label and the second tap goes to the section.

**Projects.** Each project is one row: the status in the left column, the name in Fraunces, then the description, and the links in the right column. NotePilot's row adds its four results in Fraunces (`--step-display-6`), with labels at `--step-text-5` and a note on how they were measured at `--step-text-6`. A myelinated axon runs through the section: a soma and tapering hillock under the heading, a divider between projects with sheaths and faint wrapped layers, and branching terminals at the end. Desktop nodes sit every `--axon-node-spacing` (80px) so they land on the column gutters; place them from the real column positions at each width. Below 900px, each project stacks status, name, description, and links, and the results form a 2×2 grid. The dividers keep the same 80px spacing at every width, with the last sheath cut off at the edge.

**Case study page** (for example, `/projects/notepilot`). The top bar, then the status, the title, the lede, and the links, with the axon's soma and hillock under that block. A divider comes before each part (What it does, The hard part, Results, What's next). On desktop the dividers match the 680px reading column; on phones they run the full content width, inside the gutters. Section headings use `--step-display-7`. The comma diagram sits in the margin beside the hard part's third paragraph on desktop, and full width right after that paragraph on phones. The branching terminal replaces the line above "Back to projects."

**About.** The heading, the opener as a Fraunces lede, then the story with the photo to its right. "Prelude" links to the Projects section and "NotePilot" to its case study. A thin dendrite grows down the margin beside the story. It has a soma at the first paragraph, a fainter pruned branch at medical school, branches on both sides at building, two branches at today, and a growth cone lined up with the last paragraph. On phones, the dendrite moves into the 20px left edge so the story keeps its full width, with each turning point as a single short twig angled toward the edge. The photo sits right after the opener, up to `--about-photo-phone` (300px) wide at 4:5.

**Experience.** Six entries, newest first. Each entry is preceded by a full-width spike raster on one shared time axis from 2020 to now, with spikes across that role's dates (see Drawings).
- Spike density shows only full-time (dense) versus part-time (sparse).
- Each row carries faint year marks and "2020" and "now" labels at its ends, so it reads without a separate axis.
- The ongoing role gets a brighter marker where its spikes end.
- Each entry shows dates (secondary color) and location (muted) in the left column, lined up with the role's first line. Then come the role in Fraunces, the organization in muted text, and the description.
- On phones, dates and location share one line, separated by a comma: "May 2026 – present, Remote."
- In the education entry, the school is the Fraunces line and the degree (M.H.S.) is the muted line, as on the artboard.
- **Spacing:** heading to the first raster `--space-l`; a raster to its entry's text `--space-s`; role to organization `--space-3xs`; organization to description `--space-xs`; the end of one entry to the next raster `--space-l`.

**Skills.**
- **Desktop.** Skills on the left flow into their nine groups in the middle, then out to the places they were used on the right. Every label is readable without hovering. Hovering a skill, group, or place traces its path. A plain list sits behind the diagram for screen readers.
- **What keeps it from being a plexus.** Every dot is labeled, every connection is curved and carries real data, and the flow runs in one direction. Never use straight lines or unlabeled dots, and never use the diagram as background decoration.
- **Phones.** One small diagram per group, with the group name as its heading. Each skill connects straight to its own places, with no group node, so the static figure never implies a connection that isn't true. There is no hover on phones.
- **Which one shows.** The section's own content width decides, in rem (see Breakpoints): the desktop diagram at 45rem or more, one diagram per group from 17.5rem to 45rem, and the plain list below 17.5rem.
- **The plain list.** Nine groups, each with its skills, each item written like the master sheet's Site copy line: "Anthropic API (tool use, structured outputs, streaming): NotePilot". Screen readers get it at every width. It is visible, in place of the diagrams, below 17.5rem and with JavaScript off, because the script draws the diagrams. When visible, group names are `--step-text-7` muted, as on phones, and the skills are body text in the secondary color.

**Contact.**
- **Desktop.** A myelinated axon with three sheaths curves up from the lower left. A short bare stretch leads into a terminal that flares open toward the contact side, with vesicles packed at its face. Across the gap, the receiving membrane and its bright receptor band sit right against the contact block. The email is large in Fraunces, with GitHub and LinkedIn beneath it.
- **Phones.** The figure turns so the axon comes down from above and the terminal opens downward onto the email. GitHub and LinkedIn get 44px tap targets.

## Drawings

Every drawing is ink line art measured from its chosen artboard. The numbers are tokens in tokens.css; shapes that are drawn by hand rather than generated are given here as SVG path data. Draw each one at its real pixel size, in an SVG sized in CSS px. Never stretch a drawing with a `viewBox` that scales its text or its line widths. A drawing snaps to its own pixels, counted from its SVG's corner, because that's where Chrome starts painting it: an SVG's contents are painted from the screen pixel nearest its corner, wherever the SVG falls on the page. Colors are always `--ink` (or `--color-bg` where a shape cuts a gap) with the opacity tokens below. Every drawing is decorative and hidden from screen readers, because the text beside it says what it shows.

### Spike raster (Experience)

One raster row sits above each entry, across the full content width.

- **Time axis.** Shared by every row. It starts on January 1 of the earliest start year in the content (2020) and ends at "now," which is the build date. The build writes that date into the page, so "now" and the ongoing marker move forward with each deploy and stand still between deploys. A position is `(date − start) / (now − start) × width`. Months are inclusive: a role ending `2021-07` runs through July 31.
- **Band.** `--raster-band` (16px) tall, with a `--line` baseline through its middle across the full width at `--raster-baseline-op`.
- **Year marks.** `--raster-tick` (6px) ticks centered on the baseline at January 1 of every year, including the first, at `--raster-tick-op`.
- **Spikes.** `--raster-spike` (12px) tall, `--raster-spike-stroke` wide with round ends, centered on the baseline, resting at `--ink-rest`. They run from the first day of the start month to the last day of the end month, in bursts placed left to right:
  - full-time: `--raster-ft-burst-min` to `--raster-ft-burst-max` spikes per burst, `--raster-pitch` apart, with `--raster-ft-gap-min` to `--raster-ft-gap-max` between bursts;
  - part-time: 1 to `--raster-pt-burst-max` spikes per burst, `--raster-pitch` apart, with `--raster-pt-gap-min` to `--raster-pt-gap-max` between bursts.

  Full-time bursts are always tight clusters and part-time spikes stand nearly alone, so even a short role on a phone shows its schedule. Spacing is in pixels, so a narrower row has fewer spikes, not tighter ones.
- **Seeded pattern.** The pattern is identical on every load and every build. Seed a mulberry32 generator with the 32-bit FNV-1a hash of the string `start|end|schedule` (for example `2021-06|2021-09|full-time`). Then, from left to right, draw each burst's size and then the gap after it, each as a whole number spread evenly across its range.
- **Pixel centers.** Each role's first spike and the ongoing marker move to the nearest pixel center (n + 0.5px from the row's left end), so they sit within half a pixel of the position formula. Spacing is in whole pixels, so every spike then lands on a pixel center and sits mostly in one pixel column on a 1x screen, and every row is equally sharp.
- **Ongoing role.** A `--raster-marker` (18px) vertical line, `--raster-marker-stroke` wide with round ends, at full ink, at the "now" end of the axis. Its spikes stop at least one minimum gap short of it, by the role's own schedule (`--raster-ft-gap-min` for full-time, `--raster-pt-gap-min` for part-time). The marker sits where the next burst would start, so it never reads as part of a burst.
- **Labels.** "2020" (the axis start year) and "now" at the two ends, `--space-3xs` below the band, in `--step-text-7` muted. "now" is design text, not copy.
- **Phones.** Same geometry at the phone's real width.
- **Before the script runs.** Each row reserves its full height and shows its baseline and its two labels, which CSS can draw. The script adds the year marks, spikes, and marker. Without JavaScript the row stays that way, which is fine because the raster is decorative.

### Myelinated axon dividers (Projects, case study)

Each divider is a `--axon-band` (28px) strip with the axon through its middle. Coordinates below are in px from the divider's left end, with the axon at y = 14.

- **Axon.** A `--line` line at `--axon-op`, from the hillock (or the left end) to the right end, or to the terminal's split.
- **Soma and hillock** (the first divider in a section only). The soma is a `--axon-soma` (12px) circle centered at (9, 14), full ink, resting at `--ink-rest`. The hillock is `M14 9.5 L34 13.3 L34 14.7 L14 18.5 Z` at `--hillock-op`. The axon starts at x = 30.
- **Sheaths.** Every `--axon-node-spacing` (80px), starting at a = 100 on the first divider and a = 20 on the others. Each sheath is `M{a} 14 Q{a+3} 10.5 {a+9} 10.5 L{a+63} 10.5 Q{a+69} 10.5 {a+72} 14 Q{a+69} 17.5 {a+63} 17.5 L{a+9} 17.5 Q{a+3} 17.5 {a} 14 Z`, filled at `--sheath-fill-op` with a `--line` edge at `--sheath-edge-op`. Sheaths continue to the right edge, where the last may be cut off. On the last divider, they stop before the terminal's split.
- **Lamellae.** Two lines per sheath, `M{a+10} 12.4 L{a+62} 12.4 M{a+10} 15.6 L{a+62} 15.6`, `--lamella-stroke` wide at `--lamella-op`.
- **Nodes.** A `--node-radius` dot at x = a − 4 in front of each sheath, full ink, resting at `--ink-rest`.
- **Terminal** (the last divider only; W is the divider's width). The axon splits at W − 82 into three branches: `M{W−82} 14 Q{W−64} 14 {W−42} 5`, `M{W−82} 14 Q{W−64} 14 {W−34} 14`, and `M{W−82} 14 Q{W−64} 14 {W−42} 23`, each a `--line` at `--axon-op`. Boutons of `--bouton-radius` sit at (W−39, 5), (W−31, 14), and (W−39, 23), full ink, resting at `--ink-rest`.
- **Where they go.** In Projects, the first divider sits under the heading, one sits between projects, and the last ends the section; on desktop, nudge the sheath start so nodes land on the column gutters. On the case study page, the first sits under the title block, one comes before each part, and the last replaces the line above "Back to projects." The case study's dividers are 680px wide on desktop and the full content width on phones. Phones use the same 80px spacing.

### Dendrite (About)

- **Desktop.** A `--dendrite-margin` (40px) column left of the story, with a `--dendrite-gap` (20px) gap. The trunk is a `--line` line at `--dendrite-trunk-op` down the column's center (x = 20), from 12px below the top of the first paragraph to the growth cone's tip, 6px below the top of the last paragraph.
- **Turning points.** Each is drawn in a 40 × 48 box at the top of its paragraph (the growth cone's box is 40 × 20, set 2px down). Branches are `--line` lines with round ends.

```
1. First paragraph (soma)   soma: circle (20, 12), diameter --dendrite-soma, full ink
                            branch: M20 32 Q13 27 7 18 M11 23 L3 24          --dendrite-branch-op
2. Medical school (pruned)  branch: M20 14 Q11 18 5 29                       --dendrite-pruned-op
                            bouton: circle (5, 30), radius 2, at --ink-rest
3. Building (both sides)    M20 16 Q12 11 6 3 M10 8 L2 11 M20 26 Q27 22 34 14  --dendrite-branch-op
4. Today (two branches)     M20 14 Q12 10 5 2 M20 24 Q12 27 5 35 M9 30 L3 27   --dendrite-branch-op
5. Last paragraph (cone)    M20 4 L13 15 M20 4 L20 17 M20 4 L27 15            --dendrite-cone-op
                            tips: radius 1.3 at (13, 15.5), (20, 17.5), (27, 15.5), full ink
```

- **Phones.** The dendrite sits in the 20px left edge. Each box is 16 × 32 at left −20px, with the trunk at x = 8; the cone's box is 16 × 16, set 7px down, with no tip dots. The trunk ends at the cone's tip, 7px below the top of the last paragraph.

```
1. soma: circle (8, 10), diameter --dendrite-soma-phone (6px); branch M8 22 Q5 18 2 14
2. pruned: M8 12 Q5 15 2 20; bouton radius 1.5 at (1.6, 21)
3. M8 14 Q5 10 2 5 M8 22 Q5 22 2 25
4. M8 12 Q5 9 2 5 M8 20 Q5 22 2 26
5. cone: M8 0 L4 9 M8 0 L8 11 M8 0 L12 9
```

### Wiring diagram (Skills)

- **Desktop columns,** as fractions of the content width:
  - skill labels right-aligned, ending at 21.0%;
  - skill dots at 22.0%;
  - group dots at 47.0%;
  - place dots at 79.7%;
  - place labels starting at 81.0%.

  Text keeps its token size at every width; it never scales with the drawing.
- **Rows.** Skills sit `--wire-row` (22px) apart, with an extra `--wire-group-gap` between groups, starting 30px from the top. Once a visitor's enlarged text makes one line of a label (`--step-text-7` × `--leading-label`) taller than `--wire-row`, a row grows to that line, in both layouts, so two rows' labels never overlap. Each group dot is centered on its skills, with the group's label centered 12px above the dot and outlined in `--color-bg` at `--wire-label-halo` (use `paint-order: stroke`) so it reads over the wires. Places are spread evenly from the first skill row to the last.
- **Dots.** Full ink: skills `--wire-skill-dot`, groups `--wire-group-dot`, places `--wire-place-dot`.
- **Wires.** Cubic curves that leave and arrive horizontally, with both control points at the horizontal midpoint. Skill wires run from 4px right of the skill dot to 8px left of the group dot. Place wires run from 8px right of the group dot to 10px left of the place dot. Never straight lines.
- **Text.** Skill labels `--step-text-7` secondary, group labels `--step-text-7` main, place labels `--step-text-5` main.
- **States.**
  - At rest, wires are `--line` at `--wire-op`.
  - While tracing, the traced wires are `--wire-traced-stroke` at `--wire-traced-op`, and the others drop to `--wire-dimmed-op`.
  - Labels and dots off the traced path dim to `--dim-text-min`.
  - Each label's whole row is the hover target.
- **Phones (the section's content narrower than 45rem).** One diagram per group:
  - Columns: skill labels end at 47.4% and skill dots sit at 49.7%; place dots sit at 70.3% and place labels start at 73.1%.
  - Column shift: where the longest labels don't fit those fractions (windows narrower than about 363px at default text), the two columns move toward each other just far enough to keep them inside the content. Skill labels end at the larger of 47.4% and the longest skill label's width; place labels start at the smaller of 73.1% and the content width less the longest place label's width. Each dot keeps its distance from its label (2.3% and 2.8% of the width), and every group uses the same columns. The script measures the labels, so a longer name adjusts itself.
  - Dots are 5px for skills and 8px for places.
  - Rows are `--wire-row` apart, with the skills and the places each centered in the group's height.
  - Wires use the same curves at `--wire-op`.
  - All labels are `--step-text-7`: skills secondary, places main.
  - The group name above each diagram is `--step-text-7` muted.

### Synapse (Contact)

A fixed figure: copy it as written, with `color: var(--ink)` on the SVG. On desktop it fills the `--contact-figure` column (430 × 200).

```html
<svg viewBox="0 0 430 200" style="color: var(--ink); overflow: visible" aria-hidden="true">
  <!-- axon with three sheaths: a wide stroke, a background-colored core, then the axon -->
  <path d="M0 148 C 100 158, 150 99, 262 100" fill="none" stroke="currentColor" stroke-opacity="0.34"
        stroke-width="8" stroke-linecap="round" stroke-dasharray="62 18 62 18 62 2018"/>
  <path d="M0 148 C 100 158, 150 99, 262 100" fill="none" style="stroke: var(--color-bg)"
        stroke-width="6" stroke-linecap="round" stroke-dasharray="62 18 62 18 62 2018"/>
  <path d="M0 148 C 100 158, 150 99, 262 100" fill="none" stroke="currentColor" stroke-opacity="0.5"/>
  <!-- nodes, in hop order; rest at --ink-rest -->
  <circle class="node" cx="70.7" cy="143.9" r="1.9" fill="currentColor"/>
  <circle class="node" cx="147.1" cy="120.4" r="1.9" fill="currentColor"/>
  <circle class="node" cx="224.8" cy="101.9" r="1.9" fill="currentColor"/>
  <g transform="translate(-90 0)">
    <!-- terminal, flaring open toward the contact block -->
    <path d="M351 98 C 384 97, 404 74, 434 66 C 452 61, 470 62, 476 70 L 476 130 C 470 137, 454 138, 440 133 C 414 125, 390 104, 351 102"
          fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.5"/>
    <!-- vesicles packed at its face -->
    <g fill="none" stroke="currentColor" stroke-opacity="0.45">
      <circle cx="465" cy="80" r="3.6"/><circle cx="467" cy="93" r="3.6"/><circle cx="467" cy="107" r="3.6"/>
      <circle cx="465" cy="120" r="3.6"/><circle cx="455" cy="87" r="3.6"/><circle cx="455" cy="100" r="3.6"/>
      <circle cx="455" cy="113" r="3.6"/><circle cx="444" cy="100" r="3.6"/>
    </g>
    <!-- released vesicles: hidden at rest, shown only during the sequence -->
    <circle class="release" cx="478" cy="88" r="2.2" fill="currentColor" opacity="0"/>
    <circle class="release" cx="478" cy="100" r="2.2" fill="currentColor" opacity="0"/>
    <circle class="release" cx="478" cy="112" r="2.2" fill="currentColor" opacity="0"/>
    <!-- receiving membrane and its receptor band (band rests at 0.55) -->
    <path d="M504 24 C 498 70, 498 130, 504 176" fill="none" stroke="currentColor" stroke-opacity="0.5"/>
    <path class="receptor" d="M503 70 C 500.5 88, 500.5 112, 503 130" fill="none" stroke="currentColor"
          stroke-width="3.2" stroke-linecap="round" opacity="0.55"/>
  </g>
</svg>
```

- **Phones (below 900px).** The same figure turned to flow down onto the email: `viewBox="0 0 200 430"`, 130px wide, with its contents wrapped in `<g transform="translate(200 0) rotate(90)">`, sitting 4px above the email.

## Motion

### The language

One motion language runs through the whole site: a signal travels at a set speed, the thing it reaches brightens, and it fades back to rest. Travel uses `--ease-travel` (linear), because a signal moves at constant speed. Anything that appears, grows, or fades uses `--ease-out`.

### Rules for every piece

1. **Each drawing plays once.** Each drawing, such as one raster row or one divider, plays the first time it is fully in view, then stays at rest. It doesn't wait for its section or fire with it, so drawings lower down don't play out of sight. The canvas mocks loop only so they could be reviewed.
2. **Reduced motion.** With reduced motion on, nothing travels or drifts. Each section's drawing shows in its final, resting state. The table at the end says what each piece does instead.
3. **Five-second window.** The neuron layer fires on its own only for the first `--spontaneous-window` (5 seconds) after the page loads. After that, it moves only when the visitor's pointer or finger moves it, and the brain's nuclei stop drifting at the same moment. WCAG 2.2.2 (Pause, Stop, Hide) requires a way to pause motion that starts by itself and runs longer than 5 seconds; motion the visitor starts doesn't count. This is why the hero has no pause button.
4. **Nothing animates out of sight.** Animations stop while their part of the page is off screen and while the tab is hidden.
5. **Motion never sits behind or through text,** except the neuron layer, which stays under the brightness cap in Color.
6. **Values come from tokens.css.** Never write a duration or speed into a component.

### Hero neuron layer

- **Cells.** Real reconstructions from `public/cells/` (the cell-web/1 format). Each cell is GFP or tdTomato, with DAPI nuclei.
- **Input.** A pointer or finger passing over a dendrite sends input toward the soma as a short burst, at `--signal-dendrite` (0.32 px/ms).
- **Firing.** The soma sums its inputs, which fade with `--membrane-tau` (260ms), and fires when they reach `--fire-threshold` (1). The spike fades outward from the soma. It runs down the axon at `--signal-axon` (1.15 px/ms) and back into the dendrites at `--signal-backprop` (0.55 px/ms). The cell then can't fire again for `--refractory` (420ms).
- **Brightness behind text.** Behind the text column and every brain-label position, the layer is dimmed to the canvas cap.
- **Reduced motion.** Signals appear in place with no travel, and nothing drifts.

### Brain callouts and labels

1. **The lobe responds.** Hovering or focusing a lobe highlights it over `--hover`.
2. **The pulse travels.** A pulse runs out along the lobe's callout at `--signal-backprop`, drawing the line as it goes, and only the end dot flashes.
3. **The shelf grows.** When the pulse lands, the shelf grows from the dendrite's end, away from the brain, over `--shelf`.
4. **The text appears.** The label text fades in from that corner `--shelf-text-delay` later, over `--fade`. Labels are readable by about half a second.
5. **The label leaves.** Moving away fades the label out over `--fade-out`.

**Reduced motion:** the label appears with no pulse and no transition.

### Axon dividers (Projects, case study)

The soma fires and the signal hops node to node, one node every `--hop` (130ms). Each node rises from `--ink-rest` (45% opacity) to full over `--flash-in`, then falls back over `--flash-out`, about half a second in all. Each divider plays once as it scrolls in. **Reduced motion:** every node at rest.

### About dendrite

The dendrite grows down the margin once as About scrolls in. Each segment grows over `--grow`, each branch draws over `--draw`, and successive parts start `--grow-stagger` apart, ending with the growth cone at the last paragraph. **Reduced motion:** drawn fully grown.

### Experience raster

A playback cursor sweeps each row once over `--sweep`, left to right. It's a `--line` vertical line as tall as `--raster-band`, at `--sweep-cursor` opacity. It fades in over `--flash-in` as it starts and out over `--flash-in` at the end, and is absent at rest. Each spike starts to rise the moment the cursor reaches it, with the same rise and fall as an axon node. The marker and year marks don't flash. If a row leaves view mid-sweep it holds and resumes; if it's resized mid-sweep it goes straight to rest. **Reduced motion:** no cursor, spikes at rest.

### Skills tracing

Hovering a skill, group, or place brings its whole path to full strength and dims the rest over `--fade`. Dimmed labels stay at `--dim-text-min` or more. Tracing is for pointers only. The wires at rest already meet 3:1, so the diagram reads fully without it, and the diagram holds nothing focusable, so it can stay hidden from screen readers. **Reduced motion:** the change is instant. **Phones:** no tracing.

### Contact sequence

Plays once when Contact scrolls in. Times are measured from the first hop:

| Time | What happens |
| --- | --- |
| 0, 130, 260ms | The signal hops the three nodes (`--hop`), each flashing like an axon node. |
| 350ms | Three vesicles release, `--hop` apart. Each appears at 90% opacity, drifts 20px across the gap by 800ms, and fades out by 1s (`--contact-release`). |
| 800ms | The receptor band rises from 55% to full over `--flash-in`, then settles back over `--contact-settle` (`--contact-receptor`). |
| 1s | The email's underline rises from the underline color to the main text color over `--flash-in`, then settles back over `--contact-settle` (`--contact-underline`). |

**Reduced motion:** still, at rest.

### Reduced motion, all in one place

| Piece | With reduced motion on |
| --- | --- |
| Neuron layer | Signals appear in place, no travel or drift |
| Brain labels | Appear with no pulse or transition |
| Axon dividers | Nodes at rest |
| About dendrite | Fully grown |
| Experience raster | No cursor, spikes at rest |
| Skills tracing | Instant |
| Contact | Still, at rest |

## Banned list

| Banned | Why |
| --- | --- |
| Violet or purple glow | The stock look of AI-product sites. The site's colors come from real fluorescent labels instead. The only shadow is the brain labels' dark legibility shadow. |
| Letter-spaced monospace labels | The stock look of developer portfolios. Labels here are plain Plex. |
| Plexus networks (dots joined by straight lines) | A stock "network" graphic that shows no real data. The Skills diagram stays clear of it by the rules in Sections. |
| Generic hero copy | It could belong to anyone. The hero copy is final and lives in the content files. |
| Sites assembled from animated component libraries | They make a site look assembled rather than made. Every piece here is drawn for this site. |
| "HIPAA-compliant" or "de-identified" | Claims the site can't back. Clinic work uses the master sheet's wording: "patient-authorized, identifiers withheld." |
| Any number not in the master sheet's Done column | Every number must trace to a source. Site-only details that don't belong on a resume are allowed only when Cal has confirmed them and they're logged. |

## Accessibility

- **Contrast.** WCAG 2.2 AA for every text pair, plus the dimmed-label floor, the line-art floor, and the canvas cap above.
- **Keyboard.** Every link and lobe is reachable with Tab, in reading order, with a visible focus ring. On the brain, hover and keyboard focus do the same thing. Skills tracing is for pointers only, because the diagram reads fully at rest and is hidden from screen readers, so it holds nothing focusable.
- **Touch.** Brain lobes need two taps: the first shows the label, the second goes to the section. Nothing depends on hover on phones. Tap targets are at least 44px.
- **Screen readers.**
  - The neuron canvas is hidden from screen readers (`aria-hidden="true"`).
  - Each brain lobe is a real link with a name a screen reader can say.
  - Decorative drawings (dividers, the dendrite, the rasters, the synapse) are hidden from screen readers, because the text beside them already says everything they show.
  - The Skills diagram has a plain list behind it for screen readers.
  - Every image has real alt text.
- **Motion.** Reduced motion is honored everywhere. Automatic motion stops after 5 seconds. Nothing animates off screen or in a hidden tab.
- **Resizing.** Text stays readable and layouts reflow at 200% zoom and with enlarged default fonts. Lines may wrap; nothing clips or overlaps.
