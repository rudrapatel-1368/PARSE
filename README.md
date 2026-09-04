# PARSE

**Business Transformation AI** — describe your business in plain English, get back a concrete implementation plan.

Not a thin wrapper around a chatbot. PARSE runs your input through a five-stage pipeline where each stage has one job, a defined input shape, and a validated output shape — so the AI reasons within a structure instead of free-associating at you.

---

## The problem it solves

Most small businesses know *something* is inefficient. What they don't have is:

- the technical vocabulary to describe what an automation solution would even look like
- the budget for a consultant to figure it out for them
- anything actionable from generic "AI can help your business!" advice

PARSE compresses that discovery process into a few minutes and — the part that matters — ends with something concrete: a solution design, an architecture diagram, and a document you can hand to a developer.

---

## How it works

```mermaid
flowchart LR
    A[Plain-text<br/>business description] --> B[1 · Ingest]
    B --> C[2 · Structure]
    C --> D[3 · Recommend]
    D --> E[4 · Blueprint]
    E --> F[5 · Export]
    F --> G[Downloadable<br/>implementation plan]
```

**INPUT → UNDERSTAND → RECOMMEND → DESIGN → EXPORT**

| Stage | Endpoint | What it does |
|---|---|---|
| 1 · Ingest | `POST /ingest` | Accepts the raw description, validates there's enough to work with. No AI call. |
| 2 · Structure | `POST /structure` | Extracts industry, pain points, goals, and constraints into a consistent schema. |
| 3 · Recommend | `POST /recommend` | Generates ranked recommendations — each one required to cite a specific pain point or goal it addresses. |
| 4 · Blueprint | `POST /solution` | Turns a chosen recommendation into components, a workflow, and a Mermaid architecture diagram. |
| 5 · Export | `POST /export` | Assembles everything into a downloadable Markdown document. |

Each stage validates its input and output against a Pydantic model, so a malformed LLM response fails immediately and visibly — at the stage that produced it — rather than quietly corrupting something three steps later.

---

## Example

**Input:**
> "I am running a law firm but I have a problem with sorting emails, my team wastes time reading the non-important emails which leads to missing out on the important ones."

**Stage 2 — structured:**
```json
{
  "industry": "law firm",
  "pain_points": ["team wastes time reading non-important emails", "important emails get missed"],
  "goals": ["sort emails efficiently"],
  "constraints": ["small team"]
}
```

**Stage 3 — recommended:**
```json
{
  "title": "AI Email Triage System",
  "addresses": "team wastes time reading non-important emails",
  "reasoning": "Automatically flags high-priority emails so the team can focus attention correctly.",
  "priority": "high"
}
```

**Stage 4 — designed:**
```mermaid
flowchart TD
  A[Email Arrives] --> B[Classifier Scores It]
  B --> C[Flag if Important]
```

**Stage 5 — exported** as a formatted `.md` file, ready to open, share, or hand off.

---

## Running it locally

**Requires:** Python 3.10+ and a Gemini API key ([Google AI Studio](https://aistudio.google.com), free tier works).

```bash
git clone https://github.com/rudrapatel-1368/PARSE.git
cd PARSE
pip install fastapi uvicorn python-dotenv google-generativeai
```

Create a `.env` file in the project root:
```
GEMINI_API_KEY=your_key_here
```

Start the server:
```bash
python -m uvicorn main:app --reload
```

Then open **http://127.0.0.1:8000/docs** — FastAPI's auto-generated interface, where you can run every endpoint and see real responses without writing a line of frontend code.

---

## Stack

- **Python + FastAPI** — endpoints, request/response handling
- **Pydantic** — schema definitions and validation at every stage boundary
- **Gemini** — the LLM behind stages 2, 3, and 4
- **Frontend** — not built yet (see below)

---

## Status

Backend: **complete**, all five stages built and verified end-to-end.

Still to come:
- Frontend (plain HTML/CSS/JS)
- CORS configuration for browser access
- Optional refactor to a backend-orchestrated pipeline (currently each stage is called independently, which keeps them separately testable)

---

## About

Solo portfolio project by a first-year CS student, built to learn backend and API development from scratch — no prior web experience going in. Commit history is the real build log.
