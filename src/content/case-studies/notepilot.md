---
# The NotePilot case study, at /projects/notepilot. Its title, status, and
# links come from projects/notepilot.md. An axon divider comes before each
# part from "What it does" on.
project: notepilot
lede: >-
  A clinical SOAP-note summarizer that links every claim to the exact source
  text it came from.

parts:
  - id: the-problem
    heading: The problem
    blocks:
      - text: >-
          Encounter notes are long, messy, and full of shorthand. A summary saves
          a clinician time only if they can trust it, and a fluent summary that
          drops an allergy or adds a medication the patient isn't taking is
          worse than no summary at all.

  - id: what-it-does
    heading: What it does
    blocks:
      - text: >-
          NotePilot turns an encounter note into a structured SOAP note, and
          every line cites the exact text it came from. The model writes the
          draft through tool use, Pydantic validates its structure, and the
          model corrects itself when the draft doesn't fit.
      - text: >-
          Code then checks the draft for what clinicians worry about most: a
          dropped allergy, a medication the note never mentions, and
          contraindications such as penicillin cross-reactivity. Those checks
          run against injected traps on every commit.
      - text: >-
          Behind it is an evaluation harness. Prompts, the judge, and the test
          corpus are versioned, and every corpus run is recorded with the git
          commit that produced it, so any prompt or model change is scored
          against the runs that came before.
      - text: >-
          Built with Python, FastAPI, Pydantic, PostgreSQL, React, and the
          Anthropic API.

  - id: the-hard-part
    heading: "The hard part: reading what a word reaches"
    blocks:
      - text: >-
          NotePilot makes every line of its summary cite a quote from the
          original note, then checks each line against its quote. The model
          writes, and code verifies. The model was never the hard part. The hard
          part was teaching code to read clinical shorthand the way a clinician
          does.
      - text: >-
          A quote can match word for word and still flip the meaning. At one
          point, a test line reading "Reports chest pain," quoting "chest pain"
          from "Denies chest pain.", passed every check I had, because the checks
          read only the quoted words and "Denies" sat just outside them. A "Right
          knee pain" line quoting "Left knee pain" passed too. Neither failure
          throws an error. The summary just says the opposite of the chart.
      - text: >-
          Fixing that means deciding, in code, how far each word reaches: which
          drug a "hold" stops, where a "denies" ends, which body part a "left"
          belongs to. Charting makes this hard, because a comma can end a clause
          or separate items in a list. "Hold pressure, takes apixaban" is a note
          to press on a puncture site beside a blood thinner the patient is
          still taking, and my checks read it as apixaban stopped. "Pt left AMA"
          names no side, and "R/O PE" is not a diagnosis. Every rule that fixed
          one phrasing broke another. The first fix I prototyped for stop orders
          kept only 15 of 36 everyday stops reading as stopped. Of the first
          seven reading rules I approved in one round, six needed a follow-up
          fix.
        figure: comma
      - text: "So I stopped chasing perfect rules and built a process around imperfect ones:"
      - list:
          - The checks now read the whole clause around a quote.
          - New readings run through one shared scope engine instead of one-off rules.
          - Every entry in the clinical word lists carries a written reason I signed off on.
          - >-
            Each new rule is tested against common charting shorthand before it
            lands, and the evaluation corpus is rerun to see what moved.
          - >-
            What the rules still can't read is written into the spec as a known
            limit, with an optional LLM judge as a second layer.
      - text: Healthcare AI that shows its work has to show its limits too.
        emphasis: true

  - id: results
    heading: Results
    showResults: true
    blocks:
      - text: >-
          I tested the live model on 24 synthetic encounters, running each one 3
          times. In the latest run, it kept safety-critical facts in 100% of
          fidelity traps. The pipeline surfaced 100% of planted dangers, and
          clean notes stayed clean 100% of the time. Across all eight recorded
          runs, 576 live model calls, the model never dropped or invented a
          labeled safety-critical fact, so the safety layer had nothing to catch
          live. Its catching is proven instead on 29 injected cases, drafts with
          a mistake planted in them, scored on every commit.
      - text: >-
          The first two runs scored 75% on fidelity traps and 87.5% on clean
          controls. Every miss was a check flagging a correct note, and changing
          what the checks read, not the model, brought both to 100%.
      - text: >-
          At 24 cases, the corpus is a regression tripwire, not an accuracy
          estimate: it shows whether a change made things worse on these cases,
          not how often the model is right in general.
      - text: >-
          The public version runs with rate limiting, a daily spend cap, and
          logging that keeps patient information out. It costs about $0.0003 per
          note, and 2,637 automated tests run on every push: 2,548 backend test
          cases, many of them table-driven, plus 89 frontend tests.

  - id: whats-next
    heading: What's next
    blocks:
      - text: >-
          If I reopen NotePilot, its next step is to cross-check each summary
          against drug-interaction and guideline references, using retrieval.
          The code is on [GitHub](https://github.com/calvinpatel/notepilot), and
          the [live demo](https://notepilot-kuptj5n2ra-uw.a.run.app) is online.

# The comma diagram, beside the hard part's third paragraph on desktop and
# right after it on phones. Wording from the chosen case study artboard.
figures:
  comma:
    rows:
      - phrase: Hold pressure, takes apixaban
        reading: '"Hold" reached past the comma. Read as apixaban stopped: wrong.'
      - phrase: Hold lisinopril, metformin
        reading: '"Hold" covers the list. Read as both stopped: right.'
    caption: A comma can end a clause or separate items in a list.

backLabel: Back to projects
---
