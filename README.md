# AI PC Showdown

Find the AI PC that fits how you actually work, in under 3 minutes. We show you which tasks an NPU can handle in supported apps, then recommend in-stock models that match your budget and daily routine.

Instead of reading a spec sheet, you route real everyday tasks—studying, photo editing, confidential contracts, live streaming, and a **Deadline Day** rush—across **The Generalist (CPU)**, **The Heavy Lifter (GPU)**, and **The Quiet Assistant (NPU)** while watching a split-screen **Ghost Laptop** without an NPU struggle to keep up. At the end, you get a personalized **"Your AI PC Week"** plan, a collectible trading card, live **offline** on-device AI proof, and real in-stock store picks filtered by your use-case track and budget.

## What Shoppers Experience

- **Engine Characters & Sound/Haptics** — **CPU** (*The Generalist*), **GPU** (*The Heavy Lifter*), and **NPU** (*The Quiet Assistant*) react with voice lines, soft chimes, and subtle haptics as you route workloads.
- **5 Interactive Challenges + Deadline Day Boss Battle**
  1. **Study Sprint** — Select 5 key study concepts and route the summary to an engine.
  2. **Creator Mode** — Apply photo effects in order (`Remove background → Enhance → Apply style`) and route supported effects.
  3. **Privacy Shield** — See a live **"What leaves your device?"** meter and test **Live Offline AI Proof** (local portrait blur & local note summary running 100% in-browser with zero network calls).
  4. **Stream Night** — Balance gaming, streaming, and call background blur.
  5. **Deadline Day (Boss Battle)** — Route 6 arriving tasks on a live timer before the workday runs out.
- **Split-Screen Ghost Laptop** — Side-by-side comparison showing how a standard non-NPU laptop's fan noise, power headroom, and task queue respond, paired with cited Intel Core Ultra & store inventory specs (`11–47 NPU TOPS`, `64–76 Wh` battery).
- **Collectible Persona Trading Card** — Rarity tier (`Standard` to `Legendary`), one-line title (e.g., *“Midnight Deadline Runner”*), and 4-stat block (`Focus`, `Creativity`, `Privacy`, `Battery Care`) exportable as PNG + QR code.
- **Your AI PC Week** — Personal plan built from your actual challenge choices, showing which tasks move to the NPU, estimated weekly hours offloaded, cited hardware specs, and explicit assumptions.
- **Use-Case Bundles, Budget Slider & Warm Handoff** — Filter real store picks (`stores/LFR01/inventory.json`, sourced from Reliance Digital, Croma and Vijay Sales) across **Student**, **Remote Worker**, **Creator**, and **Streamer** tracks with a live ₹55,000–₹1,50,000 budget slider, and pass full context to the in-store **Staff Panel**.

---

## Technical Overview

### Tech Stack

- **React 18** + **TypeScript**
- **Vite** + **Tailwind CSS**
- **Zustand** for session, routing, and shopper preference state
- **React Router** (`HashRouter`)
- **Web Audio API** for kiosk chimes/hum + `navigator.vibrate` haptics
- **Vitest** for unit tests

### Getting Started

```bash
npm install
npm run dev
```

### Scripts

- `npm run dev` — Start the Vite development server
- `npm run typecheck` — Run TypeScript type checking (`tsc -b --pretty false`)
- `npm test` — Run unit tests with Vitest (`vitest run`)
- `npm run lint` — Run ESLint
- `npm run build` — Run offline check, typecheck, and production build

### Project Structure

```text
src/
  app/            # AppShell and routes
  components/     # BrandMark, EndingFrame, RaceHud, WebGameStage, LiveOnDeviceDemo
  data/           # Challenge, persona, race, scoring, and kiosk JSON configs
  features/       # Onboarding, challenges, recommendations, store picks, value compare, handoff, staff panel
  game/           # Config loaders, characters, event bus, routing logic, and scoring modules
  services/       # Audio/haptics, inventory, persona, and local storage helpers
  store/          # Zustand game store
  styles/         # Light-theme CSS design tokens
stores/           # Store inventory datasets (DEL01, example)
tests/            # Vitest unit tests
docs/             # Architecture, game design, and deployment docs
```

> **Note:** Routing visuals are illustrative; hardware specs (NPU TOPS, battery Wh, processor power) are cited from Intel Core Ultra specifications and verified store inventory entries. Real performance and battery life depend on the model, software, and workload.
