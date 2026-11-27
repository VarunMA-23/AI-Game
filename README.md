# AI PC Showdown

An interactive, light-themed web demo that illustrates how an AI PC routes workloads across **CPU**, **GPU**, and **NPU** engines through five short challenges, followed by an AI PC identity reveal and in-store laptop recommendations.

## Features

- **5 Interactive Challenges**
  1. **Study Sprint** — Pick 5 key study concepts and route the summary task to an engine.
  2. **Creator Mode** — Apply photo effects in order (`Remove background → Enhance → Apply style`) and route supported effects.
  3. **Privacy Shield** — Choose between on-device and cloud processing for a confidential sample document.
  4. **Stream Night** — Balance gaming, streaming, and call background blur while keeping illustrative frame stability high.
  5. **Battery Escape** — Route 5 everyday tasks while keeping the illustrative battery meter steady.
- **Post-Challenge Flow**
  - **Persona Reveal** — Unlocks an AI PC identity based on challenge performance.
  - **Store Picks** — Matches verified in-stock models from store inventory (`stores/DEL01/inventory.json`).
  - **Value & Fit** — Side-by-side comparison, shopper checklist, and even-handed competitor overview.
  - **Next Step** — Request a specialist or export a QR code / shareable persona card.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** + **Tailwind CSS**
- **Zustand** for session and race state
- **React Router** (`HashRouter`)
- **Vitest** for unit tests

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — Start the Vite development server
- `npm run typecheck` — Run TypeScript type checking (`tsc -b --pretty false`)
- `npm test` — Run unit tests with Vitest (`vitest run`)
- `npm run lint` — Run ESLint
- `npm run build` — Run offline check, typecheck, and production build

## Project Structure

```text
src/
  app/            # AppShell and routes
  components/     # BrandMark, EndingFrame, RaceHud, WebGameStage
  data/           # Challenge, persona, race, scoring, and kiosk JSON configs
  features/       # Onboarding, challenges, recommendations, store picks, value compare, handoff, staff panel
  game/           # Config loaders, event bus, routing logic, and scoring modules
  services/       # Inventory, persona, and local storage helpers
  store/          # Zustand game store
  styles/         # Light-theme CSS design tokens
stores/           # Store inventory datasets (DEL01, example)
tests/            # Vitest unit tests
docs/             # Architecture, game design, and deployment docs
```

> **Note:** This experience is an illustrative routing simulation, not a benchmark. Real performance and battery life depend on the model, software, and workload.

