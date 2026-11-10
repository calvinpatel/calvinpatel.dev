---
# Skills: every Done-column skill from the master sheet, in nine groups, each
# connected to where it was used. "name" is the diagram label; "detail" holds
# the rest of the Site copy line, for the plain list behind the diagram.
hint: Hover a skill, a group, or a place to trace its path.

# The diagram's right column, top to bottom.
places:
  - { id: notepilot, label: NotePilot }
  - { id: coastal-pain, label: Coastal Pain }
  - { id: medical-school, label: Medical school }
  - { id: atelier-health, label: Atelier Health }
  - { id: cedars-sinai, label: Cedars-Sinai }
  - { id: yang-lab, label: Yang Lab }
  - { id: mehta-lab, label: Mehta Lab }

groups:
  - name: Languages
    skills:
      - { name: Python, places: [notepilot] }
      - { name: MATLAB, places: [cedars-sinai, mehta-lab] }
      - { name: SQL, places: [notepilot] }
      - { name: JavaScript, places: [notepilot] }
      - { name: TypeScript, places: [notepilot] }
      - { name: HTML/CSS, places: [notepilot] }

  - name: AI / LLM
    skills:
      - name: Anthropic API
        detail: tool use, structured outputs, streaming
        places: [notepilot]
      - { name: Prompt engineering, places: [notepilot, coastal-pain] }
      - name: Eval design
        detail: adversarial test corpora, LLM-as-judge, regression evals
        places: [notepilot]
      - { name: Output grounding, places: [notepilot] }

  - name: Backend
    skills:
      - { name: FastAPI, places: [notepilot] }
      - { name: Pydantic, places: [notepilot] }
      - { name: PostgreSQL, places: [notepilot] }
      - { name: SQLAlchemy, places: [notepilot] }
      - { name: Alembic, places: [notepilot] }
      - { name: asyncio, places: [notepilot] }
      - { name: REST, places: [notepilot] }
      - { name: OAuth2/JWT, places: [notepilot] }

  - name: Frontend
    skills:
      - { name: React, places: [notepilot] }
      - { name: Vite, places: [notepilot] }

  - name: Testing and quality
    skills:
      - name: pytest
        detail: fixtures, mocking, TDD
        places: [notepilot]
      - { name: Vitest, places: [notepilot] }
      - { name: "Type hints, mypy", places: [notepilot] }

  - name: Infrastructure and tools
    skills:
      - { name: Docker, places: [notepilot] }
      - { name: GitHub Actions CI, places: [notepilot] }
      - { name: Git, places: [notepilot] }
      - { name: Docker Compose, places: [notepilot] }
      - { name: uv, places: [notepilot] }
      - name: Google Cloud Run
        detail: Secret Manager, IAM
        places: [notepilot]

  - name: Scientific computing
    skills:
      - name: MATLAB signal analysis
        detail: burst detection, significance tests, raster plots
        places: [cedars-sinai]

  - name: Neuroscience methods
    skills:
      - { name: Tetrode fabrication, places: [mehta-lab] }
      - { name: Single-unit analysis, places: [mehta-lab, cedars-sinai] }
      - name: 3D neuron reconstruction
        detail: neuTube, SWC
        places: [yang-lab]

  - name: Clinical
    skills:
      - name: Clinical documentation
        detail: SOAP notes, histories
        places: [atelier-health, notepilot, coastal-pain]
      - { name: EHR (Chrono), places: [atelier-health] }
      - name: Clinical knowledge
        detail: from MD coursework and transplant surgery rotations
        places: [medical-school, coastal-pain]
      - { name: PHI handling, places: [coastal-pain, notepilot] }
---
