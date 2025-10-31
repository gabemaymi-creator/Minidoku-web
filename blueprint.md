## Sudoku App Development Blueprint — Master Prompt

Purpose: This document is a copy-paste-ready, production-focused prompt and blueprint to guide a solo developer through designing, prototyping, implementing, testing, and releasing a Sudoku app for iPhone (with future Android support). It includes PRD elements, milestones, developer prompts, acceptance criteria, testing plans, and templates for PRs/issues and QA.

---

## Role & Mission

- Role: You are a Product+Engineering lead and prompt-driven development agent responsible for delivering a polished Sudoku app for iPhone, starting with a web prototype and moving to native Swift (iOS) implementation, while enabling iterative testing and quality of life features.
- Mission: Deliver a high-quality, maintainable Sudoku application with: an MVP web prototype (HTML/CSS/JS), a robust Swift iOS app replicating prototype behavior, smooth UI animations, theming, game modes (start with classic 9x9), statistics, and a polished release-ready product.

## Goals & Success Criteria

- Functional: Core Sudoku gameplay for classic 9x9 works reliably (puzzle generation, input, notes, delete, hint mechanism).
- UX: Smooth fade transitions between screens, clear highlighting behavior, responsive controls on iPhone-size screens.
- Settings: Light, dark, and system-following themes implemented.
- Metrics: Basic stats tracking per game mode (games played, win/loss/time, avg time), persisted across launches.
- Prototype -> Native parity: Behavior in web prototype mirrors the Swift app's gameplay and UI flows.
- Maintainability: Clean modular code, documented PRD, and templates for repeatable developer work.

## Required Variables (use {{VARIABLE}} format)

- {{APP_NAME}} — Example: "PocketSudoku".
- {{PRIMARY_LANGUAGE}} — Example: "Swift" for iOS, "Java/Kotlin" for Android in future.
- {{PROTOTYPE_HOST}} — Local path or static host for web prototype.
- {{TARGET_IOS_VERSION}} — Example: 15.0 or 16.0.
- {{THEME_MODES}} — [light, dark, sepia, high-contrast, system].
- {{FONTS}} — SF Compact Display (iOS), Google Sans (Android).
- {{HINTS_ALLOWED}} — Progressive hint system, 3 levels per hint (location, number, technique).

Missing Inputs checklist: If any variable above is undefined, the developer must choose values before implementation.

## Context & Constraints

- Platform first: iPhone (Swift, UIKit or SwiftUI). Prototype as web app (HTML/CSS/JS) to validate mechanics rapidly.
- Development environment: VS Code as editor co-located with Xcode project folder to allow iterative development and simulator builds.
- Monetization: Horizontal banner ad in the bottom of the screen. Hints unlockable via ad view (placeholder hook; integrate ad SDK later). Hints capped per session.
- Privacy: No PII required. Stats stored locally; consider opt-in for cloud sync/leaderboards later.
- Accessibility: Large text support, VoiceOver labels, color contrast for light/dark.

## Game Rules & Core Mechanics (Canonical Sudoku)

- Board: 9x9 grid composed of nine 3x3 regions.
- Objective: Fill all cells with numbers 1–9 so each row, column, and 3x3 region contains all digits exactly once.
- Inputs: Tapping an empty cell highlights the cell, its row and column, and possible numbers.
- Notes mode: Toggle to input candidate notes (a 3x3 mini-grid inside cell with gray digits 1–9).
- Delete: Removes player's placed number from a cell (but not system or prefilled numbers).
- Hints: Reveal the correct number in a chosen empty cell; costs one hint credit, prompt ad viewing if required.
- Validation: Illegal placements are prevented (or flagged depending on difficulty/settings).

Edge Cases: prefilled conflicts must never be produced by generator; user attempts to edit preset numbers disallowed; empty or solved board states handled gracefully.

## Game Modes (initial set)

- Classic: single-player 9x9, difficulty: Easy / Medium / Hard / Expert.
- Timed: Classic with a clock and time-based leaderboards (later stage).
- Anti-cheat & Rewards: track hints used; optionally disable leaderboards if hints used.

Later expansions: 4x4, 16x16 variants, Killer Sudoku, multiplayer collaborative/concurrent solving (design notes included below).

## UI/UX Requirements

### Launch Experience
- Instant load (200-300ms) with no splash screens or animations
- First launch: Opens directly to an Easy difficulty puzzle
- Single onboarding tooltip: "Tap a cell, then select a number below"
- Returning users: Instant resurrection of last game state

### Visual Design
- Edge-to-edge immersive board layout
- Three-tier border hierarchy:
  - Cell separators: 1px hairline (#E0E0E0 light, #404040 dark)
  - Box boundaries: 3px medium (#9E9E9E light, #757575 dark)
  - Grid perimeter: 4px bold (#424242 light, #BDBDBD dark)
- Typography:
  - Numbers: SF Compact Display iOS/Google Sans Android, 28-32pt
  - Given numbers: Bold weight (#212121 light, #FAFAFA dark)
  - User numbers: Regular weight, 85% opacity
  - Pencil marks: 10-12pt, #757575, 3×3 micro-grid

### Themes & Colors
- Light: White background, charcoal numbers
- Dark: Deep charcoal (#1E1E1E), off-white numbers (#FAFAFA)
- Sepia: Warm cream (#F5F1E8), brown numbers (#3E2723)
- High Contrast: Pure black/white for accessibility
- Theme changes: 200ms cross-fade transition

### Navigation & Layout
- Flat two-level structure
- Menu icon (top-left): Three lines or "×"
- Theme selector (top-right): Palette icon
- Number pad: Anchored bottom, 1-9 horizontal row
- Cell size: Perfect squares, 12-16px internal padding

### Input Methods
- Cell-first flow: Tap a cell → highlight row/column/box → choose number from palette
- Number fill animation: 150ms scale-up + haptic
- Smart number pad:
  - Remaining count badges
  - Auto-dim completed numbers
  - Notes toggle + hint action shortcuts

### Advanced Features
- Multi-touch gestures:
  - Long-press: Quick pencil mark
  - Swipe: Multi-cell selection
  - Two-finger tap: (optional) quick notes toggle
- Context-aware highlighting:
  - Selected cell: Primary accent border
  - Same numbers: 15% tint
  - Related cells: 5% tint on row/column/box

### Validation & Assistance
- Three validation modes:
  - No checking
  - Duplicate highlighting (default)
  - Real-time with shake animation
- Pencil mark modes:
  - Manual (default)
  - Auto-fill
  - Hybrid (auto-remove invalid)
- Progressive hint system:
  1. Highlight logical next cell
  2. Show correct number
  3. Explain technique used

### Completion & Rewards
- Multi-sensory celebration (2.5s sequence):
  1. Haptic + board shimmer (0ms)
  2. Themed confetti burst (150ms)
  3. Success chime (300ms)
  4. Completion modal (500ms)
- Statistics tracking:
  - Completion time
  - Best time comparison
  - Accuracy percentage
  - Hints used
  - Achievement milestones

### Accessibility
- Tap targets >= 44×44pt
- High contrast theme option
- VoiceOver optimization
- Scalable typography
- Colorblind-friendly palette
- Reduced motion support

## Data Model / Storage

- GameState:
  - id, startedAt, endedAt, mode, difficulty, board (initial/prefilled state), currentState, moves[], notes[], hintsUsed, timeElapsed
- Statistics:
  - per-mode: gamesPlayed, wins, losses, avgTime, bestTime, hintsUsed
- Storage:
  - Local persistence (UserDefaults or local DB like SQLite/CoreData for Swift). JSON serialization for web prototype.

## Puzzle Generation & Solver

- Generator: Produce valid 9x9 boards with unique solution (use backtracking generator + randomized removal based on difficulty).
- Validator/Solver: Deterministic solver to check uniqueness and provide hints (used by hint feature and generator).

Implementation notes:
- For prototype: use a JS solver/generator library or implement backtracking solver to guarantee uniqueness.
- For iOS: re-implement or port the generator/solver in Swift; consider unit tests to ensure parity.

## Prototype Plan (Web MVP)

- Goal: Fast feedback loop verifying gameplay, notes behavior, highlight logic, and palette interactions.
- Minimal feature set for prototype:
  - 9x9 board rendering
  - Tap/click selection and highlight
  - Number palette for input and notes toggle
  - Simple generator + solver (ensure unique solution)
  - Save/load game to localStorage
  - Theme toggle (light/dark)
  - Smooth fade transitions using CSS
- Deliverable: A single-page app with modular JS that can be iterated in the browser and used as spec for Swift UI.

Prototype Acceptance Criteria:
- All core interactions functional in mobile viewport.
- Solver produces unique valid puzzles for Easy/Medium/Hard sets.
- Notes and delete behaviors function correctly.

## Swift iOS Implementation Plan

Architecture:
- Use SwiftUI (recommended) for rapid UI iteration and smooth animations, or UIKit if you need older compatibility.
- MVVM pattern: Views (SwiftUI), ViewModels (game logic glue), Models (GameState, Board, Cell).
- Module separation: UI, GameEngine (generator/solver), Persistence, Analytics, Ads (placeholder interface).

Key components:
- GameView: renders board, handles taps, highlights, keyboard palette, notes grid overlay
- GameEngine.swift: generator, solver, validators
- StatsManager.swift: aggregates and persists per-mode statistics
- SettingsView.swift: theme and difficulty controls

Developer workflow (VS Code + Xcode):
- Keep Xcode project in same folder. Use VS Code for editing and quick refactor. Open the Xcode project to run on simulator/device.
- Use Swift Package Manager for modular code if desired.

Animation and Transitions:
- Screen transitions: 200-300ms cross-fade with easeInOut
- Theme changes: 200ms cross-fade
- Number entry: 150ms scale-up animation with haptic feedback
- Button press: 120ms scale animation (98% scale on press)
- Selection highlight: 8% tint with border glow, 60ms response
- Cell validation: Gentle shake animation for incorrect entries
- Completion celebration: 2.5s choreographed sequence

Testing:
- Unit tests for generator/solver to ensure unique solutions
- UI tests for major flows (create game, input numbers, notes, delete, hint)
- Animation timing verification across all transitions
- Theme switching and accessibility mode testing
- Multi-touch gesture validation

## Hints & Monetization (design)

- Hints per session: default 3.
- Hint gating: show an ad view (stubbed in prototype) before granting hint; later integrate ad SDKs.
- Analytics: track hint usage and ad impressions.

## Statistics & Leaderboards (staged)

- Local Stats: required for MVP. Per-mode, store gamesPlayed, wins, avgTime, bestTime, hintsUsed.
- Leaderboards: later stage — design API contract and privacy plan before integrating.

## QA, Acceptance Criteria & Edge Cases

Acceptance checklist for each release:
- Core gameplay: board validation, generator uniqueness, solver correctness (unit tests pass).
- UI: selection highlighting, notes behavior, palette inputs, delete/hint flows verified on device.
- Settings: theme switching and system-follow behavior verified.
- Persistence: resume games work, stats persist.
- Analytics/Privacy: no PII stored; privacy policy placeholder included.

Edge cases to test:
- Rapid input toggling in notes vs normal mode.
- Device rotation / different screen sizes.
- Out-of-memory / low storage handling when persisting.
- App background/foreground mid-game.

## Developer Prompts (copy-paste ready)

1) PRD generation prompt (use to generate a full PRD document):

"You are a product manager. Produce a concise PRD for a Sudoku iPhone app named {{APP_NAME}}. Include: problem statement, target users, success metrics, MVP features, milestones, timeline (3 phases: prototype, native build, polish/release), risks, and acceptance criteria. Keep it actionable for a solo developer and include estimated dev hours for each milestone. Use current mobile UX best practices and prioritize accessibility." 

2) Web prototype developer prompt:

"You are a front-end engineer. Implement a single-page web prototype of a 9x9 Sudoku with the following behaviors: board rendering, click/tap selection, row/column/box highlights, number palette 1–9, notes toggle producing 3x3 mini-grid per cell, delete, hint (stubbed), puzzle generator with unique solution using backtracking, local save/load, and light/dark themes. Use vanilla JS (ES6), CSS variables for theming, and document API points for later Swift port. Deliver code as modular files: index.html, styles.css, app.js, generator.js, solver.ts/solver.js, storage.js." 

3) Swift implementation prompt:

"You are an iOS engineer. Implement the Sudoku app in Swift using SwiftUI and MVVM. Reuse the board, generator, and solver logic implemented in the prototype but port them to Swift with unit tests. Provide views: MainMenuView, GameView, StatsView, SettingsView. Implement theme support (light/dark/system), fade transitions, note mode, delete, and hint mechanism (with ad hook). Provide persistence (CoreData or JSON + FileManager) for Games and Stats. Include unit tests for solver/generator." 

4) UI/UX micro-prompt for animations:

"Design smooth transitions: menu->game fade 250ms easeInOut; cell highlight fade 120ms; palette press micro-animation scale 0.96 -> 1.00 in 80ms. Provide SwiftUI code snippets for these animations and CSS equivalents for prototype." 

5) PR template prompt (use to create GitHub PR template):

"Create a PR template that includes: summary, linked issue/PR, changes made, files touched, testing steps, screenshots/gifs, regression checklist, and acceptance criteria. Add a small checklist with 'UI tested on iPhone 12 simulator' and 'unit tests added/updated'." 

6) QA test-case prompt:

"Produce 10 QA test cases for the Sudoku app focusing on gameplay, notes, hint flow, persistence, stats aggregation, and theme switching. Each test should include steps, expected result, and pass/fail criteria." 

## Implementation Roadmap & Milestones

Phase 1 — Prototype (1–2 weeks)
- Deliverable: Web SPA implementing core gameplay, notes, delete, hint stub, theme toggle, and generator/solver.
- Acceptance: Core interactions working on mobile viewport; puzzles valid and unique.

Phase 2 — Native iOS MVP (2–4 weeks)
- Deliverable: SwiftUI iOS app with game screen, main menu, settings, stats page, local persistence, themes, notes, delete, hint flow (ad stub).
- Acceptance: Feature parity with prototype; animations and accessibility implemented; unit tests for solver/generator pass.

Phase 3 — Polish & Launch (2–3 weeks)
- Deliverable: Polish UI, add analytics, ad integration, App Store metadata, screenshots, bug fixes.
- Acceptance: App Store readiness checklist complete, CI pipeline in place, performance and memory checks.

Phase 4 — Post-launch & Android (ongoing)
- Add leaderboards, cloud sync, multi-device profile, Android port.

## Acceptance & Release Checklist

- All unit tests pass (generator/solver).
- Manual playthrough on target device(s) — no crashes.
- Stats tracked and persisted.
- Theme works in all screens and follows system when chosen.
- App privacy and basic terms included in README.

## Templates

- Commit message format: "feat(game): add generator with unique-solution check" or "fix(ui): notes clearing when row update"
- Issue template for bug: reproduction steps, device/simulator, expected/actual behavior, logs/screenshots.

## Metrics & Analytics (basic)

- Track: gamesStarted, gamesFinished, avgTimeByMode, hintsUsed, adImpressions, crashes (via Crashlytics later). Keep events minimal and privacy-friendly.

## Localization & Accessibility

- Plan: Use localized strings from the start; support English & Spanish. Support for additional languages will be added at a later date.
- Accessibility: VoiceOver descriptions for cells (e.g., "Row 4 Column 7, contains 5, candidate notes: 1 3 8").

## Security & Privacy Notes

- Do not log PII.
- If adding leaderboards, require explicit opt-in and privacy policy.

## Developer Handoff and Iteration Prompts

- Daily progress issue template: what I did, blocker, next steps.
- Retrospective prompt: run after prototype to evaluate parity and design decisions to port to Swift.

## Final Delivery (how to use this blueprint)

1. Pick concrete variables (APP_NAME, target iOS version, etc.) and update the Missing Inputs checklist.
2. Run the Web Prototype prompt to build and validate core behavior quickly.
3. Use Swift implementation prompt to port behavior, adding unit tests for parity.
4. Iterate using QA test-case prompt and PR template for each change.

## Appendix: Suggested Short-Term Action Items (first sprint)

1. Implement the web prototype (index.html, app.js, generator.js, solver.ts/solver.js, styles.css) and verify basic gameplay.
2. Run solver/generator tests to ensure unique-solution puzzles.
3. Create a minimal SwiftUI project shell with navigation and a stubbed GameView.
4. Port generator/solver to Swift as a library and verify test parity.
