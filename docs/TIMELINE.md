# Timeline — AI PC Showdown

Status: Phases 1–4 implemented, including the absolute 180-second segment controller, 25-second challenge caps and timed ending screens. Demo-unit timing is not measured yet.

## Phase 1 boundary

The landing screen is a pre-session screen. START creates a local-only session id and mounts the Phaser race/challenge experience. Race setup, five 25-second challenges, race finish and the ending placeholder are driven by one absolute timeline controller.

## Planned guided timeline

| Start (s) | End (s) | Duration | Screen | Phase |
|---:|---:|---:|---|---|
| 0 | 5 | 5 | Race setup | 2 |
| 5 | 30 | 25 | Study Sprint | 3 |
| 30 | 55 | 25 | Creator Mode | 3 |
| 55 | 80 | 25 | Privacy Shield | 3 |
| 80 | 105 | 25 | Stream Night | 3 |
| 105 | 130 | 25 | Battery Escape | 3 |
| 130 | 140 | 10 | Race finish | 2 |
| 140 | 152 | 12 | Persona reveal | 4 |
| 152 | 165 | 13 | Store picks or fallback | 4 |
| 165 | 175 | 10 | Value and fit | 4 |
| 175 | 180 | 5 | Next-step bar | 4 |

## Implemented hard rules

- Segments do not overlap.
- Every challenge is capped at 25 seconds.
- Skip scores 0 and gives both lanes the default route.
- At the cap, the best result so far is scored.
- Timers and listeners are cleaned up on scene exit.
- The ending persists after 180 seconds.

## Timing verification

- Phase 1: verify landing paint and animation behavior at 1920 × 1080 and 1366 × 768.
- Phase 7: measure all guided segments on the demo unit across 20 timed runs.

## Open decision

The spec states 60 seconds idle reset on landing/ending and a separate 45-second ending results timeout. Recommended default: landing 60 seconds, ending 45 seconds, with any shopper interaction resetting the timer.
