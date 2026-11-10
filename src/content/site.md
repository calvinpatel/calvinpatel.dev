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
    phoneLine: "About: frontal lobe, personality and planning. Tap again to go there."
  - id: projects
    label: Projects
    lobe: occipital
    lobeLine: "Occipital lobe: vision"
    phoneLine: "Projects: occipital lobe, vision. Tap again to go there."
  - id: experience
    label: Experience
    lobe: temporal
    lobeLine: "Temporal lobe: memory"
    phoneLine: "Experience: temporal lobe, memory. Tap again to go there."
  - id: skills
    label: Skills
    lobe: cerebellum
    lobeLine: "Cerebellum: learned skill and movement"
    phoneLine: "Skills: cerebellum, learned skill and movement. Tap again to go there."
  - id: contact
    label: Contact
    lobe: parietal
    lobeLine: "Parietal lobe: guides reaching"
    phoneLine: "Contact: parietal lobe, guides reaching. Tap again to go there."

# Under the brain. Pointer devices see the first; touch screens the second.
brainHint:
  pointer: Hover a region to preview it, click to go there
  touch: Tap a region to preview it, tap again to go there

footer:
  credit: Neuron reconstructions from NeuroMorpho.Org, used under CC BY 4.0.
  creditsLabel: Credits
  copyright: © 2026 Calvin Patel
---
