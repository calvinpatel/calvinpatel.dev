---
# Site-wide copy: the top bar, the brain navigation, and the footer.
# Each section's label is its top bar link, its heading, and the first line of
# its brain label. DESIGN.md fixes which lobe leads to which section.
mark: CP

# The first link on every page, shown only while it has keyboard focus. It
# moves focus past the top bar to the page's heading.
skipLabel: Skip to content

# What a screen reader says for the top bar. The mark's name is its visible
# text, then one of these: the first on the home page, the second elsewhere.
markLabel:
  home: Calvin Patel, back to top
  elsewhere: Calvin Patel, home
navLabel: Sections

sections:
  - id: about
    label: About
    lobe: frontal
    lobeLine: "Frontal lobe: personality and planning"
  - id: projects
    label: Projects
    lobe: occipital
    lobeLine: "Occipital lobe: vision"
  - id: experience
    label: Experience
    lobe: temporal
    lobeLine: "Temporal lobe: memory"
  - id: skills
    label: Skills
    lobe: cerebellum
    lobeLine: "Cerebellum: learned skill and movement"
  - id: contact
    label: Contact
    lobe: parietal
    lobeLine: "Parietal lobe: guides reaching"

# What a screen reader calls the brain's five lobe links.
brainLabel: Brain map

# Under the brain. Pointer devices see the first; touch screens see touch.
# pointerNarrow is for a mouse in a window under 760px, where hovering a lobe
# lights it and shows no label.
# On phones a lobe's label and lobeLine take the hint's place, and tapAgain
# follows them only when a tap put them there: keyboard focus shows the two
# lines alone.
brainHint:
  pointer: Hover a region to preview it, click to go there
  pointerNarrow: Click a region to go there.
  touch: Tap a region to preview it, tap again to go there
  tapAgain: Tap again to go there.

footer:
  # "CC BY 4.0" is written with two non-breaking spaces (U+00A0), so it never
  # splits across lines (DESIGN.md, Type).
  credit: Neuron reconstructions from NeuroMorpho.Org, used under CC BY 4.0.
  creditsLabel: Credits
  copyright: © 2026 Calvin Patel
---
