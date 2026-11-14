---
# Site-wide copy: the top bar, the brain navigation, and the footer.
# Each section's label is its top bar link, its heading, and the first line of
# its brain label. DESIGN.md fixes which lobe leads to which section.
mark: CP

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
    phoneLine: "About: frontal lobe, personality and planning."
  - id: projects
    label: Projects
    lobe: occipital
    lobeLine: "Occipital lobe: vision"
    phoneLine: "Projects: occipital lobe, vision."
  - id: experience
    label: Experience
    lobe: temporal
    lobeLine: "Temporal lobe: memory"
    phoneLine: "Experience: temporal lobe, memory."
  - id: skills
    label: Skills
    lobe: cerebellum
    lobeLine: "Cerebellum: learned skill and movement"
    phoneLine: "Skills: cerebellum, learned skill and movement."
  - id: contact
    label: Contact
    lobe: parietal
    lobeLine: "Parietal lobe: guides reaching"
    phoneLine: "Contact: parietal lobe, guides reaching."

# What a screen reader calls the brain's five lobe links.
brainLabel: Brain map

# Under the brain. Pointer devices see the first; touch screens the second.
# On phones a lobe's phoneLine takes the hint's place, and tapAgain follows it
# only when a tap put it there: keyboard focus and hover show the phoneLine alone.
brainHint:
  pointer: Hover a region to preview it, click to go there
  touch: Tap a region to preview it, tap again to go there
  tapAgain: Tap again to go there.

footer:
  credit: Neuron reconstructions from NeuroMorpho.Org, used under CC BY 4.0.
  creditsLabel: Credits
  copyright: © 2026 Calvin Patel
---
