# IMPLEMENTATION_PHASE1.md

## Phase Identification

- **Selected phase:** Phase 1 — Repository scaffold and project tooling confirmed working
- **Why this is next:** `TODO.md` and `DONE.md` are currently empty, and no runtime source tree (`src/`, `test/`, `package.json`, `index.html`, `style.css`) exists yet in the workspace.
- **Authoritative alignment:** `IMPLEMENTATION_PLAN.md` Phase 1 + `REQUIREMENTS.md` Project Setup Requirements.

## 1) Architectural Design

This phase defines the **project architecture skeleton**, not gameplay logic. The design objective is to establish module boundaries and executable tooling contracts so later phases can fill behavior incrementally.

### 1.1 Runtime Architecture (Phase 1 contract)

- **App type:** Static SPA (no backend), browser-executed ES modules.
- **Entry-point chain (declared now, implemented later):**
  - `index.html` loads `src/game.js` via `<script type="module">` (can be deferred to later phase if script remains a no-op).
  - `src/game.js` orchestrates engine + UI wiring (stub in Phase 1).
  - `src/engine.js` owns pure game logic (stub in Phase 1).
  - `src/ui.js` owns DOM rendering helpers (stub in Phase 1).
- **Test architecture:** Node-based unit tests (`npm test`) must execute without browser.

### 1.2 Data Structures to Declare Now (stub-level only)

These are **type contracts and placeholder structures** to lock interfaces early:

```js
// src/engine.js (Phase 1 placeholder API contract)

/**
 * @typedef {Object} Cell
 * @property {number} row
 * @property {number} col
 * @property {boolean} hasMine
 * @property {number} neighborCount
 * @property {'hidden'|'revealed'|'flagged'} state
 */

/**
 * @typedef {Object} GameConfig
 * @property {number} rows
 * @property {number} cols
 * @property {number} mines
 */

/**
 * @typedef {'idle'|'in-progress'|'won'|'lost'} GameStatus
 */
```

### 1.3 State Definitions (to freeze naming consistency)

- **Cell state enum:** `hidden | revealed | flagged`
- **Game state enum:** `idle | in-progress | won | lost`
- **Difficulty presets (constants):**
  - Beginner: `9x9`, `10`
  - Intermediate: `16x16`, `40`
  - Expert: `30x16`, `99`

### 1.4 Function Signatures to Stub (no logic yet)

```js
// src/engine.js
export function createEngine(config) {}

// src/game.js
export function initGame() {}

// src/ui.js
export function renderBoard(boardElement, board) {}
```

Notes:

- Function bodies remain minimal (`throw new Error('Not implemented')` OR no-op), but exports must resolve cleanly for imports.
- Avoid speculative APIs beyond these signatures in Phase 1.

### 1.5 Tooling/Execution Contract

`package.json` must define:

- `"type": "module"`
- `"scripts.test"` (must pass)
- `"scripts.serve"` (local static server convenience)

Recommended minimal script contract:

```json
{
  "type": "module",
  "scripts": {
    "test": "node --test",
    "serve": "python3 -m http.server 8080"
  }
}
```

This remains fully compatible with static-host deployment and avoids unnecessary dependencies.

---

## 2) File-Level Strategy

Exact files to touch for Phase 1 and each change’s responsibility:

1. **`package.json`**
   - Define module mode and executable scripts.
   - Establish stable command interface (`npm test`, `npm run serve`).

2. **`index.html`**
   - Valid HTML5 shell.
   - Minimal structure only; no gameplay logic.
   - Must open with zero console errors.

3. **`style.css`**
   - Stub stylesheet (empty or reset only).
   - No visual system implementation yet.

4. **`src/engine.js`**
   - Export placeholder engine contract.
   - Keep pure-logic boundary explicit.

5. **`src/game.js`**
   - Export bootstrap placeholder (`initGame`).
   - No event binding or board logic yet.

6. **`src/ui.js`**
   - Export placeholder render contract (`renderBoard`).
   - No DOM rendering implementation yet.

7. **`test/engine.test.js`**
   - Include one passing smoke test to prove test runner wiring.

8. **`README.md`**
   - Add quickstart commands for test and local serve.

No additional files are required in this phase.

---

## 3) Atomic Execution Steps (Plan–Act–Validate)

Source checklist basis: Phase 1 high-level TODO set from `IMPLEMENTATION_PLAN.md` (used because current `TODO.md` is empty).

### 3.1 Create `package.json` with ESM + scripts

- **Plan:** Define minimal metadata and deterministic scripts aligned with `REQUIREMENTS.md` setup rules.
- **Act:** Create root `package.json` with `"type": "module"`, `"test"`, and `"serve"` scripts.
- **Validate:**
  - `cat package.json` includes required keys.
  - `npm test` command is resolvable.

### 3.2 Create stub `index.html`

- **Plan:** Provide valid HTML5 document with UTF-8 + viewport and project title.
- **Act:** Create `index.html` with minimal semantic body container.
- **Validate:**
  - Open page in browser.
  - Confirm no console errors.

### 3.3 Create stub `style.css`

- **Plan:** Add zero-risk placeholder stylesheet.
- **Act:** Create empty file or reset-only content.
- **Validate:**
  - File exists.
  - Importing it in HTML does not throw errors.

### 3.4 Create stub `src/engine.js`

- **Plan:** Lock export name(s) used by later phases.
- **Act:** Add named export placeholder (e.g., `createEngine`).
- **Validate:**
  - Module imports cleanly from test or `src/game.js`.
  - No runtime syntax/module errors.

### 3.5 Create stub `src/game.js`

- **Plan:** Reserve game orchestration module.
- **Act:** Export `initGame` as no-op/placeholder.
- **Validate:**
  - ES module parses.
  - Import path integrity preserved.

### 3.6 Create stub `src/ui.js`

- **Plan:** Reserve rendering module boundary.
- **Act:** Export `renderBoard` placeholder.
- **Validate:**
  - Module parses and exports resolve.

### 3.7 Create `test/engine.test.js` with passing no-op

- **Plan:** Prove test harness executes in repo baseline state.
- **Act:** Add one deterministic passing test using Node test runner.
- **Validate:**
  - `npm test` exits `0`.

### 3.8 Confirm `npm test` exits zero

- **Plan:** Verify baseline tooling before additional implementation.
- **Act:** Run test script in clean shell.
- **Validate:**
  - Exit code `0`.
  - Exactly expected passing test output.

### 3.9 Create or update `README.md` with run commands

- **Plan:** Ensure repo is runnable by a new contributor in one minute.
- **Act:** Add commands for testing and static serving.
- **Validate:**
  - `README.md` contains `npm test` and `npm run serve` strings.

### 3.10 Open `index.html` and verify no console errors

- **Plan:** Validate browser baseline before logic phases.
- **Act:** Launch page in desktop browser.
- **Validate:**
  - No uncaught exceptions.
  - No failed script/style fetches.

---

## 4) Edge Case & Boundary Audit (Phase 1)

Even scaffolding has failure modes that can block later phases.

1. **ESM mismatch trap**
   - Missing `"type": "module"` causes import syntax/runtime failures in Node tests.

2. **Script portability trap**
   - `serve` script using unavailable tooling (`npx` package not installed) breaks local setup.

3. **Silent path drift**
   - Wrong paths (`src/Engine.js` vs `src/engine.js`) fail on Linux due to case sensitivity.

4. **Empty test suite ambiguity**
   - Some runners treat no tests as pass with poor signal; include explicit one-test smoke case.

5. **Browser console contamination**
   - Premature script references in HTML to non-existent files produce false-negative baseline.

6. **Cross-phase API drift risk**
   - If placeholder function names differ from implementation plan, future phases add churn.

7. **Scope creep risk**
   - Implementing engine/UI behavior in scaffolding phase increases review complexity and violates phase boundaries.

8. **Static hosting mismatch**
   - Using file URL assumptions without a local HTTP script may cause module load restrictions in some browser setups.

---

## 5) Verification Protocol

### 5.1 Automated checks (must pass)

1. Run `npm test`.
2. Verify process exits `0`.
3. Verify smoke test count matches expected (`1` passing test).

### 5.2 Manual UX checks (must pass)

1. Open `index.html` in desktop browser at minimum supported viewport context.
2. Confirm page renders (even if mostly empty).
3. Open devtools console.
4. Confirm zero JavaScript errors and zero failed module/style fetches.

### 5.3 Artifact integrity checklist

- [ ] `package.json` exists with `"type": "module"`.
- [ ] `package.json` includes `test` script.
- [ ] `package.json` includes `serve` script.
- [ ] `index.html` exists and is valid HTML5.
- [ ] `style.css` exists.
- [ ] `src/engine.js` exists with named export placeholder.
- [ ] `src/game.js` exists as valid ES module.
- [ ] `src/ui.js` exists as valid ES module.
- [ ] `test/engine.test.js` exists with one passing test.
- [ ] `README.md` includes `npm test` and `npm run serve` instructions.

### 5.4 Exit criteria gate

Phase 1 is complete only when **all** automated + manual + artifact checks above pass and reviewer confirms no scope creep into engine/gameplay/UI behavior.

---

## 6) Code Scaffolding (Idiomatic Templates)

Use these templates verbatim/minimally adjusted to keep style consistent.

### 6.1 `package.json` template

```json
{
  "name": "pxl-sweeper-tomcoolpxl",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "node --test",
    "serve": "python3 -m http.server 8080"
  }
}
```

### 6.2 `index.html` template

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PXL Sweeper</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <main id="app"></main>
  </body>
</html>
```

### 6.3 `src/engine.js` template

```js
export function createEngine(config) {
  void config;
  return {
    status: 'idle'
  };
}
```

### 6.4 `src/game.js` template

```js
export function initGame() {}
```

### 6.5 `src/ui.js` template

```js
export function renderBoard(boardElement, board) {
  void boardElement;
  void board;
}
```

### 6.6 `test/engine.test.js` template

```js
import test from 'node:test';
import assert from 'node:assert/strict';

test('engine scaffold smoke test', () => {
  assert.equal(1, 1);
});
```

### 6.7 `README.md` minimal section template

````markdown
## Development

```bash
npm test
npm run serve
```
````

---

## Implementation Notes for Reviewers

- This blueprint intentionally keeps Phase 1 constrained to scaffolding and execution contracts only.
- Gameplay mechanics, rendering behavior, and interaction logic are deferred to subsequent phases by design.
- If `TODO.md` is refreshed before implementation, copy the Phase 1 checklist from `IMPLEMENTATION_PLAN.md` to preserve one-to-one traceability.
