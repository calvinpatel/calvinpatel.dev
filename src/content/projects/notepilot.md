---
# NotePilot's row in the Projects section. Its results show large here and at
# the top of the case study's Results; every number traces to the master
# sheet's Done column (checked against commit 6676a52 on Nov 10, 2026).
# Each number is joined to its word by a non-breaking space (U+00A0), so the
# two stay on one line (DESIGN.md, Type).
name: NotePilot
order: 1
status: Live
description: >-
  A clinical SOAP-note summarizer that links every claim to the exact source
  text it came from. The hard part wasn't the model: it was teaching code to
  read clinical shorthand, where one comma can flip the meaning.

results:
  - value: 100%
    label: fidelity traps passed
  - value: 100%
    label: planted dangers surfaced
  - value: 100%
    label: clean notes stayed clean
  - value: "576"
    label: live calls without a dropped or invented safety fact
measurementNote: >-
  Rates are from the latest of eight runs, on 24 synthetic encounters run
  3 times each; 576 counts every live call across all eight runs. A regression
  tripwire, not an accuracy estimate.

links:
  - label: Read the case study
    href: /projects/notepilot
  - label: Live demo
    href: https://notepilot-kuptj5n2ra-uw.a.run.app
  # spokenName: the link's name for a screen reader in the Projects section.
  # Contact has a "GitHub" link too, and a list of the page's links can't tell
  # two with one name apart.
  - label: GitHub
    spokenName: "GitHub: NotePilot's code"
    href: https://github.com/calvinpatel/notepilot
---
