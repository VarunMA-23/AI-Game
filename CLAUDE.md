# CLAUDE.md: AI PC SHOWDOWN
## The 180-Second Upgrade (v3)

> **Project:** Offline-capable Intel AI PC retail experience
> **Category:** Gamified product discovery / retail technology
> **Audience:** Gen Z walk-in shoppers with little or no technical knowledge
> **Deployment:** Large Format Retail (LFR) demo units (Croma, Reliance Digital, Vijay Sales)
> **Primary objective:** Turn "Why do I need an AI PC?" into "I want this Intel AI PC."
> **Guided session:** 180 seconds. The ending screen then stays open for handoff until the shopper leaves.
> **Development approach:** Spec-driven, phased

---

# 1. PROJECT VISION

A premium arcade game that shows shoppers what an AI PC does for their daily life, then recommends a specific, in-stock model at the store they are standing in.

The experience must not feel like:
- A product advertisement.
- A technical presentation or spec sheet.
- A multiple-choice quiz.
- A chatbot.

## Core Concept

**"Your laptop is about to lose a race."**

Every challenge produces a task packet. The shopper decides which engine (CPU, GPU or NPU) each packet is routed to. Two lanes race on the same packets:

| Lane | Strategy | On-screen label |
|---|---|---|
| Left | Routes every packet through CPU or GPU only | "Without NPU routing" |
| Right | Routes each packet to the engine that suits it, including the NPU where the packet supports it | "With NPU routing" |

The lanes share the same packets and the same illustrative weights, so the comparison isolates routing strategy. It is not a comparison between brands.

Routing choices have visible consequences. When a packet is sent to an engine that cannot run it, the packet falls back and the shopper sees why (Section 5.3). This is how the game teaches that an AI PC does not make every task AI-accelerated.

The race is a routing simulation, not a benchmark. It never shows real speed, battery or performance numbers.

## Main Objectives

1. Grab attention within 3 seconds.
2. Be understandable by someone who has never used an AI PC.
3. Show what on-device AI does in everyday tasks, and where it does not apply.
4. Explain CPU, GPU and NPU roles accurately, through play.
5. Make privacy and efficiency tangible without fabricating numbers.
6. Land the shopper on a specific, in-stock Intel AI PC at this store, with a reason to choose it over the cheaper option.
7. Give the shopper a person to talk to and a portable takeaway.
8. Complete the guided session in 180 seconds or less.

---

# 2. TARGET PERSONAS

Persona comes from gameplay, not a questionnaire. There are no sign-ups, no personal data and no lengthy forms.

| Persona | Typical behaviour | Strongest challenges |
|---|---|---|
| THE LEARNER | Notes, research, assignments | Study Sprint |
| THE CREATOR | Photo and video editing, social content | Creator Mode |
| THE POWER USER | Meetings, browser tabs, documents at once | Stream Night (multitasking routing), Privacy Shield |
| THE GAMER | Games, streams, high-refresh play | Stream Night (gaming routing) |

Persona logic lives in `features/recommendations/` and has no UI imports (Section 8).

---

# 3. TECHNOLOGY STACK

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + TypeScript (strict) | Landing, instructions, results, ending, staff panel |
| Build | Vite | Produces a static bundle |
| Game engine | Phaser 3 | Race, challenges, timers, particles |
| Styling | Tailwind CSS | Design tokens in `styles/` |
| Animation | Framer Motion (React), Phaser tweens (game) | |
| Icons | Lucide React | |
| State | Zustand | Shared store, with Phaser connected through an event bus |
| Routing | React Router (hash-based) | Works offline and under kiosk launch |
| Offline | vite-plugin-pwa (Workbox precache) | Precaches all assets |
| Fonts | Self-hosted Inter and Space Grotesk | No runtime font requests |
| Storage | localStorage (session and pending handoffs only), local JSON (store and competitor data) | |
| QR codes | Local QR library | Generated in the browser |
| Persona card | Canvas render in the browser | Exported locally, no upload |
| Backend | None | The kiosk makes no runtime network calls |
| Deployment | Static bundle on the demo unit (Section 13) | Vercel is for preview builds only |

## Architectural Principle

- **React owns:** landing, instructions, persona reveal, store picks, value comparison, "Why this fits you" panel, next step, persona card, staff panel, idle reset, store readiness gate.
- **Phaser owns:** the race, the five challenge mini-games, timers, scoring animations, packet routing animations and particles.
- **Shared state:** the Zustand store is the single source of truth. Phaser reads it and emits events (`challenge:complete`, `packet:routed`, `packet:fallback`, `race:update`, `timer:tick`). React subscribes to those events. Phaser scenes never import React components.

Do not build the whole app inside Phaser.

---

# 4. SESSION TIMELINE (hard budget: 180 seconds)

Every guided segment has one start second, one end second and one screen. Nothing overlaps.

| Start (s) | End (s) | Duration | Screen | What happens |
|---:|---:|---:|---|---|
| 0 | 5 | 5 | Race setup | Two lanes appear with captions. "Your choices decide who wins." |
| 5 | 30 | 25 | Challenge 1: Study Sprint | Packet routed. Race HUD updates. |
| 30 | 55 | 25 | Challenge 2: Creator Mode | Packet routed. |
| 55 | 80 | 25 | Challenge 3: Privacy Shield | Packet routed. |
| 80 | 105 | 25 | Challenge 4: Stream Night | Three packets routed. |
| 105 | 130 | 25 | Challenge 5: Battery Escape | Five packets routed. |
| 130 | 140 | 10 | Race finish | Lanes cross the line. Disclosure text shown. |
| 140 | 152 | 12 | Persona reveal | Persona, three priorities, race result. |
| 152 | 165 | 13 | Store picks | Top, value and alternative in-stock models (or the fallback message). |
| 165 | 175 | 10 | Value comparison and "Why this fits you" | Top model vs cheapest in-stock model, plus persona fit panel. |
| 175 | 180 | 5 | Next-step bar | Primary "Ask a specialist," then "Save your picks," then "Play again." |

After 180 seconds, the ending screen stays open. The guided session is over, but the shopper can still use the handoff and QR actions. The idle rule in Section 13.4 then applies.

## Hard Rules

- Each challenge has a 25-second cap. At the cap, the challenge ends and the best result so far is scored. The shopper is never left in a stuck state.
- Any challenge can be skipped with a visible SKIP button. A skipped challenge scores 0 and gives both lanes the default route (Section 5.4).
- Timers and listeners are cleaned up on scene exit.
- The timeline is measured on the demo unit before pilot (Section 18).

---

# 5. THE ROUTING RACE

## 5.1 Packets

Each challenge produces packets defined in `data/challenges.json`. Each packet carries these config fields:

| Field | Meaning |
|---|---|
| `id` | Packet identifier |
| `label` | Short shopper-facing name |
| `npuCompatible` | Whether this packet is set up to run on the NPU in the demo. A config value for the simulation, not a claim about any real app. |
| `gpuSuitable` | Whether the GPU is a good home for this packet |
| `npuBenefit` | `"none"`, `"low"` or `"high"`. Illustrative. Used only to drive the battery and race visuals. |
| `fallbackEngine` | `"CPU"` or `"GPU"`. Where the packet lands when routed to an engine that cannot run it. |
| `illustrativeRoutingWeight` | Race progress weight for this packet. Not a measurement. |

Every packet with `npuCompatible: false` is still part of the game. Some shoppers will route it to the NPU and see it fall back.

## 5.2 Race Progress

- Correct routing advances a lane faster. Routing to an engine that cannot run the packet causes a fallback, which costs the lane a fixed illustrative delay from config.
- Progress is deterministic for the same inputs.
- The race never states or implies a time in seconds, a battery percentage, a frame rate, or a speedup multiple.
- The word "efficiency" is never used for race weights. Use `illustrativeRoutingWeight` in code and "routing" in copy.

## 5.3 Fallback Consequence

When a packet is routed to the NPU but `npuCompatible` is false:

1. The packet bounces back out of the NPU lane and lands on its `fallbackEngine`.
2. A caption appears for two seconds: "This task isn't set up for the NPU here. It ran on the GPU instead." (or CPU, per the packet's fallback).
3. The lane takes the fallback delay.
4. The shopper's score for that packet reflects the choice. Routing a non-NPU packet to the NPU is a learning moment, not a penalty larger than a wrong answer elsewhere.

This is the mechanic that teaches "an AI PC does not make every task AI-accelerated" through play.

## 5.4 Skipped Challenges

A skipped challenge assigns the default route to both lanes. The race segment is a tie. A skip cannot make the shopper lose by default.

## 5.5 Required On-Screen Disclosure

Show this in small but readable type in the race HUD and on the results screen:

> "Illustrative routing simulation. Not a benchmark. Real performance and battery life depend on the model, software and workload. Whether a task can use the NPU depends on the app."

## 5.6 Race Visual Rules

- Left lane uses Rival Red (#FF4D67). Right lane uses Electric Blue (#00A8FF). Cyan (#00E5FF) is reserved for the finish line and success effects.
- Each packet visibly travels into an engine icon (CPU, GPU or NPU). A fallback shows the packet bouncing back.
- Keep the race under 100 concurrent particles.

---

# 6. THE FIVE CHALLENGES

Each challenge includes: a one-sentence scenario, a one-sentence objective, an interactive mechanic, immediate feedback, a score, a one-line educational message, and a 25-second cap. All five are interactive.

## CHALLENGE 1: STUDY SPRINT
**Category:** Learning and productivity
**Scenario:** "Your exam is tomorrow. Turn tonight's lecture notes into five revision points."
**Mechanic:** A preloaded sample lecture note appears. The shopper drags five key concepts from a pool of nine into a summary tray. Two are distractors. Works with touch.
**Packet:** "Notes summary." `npuCompatible: true` in the demo, with a caption that the summary app must support on-device processing.
**Scoring:** Correct concepts minus incorrect placements, with a time bonus for completion within 15 seconds. Max 200.
**Educational message:** "AI can turn long notes into short summaries. On supported Intel AI PCs, compatible apps can run that work on the device."
**Guardrails:** The summary in DEMO mode is precomputed. Never label it as live AI output.

## CHALLENGE 2: CREATOR MODE
**Category:** Creativity
**Scenario:** "Your photo for tonight's post needs a glow-up."
**Mechanic:** A before-image appears. The shopper taps three tools in sequence: background removal, enhance, and style. Each plays a before/after transition from pre-generated images.
**Packets:** "Background removal" (`npuCompatible: true`, `npuBenefit: "low"`) and "Style filter" (`npuCompatible: false`, `gpuSuitable: true`). The shopper learns that the style filter stays on the GPU.
**Scoring:** Correct tool sequence for the target style, with a routing score for each packet. Max 200.
**Educational message:** "AI creative tools can edit and enhance photos faster. On supported Intel AI PCs, some of these effects can run on the device, while others run on the GPU."
**Guardrails:** MVP uses pre-generated images. Never present a static transition as live inference. In LIVE mode, label the output "Generated live on this device" and show the engine used.

## CHALLENGE 3: PRIVACY SHIELD
**Category:** Privacy
**Scenario:** "A confidential contract needs an AI summary. Where should it be processed?"
**Mechanic:** A fictional contract sits in the centre. Two routes appear: "Process on this device" and "Process in the cloud." The shopper taps one. The document animates along the chosen route, and a padlock stays with it on the local route.
**Packet:** "Confidential document." Local route required for the right lane to score.
**Scoring:** Choosing local processing, with a bonus for identifying what can still leak data: the app's own settings. Max 200.
**Result line (required):** "Keeping the file on the device means it isn't sent to a cloud service. It doesn't make the app or the operating system private. Check the app's privacy settings."
**Educational message:** "Compatible AI apps can run on your device, so your document doesn't leave it. Privacy depends on the app and its settings, not only on the chip."
**Guardrails:** Never imply that an NPU guarantees privacy. Never imply every AI app works offline. Make the local and cloud distinction visually explicit.

## CHALLENGE 4: STREAM NIGHT
**Category:** Gaming and multitasking
**Scenario:** "You're gaming, streaming to friends and joining a call. Everything has to stay smooth."
**Mechanic:** Three packets arrive together: GAME, STREAM and CALL (voice with background blur). The shopper drags each onto CPU, GPU or NPU. A frame-stability meter shows the game's smoothness. Sending the game to the GPU keeps the meter green. Sending the game to the NPU triggers a fallback to the GPU, and the caption explains why.
**Packets:**
- GAME: `npuCompatible: false`, `fallbackEngine: "GPU"`, `gpuSuitable: true`.
- STREAM: `npuCompatible: false`, `fallbackEngine: "GPU"`.
- CALL blur: `npuCompatible: true`, `npuBenefit: "low"`, `fallbackEngine: "CPU"`.

**Scoring:** Frame-stability score across the 25 seconds, plus correct routing for each packet. Max 200.
**Educational message:** "A game leans on the GPU. Background blur and some AI effects can run on the NPU, so your game keeps its smoothness."
**Gaming honesty rules:**
- The GPU is the primary gaming engine. Never imply the NPU renders games.
- The frame-stability meter is illustrative. Never display FPS, frame times or latency.
- Show the GPU as the game engine and the NPU as an effects engine, only where the packet supports it.

## CHALLENGE 5: BATTERY ESCAPE
**Category:** Power efficiency
**Scenario:** "You're at a café on 20% battery with work left to finish."
**Mechanic:** A fictional battery meter drains as the shopper routes five packets. Routing a packet with `npuBenefit: "low"` or `"high"` to the NPU drains the meter more slowly. Routing a packet with `npuBenefit: "none"` to the NPU changes nothing, and the caption says so.
**Packets:**
- Background blur batch: `npuBenefit: "high"`.
- Spreadsheet recalculation: `npuBenefit: "none"`, `gpuSuitable: false`, CPU default.
- GPU-heavy video export: `npuBenefit: "none"`, `gpuSuitable: true`. Stays on the GPU. The meter barely moves for this packet.
- Notes summary: `npuBenefit: "low"`.
- Browser tabs and documents: CPU default.

**Scoring:** Remaining simulated battery, plus correct routing. Max 200.
**Educational message:** "Dedicated AI engines can run some AI tasks using less power than general-purpose processors. Not every task benefits, and real battery life depends on the battery, screen, software and what you do."
**Hard restrictions:**
- Labelled "Illustrative" on the meter and in the caption.
- Never display a battery-life figure in hours or minutes, or a percentage improvement.
- Drain rates are config values with no link to measured data.

---

# 7. SCORING

Maximum score: 1000 (5 × 200).

- Score reflects correct routing and understanding, not Intel-related selections.
- Speed earns a bonus only within correct answers.
- Skips score 0.
- Scoring functions live in `game/scoring/` as pure functions with unit tests.

Results display:
- Total score and per-challenge scores.
- Challenges completed (out of 5).
- Time taken.
- Persona and strongest category.
- One achievement.

Achievements:
- Productivity Master (Study Sprint highest)
- Creative Genius (Creator Mode highest)
- Privacy Guardian (Privacy Shield highest)
- Stream Star (Stream Night highest)
- Efficiency Expert (Battery Escape highest)

---

# 8. PERSONA ENGINE

Persona is calculated from weighted category scores, not total score alone. Implemented in `features/recommendations/personaEngine.ts`.

| Persona | Primary signal (weight 1.0) | Secondary signal (weight 0.5) |
|---|---|---|
| THE LEARNER | Study Sprint | Privacy Shield |
| THE CREATOR | Creator Mode | Stream Night |
| THE POWER USER | Stream Night (multitasking routing) | Privacy Shield, Battery Escape |
| THE GAMER | Stream Night (gaming routing) | Creator Mode |

Tie-breaks: prefer the persona with the higher primary-signal raw score. If still tied, prefer THE POWER USER.

Required behaviour:
- Persona is never assigned from one challenge without the weighted calculation.
- A shopper who skipped most challenges gets THE POWER USER with the note: "Play again to unlock a sharper match."
- The engine takes a plain object of category scores and returns a persona and priorities. No React or Phaser imports.

---

# 9. THE ENDING

The ending is the conversion screen. It must give the shopper a specific model, a clear reason to choose it over the cheaper option, and a person to talk to.

## 9.1 Store Readiness Gate

Before the store picks screen loads, the app checks inventory health.

- **Pass:** At least two in-stock models have `lastVerified` and `priceDate` both within 90 days. Show store picks normally.
- **Fail:** Show the fallback. The primary button becomes "Ask a specialist." The store picks screen says: "Our team will match you to the best in-stock model."
- The gate result is shown to staff in the staff panel (Section 13.3), with a warning before the kiosk enters fallback mode.
- The gate never shows fictional products or prices.

## 9.2 Screen Sequence

1. **Persona reveal (12 s):** "YOU'VE UNLOCKED YOUR AI PC IDENTITY." Persona, three priorities, and the race result with its disclosure.
2. **Store picks (13 s):** Top, value and alternative in-stock models, ranked by persona priorities. Or the fallback (Section 9.1).
3. **Value comparison and fit (10 s):** Top model against the cheapest in-stock model, plus the "Why this fits you" panel (Section 9.4).
4. **Next step bar (from 175 s, persists):** Primary "Ask a specialist." Secondary "Save your picks" (QR and persona card). Tertiary "Play again."

## 9.3 In-Store Model Recommendation

- Models come only from `stores/{storeId}/inventory.json`, written by store staff. Never a hardcoded list.
- Show three models at most: top pick, value pick and alternative.
- Each card shows: model name, exact processor model, NPU class (only if verified on Intel's spec page), RAM, storage, battery capacity (Wh, from the manufacturer), GPU, price as entered by staff with its date, warranty, and "In stock at this store."
- If `lastVerified` is older than 90 days, show "Specs to be re-checked" on that card.

| Persona | Ranking emphasis |
|---|---|
| THE LEARNER | Battery capacity, RAM, price |
| THE CREATOR | RAM, storage, NPU class, display |
| THE POWER USER | RAM, NPU class, battery capacity |
| THE GAMER | GPU class, RAM, manufacturer's cooling note |

## 9.4 "Why This Fits You" Panel

This replaces a competitor-led emphasis. It shows the shopper how the recommended model matches their own priorities, using verified facts only.

| Persona priority | Verified proof on the card |
|---|---|
| Study and notes | Battery capacity, RAM, supported note or summary apps (if entered and sourced) |
| Creating content | RAM, storage, display, NPU-accelerated creative features (if sourced) |
| Gaming and streaming | GPU class, RAM, manufacturer's cooling note |
| Multitasking and privacy | RAM, NPU class, local-processing features (if sourced) |

- Each row names its spec and source.
- If a value is not verified, the row reads "Ask our team." Never fill it with a guess.
- Closing line, always shown: "Compare the exact configuration, software support, warranty and price before you decide."

## 9.5 Price-Versus-Value Moment

- Compare the top model with the cheapest in-stock model.
- Rows: RAM, storage, battery capacity, NPU class (verified), GPU class, warranty.
- Each difference in plain language, for example: "16 GB RAM vs 8 GB: more room for several apps open at once."
- Prices are in INR, entered by staff, with the store's price date.
- No value score, no percentage, no overall winner. If the cheaper model is the better fit for the persona, say so.

## 9.6 Shopper Checklist

A five-question checklist works on any laptop. It appears on the results screen and on the persona card.

1. Which processor family and exact model is it?
2. Does it have an NPU, and which AI features do the apps I use support?
3. How much RAM, and can it be upgraded?
4. What's the battery capacity, and does the manufacturer publish a battery-life test?
5. What's the warranty and return policy?

## 9.7 Staff Handoff

- Primary button: **"Ask a specialist."**
- Creates a handoff record in local storage: store ID, persona, model code being viewed, timestamp. No name, phone number or personal data.
- The staff panel shows pending handoffs. Staff confirm when they have spoken to the shopper, which clears the record.
- Handoff records are deleted after 24 hours or on confirmation, whichever comes first.
- The default adapter is local-only. Staff read it from the panel. A network adapter is optional and out of scope for the MVP.

## 9.8 Persona Card (shareable)

- A card rendered locally with: persona name, top priority, store name, and the QR code.
- No name, photo, session ID or timestamp.
- Exported as an image to the staff-printable area or shown as a phone-scannable QR. Shoppers can screenshot it.
- The card carries the shopper checklist (9.6) on its back face, when printed.

## 9.9 QR Code

- Payload: `IPCS|STORE:{storeId}|P:{persona}|M:{modelCodes}`. Example: `IPCS|STORE:DEL01|P:CREATOR|M:IN-A1,IN-B2`.
- Generated locally. No network call on the kiosk.
- Contains no session ID and nothing that identifies the shopper.
- Scanning opens the store's product page, which is outside this build.

---

# 10. PRODUCT DATA

## 10.1 Store Inventory File

Path: `stores/{storeId}/inventory.json`. Loaded at boot from the local bundle. Staff replace the file to update it. No internet fetch.

```json
{
  "storeId": "DEL01",
  "storeName": "Example Store, Delhi",
  "currency": "INR",
  "priceDate": "2026-11-20",
  "models": [
    {
      "code": "IN-A1",
      "brand": "Laptop Manufacturer",
      "model": "Actual Model Name",
      "processorFamily": "Intel Core Ultra",
      "processorModel": "Exact model from Intel spec page",
      "npu": { "available": true, "classFromIntelSpec": null, "tops": null },
      "gpu": "Exact GPU configuration",
      "ram": "16GB",
      "storage": "512GB SSD",
      "batteryWh": null,
      "displayNote": "Size and resolution",
      "warrantyMonths": null,
      "price": null,
      "inStock": false,
      "sourceUrls": [],
      "lastVerified": null,
      "aiFeatures": [],
      "supportedApplications": []
    }
  ]
}
```

Rules:
- `price`, `priceDate`, `batteryWh`, `warrantyMonths` and `inStock` are entered by staff. Null means "Not shown."
- `npu.tops` stays null unless copied from a cited Intel or manufacturer page.
- `inStock: false` models are never recommended.
- `aiFeatures` and `supportedApplications` list only features verified on the store unit (Section 12.4).
- The placeholder is in `stores/example/` only. The demo unit loads its own store folder.

## 10.2 Competitor Reference File

Path: `data/competitors.json`. Used only in the comparison and checklist content, never in the race.

Entries are **classes**, not brands ranked against each other:
- AMD Ryzen AI
- Qualcomm Snapdragon X
- Apple M-series

Each class stores:
- `npuNote`: the class's NPU approach, with `sourceUrl`.
- `strengths`: at least one honest strength, with `sourceUrl`.
- `intelStrengths`: at least one honest Intel strength on the same measures.
- `lastVerified`.

Rule: every entry includes at least one competitor strength. A comparison with no competitor strengths fails review.

---

# 11. COMPETITIVE COMPARISON

- Shown in the value comparison area, after the store picks.
- The shopper can switch the comparison class. Default: AMD Ryzen AI.
- Rows: NPU approach, memory, storage, battery capacity (Wh, where published), app support for the shopper's persona, one competitor strength. Each row shows its source in small text.
- No speed, battery-life or performance difference is stated unless it comes from a cited independent test. Otherwise the panel says: "Check independent reviews before you buy."
- Never claim a competitor lacks AI capability if it has an NPU or accelerator.

---

# 12. AI INTEGRATION AND MODES

## 12.1 Modes

| Mode | Behaviour | Labels shown |
|---|---|---|
| DEMO (default) | Preloaded content, deterministic, fully offline | "Demo content" on AI outputs |
| LIVE (optional) | Local inference service with real output | "Generated live on this device," plus the engine (CPU, GPU or NPU) |

- Mode is set in a local config file, not the UI.
- If LIVE fails, the app falls back to DEMO for that challenge and shows "Showing demo content." Gameplay never stops.
- Never claim an NPU was used unless the inference service reports the execution device and the report is recorded.

## 12.2 Phase 6 Scope

Investigate Intel AI Playground and OpenVINO. Implement LIVE for one challenge only (recommended: Study Sprint summarisation), and only after the execution device is verified on the target unit. Ship in DEMO mode if verification is not complete.

## 12.3 Browser Limitation

Do not assume WebGPU or any browser API uses the Intel NPU automatically. Verify the execution device through the inference runtime.

## 12.4 Verify Before Citing

The following must be checked against current Intel and manufacturer pages before they appear in the UI, store data or copy:
- Processor model names and NPU classes.
- Any TOPS figures, which must be stated separately for NPU and GPU.
- Supported AI frameworks and runtimes named in copy.
- Which on-device features run on the NPU on the store unit.

Until verified, the UI uses generic wording ("compatible apps," "supported features") and never names a framework or figure.

---

# 13. OFFLINE KIOSK DEPLOYMENT

## 13.1 Build and Packaging

- Vite builds a static bundle with all assets.
- vite-plugin-pwa precaches every route, image, audio file and JSON file.
- The bundle includes `stores/{storeId}/inventory.json` for the unit's store.
- The build fails if any runtime `fetch` or external URL remains in source (lint rule or build-time check).
- Fonts are self-hosted.

## 13.2 Launch

- The unit serves the bundle locally, either through a small static server started at boot or by opening the built index.
- Chromium kiosk launch in fullscreen, with no address bar, tabs or browser UI.
- Auto-start on boot. Restart if the page crashes.
- Primary resolution 1920 × 1080. Must also work at 1366 × 768.

## 13.3 Staff Panel

- Opened by a 3-second long press on a screen corner, then a store-specific PIN.
- Shows: pending handoffs, store inventory status, store readiness gate result (with a warning before fallback), current mode (DEMO or LIVE), and a session reset button.
- Includes "Exit kiosk" for maintenance. This is the only exit.

## 13.4 Idle and Reset

- After 60 seconds of no interaction on the landing or ending screens, return to landing.
- During a challenge, idle reset is disabled. The 25-second cap ends each challenge.
- Results timeout: 45 seconds without interaction on the ending screen returns to landing.
- Restart clears all session state, including race, scores, persona, persona card and QR payload. Pending handoffs stay until confirmed or expired.

## 13.5 Privacy

- No personal data is collected.
- No cookies, analytics or person-linked identifiers.
- localStorage holds only the current session and pending handoffs. Both are cleared as above.

---

# 14. VISUAL DESIGN SYSTEM

## Palette (Intel-inspired, not official)

| Token | Hex | Use |
|---|---|---|
| Deep Navy | #071426 | Background |
| Intel-inspired Blue | #0071C5 | Highlights |
| Electric Blue | #00A8FF | Right lane, interactive |
| Cyan | #00E5FF | Finish line, success effects |
| White | #FFFFFF | Primary text |
| Muted Grey | #94A3B8 | Secondary text |
| Success Green | #22C55E | Completed challenges, frame stability OK |
| Rival Red | #FF4D67 | Left lane, fallback caption accent |

Do not present the app as an official Intel product unless brand authorisation is obtained.

## Type

- Space Grotesk for headings and mission titles.
- Inter for body and instructions.
- Minimum 20 px body text at 1920 × 1080.
- Keep copy under 12 words per headline.

## Rules

- No heavy gradients, generic dashboard cards, cartoon art or cluttered layouts.
- Every screen has one primary action.
- Touch targets at least 64 px.
- WCAG AA contrast minimum.
- Animations serve gameplay. None delays an instruction or result.

## Copy Style

- Short sentences. No "welcome to the future."
- Explain each technical term once, in plain words, the first time it appears.
- Every instruction and reward has a caption, so the app works with sound off.

---

# 15. SCREENS

| # | Screen | Purpose | Key content |
|---|---|---|---|
| 1 | Landing | Grab attention in 3 seconds | Logo, two laptop silhouettes with pulsing lanes, "YOUR NEXT LAPTOP NEEDS AN UPGRADE.", "5 challenges. 180 seconds. One smarter choice.", START |
| 2 | Race setup | Explain the lanes | Two lanes, "Your choices decide who wins." |
| 3 | Challenges 1 to 5 | Play | Race HUD, timer, skip, routing captions, fallback captions |
| 4 | Race finish | Show result | Lane positions, disclosure |
| 5 | Persona reveal | Identity | Persona, three priorities, achievement |
| 6 | Store picks or fallback | Recommend | Three in-stock models, or "Our team will match you" |
| 7 | Value and fit | Justify the choice | Top vs cheapest, "Why this fits you," checklist link |
| 8 | Next step | Convert | "Ask a specialist" (primary), "Save your picks" (QR and card), "Play again" |
| 9 | Staff panel | Staff use | PIN, handoffs, readiness gate, mode, exit |

---

# 16. PROJECT STRUCTURE

```
src/
├── app/                      App.tsx, routes.tsx, providers/
├── components/
│   ├── common/
│   ├── buttons/
│   ├── animations/
│   └── game-ui/
├── game/
│   ├── config/               race and challenge config loaders
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── RaceSetupScene.ts
│   │   ├── StudySprintScene.ts
│   │   ├── CreatorModeScene.ts
│   │   ├── PrivacyShieldScene.ts
│   │   ├── StreamNightScene.ts
│   │   ├── BatteryEscapeScene.ts
│   │   └── RaceFinishScene.ts
│   ├── race/                 routing and fallback logic (pure, unit tested)
│   ├── scoring/              pure scoring functions
│   └── events/               event bus shared with React
├── features/
│   ├── onboarding/
│   ├── challenges/
│   ├── recommendations/      personaEngine.ts, modelRanking.ts (no UI imports)
│   ├── store-picks/
│   ├── store-readiness/      gate logic (pure, unit tested)
│   ├── value-compare/
│   ├── fit-panel/            "Why this fits you"
│   ├── persona-card/         local canvas render and export
│   ├── handoff/
│   └── staff-panel/
├── services/
│   ├── ai/                   AIService interface, demo adapter, live adapter
│   ├── inventory/            loads stores/{storeId}/inventory.json
│   ├── competitors/          loads data/competitors.json
│   └── storage/              session and handoff storage
├── data/
│   ├── challenges.json       challenge content and packets
│   ├── personas.json
│   └── race.json             illustrativeRoutingWeight values, fallback delays
├── store/                    Zustand store
├── types/
├── utils/
└── styles/

stores/
├── example/inventory.json    placeholder only
└── DEL01/inventory.json      pilot store file (example ID)

public/
├── images/                   pre-generated before/after images
├── audio/
└── animations/

docs/
├── ARCHITECTURE.md
├── GAME_DESIGN.md
├── AI_INTEGRATION.md
├── PRODUCT_DATA.md
├── TIMELINE.md
├── MEASUREMENT.md
└── KIOSK_DEPLOYMENT.md
```

---

# 17. STATE

```typescript
interface GameState {
  sessionId: string;              // random, local only, never sent anywhere
  storeId: string;
  mode: 'DEMO' | 'LIVE';
  phase: 'landing' | 'setup' | 'challenges' | 'race-finish' | 'persona' | 'store' | 'value' | 'next-step' | 'staff';
  currentChallenge: number;       // 1..5
  startedAt: number | null;
  completedAt: number | null;
  challengeScores: Record<ChallengeId, number>;
  challengeStatus: Record<ChallengeId, 'pending' | 'completed' | 'skipped' | 'timed-out'>;
  packetRoutes: Record<PacketId, { routedTo: 'CPU' | 'GPU' | 'NPU'; fellBack: boolean }>;
  race: { leftProgress: number; rightProgress: number };
  persona: PersonaId | null;
  recommendedModelCodes: string[];
  storeReady: boolean;            // result of the readiness gate
  handoffPending: boolean;
}
```

Rules:
- Scoring, persona and readiness functions take plain inputs and return plain outputs.
- Restart resets every field except pending handoffs.
- Phaser reads state through the event bus and never writes React state directly.

---

# 18. TESTING AND MEASUREMENT

## Gameplay
- Landing loads and START begins a session.
- Each challenge can be completed, skipped and timed out.
- Routing a packet to an engine that cannot run it triggers the fallback and caption, and the lane takes the fallback delay.
- The battery challenge shows no change when a `npuBenefit: "none"` packet is routed to the NPU.
- Race progress updates for each routing choice and for skips.
- Scores are capped at 200 per challenge.
- Persona calculation matches the weighting table, including ties and skip-heavy sessions.
- Store picks show only in-stock models from the loaded file.
- Readiness gate: two verified in-stock models passes; one fails and shows the fallback.
- Price-versus-value panel shows the correct top and cheapest in-stock models.
- "Why this fits you" shows "Ask our team" for any unverified value.
- "Ask a specialist" creates a handoff record with no personal data.
- Restart clears session state.

## Timing
- Each segment in Section 4 ends at its listed second, measured on the demo unit.
- Each challenge ends at 25 seconds with no player input.
- The guided session finishes within 180 seconds across at least 20 timed runs with different users.

## Technical
- No TypeScript errors (strict).
- No runtime network requests, checked in the network panel and by the build check.
- No console errors, unhandled promise rejections or broken assets.
- No duplicate Phaser instances after repeated sessions.
- Timers and listeners cleaned up on scene exit.
- LIVE failure falls back to DEMO without breaking gameplay.

## Kiosk
- Works offline after a cold boot with the network disabled.
- Works at 1920 × 1080 and 1366 × 768.
- Touch-only operation.
- Idle reset returns to landing after 60 seconds.
- Staff panel opens with the correct PIN and exits cleanly.

## Content
- Every product field is cited, entered by staff, or null.
- Every competitor entry has at least one strength and a source.
- No battery-life figures, benchmark numbers, FPS values or speedup multiples appear anywhere in the UI.
- Section 12.4 items are verified before release.

## Measurement (pilot targets)
Track these per store, per week, without collecting personal data:

| Metric | Definition | Pilot target |
|---|---|---|
| Completion rate | Sessions reaching the next-step bar ÷ sessions started | Set a baseline in week 1, then target a rise |
| Action rate | Finishers who tap "Ask a specialist" or save the QR or card ÷ finishers | Set a baseline in week 1 |
| Handoff conversion | Handoffs that the store records as a sale within 7 days ÷ handoffs | Set a baseline; store-recorded, not kiosk-tracked |
| Gate uptime | Share of days the readiness gate passed | Target 90% or more |

Counts are stored as anonymous daily totals on the staff panel. Nothing is sent over the network.

---

# 19. DEVELOPMENT PHASES

## PHASE 1: Foundation
- Vite, React, TypeScript (strict), Tailwind, Framer Motion, Zustand, React Router (hash).
- Self-hosted fonts and design tokens.
- Landing screen.
- Offline PWA shell with precache.

Deliverable: polished landing screen that loads offline.

## PHASE 2: Race and Routing
- Phaser connected to React through the event bus.
- Pure race and fallback logic, unit tested, driven by `race.json`.
- Race HUD, lanes, captions, disclosure.
- 25-second cap timers.

Deliverable: race running with placeholder packets, including fallback.

## PHASE 3: Challenges
Build in this order, testing each before the next:
1. Study Sprint
2. Creator Mode
3. Privacy Shield
4. Stream Night
5. Battery Escape

Deliverable: five playable challenges feeding the race.

## PHASE 4: Ending
- Persona engine (pure, unit tested).
- Persona reveal and race result.
- Inventory loader, readiness gate and model ranking.
- Store picks and fallback.
- Value comparison and "Why this fits you" panel.
- Shopper checklist.
- Handoff record and staff panel.
- QR and persona card.

Deliverable: full session ending in a real in-stock recommendation, or the fallback.

## PHASE 5: Competitor Data and Pilot Store
- Competitor reference file with sources.
- Comparison panel.
- Verified inventory for the pilot store.
- Verification of every Section 12.4 item.

Deliverable: sourced comparison and verified pilot data.

## PHASE 6: Advanced AI (optional)
- Investigate Intel AI Playground and OpenVINO.
- LIVE mode for one challenge, only after execution-device verification.

Deliverable: one verified live demonstration, or a DEMO-only ship.

## PHASE 7: Kiosk Hardening and Pilot
- Offline build check.
- Kiosk launch, auto-start, crash recovery.
- Idle reset and session reset on the demo unit.
- Timing test on the demo unit.
- Measurement set up and baselines taken in week 1.

Deliverable: stable, offline-capable pilot with measurement in place.

---

# 20. WORKING RULES

- **Spec-driven:** Before a major feature, restate the requirement, inspect the project, list affected files, implement the smallest complete unit, test it, and update the matching doc.
- **Strict TypeScript.** No `any` without a comment explaining why.
- **Separation of concerns:** game logic is pure and testable. Presentation reads state and does not compute scores.
- **Keep the MVP playable at every milestone.**
- **Do not invent:** Intel benchmarks, competitor weaknesses, battery-life figures, speedup multiples, TOPS values, product specifications, prices, framework support or software compatibility claims. Unknown values are null and display as "Not shown," or they are left out.
- **Do not claim NPU execution** unless verified and recorded.
- **Route, don't rank:** race content uses "routing" and `illustrativeRoutingWeight`. Never "efficiency."
- **Do not add scope** beyond this spec unless it clearly improves the experience.

---

# 21. DEFINITION OF DONE

1. A shopper can start immediately, with no login or setup.
2. The guided session finishes within 180 seconds on the demo unit.
3. Five challenges are playable, each capped at 25 seconds.
4. All five challenges are interactive.
5. The routing race runs through all five challenges, with visible fallback when a packet cannot run on the chosen engine.
6. Gaming is covered by Stream Night, with the GPU shown as the game engine.
7. CPU, GPU and NPU roles are explained accurately, and NPU routing is shown not to help every task.
8. Privacy is shown as an app-and-settings matter, not a chip guarantee.
9. Battery and race outputs are labelled illustrative, with no fabricated numbers.
10. The persona comes from weighted category scores.
11. The ending recommends in-stock models from the store's own file, or shows the fallback.
12. A value comparison and "Why this fits you" panel explain the choice using verified facts only.
13. The shopper checklist and competitor comparison are even-handed and sourced.
14. A staff handoff and a local persona card are available, and neither stores personal data.
15. The app runs fully offline, in fullscreen kiosk mode, with idle reset and a staff exit.
16. Pilot measurement is in place, with baselines recorded in week 1.

---

# 22. PRODUCT PHILOSOPHY

Shoppers should feel the difference, not read about it.

- Study Sprint: How can AI help me learn?
- Creator Mode: How can AI help me create?
- Privacy Shield: How do I keep my data on my device?
- Stream Night: How do I game, stream and call without stutter?
- Battery Escape: Which of my tasks actually benefit from an NPU?

**The central message:**

"Don't just buy a laptop for what you need today. Discover what your next PC can help you do tomorrow."

The ending is not a link. It is a specific in-stock laptop, a clear reason to pick it over the cheaper one, a checklist to compare it with anything else, and a person at the store who can help.