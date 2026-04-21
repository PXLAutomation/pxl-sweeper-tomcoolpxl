# IMPLEMENTATION_PLAN.md

---

## Overview

**Project:** PXL Sweeper (Classic Minesweeper – Web)
**Type:** Static single-page web application
**Tech stack:** Plain HTML, CSS, vanilla JavaScript (ES modules), no framework, no build tool required
**Goal:** Deliver a faithful, correct, and immediately playable browser-based implementation of classic Minesweeper, matching the original rules exactly, for desktop users
**Deployment target:** Static host (any HTTP file server or CDN; no server-side runtime)
**Existing documents:** `REQUIREMENTS.md`
**Risk tolerance:** Low — correctness and faithfulness to classic rules take priority over speed of delivery

---

## Assumptions

1. The project is a solo or very small team effort with one review cycle per phase.
2. No build tool (Webpack, Vite, Rollup, etc.) is required unless the team explicitly chooses one; a `package.json` with an `npm test` script is required by `REQUIREMENTS.md`.
3. The test runner will be a lightweight JavaScript test framework runnable via `npm test` without a browser (e.g., Node.js with a test runner such as `node:test` built-in, or a minimal dependency like `jest` or `vitest` in Node mode).
4. The review cadence is one small, independently reviewable phase at a time; a phase is "small enough" if its diff is reviewable in a single sitting (roughly ≤ 400 lines of production code changed, excluding generated or test files).
5. Deployment is manual: copying static files to a static host or opening `index.html` locally; no CI/CD pipeline is required for v1 but a local `npm run serve` convenience script is desirable.
6. `TODO.md` and `DONE.md` are maintained manually per the project rules in `GEMINI.md`.
7. No accessibility keyboard support is required for v1 (per `REQUIREMENTS.md`); contrast and icon-based state indicators are required.
8. The `.codex` directory already present in the repository is pre-existing tooling scaffolding and must not be removed.
9. The conservative post-win choice is: mines remain hidden (not auto-flagged) after a win.
10. A `package.json` with `"type": "module"` will be created in Phase 1 to declare ES module intent for all JS files.

---

## Delivery strategy

This plan uses a **hybrid strategy**: layered implementation for the core game engine (data model → logic → state machine), then thin vertical slices for each UI surface (layout shell → cell rendering → interaction → status bar → difficulty selector → loss/win presentation).

**Justification:**
- The game engine is a pure-logic module with no UI dependency. Building and testing it in isolation before touching the DOM eliminates an entire class of regression where visual and logic bugs are conflated.
- Once the engine is solid, each UI slice is independently reviewable and can be verified by a human in the browser without re-testing the engine logic.
- The project is small (five source files or fewer for v1) and has no backend, so the overhead of a layered start is minimal and the benefit of engine correctness is high.
- This fits a low-risk-tolerance, small-team cadence: engine correctness is verified once, then UI phases can proceed quickly with confidence.

---

## Phase list

| ID      | Outcome                                                       |
|---------|---------------------------------------------------------------|
| Phase 1 | Repository scaffold and project tooling confirmed working     |
| Phase 2 | Core game-engine logic implemented and unit-tested            |
| Phase 3 | Static HTML/CSS layout shell renders correctly in browser     |
| Phase 4 | Board renders cell states visually from engine state          |
| Phase 5 | Mouse interaction wired: reveal, flag, and first-click safety |
| Phase 6 | Status bar (mine counter, timer, restart button) is live      |
| Phase 7 | Loss presentation: mine reveal, triggered mine, bad flags     |
| Phase 8 | Win presentation and post-game input lockout                  |
| Phase 9 | Difficulty selector: three presets, full state reset          |
| Phase 10| Stabilization, acceptance-criteria audit, and release check   |

---

## Detailed phases

---

### Phase 1 — Repository scaffold and project tooling confirmed working

#### Goal
Establish the repository structure, `package.json`, a working `npm test` command, and a local static-serve script so that every subsequent phase has a stable, runnable baseline.

#### Scope
- Create `package.json` with `"type": "module"`, a `test` script, and a `serve` script.
- Create the file skeleton: `index.html`, `style.css`, `src/engine.js`, `src/game.js`, `src/ui.js`, `test/engine.test.js`.
- Files are stubs only — no game logic yet.
- Confirm `npm test` exits zero (empty test suite passes).
- Confirm `index.html` opens in a browser without console errors.

#### Expected files to change
```
package.json                  (create)
index.html                    (create stub)
style.css                     (create stub)
src/engine.js                 (create stub — exports placeholder)
src/game.js                   (create stub)
src/ui.js                     (create stub)
test/engine.test.js           (create — empty passing suite)
README.md                     (create or update with run instructions)
```

#### Dependencies
- No prior phase.
- Decision required: choice of test runner (see Open questions). Assumed: Node.js built-in `node:test` module to keep zero mandatory dependencies beyond Node itself, or a single dev-dependency such as `vitest`.

#### Risks
- **Low.** Scaffolding risk is minimal. The only meaningful failure mode is choosing a test runner that later conflicts with ES module syntax — mitigated by testing the import chain in Phase 1 itself.

#### Tests and checks to run
- `npm test` — must exit zero.
- Manual: open `index.html` in a desktop browser; no console errors.

#### Review check before moving work to `DONE.md`
- [ ] `package.json` has `"type": "module"`, a `test` script, and a `serve` script.
- [ ] All stub files are present at the expected paths.
- [ ] `npm test` exits zero.
- [ ] `index.html` opens without console errors.
- [ ] No game logic has been added (scope creep check).
- [ ] `README.md` documents `npm test` and `npm run serve` commands.
- [ ] Any follow-up decisions (test runner choice) are recorded in `TODO.md` if unresolved.

#### Exact `TODO.md` entries to refresh from this phase

```
## Phase 1 — Repository scaffold

- [ ] Create `package.json` with `"type": "module"`, `test` script, and `serve` script
- [ ] Create stub `index.html` (valid HTML5 document, no console errors on open)
- [ ] Create stub `style.css` (empty or reset only)
- [ ] Create stub `src/engine.js` (exports at least one named placeholder)
- [ ] Create stub `src/game.js` (empty ES module)
- [ ] Create stub `src/ui.js` (empty ES module)
- [ ] Create `test/engine.test.js` with one passing no-op test
- [ ] Confirm `npm test` exits zero
- [ ] Create or update `README.md` with `npm test` and `npm run serve` instructions
- [ ] Open `index.html` in browser and confirm no console errors
```

#### Exit criteria for moving items to `DONE.md`
- `package.json` exists and `cat package.json` shows `"type": "module"`, a `test` entry, and a `serve` entry.
- `npm test` passes with exit code 0 — verified by running the command.
- All six listed stub files exist at their exact paths — verified by `ls`.
- `index.html` opens in a desktop browser without any console errors — verified manually.
- `README.md` contains the words `npm test` and `npm run serve` — verified by `grep`.

---

### Phase 2 — Core game-engine logic implemented and unit-tested

#### Goal
Implement the pure-logic game engine in `src/engine.js` covering: board generation (post-first-click, with safe zone), neighbor-count calculation, flood reveal, flag toggling, win detection, and loss detection. All logic is unit-tested with no DOM dependency.

#### Scope
- `src/engine.js` exports a factory or class (e.g., `createEngine`) representing the full game state machine.
- Covers: cell data model, mine placement (excluding clicked cell and its 8 neighbors), neighbor count computation, flood reveal (BFS/DFS, does not reveal flagged cells, no infinite loops), flag toggle (hidden only), win condition (all non-mine cells revealed), loss condition (mine revealed).
- Does **not** cover: rendering, DOM, timer, mine counter display, difficulty UI.
- `test/engine.test.js` exercises all logic paths listed in `REQUIREMENTS.md` acceptance criteria relevant to the engine.

#### Expected files to change
```
src/engine.js                 (implement fully)
test/engine.test.js           (implement all unit tests)
```

#### Dependencies
- Phase 1 complete: stub files exist, `npm test` runs.
- No external library dependency; pure JS.

#### Risks
- **Medium.** The flood-reveal algorithm must not enter infinite loops and must not reveal flagged cells. Off-by-one errors in 8-directional neighbor indexing are a common mistake. The first-click safe-zone logic (exclude clicked cell + all 8 neighbors, even at board edges) must handle edge and corner cells correctly without crashing.
- Mitigation: unit tests must include edge cells, corner cells, boards with fewer than 9 cells remaining after exclusion (e.g., Beginner with a corner first click), and a board where an entire region of zeros triggers a large flood.

#### Tests and checks to run
- `npm test` — all unit tests pass.
- Test cases must include:
  - First click on corner cell — mine exclusion zone is clipped to board bounds, mines are still placed correctly.
  - All neighbor counts are correct for interior, edge, and corner cells.
  - Flood reveal stops at non-zero cells and does not cross flagged cells.
  - Flood reveal on a fully empty board reveals all non-mine cells.
  - Win condition triggers exactly when the last non-mine cell is revealed.
  - Loss condition triggers when a mine cell is revealed.
  - Flagging a revealed cell has no effect.
  - Flagging a hidden cell marks it; re-flagging removes the mark.

#### Review check before moving work to `DONE.md`
- [ ] `src/engine.js` contains no DOM references (`document`, `window`, `HTMLElement`, etc.).
- [ ] Every acceptance criterion in `REQUIREMENTS.md` that is engine-only is covered by at least one test.
- [ ] All tests pass (`npm test` exits zero).
- [ ] Corner/edge board cases are tested.
- [ ] No UI, timer, or difficulty logic has leaked into `src/engine.js` (scope creep check).
- [ ] `src/game.js` and `src/ui.js` remain unchanged from Phase 1 stubs.
- [ ] Reviewer has traced each test back to a specific `REQUIREMENTS.md` acceptance criterion.

#### Exact `TODO.md` entries to refresh from this phase

```
## Phase 2 — Core game engine

- [ ] Define cell data model in `src/engine.js` (position, mine, count, visibility, flag)
- [ ] Implement `createBoard(rows, cols)` — creates all-hidden, no-mine grid
- [ ] Implement `placeMines(board, totalMines, firstRow, firstCol)` — excludes first cell and 8 neighbors
- [ ] Implement `computeNeighborCounts(board)` — correct 8-directional counts for all cells
- [ ] Implement `revealCell(board, row, col)` — returns updated board and game result (ongoing/loss/win)
- [ ] Implement flood-reveal (BFS) triggered when a zero-count cell is revealed
- [ ] Implement `toggleFlag(board, row, col)` — only affects hidden cells
- [ ] Implement win detection: all non-mine cells revealed
- [ ] Implement loss detection: mine cell revealed
- [ ] Write unit test: first click on corner cell places mines correctly
- [ ] Write unit test: neighbor counts correct for interior, edge, and corner cells
- [ ] Write unit test: flood reveal expands through zeros, stops at counts, skips flagged
- [ ] Write unit test: flood reveal on an all-zero-neighbor board reveals entire safe area
- [ ] Write unit test: win condition fires on last non-mine reveal
- [ ] Write unit test: loss condition fires on mine reveal
- [ ] Write unit test: flag toggle on hidden cell; toggle on revealed cell has no effect
- [ ] Confirm `npm test` exits zero with all engine tests passing
```

#### Exit criteria for moving items to `DONE.md`
- `npm test` exits zero — verified by running the command and observing output.
- `src/engine.js` contains no string `document` or `window` — verified by `grep`.
- Every test listed in the TODO entries above is present in `test/engine.test.js` — verified by inspection.
- Reviewer has confirmed each test maps to a named acceptance criterion in `REQUIREMENTS.md`.

---

### Phase 3 — Static HTML/CSS layout shell renders correctly in browser

#### Goal
Build the visual skeleton of the game page: information bar (mine counter placeholder, restart button, timer placeholder), game board container, and difficulty selector area. No interaction logic yet; cells are not rendered from engine state.

#### Scope
- `index.html`: semantic HTML structure for all named UI regions.
- `style.css`: layout (flexbox/grid), sizing for Expert board at 1024×768 without horizontal scroll, raised-cell appearance for hidden cells, basic typography.
- No JavaScript behavior wired yet — the board container can show a static placeholder grid (e.g., hardcoded 9×9 for visual check).
- The Expert board (30×16) must fit at 1024×768 desktop viewport with no scrollbar.

#### Expected files to change
```
index.html                    (implement layout structure)
style.css                     (implement layout, cell appearance, info bar, difficulty selector)
```

#### Dependencies
- Phase 1 complete (files exist).
- Phase 2 not required (no engine needed for layout).
- Cell pixel size decision: must be determined to ensure Expert board fits at 1024×768 (see Assumptions and Open questions).

#### Risks
- **Medium.** The Expert board is 30 columns wide. At 1024 px viewport minus margins, each cell is at most ~30 px wide. If cell size or padding is too large the board will require horizontal scrolling, violating `REQUIREMENTS.md`. Careful sizing is critical.
- The raised-cell 3D effect (classic look) requires precise border/shadow CSS; getting it wrong visually is easy.

#### Tests and checks to run
- Manual UX check: open `index.html` in a desktop browser at 1024×768. Confirm no scrollbar appears for a 30-column placeholder grid.
- Manual UX check: confirm mine counter area, restart button, timer area, and difficulty selector are visible and positioned correctly (counter left, restart center, timer right).
- Manual UX check: hidden cells have a raised/3D appearance.
- `npm test` — must still pass (engine tests unaffected).

#### Review check before moving work to `DONE.md`
- [ ] No JavaScript interaction code has been added to `index.html` or `style.css` (scope creep check).
- [ ] Expert board placeholder (30 cols × 16 rows) fits at 1024×768 with no horizontal scrollbar.
- [ ] All five UI regions are present: mine counter, restart button, timer, board, difficulty selector.
- [ ] Hidden cell raised appearance is visually distinguishable.
- [ ] `npm test` still exits zero.
- [ ] No layout changes will be needed in Phase 4 to accommodate dynamic cell rendering (reviewer confirms the HTML structure is amenable to JS-driven cell injection).

#### Exact `TODO.md` entries to refresh from this phase

```
## Phase 3 — Layout shell

- [ ] Add semantic HTML structure to `index.html`: info bar, board container, difficulty selector
- [ ] Add mine-counter placeholder element (left of info bar)
- [ ] Add restart button element (center of info bar)
- [ ] Add timer placeholder element (right of info bar)
- [ ] Add three difficulty radio/button elements in selector area
- [ ] Style info bar: flex row, counter left, restart center, timer right
- [ ] Style board container: centered, grid layout
- [ ] Style hidden cell: raised 3D appearance using border or box-shadow
- [ ] Verify Expert-size placeholder grid (30×16) fits at 1024×768 with no horizontal scroll
- [ ] Confirm `npm test` still exits zero after layout changes
```

#### Exit criteria for moving items to `DONE.md`
- `index.html` contains elements for: mine counter, restart button, timer, board container, difficulty controls — verified by `grep` or DOM inspection.
- Manual screenshot or visual check at 1024×768 confirms no horizontal scrollbar with a 30-column grid.
- `npm test` exits zero — verified by running the command.
- Reviewer confirms the board container is suitable for dynamic cell injection in Phase 4.

---

### Phase 4 — Board renders cell states visually from engine state

#### Goal
Wire `src/ui.js` to read engine state and render the board as interactive DOM cells, with correct visual representation for each cell state (hidden, revealed with count, revealed empty, flagged). Interaction is not yet wired; this phase is rendering only.

#### Scope
- `src/ui.js`: implement `renderBoard(boardElement, board)` — creates or updates cell DOM elements from engine board state.
- `src/game.js`: initialize engine with Beginner defaults on page load, call `renderBoard` once to show an initial hidden grid.
- `index.html`: add `<script type="module" src="src/game.js">` entry point.
- `style.css`: add visual styles for revealed cells (flat appearance), numbered cells (colors per classic convention: 1=blue, 2=green, 3=red, 4=dark blue, 5=dark red, 6=teal, 7=black, 8=gray), flagged cell icon.
- No click handling yet. Cells render but do not respond to mouse events.

#### Expected files to change
```
src/ui.js                     (implement renderBoard)
src/game.js                   (initialize engine, call renderBoard)
src/engine.js                 (add board state accessor if needed — minimal change)
index.html                    (add script tag)
style.css                     (revealed cell styles, number colors, flag icon)
```

#### Dependencies
- Phase 2 complete: engine exports board state.
- Phase 3 complete: board container and cell CSS structure exist.

#### Risks
- **Low-medium.** The rendering function must map engine cell state to CSS classes reliably. The main risk is a mismatch between CSS class names used in `ui.js` and those defined in `style.css`. Using a shared constants file or simply being consistent in naming mitigates this.
- Performance: re-rendering the entire board on every state change is acceptable for v1 (max 480 cells on Expert).

#### Tests and checks to run
- `npm test` — engine unit tests still pass.
- Manual UX check: open in browser; Beginner board (9×9) shows 81 hidden cells.
- Manual UX check: temporarily force a revealed state in `game.js` (or use browser console) and confirm a number cell shows the correct digit and color, a zero cell shows flat/blank, and a flagged cell shows a flag indicator.
- Manual UX check: no JavaScript errors in browser console.

#### Review check before moving work to `DONE.md`
- [ ] `src/ui.js` contains no game logic (no mine placement, no win/loss detection) — scope check.
- [ ] All five cell states (hidden, revealed-zero, revealed-count, flagged, not-yet-used mine) have a corresponding CSS class.
- [ ] Number colors match classic Minesweeper convention (1–8).
- [ ] `npm test` exits zero.
- [ ] No console errors in browser.
- [ ] Reviewer confirms cell DOM structure is suitable for click-event attachment in Phase 5.

#### Exact `TODO.md` entries to refresh from this phase

```
## Phase 4 — Board rendering

- [ ] Implement `renderBoard(boardElement, board)` in `src/ui.js` that builds cell DOM elements
- [ ] Apply CSS class for each cell state: hidden, revealed, flagged
- [ ] Display neighbor count number inside revealed non-zero cells
- [ ] Apply per-number CSS color classes (1=blue, 2=green, 3=red, 4=navy, 5=maroon, 6=teal, 7=black, 8=gray)
- [ ] Add revealed flat-cell CSS to `style.css`
- [ ] Add flagged-cell CSS (flag icon or emoji) to `style.css`
- [ ] Initialize engine with Beginner defaults in `src/game.js` and call `renderBoard` on load
- [ ] Add `<script type="module" src="src/game.js">` to `index.html`
- [ ] Manual check: Beginner board shows 81 hidden cells on load
- [ ] Manual check: forced revealed cell shows correct digit and color
- [ ] Manual check: no console errors on load
- [ ] Confirm `npm test` exits zero
```

#### Exit criteria for moving items to `DONE.md`
- Opening `index.html` shows a 9×9 grid of hidden cells with no console errors — verified manually.
- Setting a cell to revealed in the engine and calling `renderBoard` shows the correct number and color — verified manually.
- `npm test` exits zero — verified by running the command.
- Reviewer confirms `src/ui.js` imports from `src/engine.js` only for state reading, not logic execution.

---

### Phase 5 — Mouse interaction wired: reveal, flag, and first-click safety

#### Goal
Attach left-click (reveal) and right-click (flag toggle) event handlers to board cells. Implement the first-click safety guarantee (mine placement deferred to first click). The game transitions correctly between Idle → In Progress states.

#### Scope
- `src/game.js`: attach click/contextmenu listeners to board cells via event delegation on the board container; on first left-click, call engine mine placement, then reveal; on subsequent left-clicks, reveal; on right-click, toggle flag; re-render board after each action.
- `src/engine.js`: expose a `gameState` field or accessor (`idle | in-progress | won | lost`); expose `isFirstClick` or equivalent to gate mine placement.
- `style.css`: add `cursor: pointer` on interactive (hidden) cells; prevent context menu default via JS (already implied by right-click flag behavior).
- Win/loss transitions are NOT handled yet (Phase 7 and 8); for now, the game simply stops accepting input on win/loss (a basic guard is acceptable).

#### Expected files to change
```
src/game.js                   (event delegation, first-click mine placement, re-render loop)
src/engine.js                 (expose gameState accessor; isFirstClick tracking)
src/ui.js                     (no change expected, renderBoard already works)
style.css                     (cursor styles for hidden cells)
test/engine.test.js           (add tests for state transitions if not already present)
```

#### Dependencies
- Phase 4 complete: board renders from engine state; DOM structure is in place.

#### Risks
- **Medium.** The first-click safety logic is the most failure-prone requirement. If mine placement happens before or without the first-click exclusion zone the game is incorrect. Additionally, event delegation must correctly identify the target cell's row/col from a data attribute; misidentification would route clicks to wrong cells.
- Rapid clicking: if the user clicks while a re-render is in progress (not an issue in synchronous JS, but worth noting) there should be no double-placement. Since all code is synchronous, this is inherently safe.
- Right-click context menu must be suppressed via `event.preventDefault()` on the board container.

#### Tests and checks to run
- `npm test` — all existing engine tests pass.
- Add engine unit tests: game state is `idle` before first click; transitions to `in-progress` after first reveal.
- Manual UX check: left-click a hidden cell → cell reveals; if count is 0, neighbors also reveal (flood).
- Manual UX check: right-click a hidden cell → flag appears; right-click again → flag removed.
- Manual UX check: right-click a revealed cell → no change.
- Manual UX check: left-click a flagged cell → no reveal.
- Manual UX check: first click always reveals a zero-adjacent cell (test several clicks on fresh boards).
- Manual UX check: browser context menu does not appear on right-click within the board.

#### Review check before moving work to `DONE.md`
- [ ] First-click safety: tested manually across at least 10 fresh games — first click always reveals a zero-adjacent area.
- [ ] Right-click suppressed within board (no browser context menu).
- [ ] Left-click on flagged cell has no effect.
- [ ] Right-click on revealed cell has no effect.
- [ ] `npm test` exits zero including new state-transition tests.
- [ ] No win/loss presentation code has been added (scope check — that's Phase 7/8).
- [ ] Reviewer confirms event delegation uses data attributes (row, col) for cell identification — not child index or positional heuristics.

#### Exact `TODO.md` entries to refresh from this phase

```
## Phase 5 — Mouse interaction

- [ ] Add `data-row` and `data-col` attributes to each cell in `renderBoard`
- [ ] Attach left-click event delegation on board container in `src/game.js`
- [ ] On first left-click: call `placeMines`, then `revealCell`, then `renderBoard`
- [ ] On subsequent left-clicks: call `revealCell`, then `renderBoard`
- [ ] Attach right-click (`contextmenu`) event delegation; call `toggleFlag`, then `renderBoard`
- [ ] Suppress default context menu with `event.preventDefault()` on board container
- [ ] Prevent left-click reveal on flagged cells
- [ ] Expose `gameState` accessor from `src/engine.js`
- [ ] Add engine unit test: state is `idle` before first click
- [ ] Add engine unit test: state transitions to `in-progress` after first reveal
- [ ] Manual check: first click on fresh board always reveals zero-adjacent cell (10 trials)
- [ ] Manual check: right-click toggles flag on hidden cell; no effect on revealed cell
- [ ] Manual check: left-click on flagged cell does nothing
- [ ] Manual check: no browser context menu inside board area
- [ ] Confirm `npm test` exits zero
```

#### Exit criteria for moving items to `DONE.md`
- `npm test` exits zero — verified by running the command.
- First-click safety manually verified across 10 fresh games with no mine on first click and a zero-adjacent reveal every time — documented in review notes.
- Right-click within board does not open browser context menu — verified manually.
- Left-click on flagged cell does not reveal it — verified manually.
- `src/game.js` uses `data-row`/`data-col` attributes for cell identification — verified by code review.

---

### Phase 6 — Status bar live: mine counter, timer, and restart button

#### Goal
Make the information bar functional: the mine counter shows `totalMines − flagsPlaced` (can go negative), the timer starts on first reveal and stops on win/loss, and the restart button resets all state to a fresh Beginner game.

#### Scope
- `src/game.js`: implement timer using `setInterval`/`Date` (start on first click, stop on win/loss, cap display at 999); implement mine counter update after every flag toggle; wire restart button to reset engine state and re-render.
- `src/ui.js`: implement `updateInfoBar(mineCountEl, timerEl, minesTotal, flagsPlaced, elapsedSeconds)`.
- `style.css`: style counter and timer as 7-segment-style or plain numeric display (conservative — no animation required); ensure three-digit display is readable.
- Timer and counter must update after every relevant user action (not only on render).

#### Expected files to change
```
src/game.js                   (timer logic, mine counter logic, restart handler)
src/ui.js                     (updateInfoBar function)
style.css                     (info bar display styling — counter and timer readability)
```

#### Dependencies
- Phase 5 complete: interaction is wired; `gameState` transitions are working.

#### Risks
- **Low-medium.** Timer accuracy: `setInterval` can drift over long sessions. For v1 (capped at 999 seconds), drift is cosmetically acceptable. The main risk is forgetting to clear the interval on restart, causing multiple concurrent timers.
- Mitigation: store the interval ID in a module-level variable; always `clearInterval` before starting a new one.

#### Tests and checks to run
- `npm test` — all tests pass.
- Manual UX check: timer starts at 0 on first click; increments each second.
- Manual UX check: timer stops on win (Phase 8 not done yet, so trigger a win in console for now if possible, or verify stop behavior in Phase 8 review).
- Manual UX check: mine counter starts at `totalMines` (10 for Beginner); decrements on flag placement; increments on flag removal; can go negative.
- Manual UX check: restart button resets board, timer (to 0, stopped), and mine counter (to 10).
- Manual UX check: timer does not double-count after multiple restarts (no leaked intervals).

#### Review check before moving work to `DONE.md`
- [ ] Timer starts on first click; stops on game end (win or loss).
- [ ] `clearInterval` is called before setting a new interval on restart.
- [ ] Mine counter reflects `totalMines − flagsPlaced` at all times.
- [ ] Mine counter can display negative values (per `REQUIREMENTS.md`).
- [ ] Timer display caps at 999.
- [ ] Restart resets board, timer, counter, and game state completely.
- [ ] `npm test` exits zero.
- [ ] No difficulty-switching logic added yet (scope check — that's Phase 9).

#### Exact `TODO.md` entries to refresh from this phase

```
## Phase 6 — Status bar

- [ ] Implement timer in `src/game.js`: start on first reveal, increment each second, stop on game end
- [ ] Cap timer display at 999 seconds
- [ ] Store interval ID and clear it on each restart to prevent leaked timers
- [ ] Implement mine counter: `totalMines − flagsPlaced`, updated after every flag toggle
- [ ] Allow mine counter to display negative values
- [ ] Implement `updateInfoBar` in `src/ui.js` and call it after every state-changing action
- [ ] Wire restart button click handler in `src/game.js`: reset engine, clear timer, reset counter, re-render
- [ ] Style timer and mine counter for readability (three-digit numeric area)
- [ ] Manual check: timer starts at 0 on first click and increments each second
- [ ] Manual check: mine counter starts at 10 (Beginner), tracks flag placement/removal correctly
- [ ] Manual check: restart button fully resets board, timer (to 0, stopped), and counter (to 10)
- [ ] Manual check: rapid restart × 5 — timer never double-counts (no leaked intervals)
- [ ] Confirm `npm test` exits zero
```

#### Exit criteria for moving items to `DONE.md`
- `npm test` exits zero — verified by running the command.
- Timer increments correctly after first click and stops after game end — verified manually.
- Mine counter goes negative when more flags are placed than total mines — verified manually.
- Five consecutive restarts produce correct timer behavior (no double-counting) — verified manually.
- `clearInterval` call is present in the restart handler — verified by code review.

---

### Phase 7 — Loss presentation: mine reveal, triggered mine, incorrect flag indicators

#### Goal
When a mine is clicked, transition the game to the Lost state: reveal all mines visually, mark the triggered mine distinctly, mark incorrectly placed flags (flag on a non-mine cell), and lock all board input.

#### Scope
- `src/engine.js`: on loss, expose the full board with all mines visible and an `incorrectFlags` list.
- `src/ui.js`: extend `renderBoard` or add a `revealLoss(board, triggeredCell)` render pass that applies mine, triggered-mine, and bad-flag CSS classes.
- `src/game.js`: on loss result from `revealCell`, stop timer, call loss render, lock input (ignore subsequent clicks).
- `style.css`: add `.cell--mine`, `.cell--mine-triggered`, `.cell--bad-flag` visual styles.

#### Expected files to change
```
src/engine.js                 (expose all-mines-visible state on loss; incorrectFlags accessor)
src/ui.js                     (loss render pass or extended renderBoard)
src/game.js                   (detect loss result, stop timer, lock input)
style.css                     (mine, triggered-mine, bad-flag cell styles)
test/engine.test.js           (add: incorrect flag detection on loss)
```

#### Dependencies
- Phase 5 complete: mouse interaction works.
- Phase 6 complete: timer stop on game end is partially wired; this phase fully exercises it.

#### Risks
- **Low-medium.** The "incorrect flag" calculation must only mark flags on non-mine cells, not all flags. A flag on a mine cell is correct and should appear as a normal flagged mine (or plain mine icon). The triggered mine must be visually distinct from other revealed mines — choosing a clear icon/color is necessary.

#### Tests and checks to run
- `npm test` — all tests pass; add unit test for incorrect flag detection.
- Manual UX check: click a mine → all mines visible; triggered mine visually distinct.
- Manual UX check: a flagged non-mine cell shows bad-flag indicator after loss.
- Manual UX check: a flagged mine cell does NOT show bad-flag indicator after loss.
- Manual UX check: left-click anywhere on board after loss → no effect.
- Manual UX check: right-click anywhere on board after loss → no effect.
- Manual UX check: timer has stopped.

#### Review check before moving work to `DONE.md`
- [ ] All mines visible after loss — including mines that were not near the click.
- [ ] Triggered mine is visually distinct from other mines.
- [ ] Incorrect flags (flag on non-mine) are visually marked.
- [ ] Correct flags (flag on mine) appear as normal mine indicators — not bad-flag.
- [ ] Board input is fully locked after loss (clicks ignored).
- [ ] Timer has stopped on loss.
- [ ] `npm test` exits zero including incorrect-flag unit test.
- [ ] No win-state code added in this phase (scope check).

#### Exact `TODO.md` entries to refresh from this phase

```
## Phase 7 — Loss presentation

- [ ] Add `incorrectFlags` computation to `src/engine.js`: flags on non-mine cells
- [ ] Write unit test: `incorrectFlags` returns only flags placed on non-mine cells
- [ ] Extend `renderBoard`/add `renderLoss` in `src/ui.js`: apply mine class to all mine cells
- [ ] Apply `.cell--mine-triggered` to the clicked mine cell
- [ ] Apply `.cell--bad-flag` to flagged non-mine cells on loss
- [ ] Add CSS styles: `.cell--mine`, `.cell--mine-triggered`, `.cell--bad-flag`
- [ ] In `src/game.js`: detect loss result, stop timer, call loss render, set input-lock flag
- [ ] Verify left-click after loss has no effect
- [ ] Verify right-click after loss has no effect
- [ ] Manual check: triggered mine is visually distinct from other revealed mines
- [ ] Manual check: flag on non-mine shows bad-flag; flag on mine does not
- [ ] Manual check: timer is stopped on loss
- [ ] Confirm `npm test` exits zero
```

#### Exit criteria for moving items to `DONE.md`
- `npm test` exits zero including the `incorrectFlags` unit test — verified by running the command.
- All mines are visible after loss — verified manually.
- Triggered mine, bad-flag, and normal-mine cells are visually distinct — verified manually.
- Clicks after loss have no effect on board state — verified manually.
- Timer stops on loss — verified manually.

---

### Phase 8 — Win presentation and post-win input lockout

#### Goal
When all non-mine cells are revealed, transition the game to the Won state: stop the timer, lock all board input, and display a win indicator. Mines remain hidden (not auto-flagged) per the conservative choice.

#### Scope
- `src/game.js`: detect win result from `revealCell`; stop timer; lock input; show win indicator.
- `src/ui.js`: update or add `renderWin()` — sets the restart button to a happy face / "😊 WIN" or similar minimal indicator; no board changes (mines stay hidden).
- `style.css`: optional minimal win indicator style (restart button face or text change).
- No auto-flagging of mines on win.

#### Expected files to change
```
src/game.js                   (detect win result, stop timer, lock input, call renderWin)
src/ui.js                     (renderWin — minimal win feedback)
style.css                     (win indicator style if needed)
```

#### Dependencies
- Phase 7 complete: loss path and input locking pattern already established (reuse the lock).

#### Risks
- **Low.** The win detection is already in the engine (Phase 2). This phase is purely presentation. The main risk is forgetting to also lock input on win (reusing the same guard as Phase 7 mitigates this trivially).

#### Tests and checks to run
- `npm test` — all tests pass (win detection was already tested in Phase 2).
- Manual UX check: reveal all non-mine cells (can use a small test board via console) → timer stops, win indicator appears.
- Manual UX check: left-click and right-click after win → no effect on board.
- Manual UX check: mines are NOT flagged automatically after win.
- Manual UX check: restart button still works from win state.

#### Review check before moving work to `DONE.md`
- [ ] Timer stops on win.
- [ ] Input is locked on win (same mechanism as loss).
- [ ] Mines remain hidden after win (no auto-flag).
- [ ] Win indicator is visible (restart button or dedicated element).
- [ ] Restart from win state works and returns game to Idle.
- [ ] `npm test` exits zero.
- [ ] No new game logic added — this phase is presentation only (scope check).

#### Exact `TODO.md` entries to refresh from this phase

```
## Phase 8 — Win presentation

- [ ] Detect win result in `src/game.js` and stop timer
- [ ] Apply same input-lock flag as Phase 7 on win
- [ ] Call `renderWin()` in `src/ui.js` to show win indicator (restart button face/text update)
- [ ] Ensure mines are NOT auto-flagged on win
- [ ] Manual check: after winning, left/right click has no board effect
- [ ] Manual check: win indicator visible
- [ ] Manual check: mines remain hidden after win
- [ ] Manual check: restart from win state works correctly
- [ ] Confirm `npm test` exits zero
```

#### Exit criteria for moving items to `DONE.md`
- `npm test` exits zero — verified by running the command.
- Timer stops on win — verified manually.
- Board input locked after win — verified manually.
- Mines remain hidden after win — verified manually.
- Restart from win state resets all state — verified manually.

---

### Phase 9 — Difficulty selector: three presets, full state reset

#### Goal
Wire the three difficulty buttons/radio inputs (Beginner, Intermediate, Expert) so that selecting a difficulty immediately resets the game with the correct board dimensions and mine count, and the board fits the viewport.

#### Scope
- `src/game.js`: add difficulty-change handler; on change, clear timer, reset engine with new dimensions (9×9/10, 16×16/40, 30×16/99), re-render board, reset mine counter, reset timer display.
- `src/ui.js`: expose a `resizeBoard(boardElement, rows, cols)` or handle dynamic grid sizing in `renderBoard`.
- `style.css`: ensure the board grid layout updates dynamically (CSS `grid-template-columns` set via JS style property if needed).
- `index.html`: difficulty selector elements (already present from Phase 3, now wired).

#### Expected files to change
```
src/game.js                   (difficulty change handler, engine re-init with new params)
src/ui.js                     (dynamic grid resizing in renderBoard or new helper)
style.css                     (verify Expert board still fits; no additional scroll)
index.html                    (no change expected; elements already present)
```

#### Dependencies
- Phase 6 complete: restart logic exists; difficulty change is a superset of restart with a parameter.
- Phase 3 layout must accommodate dynamic column count (reviewer confirmed in Phase 3 exit criteria).

#### Risks
- **Low-medium.** The Expert board (30×16) at 1024 px width is already verified in Phase 3. The risk here is that switching from Beginner to Expert causes layout reflow that overflows the viewport. Since cell size is fixed and was sized for Expert in Phase 3, this should not occur — but must be verified.
- Mine count parameter must be validated: placing 99 mines with fewer than 9 valid cells excluded after first click on a corner is not possible on Expert (480 − 9 = 471 >> 99). No issue.

#### Tests and checks to run
- `npm test` — all tests pass.
- Manual UX check: click Intermediate → board redraws as 16×16, mine counter shows 40, timer resets to 0.
- Manual UX check: click Expert → board redraws as 30×16, mine counter shows 99; no scrollbar at 1024×768.
- Manual UX check: switch difficulty mid-game → board resets, timer resets, mine counter resets.
- Manual UX check: switch difficulty after win/loss → board resets correctly (input lock cleared).

#### Review check before moving work to `DONE.md`
- [ ] All three difficulty presets produce the correct rows × cols × mines values (verified against `REQUIREMENTS.md`).
- [ ] Switching mid-game resets everything (timer, counter, board, game state, input lock).
- [ ] Expert board at 1024×768 shows no horizontal scrollbar.
- [ ] `npm test` exits zero.
- [ ] No new gameplay mechanics added (scope check).

#### Exact `TODO.md` entries to refresh from this phase

```
## Phase 9 — Difficulty selector

- [ ] Add difficulty constants: Beginner (9×9, 10), Intermediate (16×16, 40), Expert (30×16, 99)
- [ ] Wire difficulty change handler in `src/game.js` (radio change or button click)
- [ ] On difficulty change: clear timer, reset engine with new dimensions, reset mine counter, re-render board
- [ ] Update `renderBoard` or add `resizeBoard` to set CSS grid columns dynamically
- [ ] Clear input-lock flag on difficulty change (allows play on new board)
- [ ] Manual check: Beginner → 9×9, 10 mines
- [ ] Manual check: Intermediate → 16×16, 40 mines
- [ ] Manual check: Expert → 30×16, 99 mines, no scrollbar at 1024×768
- [ ] Manual check: switch difficulty mid-game — board, timer, counter all reset
- [ ] Manual check: switch difficulty after loss — input lock clears, new game playable
- [ ] Confirm `npm test` exits zero
```

#### Exit criteria for moving items to `DONE.md`
- `npm test` exits zero — verified by running the command.
- All three preset dimension and mine counts match `REQUIREMENTS.md` exactly — verified by code review of constants.
- Expert board at 1024×768 shows no scrollbar — verified manually.
- Switching difficulty after a loss clears the input lock — verified manually.

---

### Phase 10 — Stabilization, acceptance-criteria audit, and release check

#### Goal
Verify every acceptance criterion in `REQUIREMENTS.md` is satisfied, fix any outstanding correctness gaps, ensure `DONE.md` is up to date, and confirm the project is in a releasable state (all files present, `npm test` passes, no console errors, playable on desktop).

#### Scope
- Systematic walkthrough of every acceptance criterion in `REQUIREMENTS.md` — each one is manually verified.
- Fix any defects found during the audit (scope: bug fixes only, no new features).
- Update `DONE.md` with all completed items from prior phases.
- Ensure `README.md` is complete: run instructions, test instructions, project description.
- Verify contrast and icon requirements from the accessibility section of `REQUIREMENTS.md`.
- Confirm `package.json` `test` and `serve` scripts work on a clean checkout.

#### Expected files to change
```
DONE.md                       (finalize with all verified items)
TODO.md                       (clear completed items; note any deferred v2 work)
README.md                     (finalize run and test instructions)
src/engine.js                 (bug fixes only, if any)
src/game.js                   (bug fixes only, if any)
src/ui.js                     (bug fixes only, if any)
style.css                     (contrast fixes only, if any)
test/engine.test.js           (add any missing coverage for found defects)
```

#### Dependencies
- All prior phases (1–9) complete and their items in `DONE.md`.

#### Risks
- **Low-medium.** If a correctness defect is found during the audit (e.g., edge-case flood reveal failure, incorrect flag count after rapid toggling), fixing it may require revisiting engine logic. Regression risk is mitigated by the existing unit-test suite; any fix must be accompanied by a new failing test that is then made to pass.
- If a large number of defects are found, the defects should be triaged and non-blocking ones deferred to `TODO.md` as v2 items rather than blocking release.

#### Tests and checks to run
- `npm test` — all unit tests pass.
- Full manual walkthrough of all `REQUIREMENTS.md` acceptance criteria (checklist below in TODO entries).
- Manual: open on a fresh browser profile (no cached state) and play a full game to completion on each difficulty.
- Manual: verify no console errors on any difficulty at any game state.
- Manual: confirm cursor feedback changes on interactive elements.

#### Review check before moving work to `DONE.md`
- [ ] Every acceptance criterion in `REQUIREMENTS.md` has been manually verified and the result recorded.
- [ ] `npm test` exits zero.
- [ ] `DONE.md` reflects all completed phases.
- [ ] `TODO.md` contains only deferred (v2) items or is empty.
- [ ] `README.md` is complete and accurate.
- [ ] No v2 features have been added during stabilization (scope check).
- [ ] Any defects found and fixed have an accompanying regression test.

#### Exact `TODO.md` entries to refresh from this phase

```
## Phase 10 — Stabilization and release

- [ ] Manually verify: first click never reveals a mine (10 trials each difficulty)
- [ ] Manually verify: first click always reveals a zero-adjacent cell (10 trials each difficulty)
- [ ] Manually verify: all neighbor counts are correct (spot-check 10 cells per difficulty)
- [ ] Manually verify: flood reveal expands through all connected zero regions
- [ ] Manually verify: revealing a mine triggers loss immediately
- [ ] Manually verify: all mines revealed after loss
- [ ] Manually verify: triggered mine is visually distinct
- [ ] Manually verify: incorrect flags are marked after loss; correct flags are not
- [ ] Manually verify: win condition triggers when all non-mine cells revealed
- [ ] Manually verify: timer starts on first click; stops on win and loss
- [ ] Manually verify: mine counter decrements on flag, increments on unflag, can go negative
- [ ] Manually verify: flagged cells cannot be revealed by left-click
- [ ] Manually verify: restart clears board, timer, flags, game state
- [ ] Manually verify: difficulty change applies correct dimensions and mine count
- [ ] Manually verify: no interaction allowed after win/loss except restart and difficulty change
- [ ] Manually verify: Expert board at 1024×768 has no scrollbar
- [ ] Manually verify: no console errors during a full game on each difficulty
- [ ] Manually verify: icon/shape used for mines and flags (not color alone)
- [ ] Manually verify: number colors are distinguishable (contrast check)
- [ ] Run `npm test` and confirm exit zero
- [ ] Update `DONE.md` with all completed phase items
- [ ] Clear `TODO.md` of completed items; move deferred work to v2 section
- [ ] Finalize `README.md` with project description, run instructions, test instructions
- [ ] Confirm `npm test` and `npm run serve` work on a clean checkout (no leftover state)
```

#### Exit criteria for moving items to `DONE.md`
- Every acceptance criterion in `REQUIREMENTS.md` is checked off in the review — verified by the manual checklist in TODO entries.
- `npm test` exits zero — verified by running the command.
- `DONE.md` contains entries for all phases 1–9 — verified by inspection.
- `README.md` contains run and test instructions — verified by `grep` for `npm test` and `npm run serve`.
- No console errors on any difficulty at any game state — verified manually.

---

## Dependency notes

```
Phase 1 → Phase 2 (test runner must exist before engine tests can run)
Phase 1 → Phase 3 (stub files must exist; phases 2 and 3 are independent of each other)
Phase 2 → Phase 4 (engine must export board state before rendering can consume it)
Phase 3 → Phase 4 (CSS classes and board container HTML must exist)
Phase 4 → Phase 5 (DOM cells must exist before click handlers can be attached)
Phase 5 → Phase 6 (interaction must work before timer start/stop can be triggered)
Phase 5 → Phase 7 (interaction must work to trigger loss)
Phase 6 → Phase 7 (timer stop on loss requires timer to exist)
Phase 7 → Phase 8 (loss input-lock pattern is reused for win)
Phase 6 → Phase 9 (restart logic in Phase 6 is extended by difficulty change)
Phase 9 → Phase 10 (all features must be complete before audit)
```

**Note:** Phases 2 and 3 can be worked in parallel if the team has two reviewers, because Phase 2 has no DOM dependency and Phase 3 has no engine dependency. All other phases are strictly sequential.

---

## Review policy

**Expected review size:** Each phase diff should be reviewable in a single sitting. A practical upper bound is approximately 400 lines of production code added or changed (excluding generated files, test files, and lockfiles). Test files may add additional lines but should remain proportionate to the production change.

**When a phase must be split before implementation starts:**
- If a phase requires changing more than four source files with substantial logic in each.
- If a phase contains more than one "primary deliverable" (two independent user-visible outcomes).
- If a phase's test section contains more than approximately twelve independent test cases that cannot all be attributed to a single logical concern.

**Oversized phases are not allowed to proceed unchanged.** If a phase is identified as too large during planning or mid-execution, it must be split and the plan updated in `IMPLEMENTATION_PLAN.md` before implementation continues. The split sub-phases must each meet the review-size requirement independently.

**Review gate:** No item may move to `DONE.md` until the review checklist for its phase is fully satisfied. A partially complete phase checklist is not a sufficient condition.

---

## Definition of done for the plan

The project is considered complete when all of the following are true:

1. **Implementation:** All source files (`index.html`, `style.css`, `src/engine.js`, `src/game.js`, `src/ui.js`) are present and contain complete, working game logic for the full Minesweeper v1 feature set defined in `REQUIREMENTS.md`.
2. **Tests:** `npm test` exits zero with a unit-test suite covering all acceptance criteria attributable to pure logic (engine module).
3. **Manual verification:** Every acceptance criterion in `REQUIREMENTS.md` has been manually verified and recorded in the Phase 10 review.
4. **Documentation:** `README.md` contains accurate run and test instructions; `DONE.md` is up to date.
5. **Build:** `npm run serve` (or equivalent) serves the game locally without errors; `index.html` is openable directly in a desktop browser without a server.
6. **No outstanding blocking items:** `TODO.md` contains no incomplete items from phases 1–10; any remaining items are explicitly labeled as v2/deferred.
7. **No console errors:** A full game played on each difficulty level produces no browser console errors.

---

## Open questions

### Blocking

- **Q1 — Test runner choice:** Which JavaScript test runner will be used? The choice affects `package.json` dev-dependencies and the exact `npm test` command. A decision must be made before Phase 1 is complete. *Options:* Node.js built-in `node:test` (zero extra dependencies), `vitest` (minimal, ESM-native), `jest` (ESM support requires config). Recommended: `node:test` to honor the "no build tool" constraint.

- **Q2 — Cell pixel size for Expert board fit:** The exact pixel size of each cell must be decided before Phase 3 CSS is written, to guarantee the Expert board (30 columns) fits at 1024 px width. *Calculation:* 1024 px − border/margin ≈ 960 px usable → each cell ≤ 32 px wide. A 28 px or 30 px cell size with 1 px borders is recommended.

### Non-blocking

- **Q3 — Restart button visual:** Should the restart button use an emoji (😊 / 😮 / 😎 / 😵) as in classic Minesweeper, or plain text? Either works; an emoji approach is more faithful to the classic experience. This does not block any phase.

- **Q4 — Flag icon source:** Will the flag icon be a Unicode character (🚩), an inline SVG, or a CSS-only shape? Any approach satisfies the requirement; decision affects only `style.css` and `src/ui.js` rendering. This does not block any phase.

- **Q5 — Static host target:** Is the static host a specific platform (GitHub Pages, Netlify, Vercel, etc.)? If a deployment phase or CI/CD pipeline is desired, it should be added as Phase 9.5 between Phase 9 and Phase 10. For v1 the plan assumes manual file copy; no action required unless the answer changes.
