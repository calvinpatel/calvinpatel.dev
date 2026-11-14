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

The brain itself was settled after the artboards, in a spike: `docs/spikes/brain-navigation.html` (see Drawings: Brain). The hero's neuron layer was tuned with it in the same spike (see Drawings: Neuron layer). Where the hero artboards and the spike differ on either, the spike wins.

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
| `--fluor-dapi` | `#4f6dff` | Nuclei in the hero and the brain, the wash over the brain's active lobe, and the backlight behind the brain. |
| `--brain-tissue` | `#0b1220` | A brain lobe's fill at its center, fading to `--color-bg` at its edge. |
| `--brain-rim` | `#9fb4ff` | The rim light along the brain's outline. |

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

How the layer keeps to the cap (`src/lib/neuron-zones.ts`):

- **Zones.** Every piece of text over the canvas is a zone: each line of the hero text's letters, every brain label's box whether or not the label is showing, the hint's box (the phone line shares it), and each top bar link's box. The script measures them on the page, and again whenever the layout changes.
- **No edge.** The dimming is full within 12px of a zone and fades out smoothly over the next 32px, so no zone shows as a box.
- **The clamp.** As the last step of every frame, every color channel inside a zone is held at or under one gray, with the `darken` blend. A pixel whose channels are all at or under a gray can't be brighter than that gray, so the cap holds whatever was drawn: signals, glows, and any number of overlapping cells. The gray is the brightest whose luminance is at or under the cap less what the brain adds over the canvas behind a label (`--canvas-cap-brain`, 0.0013), then one level lower to allow for rounding: 63 of 255, luminance 0.0495.
- **The veils.** Before the clamp, the layer is dimmed inside a zone, so that the clamp rarely has to act and colors keep their hue. Resting cells and nuclei dim to about half (0.51) and signals to about an eighth (0.12). That splits the gray evenly: half for the brightest resting cell, half for a signal at full strength. One cell's rest and its signal together then land just under the gray, and the clamp only changes pixels where cells overlap.
- **The per-color cap tokens** (`--canvas-cap-gfp`, `--canvas-cap-tdtomato`, `--canvas-cap-dapi`) say what the cap allows one color alone. Holding every channel under one gray is stricter, because it also counts overlaps: behind text a GFP signal tops out near 28% and a tdTomato signal near 25%.

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
| `--step-text-3` | 17 | 18 | Long reading text (About story, case study body), NotePilot's description, Contact's GitHub and LinkedIn | `--leading-prose`; `--leading-snug` for the description and Contact's links |
| `--step-text-4` | 16 | 16 | Body text, project and Experience descriptions, links, Experience organizations, brain-label names (weight 500), the comma figure's phrases | `--leading-body`; `--leading-lede` for label names; `--leading-snug` for the figure's phrases |
| `--step-text-5` | 14 | 15 | Nav links, result labels, Skills place labels and hint | `--leading-snug` |
| `--step-text-6` | 14 | 14 | Status, dates and location, the tap hint, photo captions, the measurement note | `--leading-label` |
| `--step-text-7` | 13 | 13 | Brain-label second line, footer, figure captions, the comma figure's readings, Skills labels, raster year labels | `--leading-label` |

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
- **Reading widths.** Long reading text sits in `--reading-max` (680px): the case study column and the About story. Descriptions stop at `--measure` (66 characters per line). The About lede stops at `--lede-measure` (22ch) and is balanced, so it sets three lines at every width, as on both artboards.
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
- **Below 1048px of content width:** the case study's comma figure leaves the margin and follows its paragraph, and the results narrow from 1048px to the reading column. This one is a container query on the page's content width, not on the window, so it doesn't depend on the scrollbar's width. 1048px is the reading column, the gap at its widest, and the figure: `--reading-max` + 48px + `--figure-width`.
- **Skills, by its own content width in rem:** two container queries on the section's content width, not on the window. They are in rem so they follow enlarged text: the labels and the thresholds grow together, so a label that fits at default text fits at any text size.
  - **45rem or more** (720px, an 800px window, at default text): the desktop wiring diagram. This is where the longest skill label fits left of its column: "3D neuron reconstruction" is about 149px at 13px, and 149 / 0.21 = 710px, or 44.4rem. A longer skill name means raising it.
  - **17.5rem to 45rem:** one diagram per group. This replaces "below 760px" for Skills.
  - **Below 17.5rem** (a 320px window at default text): the plain list shows instead of the diagrams. 17.5rem is the narrowest the per-group layout fits once its columns have shifted (see Drawings).

## Components

**Links.** A link keeps the color of the text around it, with an underline in `--color-link-underline` set `--link-underline-offset` (4px) below the text. On hover, the underline brightens to `--color-text` instantly; nothing else changes. Visited links look the same as unvisited ones. The top bar's section links and the CP mark are the one exception: no underline at rest, and the standard underline appears on hover.

**Focus.** Every link and every brain lobe shows a ring on keyboard focus: `--focus-width` (2px) solid in `--color-focus`, with `--focus-offset` (4px) of space. Use `:focus-visible`, and never remove the ring without replacing it with this one. A lobe's ring follows the lobe's own shape, `--focus-offset` outside its edge. The lobes tile, so along a shared border the ring runs over the neighboring lobe. It lifts with the lobe, and it works without the script. When focus scrolls a link into view, its whole ring shows: every link has a scroll margin of `--focus-offset` plus `--focus-width`.

**Buttons.** The designs have none: every control is a link or a brain lobe, and the lobes are links too. If a real action ever needs a `<button>`, style it like a link. No filled or outlined pills.

**Top bar.** It holds the CP mark (Fraunces, `--size-mark`) and the five section links (About, Projects, Experience, Skills, Contact) in Plex at `--step-text-5`, all in the main text color. It spans the window with `--gutter` padding, not the `--page-max` column, as on the hero artboard, so on windows wider than 1320px the CP mark sits left of the content's edge. On phones the links move into a full-width second row under the mark, each with a 44px tap target. The case study page uses the same bar.

**Figure box.** Used for the case study's comma diagram. A `--color-surface` box with a 1px `--color-border` edge, `--radius` (12px) corners, and `--figure-padding` (20px) of padding. In the margin it is `--figure-width` (320px) wide.

**Brain label (shelf).** The callout dendrite ends in a short horizontal line, and the label sits on it with no box. The first line is the section name in Plex at `--step-text-4`, weight 500, in the main text color. The second line is the lobe and what it does, such as "Frontal lobe: personality and planning," at `--step-text-7` in the muted color. A soft dark shadow (`--label-shadow`) sits behind the letters. The text goes on the side away from the brain: right-aligned for labels on the left, left-aligned for labels on the right. The Skills label, the only one below the brain, hangs under its shelf and wraps to two even lines, with the shelf as wide as those lines. The text sits `--space-2xs` from the shelf, and the shelf runs `--space-2xs` past the text on the side away from the tip. On phones, the labels appear under the brain.

- **A label slides along its shelf to stay in bounds.** It keeps `--space-2xs` from the viewport's right edge and `--space-xs` from the hero text's letters. The callout's tip stays on the shelf, so a slid label's shelf runs both ways from the tip and grows outward from it. Where both limits can't be met, the viewport wins. The script measures the real label and the real text, so the rule also holds for enlarged text.
- **Where it applies today.** The Projects and Skills labels slide left in windows from 760px to about 1120px wide (62px at 760px). The Experience label slides right below 800px (10px at 760px). From about 1150px up, every label sits as drawn.

**Footer.** The neuron credit line (NeuroMorpho.Org, CC BY 4.0) with a Credits link, plus the copyright, in `--step-text-7` muted. It stacks on phones.

**Selection.** Selected text uses `--color-selection` behind the main text color.

## Sections

**Hero.** The top bar, then the name on one line in Fraunces and the two hero sentences in Plex, each sentence starting its own line, in the secondary color. The brain sits on the right with the hint under it. The hint is `brainHint.pointer` where the device can hover and `brainHint.touch` where it can't, at `--step-text-6`, muted and centered. It hides while a label shows, because a label can reach where it sits. On phones, everything is left-aligned, with the brain full width below the text and the tap hint centered under it. The text, the brain, and the hint are one group, centered top to bottom in the first screen below the top bar, with `--space-l` between the text and the brain. Where the group is taller than the screen, the brain shrinks to fit, down to a floor, and then the hero grows to hold it (see Drawings: Brain). The hint keeps room for a second line, which a phone line can take, without counting it in the group, so nothing moves on the first tap. The neuron canvas fills the whole first screen behind everything, the top bar included: on the home page the top bar floats over it, as on the artboards (see Drawings: Neuron layer).

**Brain navigation.** Five lobes, each a real link to a section: frontal lobe → About, occipital → Projects, temporal → Experience, cerebellum → Skills, parietal → Contact. Hover or keyboard focus shows that lobe's label. On touch, the first tap shows the label and the second tap goes to the section.
- **The lobes are links in the page before any script runs,** in a `<nav>` named by site.md's `brainLabel`. Each lobe's name for a screen reader is its section label, then its lobe line. Without the script they are plain links with focus rings: no highlight and no labels.
- **One lobe is active at a time.** The active lobe lifts (`--brain-lift`), its edge shows (`--brain-edge-op`), a DAPI wash covers it (`--brain-wash-op`), and its cells go from `--brain-cell-rest` to full brightness. Escape, or moving away, clears it.
- **Touch.** A tap away from the lobes clears the preview. Below 760px there are no callouts or shelf labels: the first tap swaps the hint for that section's `phoneLine`.
- **What counts as a first tap.** Going to the section is the rule. A click previews only when it follows a real touch on that lobe: a finger or a pen, with a contact size. A mouse, a keyboard, and a screen reader's activation go straight to the section. Browsers give no certain sign of a screen reader, so the test is a heuristic (a press with no size, or a click that counts no press).
- **Tap targets.** On phones the brain fills the content width, so every lobe is at least `--tap-min` both ways (the occipital, the narrowest, is 56px wide at 375px and 47px at 320px). From 760px up the brain sits beside the text and can be smaller: the occipital lobe is under `--tap-min` wide in windows up to about 834px, a tablet held upright. There its tap target reaches `--space-xs` past the brain's edge, unseen.

**Projects.** Each project is one row: the status in the left column, the name in Fraunces, then the description, and the links in the right column. NotePilot's row adds its four results in Fraunces (`--step-display-6`), with labels at `--step-text-5` and a note on how they were measured at `--step-text-6`. A myelinated axon runs through the section: a soma and tapering hillock under the heading, a divider between projects with sheaths and faint wrapped layers, and branching terminals at the end. Desktop nodes sit every `--axon-node-spacing` (80px) so they land on the column gutters; place them from the real column positions at each width. From 900 to 1319px windows they stay on the status gutter only (see Drawings: Myelinated axon dividers). Below 900px, each project stacks status, name, description, and links, and the results form a 2×2 grid. The dividers keep the same 80px spacing at every width, with the last sheath cut off at the edge.

**Case study page** (for example, `/projects/notepilot`). The top bar, then the status, the title, the lede, and the links, with the axon's soma and hillock under that block. The lede is balanced at every width. A divider comes before each part (What it does, The hard part, Results, What's next). On desktop the dividers match the 680px reading column; on phones they run the full content width, inside the gutters. Section headings use `--step-display-7`. The comma diagram sits in the margin beside the hard part's third paragraph on desktop, and full width right after that paragraph on phones. On desktop the comma figure sits in flow beside its paragraph; where the figure is taller, the next paragraph moves down to clear it. The results span 1048px only while the figure sits in the margin; otherwise they match the reading column. In the diagram, each phrase's reach is a `--line` (1px) ink bracket with a tick at each end, hidden from screen readers. It replaces the artboard's underline, because an underline is the site's only link signal. The branching terminal replaces the line above "Back to projects."

**Credits page** (`/credits`). Linked from the footer's Credits link on every page.
- **Content, in order.** The heading; then credits.md's intro in the secondary color, which names NeuroMorpho.Org, links the license, and says each neuron was flattened to 2D and simplified; then one line per neuron, in `public/cells/index.json`'s order.
- **Each line** is the converter's credit text, printed exactly as written, and the whole line links to that neuron's NeuroMorpho page.
- **Layout.** Everything sits in the reading column (`--reading-max`). Heading to intro `--space-l`, intro to list `--space-m`, and credits `--space-s` apart.
- **Wrapping and touch.** The license after a credit's last comma never wraps, and neither does the intro's license link. On touch screens each credit link gets a `--tap-min` (44px) tap box.

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
- **Desktop.** Skills on the left flow into their nine groups in the middle, then out to the places they were used on the right. Every label is readable without hovering. Hovering a skill, group, or place with a mouse or a pen traces its path. A plain list sits behind the diagram for screen readers.
- **What keeps it from being a plexus.** Every dot is labeled, every connection is curved and carries real data, and the flow runs in one direction. Never use straight lines or unlabeled dots, and never use the diagram as background decoration.
- **Phones.** One small diagram per group, with the group name as its heading. Each skill connects straight to its own places, with no group node, so the static figure never implies a connection that isn't true. These diagrams never trace.
- **Which one shows.** The section's own content width decides, in rem (see Breakpoints): the desktop diagram at 45rem or more, one diagram per group from 17.5rem to 45rem, and the plain list below 17.5rem.
- **The plain list.** Nine groups, each with its skills, each item written like the Site copy line: "Anthropic API (tool use, structured outputs, streaming): NotePilot". Screen readers get it at every width. It is visible, in place of the diagrams, below 17.5rem and with JavaScript off, because the script draws the diagrams. When visible, group names are `--step-text-7` muted, as on phones, and the skills are body text in the secondary color.

**Contact.**
- **Desktop.** A myelinated axon with three sheaths curves up from the lower left. A short bare stretch leads into a terminal that flares open toward the contact side, with vesicles packed at its face. Across the gap, the receiving membrane and its bright receptor band sit right against the contact block. The email is large in Fraunces, with GitHub and LinkedIn beneath it.
- **Phones.** The figure turns so the axon comes down from above and the terminal opens downward onto the email. GitHub and LinkedIn get 44px tap targets.

## Drawings

Every drawing below the hero is ink line art measured from its chosen artboard. The numbers are tokens in tokens.css; shapes that are drawn by hand rather than generated are given here as SVG path data. Draw each one at its real pixel size, in an SVG sized in CSS px. Never stretch a drawing with a `viewBox` that scales its text or its line widths. Two drawings are drawn smaller than their coordinates, the phone synapse and the hero's brain: their shapes scale, but their thin lines keep their width in px (see Synapse and Brain). A drawing snaps to its own pixels, counted from its SVG's corner, because that's where Chrome starts painting it: an SVG's contents are painted from the screen pixel nearest its corner, wherever the SVG falls on the page. Colors are always `--ink` (or `--color-bg` where a shape cuts a gap) with the opacity tokens below. Every drawing is decorative and hidden from screen readers, because the text beside it says what it shows. The brain is the exception to three of these rules: it is drawn in the hero's fluorescence colors, it comes from a spike rather than an artboard, and its lobes are links.

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
- **Where they go.** In Projects, the first divider sits under the heading, one sits between projects, and the last ends the section; on desktop, nudge the sheath start so nodes land on the column gutters. One 80px spacing meets both column gutters only at the full 1192px content width. In windows from 900 to 1319px wide the nodes stay on the status gutter and drift off the links gutter, which is accepted. On the case study page, the first sits under the title block, one comes before each part, and the last replaces the line above "Back to projects." The case study's dividers are 680px wide on desktop and the full content width on phones. Phones use the same 80px spacing.

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
  - Labels and dots off the traced path dim to `--dim-text-min`: the main text color at that opacity, so a dimmed skill label changes from the secondary color (see Color: Contrast). A dimmed group label keeps its full outline, so it still hides the wires behind it. Everything on the path looks exactly as it does at rest.
  - Overlaps never brighten, in any state. Where wires cross or converge they are no brighter than one wire, traced or dimmed, and a traced wire is unbroken where dimmed wires cross it.
  - The wires are two layers under the dots and labels, each with one opacity for the whole layer. The first holds every wire at `--line`. The second holds a copy of every wire at `--wire-traced-stroke`, and only the traced copies show. A traced wire lies over its own dimmed line, so its middle is about 86%, evenly along its length.
- **What a path is.**
  - A skill: its wire, its group, its group's wires to the places that skill was used, and those places. Never a group's wire to a place this skill wasn't used: MATLAB lights Languages → Cedars-Sinai and Languages → Mehta Lab, not Languages → NotePilot.
  - A group: all its skills and their wires, the group, all its wires out, and all its places.
  - A place: every skill used there, their wires and groups, and only those groups' wires to that place. No other place lights.
- **Hover targets.**
  - A skill's row runs from the diagram's left edge to where its wire starts. A place's row runs from where its wires end to the diagram's right edge. Each is one row tall, centered on its dot, and at least as tall as one line of its label.
  - A group's target is one box from the top of its label to the bottom of its dot, as wide as the label.
  - The cursor stays the default arrow, since nothing here is a link.
- **Only the desktop diagram traces.** The per-group diagrams never do, with any pointer.
- **Phones (the section's content narrower than 45rem).** One diagram per group:
  - Columns: skill labels end at 47.4% and skill dots sit at 49.7%; place dots sit at 70.3% and place labels start at 73.1%.
  - Column shift: where the longest labels don't fit those fractions (windows narrower than about 363px at default text), the two columns move toward each other just far enough to keep them inside the content. Skill labels end at the larger of 47.4% and the longest skill label's width; place labels start at the smaller of 73.1% and the content width less the longest place label's width. Each dot keeps its distance from its label (2.3% and 2.8% of the width), and every group uses the same columns. The script measures the labels, so a longer name adjusts itself.
  - Dots are `--wire-skill-dot-phone` (5px) for skills and `--wire-place-dot-phone` (8px) for places.
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
  <!-- nodes, in hop order; rest with fill-opacity at --ink-rest -->
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
    <circle class="release" cx="478" cy="88" r="2.2" fill="currentColor" fill-opacity="0"/>
    <circle class="release" cx="478" cy="100" r="2.2" fill="currentColor" fill-opacity="0"/>
    <circle class="release" cx="478" cy="112" r="2.2" fill="currentColor" fill-opacity="0"/>
    <!-- receiving membrane and its receptor band (band rests at 0.55) -->
    <path d="M504 24 C 498 70, 498 130, 504 176" fill="none" stroke="currentColor" stroke-opacity="0.5"/>
    <path class="receptor" d="M503 70 C 500.5 88, 500.5 112, 503 130" fill="none" stroke="currentColor"
          stroke-width="3.2" stroke-linecap="round" stroke-opacity="0.55"/>
  </g>
</svg>
```

The parts the Contact sequence changes rest with painted properties, not `opacity` (see Motion: Brain cells and nuclei): the nodes and the released vesicles with `fill-opacity`, and the receptor band with `stroke-opacity`.

- **Phones (below 900px).** The same figure turned to flow down onto the email: `viewBox="0 0 200 430"`, 130px wide, with its contents wrapped in `<g transform="translate(200 0) rotate(90)">`, sitting 4px above the email. That draws it at 0.65 of its coordinates, so its shapes scale: the sheaths, the nodes, the released vesicles, and the receptor band. Its 1px lines don't. The axon, the terminal's outline, the vesicles, and the membrane keep `--line` with `vector-effect: non-scaling-stroke`. The sheath's black core is thinned from 6 to about 4.92 units (8 − 2 ÷ 0.65), so the sheath's two edges stay 1px. The two sheath strokes never take the vector effect: it would measure their dashes in screen px and move the sheaths off the nodes.

### Brain (hero)

A left hemisphere in lateral view, frontal pole on the left, with the cerebellum and the brain stem. Its source is the approved spike, `docs/spikes/brain-navigation.html`; the hero's neuron layer comes from the same file (see Neuron layer). The geometry is generated, not drawn by hand: `src/lib/brain.ts` builds it at build time from the spike's control points with the seed 11, and the lobes are links in the page before any script runs.

- **Size.** `viewBox="-20 -12 720 488"`, filling the `--hero-brain` column: 691px wide at full width, so it is always drawn smaller than its coordinates. Sizes below are in viewBox units unless they say px.
- **On phones.** Below 760px there are no callouts or labels, so the room the viewBox leaves for them would be empty margin. The figure shows only the brain's own bounds (its outline, cerebellum, and stem) with 6 units of room: 539 × 431.2 units from (61.6, 39.9), fitted to the full content width. The backlight spills past the figure into the page's margins. This is done in CSS, so it holds without the script.
- **On a short phone screen.** The first screen is the small viewport (`100svh`), so it follows the browser's bars. Where the centered group is taller than that, the brain shrinks until the group fits, and sits centered in the content width. It never shrinks below the size at which its narrowest lobe, the occipital, is `--tap-min` wide: a figure about 264px wide and 211px tall. Where even that doesn't fit, the brain keeps that size and the hero grows past the first screen. At 375px wide the brain is full size on screens 629px tall or more and at its least on screens 573px tall or less; a 375 × 548 screen holds the brain and the hint, with the hero 25px taller than the screen.
- **Shapes.** Every curve is a Catmull-Rom spline through the spike's control points. The cerebrum's outline is notched where sulci reach the surface. Four lobes tile it: the Sylvian fissure and the central sulcus are two of their borders, and the other two (parietal to occipital, parietal to temporal) follow no sulcus. The cerebellum and the stem are separate shapes.
- **Tissue.** Each lobe is filled with a radial gradient across its own box, `--brain-tissue` at (50%, 42%) fading to `--color-bg` at 75%. The stem has the same fill at 80%, with an ink outline and two fibres at 22%.
- **Inner shading.** A `--color-bg` line 18 wide at 75%, blurred by 5, along the brain's outline and the cerebellum's, clipped to each lobe. It darkens the tissue just inside the surface.
- **Grooves.** Fifteen sulci across the cerebrum and eight folia across the cerebellum: `--color-bg` lines 2.2 wide at 70%, blurred by 0.8. The central sulcus (3.4 wide) and the Sylvian fissure (5.5 wide) are drawn the same way at 90%.
- **Borders with no sulcus.** The parietal lobe's borders with the occipital and temporal lobes are faint dashed ink lines: 1 wide at 20%, dashed 3 on and 5 off. They scale with the brain.
- **Nuclei.** 1,947 DAPI dots, radius 0.55 to 1.2, in three bands by depth from the surface (under 9, under 26, deeper) at 18%, 32%, and 48%. They are denser in the cerebellum.
- **Rim light.** The outline and the cerebellum's, 1.4 wide in `--brain-rim`, from 70% at the top through 32% to 14% at the bottom.
- **Backlight.** The brain's whole silhouette in `--fluor-dapi` at `--brain-backlight-op`, blurred by 30, behind everything. It is the one glow on the site (see the banned list).
- **Halo.** The same silhouette in `--color-bg` at 92%, blurred by 12, over the backlight and under the brain. It covers the backlight's inner part, which leaves a soft blue rim further out, and it hides the neuron layer just around the brain, so the brain reads as in front.
- **Small cells.** 46 neurons inside the lobes: pyramidal cells in the cerebrum, their apical dendrites pointing at the surface, and Purkinje cells in the cerebellum. Each is GFP or tdTomato with a DAPI nucleus. They rest at `--brain-cell-rest` and show fully in the active lobe.
- **Callouts.** Each runs from a dot inside its lobe to its label's anchor, as a wavering line with two short twigs near the lobe. In viewBox units:

  | Lobe | From | Label anchor | Label runs |
  | --- | --- | --- | --- |
  | Frontal (About) | (150, 150) | (64, 28) | left |
  | Occipital (Projects) | (546, 196) | (604, 34) | right |
  | Temporal (Experience) | (300, 300) | (236, 440) | left |
  | Cerebellum (Skills) | (522, 346) | (596, 428) | right, under its shelf |
  | Parietal (Contact) | (394, 112) | (338, −8) | left |

  The temporal anchor is the one change from the spike, which had it at (168, 374). From there the label reached the second hero sentence in windows 780 to 860px wide, and sliding it clear put it over the temporal lobe.
- **Ink over the brain keeps its px width at every size.** The callout's line, its twigs, and the active lobe's edge are `--line` wide; the pulse is 2.4px. The callout's dots are 2.8px (in the lobe) and 1.8px (on the shelf) in radius, and the tip's flash 6px. Opacities: line 85%, twigs 70%, dots 90%, shelf 55%.
  - The twigs, the lobe edge, and the focus ring take `vector-effect: non-scaling-stroke`, as the phone synapse's lines do.
  - The callout's line and pulse are dashed in units of their own length so they can draw on. The vector effect would measure those dashes in screen px, so their widths are divided by the figure's scale instead, which the script measures.
- **Written once.** Each lobe's outline, the brain's outline, the sulci, and the two fissures are each in the page once and reused. A nucleus is a zero-length line with round ends, and nuclei of one size share a path. This keeps the brain to about 115 KB (30 KB compressed), against the spike's 286 KB.

### Neuron layer (hero)

The ten real reconstructions in `public/cells/`, on a canvas behind the first screen, drawn as a fluorescence micrograph a little out of focus. Its source is the hero version of the layer in the approved spike, `docs/spikes/brain-navigation.html`, which was tuned with the brain; the real cells replace the spike's generated ones. The fixed values below are in `src/lib/neuron-field.ts` (where things go), `neuron-cell.ts` (one cell), `neuron-signal.ts` (input and firing), and `neuron-zones.ts` (the cap). tokens.css holds the timings and the soma's size. Lengths are CSS px.

- **Where it sits.** The canvas runs from the page's top to the hero's bottom edge: behind the top bar and the hero, including a hero that grows past the first screen. It is drawn at the screen's own density, up to 2 device px per px.
- **How many, and how large.** One cell per 100,000 px² of canvas, at least 6 and at most 16. A cell's size is 20% to 38% of the canvas's shorter side: the distance from its soma to its farthest point. The shorter side counts as at least 800px. On a phone that makes a cell 160 to 304px, about the phone artboard's scale (the artboard crops the desktop's image, so its cells are large against the screen); without the floor a phone's cells were 75 to 142px, with lines at their thinnest and mostly behind text. A hero 800px or more on its shorter side, such as a desktop window 900px tall, is unaffected. A soma may sit up to 5% past any edge, and two somas keep 42% of their sizes' sum apart. Everything comes from a seeded generator (seed 2026), so a window of one size always gets the same field. The cells are placed again only when the width changes, because a phone's browser bars change the height on scroll.
- **Which cells.** A fixed order that spreads the three pyramidal cells among the seven medium spiny ones, so a phone's six cells hold both kinds. A screen that holds more than ten uses a cell a second time, flipped left to right.
- **Orientation.** A medium spiny cell is placed at a random rotation. A pyramidal cell stays apical-up, tilted by up to about 14° either way.
- **Pyramidal scale.** A pyramidal cell is drawn 1.35 times its size. Its long apical dendrite sets its reach, which would otherwise shrink the rest of the cell. 1.35 is about the cells' real ratio: a median reach of about 183 µm against 138 µm. Its soma, line widths, and spines go by its size, not its drawn reach, so a pyramidal soma matches a medium spiny one.
- **Depth.** Each cell has a depth from 0.25 (far) to 1 (near), and far cells are drawn first. Depth sets three things:
  - blur: a Gaussian with a standard deviation of 0.2px (nearest) to 1.1px (farthest), which is the spike's look on a Retina screen, kept at every screen density. The blur is drawn on the canvas: the cell's picture is laid over itself at whole-pixel offsets, each copy at its Gaussian weight, once across and once down. Safari doesn't run canvas filters, and reading the pixels back to blur them in script held the main thread for tens of ms per cell;
  - resting brightness: 8% opacity plus 16% × depth, so 12% to 24%;
  - drift: 4px plus 10px × depth side to side, and 70% of that up and down.
- **Color.** 60% of cells are GFP and 40% tdTomato. A cell is one color throughout.
- **Soma.** A filled circle of radius `--neuron-soma` (2.2%) × the cell's size, never under 2.2px or over 7px, which are the spike's limits. Every soma is drawn this way whatever its file records (one file's soma is about twice the others'). A DAPI nucleus sits in it: 55% of its radius and at least 1.3px, at 30% opacity plus 25% × depth.
- **Line width.** From the tree's shape, not the files' radii, which aren't comparable from one cell to the next. By Rall's 3/2 rule, a branch that carries n tips is n^(2/3) times as wide as a tip. A tip's radius is 0.22% of the cell's size, and a line's width is 0.35px + 0.9 × its radius, kept between 0.45px and 2.6px.
- **Spines.** Short lines 0.6px wide, at right angles to the dendrite, on either side. There is one place for a spine every 2% of the cell's size along each dendrite, and 45% of the places grow one; none within the first 12% of the cell's longest path. The files are simplified, with few points on a straight stretch, so spines are spaced by length, not one per point.
- **Nuclei field.** One DAPI nucleus per 7,000 px², behind the cells, as slightly squashed ellipses: 70% small and sharp (radius 0.7 to 2.1px, 10% to 32% opacity) and 30% large and faint (2 to 4.5px, 5% to 11%). They don't drift. They are placed in bands 512px tall, so a hero that changes height keeps every nucleus it had.
- **Blending.** Resting cells and nuclei are drawn normally over each other, far to near. Only signals, soma glows, and each soma's DAPI nucleus add their light (the `lighter` blend), so where those overlap they sum, as fluorescence channels do.
- **Signals.** A lit stretch of dendrite is drawn twice: a soft line 5 to 10px wide at up to 20% opacity, then the signal itself, up to 1.3px wider than the cell's mean line. A soma's glow is a radial fade from 90% opacity, 3 soma radii wide as a spike starts and 10 by the time it has faded.
- **Axons.** None of the ten cells has a traced axon, so none is drawn and nothing travels down one. A file's axon points are left out.
- **Behind text** the layer is dimmed and capped (see Color: Contrast). Around the brain, the brain's halo hides it (see Brain).
- **How it appears.** The layer starts after the page's first paint, so the hero's text and the brain never wait for it. Each cell is prepared and drawn in a task of its own, so no task runs long. Once every cell is drawn, the whole layer, nuclei included, fades in over `--neuron-appear`. A cell that fails to load is left out.
- **A pointer's reach.** A mouse touches a dendrite within 14px, and a finger or a pen within 24px. Either touches a soma within 8px of its edge. A dendrite or a soma is left only at 1.5 times that distance, half as far again (see Motion: Hero neuron layer, Input).

## Motion

### The language

One motion language runs through the whole site: a signal travels at a set speed, the thing it reaches brightens, and it fades back to rest. Travel uses `--ease-travel` (linear), because a signal moves at constant speed. Anything that appears, grows, or fades uses `--ease-out`. Anything that moves back and forth uses `--ease-oscillate` (ease-in-out), because it slows at each turn; that is only the brain's nuclei, drifting and breathing. One fade is the exception: the flash of an axon node. It rises over `--flash-in` and falls back over `--flash-out` at a steady rate (`--ease-travel`), as on the artboards, so that flashes one `--hop` apart read as one signal travelling rather than as separate blinks. The raster's spikes and Contact's nodes flash the same way.

### Rules for every piece

1. **Each drawing plays once.** Each drawing, such as one raster row or one divider, plays the first time it is fully in view, then stays at rest. It doesn't wait for its section or fire with it, so drawings lower down don't play out of sight. The canvas mocks loop only so they could be reviewed. A change of width or text size that resizes a drawing mid-play sends it straight to rest, and it counts as played.
2. **Reduced motion.** With reduced motion on, nothing travels or drifts. Each section's drawing shows in its final, resting state. The table at the end says what each piece does instead. Switching it on mid-play sends a drawing straight to rest. A drawing that comes into view while it is on counts as played.
3. **Five-second window.** The neuron layer fires on its own only for the first `--spontaneous-window` (5 seconds) after the page loads. After that, it moves only when the visitor's pointer or finger moves it. The brain's small cells stop firing on their own, and its nuclei stop drifting and breathing, at the same moment: all three ask one clock (`src/lib/spontaneous.ts`). The clock counts only while the tab is visible. WCAG 2.2.2 (Pause, Stop, Hide) requires a way to pause motion that starts by itself and runs longer than 5 seconds; motion the visitor starts doesn't count. This is why the hero has no pause button.
4. **Nothing animates out of sight.** Animations stop while their part of the page is off screen and while the tab is hidden. A drawing that goes fully off screen mid-play, or whose tab is hidden, holds where it is and resumes when it's back.
5. **Motion never sits behind or through text,** except the neuron layer, which stays under the brightness cap in Color.
6. **Values come from tokens.css.** Never write a duration or speed into a component.

### Hero neuron layer

- **Cells.** Real reconstructions from `public/cells/` (the cell-web/1 format). Each cell is GFP or tdTomato, with DAPI nuclei.
- **Input.** A crossing sends one pulse (`src/lib/neuron-crossing.ts`). A pointer or finger sends one input when it comes within reach of a branch, which is a stretch of dendrite between branch points. Staying on the branch, moving along it, and leaving it send nothing more.
  - A branch counts as left only once the pointer is clearly away: 1.5 times as far as it had to come to touch it. So a pointer resting at the edge of the reach can't flicker inputs. Coming back after that is a new crossing, and so is coming within reach of another branch.
  - Where branches meet, at a branch point or at the soma, they are one crossing. Several coming within reach together send one input, from the nearest. A branch that meets one the pointer is still on sends nothing until the pointer has left that one, so a pointer following a dendrite past a fork sends one input a little way along the new branch, not one for each branch of the fork.
  - A scroll, or the window losing focus, resets the crossings: the pointer is then on nothing, so whatever it touches next is a new crossing.
  - The input travels toward the soma as a short burst, at `--signal-dendrite` (0.32 px/ms). Each point brightens over `--signal-rise` as the burst arrives and fades over `--signal-input-fade` behind it. Less of an input arrives from further out: what reaches the soma falls to 1/e over 0.55 of the cell's longest path. Every crossing counts, however soon after the last, so a quick sweep across several branches adds up at the soma.
- **Firing.** The soma sums its inputs, which fade with `--membrane-tau` (260ms), and fires when they reach `--fire-threshold` (1). Touching the soma itself fires the cell at once, and once: it fires again only after the pointer has left the soma and come back. A touch nearer the soma than the soma's own reach is the soma's and not a dendrite's, and leaving the soma along a dendrite sends nothing. The spike fades outward from the soma: it runs back into the dendrites at `--signal-backprop` (0.55 px/ms), each point fading over `--signal-backprop-fade` once it has passed, and the soma's glow ripples outward as it fades over `--soma-flash`. The cell then can't fire again for `--refractory` (420ms). `--signal-axon` (1.15 px/ms) is the speed down an axon; none of the ten cells has a traced one, so nothing uses it yet.
- **On its own.** Inside the five-second window the cells drift slowly, each over its own period between `--neuron-drift-min` and `--neuron-drift-max`, and one cell at a time fires on its own, at half strength, every `--neuron-idle-min` to `--neuron-idle-max`, which gives two or three firings in the window. The cell is picked from those whose soma shows, so the firing can be seen: on the canvas, clear of every text zone's dimming, and not behind the brain or within 24px of its box. Where no soma shows, as on a 375px phone, the cell whose soma is least dimmed fires instead; it is still on the canvas and not behind the brain. Either way the cell must have been quiet for `--neuron-quiet`, and its spike must be able to finish inside the window. The first waits for the layer to have appeared. When the window closes, the cells hold where they are.
- **Pointer and finger.** Input works at any time, by the crossing rule above. A mouse sends an input for each branch it crosses. A finger's tap sends an input to the branch it lands on, or fires the cell if it lands on a soma; each new touch starts afresh, so a second tap in the same place is a second crossing. A swipe sends an input for each branch it crosses until the browser takes it over as a scroll. The layer never blocks a scroll or a tap: the hero sets no `touch-action`, and the canvas takes no pointer events.
- **Brightness behind text.** Behind the hero text, every brain-label position, the hint, and the top bar's links, the layer is dimmed and held under the canvas cap (see Color: Contrast).
- **When nothing runs.** No frame is drawn while the hero is off screen or the tab is hidden, and a signal picks up where it was. When nothing is moving, the canvas holds its last frame and draws no more.
- **Reduced motion.** Signals appear in place with no travel: a signal's whole path lights at once and fades. Nothing drifts, no cell fires on its own, the soma's glow fades without spreading, and the layer appears at once.

### Brain callouts and labels

1. **The lobe responds.** Hovering or focusing a lobe highlights it over `--hover`.
2. **The pulse travels.** A pulse runs out along the lobe's callout at `--signal-backprop`, drawing the line as it goes, and only the end dot flashes (over `--flash-out`). The run takes at least `--brain-pulse-min` (180ms) and at most `--brain-pulse-max` (420ms) whatever the callout's length on screen, so a short one still reads as travel and a long one doesn't hold its label back.
3. **The shelf grows.** When the pulse lands, the shelf grows from the dendrite's end, away from the brain, over `--shelf`.
4. **The text appears.** The label text fades in from that corner `--shelf-text-delay` later, over `--fade`. Labels are readable by about half a second.
5. **The label leaves.** Moving away fades the label and its callout out over `--fade-out`.

**The hint** fades out over `--fade-out` while a label shows and back over `--fade`.

**Reduced motion:** the label appears with no pulse and no transition, and the lobe doesn't lift.

### Brain cells and nuclei

- **A cell fires** in three beats: a pulse runs in along its apical dendrite to the soma (`--brain-cell-in`), the soma flashes (fading over `--brain-cell-flash`), and a pulse runs out along the axon (`--brain-cell-out`). Meanwhile the whole cell brightens and settles over `--brain-cell-fire`, and it can't fire again until that ends. The pulses travel at constant speed.
- **Nothing inside the brain animates `opacity`.** The flash fades with `fill-opacity`, and the pulses show and hide with `visibility`. A browser hands an opacity animation to its compositor, which then splits the brain's drawing into layers for every cell that fires; with the CPU slowed 4x that dropped about one frame in ten while the pointer crossed the brain. The painted properties look the same and drop about one in a hundred.
- **Three things fire a cell.**
  - On its own: one cell at a time, every `--brain-cell-idle-min` to `--brain-cell-idle-max`.
  - A cascade across the hovered or focused lobe: each of its cells fires once per wave, at a random moment in the first `--brain-cascade-spread`, with a wave every `--brain-cascade`.
  - The cell nearest the cursor, when the cursor is close to its soma.
- **The nuclei drift and breathe.** In each depth band, half the nuclei drift one way over `--brain-drift-a` and half another over `--brain-drift-b`, a few units, back and forth. The second half also fade to 70% and back over `--brain-breathe`.
- **The five-second window.** Firing on their own, the drift, and the breathing all stop when the window closes. A cell fires on its own only if it can finish inside the window, and the nuclei hold where they are. The cascade and the cursor response work at any time, because the visitor starts them.
- **Nothing runs** while the hero is off screen or the tab is hidden.

**Reduced motion:** no firing, no drift, and no breathing.

### Scrolling to a section

Clicking a lobe, a top bar link, or any other link to a section on the same page scrolls there smoothly, at the browser's own pace (CSS can't set it, so it has no token). Arriving from another page, such as from the case study's "Back to projects," lands on the section at once: smooth scrolling starts only after the page has loaded. **Reduced motion:** it jumps.

### Axon dividers (Projects, case study)

A signal hops along each divider, one node every `--hop` (130ms).

- **What flashes.** The soma, the nodes, and the boutons, all the same way: from `--ink-rest` (45% opacity) to full over `--flash-in`, then back over `--flash-out`, at a steady rate (see The language), about half a second in all. The axon, hillock, sheaths, lamellae, and branches stay still.
- **The order.** On the first divider the soma flashes first, and the first node one `--hop` later. On the others the first node flashes as the divider starts. Each node follows the one before by one `--hop`. On the last divider the three boutons flash together, one `--hop` after the last node.
- **Only nodes that show count.** A node past the divider's right end, the first divider's hidden leading node, and a node wrapped away before the terminal are skipped, so the signal never pauses on a node nobody can see, and the gaps stay one `--hop` at every width. A node the right end cuts through counts while its center shows.
- **Each divider plays on its own,** the first time it is fully in view (rule 1). The artboards chain a section's dividers into one signal; this replaces that.
- **The flash is painted.** It changes `fill-opacity`, not `opacity`, as the brain's cells do (see Brain cells and nuclei).

**Reduced motion:** every node at rest.

### About dendrite

The dendrite grows from the soma down the margin, one turning point at a time. Before it grows, nothing of it shows, not even the soma.

- **One turning point.** The trunk grows over `--grow` from the top of the turning point's paragraph down to the next turning point. The first stretch starts at the soma and the last ends at the cone's tip. Its branch draws over `--draw`, starting `--grow-stagger` after the stretch starts, from the trunk outward. A twig starts with its branch, from where it leaves it.
- **The dots.** The soma appears as the first stretch starts. The pruned branch's bouton and the cone's three tips appear as their branches finish. Each appears over `--fade`, from nothing to its resting strength.
- **Each turning point grows on its own,** the first time its box, at the top of its paragraph, is fully in view (rule 1), and never before the turning point above it has played 2 × `--grow-stagger` of its own time. The story is taller than most windows, so growing it all at once would grow its lower part out of sight. Where several are on screen at once, they start 0, 0.8, 1.6, 2.4, and 3.2s in, as on the artboards. On a phone, each grows as the reader reaches it.
- **Always in order, and never held up by what's out of sight.** When a turning point's box comes fully into view while turning points above it haven't finished, they come first:
  - each one above whose stretch (its paragraph and the gap below it) is fully off screen finishes at once, fully grown with no motion, even if it was held mid-growth, since no one can see it;
  - each one above whose stretch is partly on screen grows first, in order, at the usual spacing, even though its own box isn't in view. That is usually only the one directly above, whose stretch ends at this one's box;
  - then this one grows, after the usual gate.

  So a reader who arrives in the middle of the story, by a reload or by scrolling up from Projects, sees the dendrite grow where they are, with the trunk above already grown.
- **Holding and resizing go by turning point.** A turning point's stretch runs through its paragraph and the gap below it, so it holds while that is fully off screen (rule 4), and its time stops counting for the one below. It stays held until it is back on screen, unless a box below it comes fully into view first, which finishes it at once as above. A change of the stretch's size mid-growth sends it straight to fully grown, and the one below may then start. Turning points not yet reached stay hidden, in the right place at the new layout.
- **It waits for the fonts.** No turning point starts until the page's fonts have loaded. Until then the story is set in fallback fonts, and the swap can change the paragraphs' heights, which would count as a resize and send a growing turning point straight to fully grown.
- **The trunk is one piece,** revealed in stages by a clip that comes off once it is fully grown, so no row is brighter where two stages meet.
- **Growing is painted.** Dots fade with `fill-opacity`, not `opacity` (see Brain cells and nuclei). Branches draw with their stroke's dashes, and the trunk with its clip.
- **Without JavaScript** it is drawn fully grown.

Growing, drawing, and appearing all use `--ease-out`. **Reduced motion:** fully grown from the first paint and never hidden. Switching it on shows the whole dendrite fully grown at once, and it stays grown.

### Experience raster

A playback cursor sweeps each row once, left to right, and each spike flashes as the cursor reaches it.

- **The cursor.** A `--line` vertical line as tall as `--raster-band`, at `--sweep-cursor` opacity. Its center travels from the row's left end to its right end over `--sweep` (2.7s), at a steady rate (`--ease-travel`). It fades in over `--flash-in` as it starts moving, and fades out over `--flash-in` once it reaches the right end, where it stays while it fades. Both fades use `--ease-out`.
- **The spikes.** A spike's flash starts the moment the cursor's center reaches the spike's center: (its position ÷ the row's width) × `--sweep` after the sweep starts. It has the same rise and fall as an axon node (see The language). The year marks and the marker don't change.
- **Each row plays on its own,** the first time it is fully in view (rule 1). Rows that come fully into view together sweep together, in step, as on the artboard. A scroll brings rows into view one after another, so they start one after another, a fraction of a second apart; that is intended.
- **A row sweeps only what is drawn.** It never starts before its spikes are drawn at its current width. A change of width redraws the spikes, so mid-sweep it leaves the row at rest with no cursor, and the row counts as played (rule 1).
- **It doesn't wait for the fonts.** A row's box is the content width by a fixed height, so the font swap can't resize it, unlike the dendrite's paragraphs.
- **The cursor is absent at rest:** before the sweep and after it. The script makes it as the sweep starts and removes it as it ends, so it never exists without JavaScript or with reduced motion on.
- **The sweep is painted.** The spikes rest and flash with `fill-opacity`, and the cursor fades with it and moves with its `x`, not a transform (see Brain cells and nuclei). The cursor and the flashes are then drawn in the same frames, so a slow frame can't put the cursor ahead of the spikes it lights.

**Reduced motion:** no cursor, spikes at rest.

### Skills tracing

- **Tracing.** In the desktop diagram, hovering a skill, group, or place with a mouse or a pen brings its whole path to full strength and dims the rest, over `--fade` with `--ease-out`. Drawings: Wiring diagram says what a path is. Dimmed labels stay at `--dim-text-min` or more.
- **Between targets.** The trace holds while the pointer crosses blank parts of the diagram: the wires and the gaps between groups. It changes when the pointer enters another target. When the pointer leaves the diagram, it returns to rest, also over `--fade`.
- **From one target to the next.** The old path fades down and the new one up together. A wire on both paths stays at full strength throughout, with no dip. During a fade, wires that overlap run a little ahead of a single wire, never past the traced strength.
- **A finger never traces,** even where the desktop diagram shows on a touch screen, as on most iPads. A tap there does nothing, and nothing stays traced. That matches the hint, which shows only with a pointer that can hover.
- **The per-group diagrams never trace** (the section's content narrower than 45rem), with any pointer.
- **A redraw returns the diagram to rest at once:** a change of width or text size, or the desktop diagram no longer showing.
- **No `opacity` transition runs in the diagram.** Labels and dots fade with `fill` and `fill-opacity`, traced wires with `stroke-opacity`, and the resting layer's opacity is set from a registered custom property that transitions instead, as the brain's cells do. On this one layer a plain `opacity` transition measured the same in Chrome (no layer rebuilds, the same frame times), so here it is a precaution, kept for consistency. The rule matters most for fading many elements at once, which is what made the brain's layers rebuild.
- **Why a mouse or a pen only.** The wires at rest already meet 3:1, so the diagram reads fully without tracing. It holds nothing focusable, so it can stay hidden from screen readers.

**Reduced motion:** the change is instant.

### Contact sequence

Plays once. Times are measured from the first hop:

| Time | What happens |
| --- | --- |
| 0, 130, 260ms | The signal hops the three nodes (`--hop`), each flashing like an axon node. |
| 350ms | The first vesicle releases (`--contact-release`). It appears at 90% opacity and drifts 20px across the gap. |
| 800ms | It reaches the far side, and the receptor band rises from 55% to full over `--flash-in`, then settles back over `--contact-settle` (`--contact-receptor`). |
| 1s | It is gone, and the email's underline rises from the underline color to the main text color over `--flash-in`, then settles back over `--contact-settle` (`--contact-underline`). |

- **Each vesicle runs on its own clock.** The table's times are the first vesicle's. The second and third run the same way, one and two `--hop` later. The band and the underline each brighten once, on the first vesicle's clock.
- **The drift eases out** (`--ease-out`): it is a release slowing as it crosses, not a signal at a set speed. A vesicle appears over `--flash-in` as it starts to drift, and fades out once it has arrived, where it stays while it fades. Those, and the band's and the underline's rise and settle, use `--ease-out`.
- **Only these change:** the three nodes, the three released vesicles, the receptor band, and the email's underline. The nodes flash with the shared flash (see The language).
- **The figure's own numbers** (the 20px drift, the 90%, the 55%) belong to the fixed figure, like its coordinates. They aren't tokens. The drift is in the figure's coordinates, so on the turned figure a vesicle drifts down toward the email, 13px on screen.
- **When it starts.** The sequence ends at the email's underline, so it plays the first time the figure and the email's line are both fully in view, not the figure alone. On a phone the figure can be fully in view while the email is still below the screen. Where the screen is too short to show both, the email's line decides: it plays the first time that line is fully in view with any of the figure on screen.
- **One drawing.** The figure that is showing plays, with the underline. It holds while the whole contact block is off screen (rule 4). A change of the block's size mid-sequence, which crossing 900px always is, sends it straight to rest (rule 1).
- **It waits for the fonts,** as the dendrite does: the swap can re-wrap the email and change the block's height.
- **Hover wins.** Hovering the email mid-sequence shows its hover underline at once. Leaving shows what the sequence, or rest, would show. Keyboard focus keeps its ring.
- **The sequence is painted.** The nodes and vesicles change `fill-opacity`, the band `stroke-opacity`, and a vesicle moves with its `cx`, not a transform (see Brain cells and nuclei). The underline changes `text-decoration-color`.
- **Without JavaScript** it is at rest.

**Reduced motion:** still, at rest. No animation starts.

### Reduced motion, all in one place

| Piece | With reduced motion on |
| --- | --- |
| Neuron layer | Signals appear in place, no travel or drift; no firing on its own; the soma's glow doesn't spread; the layer appears at once |
| Brain labels | Appear with no pulse or transition; the lobe doesn't lift |
| Brain cells and nuclei | No firing, drift, or breathing |
| Scrolling to a section | Jumps |
| Axon dividers | Nodes at rest |
| About dendrite | Fully grown |
| Experience raster | No cursor, spikes at rest |
| Skills tracing | Instant |
| Contact | Still, at rest |

## Banned list

| Banned | Why |
| --- | --- |
| Violet or purple glow | The stock look of AI-product sites. The site's colors come from real fluorescent labels instead. The one glow is the faint DAPI-blue backlight behind the brain (`--fluor-dapi` at `--brain-backlight-op`), whose color is a real stain's. The only shadows are the brain labels' dark legibility shadow and the brain's dark halo, which sets the brain in front of the neuron layer (`--color-bg`, blurred; see Drawings: Brain). |
| Letter-spaced monospace labels | The stock look of developer portfolios. Labels here are plain Plex. |
| Plexus networks (dots joined by straight lines) | A stock "network" graphic that shows no real data. The Skills diagram stays clear of it by the rules in Sections. |
| Generic hero copy | It could belong to anyone. The hero copy is final and lives in the content files. |
| Sites assembled from animated component libraries | They make a site look assembled rather than made. Every piece here is drawn for this site. |
| "HIPAA-compliant" or "de-identified" | Claims the site can't back. Clinic work uses the master sheet's wording: "patient-authorized, identifiers withheld." |
| Any number not in the master sheet's Done column | Every number must trace to a source. Site-only details that don't belong on a resume are allowed only when Cal has confirmed them and they're logged. |

## Accessibility

- **Contrast.** WCAG 2.2 AA for every text pair, plus the dimmed-label floor, the line-art floor, and the canvas cap above.
- **Keyboard.** Every link and lobe is reachable with Tab, in reading order, with a visible focus ring. On the brain, hover and keyboard focus do the same thing. Skills tracing is for a mouse or a pen only, because the diagram reads fully at rest and is hidden from screen readers, so it holds nothing focusable.
- **Touch.** Brain lobes need two taps: the first shows the label, the second goes to the section. A screen reader's activation goes straight to the section. Nothing depends on hover on phones. Tap targets are at least 44px, the brain's lobes included (see Brain navigation). A tap or a swipe over the neuron layer never blocks a scroll or a link. A tap on the Skills diagram does nothing.
- **Screen readers.**
  - The neuron canvas is hidden from screen readers (`aria-hidden="true"`) and takes no focus.
  - Each brain lobe is a real link with a name a screen reader can say: its section label, then its lobe line. The five sit in a nav named "Brain map."
  - The brain's labels and the hint are hidden from screen readers, because the lobes' names already say everything.
  - Decorative drawings (dividers, the dendrite, the rasters, the synapse) are hidden from screen readers, because the text beside them already says everything they show.
  - The Skills diagram has a plain list behind it for screen readers.
  - Every image has real alt text.
- **Motion.** Reduced motion is honored everywhere. Automatic motion stops after 5 seconds. Nothing animates off screen or in a hidden tab. Escape dismisses a brain label without moving focus.
- **Resizing.** Text stays readable and layouts reflow at 200% zoom and with enlarged default fonts. Lines may wrap; nothing clips or overlaps.
