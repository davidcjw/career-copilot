# Career Co-pilot — frontend

Next.js 16 (App Router) + Tailwind v4 UI for the Career Co-pilot agent. Upload a
resume PDF, paste a job description, watch the LangGraph pipeline run, then
review the tailored bullets + gap report.

## Run

```bash
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm run dev                        # http://localhost:3000
```

The backend (FastAPI, `../backend`) must be running on the configured base URL —
its CORS allows `http://localhost:3000`.

## Design

Light editorial "dossier" aesthetic: warm bone paper, Fraunces serif display +
Hanken Grotesk body + JetBrains Mono labels, electric-cobalt accent (`#2742ec`),
status-light gap badges (green / amber / red for strong / weak / missing).
Motion via **framer-motion** — staggered page-load reveals, spring card
transitions, `AnimatePresence` between phases, a pulsing run timeline, and a
count-up "self-corrected N×" badge. The run view mirrors the real graph nodes
(`parse_jd → retrieve_evidence → gap_analysis → draft → critic → revise →
assemble`).

## Layout

```
app/        layout.tsx (fonts/metadata) · page.tsx (flow) · globals.css (theme) · icon.svg
components/  ResumeDrop · RunConsole · Results
lib/         api.ts (typed FastAPI client)
```
