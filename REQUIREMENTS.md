# REQUIREMENTS.md

## Title and short product summary

**Product name:** Classic Minesweeper (Web)

A static, single-page web application implementing a conservative, browser-based version of classic Minesweeper. The experience closely matches the original gameplay, with minimal deviation and no additional mechanics.

---

## Product goal

Provide a clear, accurate, and faithful implementation of classic Minesweeper that runs entirely in the browser, with predictable behavior and low complexity. The product should be immediately usable without configuration and behave consistently across sessions.

---

## Product boundaries and non-goals

### In scope

* Classic Minesweeper gameplay
* Three preset difficulty levels
* Mouse-based interaction (desktop-first)
* Timer, mine counter, restart control
* Deterministic and consistent rules

### Out of scope

* Backend services
* Multiplayer
* User accounts or persistence
* Progression systems
* Story, themes, or narrative elements
* Power-ups, hints, or special tiles
* Custom board editor
* Question-mark flag state
* Chording (for v1)
* Mobile-first interaction design

---

## Target user and usage context

### Target user

* Desktop users familiar with or interested in classic puzzle games
* Users expecting traditional Minesweeper behavior

### Usage context

* Played in a desktop browser
* Single-session gameplay
* No requirement for login or setup

---

## Core gameplay requirements

### Board structure

* The board is a rectangular grid of cells
* Each cell has:

  * Position (row, column)
  * Mine presence (boolean)
  * Neighbor mine count (0–8)
  * Visibility state
  * Flag state

### Cell states

Each cell must be in exactly one of:

* Hidden (default)
* Revealed
* Flagged

No question-mark state is allowed.

### Mine behavior

* Mines are hidden until revealed
* Mines are only revealed:

  * When clicked (triggering loss)
  * After loss, all mines become visible

### Neighbor counts

* Each non-mine cell must display the correct count of adjacent mines (8-directional adjacency)

### Empty-cell propagation

* Revealing a cell with 0 adjacent mines triggers flood reveal:

  * Recursively reveal all adjacent cells
  * Continue until reaching cells with non-zero counts
  * Do not reveal flagged cells during propagation

### Win condition

* The game is won when all non-mine cells are revealed
* Flagging all mines is not required for winning

### Loss condition

* The game is lost when a mine is revealed via left click

---

## Board and difficulty requirements

### Preset difficulties (must match classic values)

* Beginner: 9x9 grid, 10 mines
* Intermediate: 16x16 grid, 40 mines
* Expert: 30x16 grid, 99 mines

### Board generation

* A new board is generated:

  * On first click (not at initial render)
  * On restart
  * On difficulty change

### First click safety

* First revealed cell must:

  * Never contain a mine
  * Must also have zero adjacent mines (conservative choice)
* Implementation requirement:

  * Mines must be placed after first click, excluding:

    * The clicked cell
    * All adjacent cells

### Mine placement

* Mines are placed randomly across valid cells after first click
* Total mine count must match difficulty setting

---

## Interaction requirements

### Mouse interactions

* Left click:

  * Reveals a cell
* Right click:

  * Toggles flag on hidden cell
  * Does nothing on revealed cells

### Flag behavior

* Flagging a cell prevents it from being revealed via left click

### Restart control

* Resets game state
* Generates a new board (pending first click)
* Resets timer and mine counter display

### Difficulty switching

* Immediately resets the game
* Applies new board dimensions and mine count
* Clears all state

### Chording

* Explicitly excluded from v1

### Question-mark state

* Explicitly excluded

---

## Game rules and state transitions

### Game states

* Idle: before first click
* In progress: after first click and before win/loss
* Won: all non-mine cells revealed
* Lost: mine revealed

### Timer behavior

* Starts on first reveal action
* Stops on win or loss
* Does not run during idle state

### First interaction

* Triggers:

  * Board generation
  * Timer start
  * Safe reveal (zero-adjacent cell)

### On mine click (loss)

* Transition to Lost state
* Reveal all mines
* Visually indicate the triggered mine distinctly
* Incorrect flags:

  * Must be visually indicated (e.g., crossed or marked incorrect)

### Post-loss behavior

* All input is disabled except restart and difficulty selection

### Post-win behavior

* All mines remain hidden or optionally auto-flagged (conservative choice: do not auto-flag)
* All input is disabled except restart and difficulty selection

---

## UI and layout requirements

### General layout

* Single-page static screen
* No scrolling required on supported desktop viewport (minimum 1024x768)

### Main elements (top to bottom)

* Information bar:

  * Mine counter (left)
  * Restart control (center)
  * Timer (right)
* Game board (centered)
* Difficulty selector (above or below board)

### Board layout

* Centered horizontally
* Fixed grid layout based on difficulty

### Visual style

* Conservative, clean browser version of classic Minesweeper
* No animations beyond minimal feedback
* No modern redesign or visual experimentation

---

## Feedback and status requirements

### Visual states

* Hidden cells: raised appearance
* Revealed cells: flat appearance
* Flagged cells: clear flag icon
* Mine cells (on loss): visible mine icon
* Triggered mine: visually distinct from others
* Incorrect flags: visually marked

### Counters

* Mine counter:

  * Displays remaining mines = total mines - flags placed
  * Can go negative if over-flagged (matches classic behavior)

* Timer:

  * Displays elapsed seconds
  * Starts at 0
  * Upper bound: 999 seconds (cap display)

---

## Error prevention and edge-case handling

* Prevent revealing flagged cells
* Prevent flagging revealed cells
* Ignore clicks after game end
* Ensure first click safety always applies
* Ensure flood reveal does not:

  * Reveal flagged cells
  * Enter infinite loops
* Ensure consistent behavior when rapidly clicking
* Ensure mine counter updates correctly when flags are toggled

---

## Accessibility and usability requirements

* Sufficient contrast between cell states
* Numbers must be legible and distinguishable
* Do not rely on color alone:

  * Use icons or shapes for mines and flags
* Cursor feedback on interactive elements

### Keyboard support

* Not required for v1
* Optional future enhancement

---

## Technical constraints

* Static front-end only
* Single-page web application
* No server dependency
* No persistent storage required
* Game state fully managed in memory
* Restart must fully reset state
* Architecture must remain simple and maintainable

---

## Acceptance criteria

* First click never reveals a mine
* First click always reveals a zero-adjacent cell
* All neighbor counts are correct for all cells
* Flood reveal correctly expands all connected zero regions
* Revealing a mine triggers loss immediately
* All mines are revealed after loss
* Incorrect flags are visibly indicated after loss
* Win condition triggers when all non-mine cells are revealed
* Timer:

  * Starts on first click
  * Stops on win/loss
* Mine counter:

  * Updates with flag placement/removal
  * Displays correct remaining count
* Flagged cells cannot be revealed
* Restart:

  * Clears board, timer, flags, and state
* Difficulty change:

  * Applies correct dimensions and mine count
  * Resets game state completely
* No interaction allowed after win/loss except restart/difficulty change

---

## Open questions and assumptions

### Assumptions

* Desktop viewport minimum is sufficient for Expert board without scrolling
* Users are familiar with right-click interaction

### Open questions

* Whether to include optional visual press states for mouse-down interactions (non-critical)

---

## Future enhancements (not part of v1)

* Chording (clicking revealed number to reveal neighbors)
* Keyboard controls
* Mobile interaction support
* Visual themes
* High score tracking (local only)
* Optional animations
* Sound effects

---

## Recommended v1 baseline

A faithful, minimal implementation of classic Minesweeper with:

* Exact classic board sizes and mine counts
* Guaranteed safe and zero-adjacent first click
* Accurate flood reveal and number logic
* Simple desktop UI with mine counter, timer, and restart
* Strict exclusion of non-essential features

The focus is correctness, clarity, and predictability over feature expansion.

## Project Setup Requirements

- The project shall include a `package.json` file in the repository root.
- The `package.json` file shall define the project's runnable commands in a consistent way.
- The `package.json` file shall include at least a `test` script so the same test command can be run every time.
- If the project uses ES module imports in JavaScript, `package.json` shall set `"type": "module"`.
- The project shall remain compatible with a plain JavaScript, static-site workflow.

# tech atack

plain html, css, javascript
