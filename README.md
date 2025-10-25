# Minidoku Web

Minidoku is a browser-based Sudoku prototype built to validate the generator quality, notes UX, highlighting behaviour, and hint flow before investing in a native SwiftUI port. The app runs entirely on the client with modern, dependency-free JavaScript.

## Features
- **On-device puzzle generation** using backtracking to produce puzzles with a single solution across four difficulty presets (easy, medium, hard, expert).
- **Smart number palette** that highlights the remaining count for each digit and reflects completion state in real time.
- **Notes workflow** with UI toggle, keyboard shortcut, and automatic pencil-mark cleanup when a final value is placed.
- **Limited hint system** (three per puzzle) gated behind a simulated ad watch, tracking per-session usage and flagging hinted cells.
- **Mistake handling** that offers gentle warnings on easy puzzles and a three-strike failure rule on medium difficulty.
- **Session timer & overlays** providing pause/resume controls, stateful overlays for paused/completed/failed games, and celebratory messaging on completion.
- **Persistent stats** stored in `localStorage`, tracking starts, finishes, best times, averages, and hint usage per difficulty level.
- **Theme switcher & accessibility** support for system, light, dark, sepia, and high-contrast themes, ARIA-labelled controls, keyboard navigation, and screen-reader messaging.
- **First-run onboarding** tip guiding new players and helpful toast-style message bar feedback for every key event.

## Controls & Shortcuts
- Click a cell, then pick a digit from the number palette or type `1`–`9`.
- `Arrow` keys move the focused cell; `Escape` clears the current selection.
- `Backspace`, `Delete`, or `0` clears a filled cell (when it is not a given).
- Toggle notes mode via the Notes button or the `N` key.
- The Hint button fills the selected cell (if empty) and decrements the remaining hint count.
- Use the pause button to halt the timer; overlays guide you when paused, failed, or finished.

## Difficulty Presets

| Difficulty | Approx. clues | Behaviour highlights |
|------------|---------------|----------------------|
| Easy       | ~40 numbers   | Immediate incorrect-placement feedback |
| Medium     | ~34 numbers   | Three mistakes end the game |
| Hard       | ~30 numbers   | Lean clue count, no live mistake warnings |
| Expert     | ~26 numbers   | Minimal clues, no mistake assistance |

## Persistence & Stats
- Game state, statistics, and onboarding progress are stored in `window.localStorage` under the `minidoku::` namespace.
- Legacy keys are migrated from older `pocketsudoku::` storage entries when detected.
- Clearing browser storage resets progress, stats, hints, and theme choices.

## Project Structure
- `index.html` – Application shell, header controls, board container, and stats panel markup.
- `styles.css` – Theme tokens, responsive layout, high-contrast styling, and board animation rules.
- `app.js` – UI orchestration: board rendering, input handling, hints, timer, overlays, stats, theming, and persistence wiring.
- `generator.js` – Difficulty-aware puzzle generator that carves unique-solution boards using the solver utilities.
- `solver.js` – Backtracking solver, validation helpers, cloning utilities, and board factory methods.
- `storage.js` – Local storage helpers with migration logic and defaults for stats/onboarding state.

## Running Locally
1. Clone the repository and move into the `web` directory.
2. Serve the files with any static server (module imports require HTTP):
   - `python3 -m http.server 4000`  
     or `npx serve .`
3. Open `http://localhost:4000` (or the reported address) in a modern browser.

## Development Notes
- The project has no build step; edits to the JavaScript or CSS files take effect on reload.
- Puzzle generation relies on randomness; for deterministic debugging, you can stub `Math.random`.
- Tests are not bundled—verify changes manually in the browser, paying attention to persistence and theming across reloads.
