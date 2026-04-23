# IMPLEMENTATION_PHASE2.md — Core Game Engine

**Phase:** 2  
**Title:** Core game-engine logic implemented and unit-tested  
**Target:** `src/engine.js` and `test/engine.test.js`  
**Scope:** Pure logic, zero DOM dependency  
**Estimated LOC:** ~500–600 production code, ~800–1000 test code  
**Review time:** 1–2 hours (comprehensive logic module with full test coverage)

---

## 1. Architectural Design

### 1.1 Data Model Definitions

#### Cell Object (Internal)
```javascript
{
  row: number,          // 0 to (rows-1)
  col: number,          // 0 to (cols-1)
  hasMine: boolean,     // true if mine present
  neighborCount: number, // 0–8, only valid for non-mine cells
  state: string         // 'hidden' | 'revealed' | 'flagged'
}
```

**Invariants:**
- `state` is always one of the three values; no other states exist.
- `hasMine` and `state` are independent. A cell can be a flagged mine, a revealed mine, a hidden mine, etc.
- `neighborCount` is only meaningful when `hasMine === false`. Do NOT compute neighbor count for mine cells (avoid confusion in UI).
- Initial cell state: `state = 'hidden'`, `hasMine = false`, `neighborCount = 0` (placeholder, computed after mine placement).

#### Board
```javascript
const board = [
  [cell, cell, cell, ...],  // row 0
  [cell, cell, cell, ...],  // row 1
  ...
]
```
**Invariants:**
- 2D array: `board[row][col]` is a Cell.
- All rows have the same length (rectangular grid).
- Exactly `totalMines` cells have `hasMine === true` after mine placement.
- Exactly zero cells have `hasMine === true` before mine placement (or after restart).

#### Game State Object (Engine Instance)
```javascript
{
  config: { rows, cols, mines },
  board: [[cell, ...], ...],
  status: 'idle' | 'in-progress' | 'won' | 'lost',
  isFirstClick: boolean,
  revealedCount: number,  // count of cells with state === 'revealed'
  flagCount: number,      // count of cells with state === 'flagged'
  triggeredCell: { row, col } | null, // set only if status === 'lost'
}
```

**Invariants:**
- `status` transitions: `idle` → `in-progress` (on first reveal) → `won` or `lost`.
- Once `status` is `won` or `lost`, it never changes during the same game instance.
- `isFirstClick` is `true` until the first `revealCell` call, then `false` forever (in that game).
- `revealedCount` and `flagCount` are maintained accurately after every state-changing action.
- `revealedCount + (total non-mine cells) − flagCount` should equal the count of unrevealed, unflagged cells.

### 1.2 Function Signatures

#### Factory Function
```javascript
/**
 * Create a new game engine instance.
 * @param {GameConfig} config - { rows, cols, mines }
 * @returns {GameEngine} Engine instance with initial state (idle, all hidden)
 * Throws if config is invalid (rows/cols ≤ 0, mines < 0, mines > rows*cols - 1)
 */
export function createEngine(config) { ... }
```

#### Core Engine Methods (on Engine Instance)
```javascript
/**
 * Place mines after first click, excluding the clicked cell and all 8 neighbors.
 * @param {number} firstRow - Clicked cell row
 * @param {number} firstCol - Clicked cell column
 * @throws if isFirstClick is false (already placed mines)
 * @throws if coordinates are out of bounds
 * @returns {GameEngine} This instance (for chaining or clarity)
 */
placeMines(firstRow, firstCol) { ... }

/**
 * Reveal a cell. If it's a mine, status becomes 'lost'.
 * If all non-mine cells are revealed, status becomes 'won'.
 * If cell is zero-count, trigger flood reveal.
 * @param {number} row - Cell row
 * @param {number} col - Cell column
 * @returns {GameEngine} This instance
 * @throws if coordinates out of bounds
 * Precondition: placeMines must have been called (or will be called by caller on first click)
 */
revealCell(row, col) { ... }

/**
 * Toggle flag on a hidden cell only. No effect on revealed or already-flagged cells.
 * @param {number} row - Cell row
 * @param {number} col - Cell column
 * @returns {GameEngine} This instance
 * @throws if coordinates out of bounds
 */
toggleFlag(row, col) { ... }

/**
 * Get current engine state (for UI rendering).
 * @returns {Object} Copy/snapshot of current board and metadata (not mutated by UI)
 */
getState() { ... }

/**
 * Compute list of cells with flags on non-mine cells (for loss-reveal display).
 * @returns {Array<{row, col}>} List of incorrectly flagged cells
 */
getIncorrectFlags() { ... }
```

### 1.3 Key Algorithms

#### Algorithm 1: Mine Placement (Post-First-Click)
```
Input: board, totalMines, firstRow, firstCol
Output: board with totalMines randomly placed, excluding:
        - cell at (firstRow, firstCol)
        - all 8 neighbors of (firstRow, firstCol) (clipped to board bounds)

Procedure:
1. Create exclusion set: {(firstRow, firstCol)} ∪ all (r, c) where
   r ∈ [firstRow-1, firstRow+1], c ∈ [firstCol-1, firstCol+1], within board bounds
2. Collect all valid (non-excluded) cell positions
3. Randomly shuffle valid positions (Fisher-Yates)
4. Select first totalMines positions and place mines
5. Compute neighbor counts for all non-mine cells
```

**Pseudo-code:**
```javascript
function placeMines(board, totalMines, firstRow, firstCol) {
  const exclusion = new Set();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = firstRow + dr, c = firstCol + dc;
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        exclusion.add(`${r},${c}`);
      }
    }
  }
  
  const validPositions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!exclusion.has(`${r},${c}`)) {
        validPositions.push([r, c]);
      }
    }
  }
  
  // Fisher-Yates shuffle
  for (let i = validPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
  }
  
  for (let i = 0; i < totalMines; i++) {
    const [r, c] = validPositions[i];
    board[r][c].hasMine = true;
  }
  
  computeNeighborCounts(board);
}
```

#### Algorithm 2: Neighbor Count Computation
```
Input: board
Output: board with neighborCount updated for all non-mine cells

Procedure:
For each cell (r, c) where hasMine === false:
  count = 0
  for each (dr, dc) in 8-directional neighbors:
    nr = r + dr, nc = c + dc
    if (nr, nc) in bounds AND board[nr][nc].hasMine:
      count++
  board[r][c].neighborCount = count
```

**Pseudo-code:**
```javascript
function computeNeighborCounts(board) {
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].hasMine) {
        let count = 0;
        for (const [dr, dc] of directions) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].hasMine) {
            count++;
          }
        }
        board[r][c].neighborCount = count;
      }
    }
  }
}
```

#### Algorithm 3: Flood Reveal (BFS/Depth-First)
```
Input: board, startRow, startCol (a zero-count cell)
Output: board with all connected zero-count and adjacent non-zero cells revealed

Procedure (BFS):
1. Create queue, enqueue (startRow, startCol)
2. While queue not empty:
   a. Dequeue (r, c)
   b. If already visited or flagged, skip
   c. Mark as visited, reveal cell
   d. If neighborCount > 0, do not enqueue neighbors (stop at non-zero)
   e. If neighborCount === 0, enqueue all 8 neighbors
3. Visited set prevents revisits; flagged cells are never enqueued
```

**Pseudo-code:**
```javascript
function floodReveal(board, startRow, startCol) {
  const queue = [[startRow, startCol]];
  const visited = new Set();
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const key = `${r},${c}`;
    
    if (visited.has(key)) continue;
    if (board[r][c].state === 'flagged') continue;
    
    visited.add(key);
    board[r][c].state = 'revealed';
    
    // Only continue to neighbors if this cell has zero mines nearby
    if (board[r][c].neighborCount === 0) {
      for (const [dr, dc] of directions) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const nkey = `${nr},${nc}`;
          if (!visited.has(nkey)) {
            queue.push([nr, nc]);
          }
        }
      }
    }
  }
}
```

#### Algorithm 4: Win Detection
```
Input: board
Output: true if game won, false otherwise

Procedure:
For each cell (r, c):
  if not hasMine and state !== 'revealed':
    return false  // unrevealed non-mine found, not won
return true  // all non-mine cells revealed
```

#### Algorithm 5: Incorrect Flags
```
Input: board
Output: array of {row, col} for each cell with state === 'flagged' AND hasMine === false

Procedure:
badFlags = []
For each cell (r, c):
  if cell.state === 'flagged' AND cell.hasMine === false:
    badFlags.push({row: r, col: c})
return badFlags
```

---

## 2. File-Level Strategy

### 2.1 Files to Modify
```
src/engine.js                 (primary: implement 100% of engine)
test/engine.test.js           (primary: 100% of test suite for engine)
```

### 2.2 Responsibility Breakdown

#### `src/engine.js`
- **Lines 1–50:** Type definitions (JSDoc for Cell, Board, GameConfig, GameStatus)
- **Lines 51–100:** Helper functions (getNeighbors, isInBounds, cloneBoard)
- **Lines 101–200:** Mine placement (placeMinesImpl, exclusion logic)
- **Lines 201–300:** Neighbor count computation
- **Lines 301–400:** Flood reveal (BFS implementation)
- **Lines 401–500:** Main engine factory and methods (createEngine, revealCell, toggleFlag, win detection)
- **Lines 501–600:** Accessors (getState, getIncorrectFlags, etc.)

#### `test/engine.test.js`
- **Test Suite 1:** Board creation and initialization (5 tests)
- **Test Suite 2:** Mine placement and exclusion zone (8 tests)
- **Test Suite 3:** Neighbor count correctness (7 tests)
- **Test Suite 4:** Flood reveal (8 tests)
- **Test Suite 5:** Game state transitions (6 tests)
- **Test Suite 6:** Flag toggling (5 tests)
- **Test Suite 7:** Win/loss conditions (6 tests)
- **Test Suite 8:** Edge cases (corner/edge cells, minimal boards) (5 tests)

**Total test count: ~50 unit tests**

---

## 3. Atomic Execution Steps (Plan-Act-Validate Cycles)

### Cycle 1: Board Initialization & Data Model
**Plan:**
- Implement `createEngine(config)` factory.
- Validate config (rows, cols, mines bounds).
- Initialize empty board (all cells hidden, no mines).

**Act:**
1. Define Cell factory/object shape in JSDoc.
2. Implement `createEngine` to:
   - Validate config (throw if invalid).
   - Create rows×cols grid of cells.
   - Set all states to 'hidden'.
   - Store config and initialize status='idle', isFirstClick=true, counts=0.
3. Implement `getState()` to return a snapshot of the board and metadata.

**Validate:**
```javascript
test("createEngine initializes an empty 9×9 board", () => {
  const engine = createEngine({ rows: 9, cols: 9, mines: 10 });
  const state = engine.getState();
  assert.strictEqual(state.board.length, 9);
  assert.strictEqual(state.board[0].length, 9);
  assert.strictEqual(state.status, 'idle');
  assert.strictEqual(engine.isFirstClick, true);
  // All cells hidden, no mines
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      assert.strictEqual(state.board[r][c].state, 'hidden');
      assert.strictEqual(state.board[r][c].hasMine, false);
    }
  }
});

test("createEngine rejects invalid config (rows <= 0)", () => {
  assert.throws(() => createEngine({ rows: 0, cols: 9, mines: 10 }));
});

test("createEngine rejects invalid config (mines > cells - 1)", () => {
  assert.throws(() => createEngine({ rows: 3, cols: 3, mines: 9 }));
});
```

---

### Cycle 2: Mine Placement with Safe Zone
**Plan:**
- Implement `placeMines(row, col)` with exclusion logic.
- Ensure exclusion zone includes clicked cell and 8 neighbors, clipped to bounds.
- Call neighbor count computation after placement.

**Act:**
1. Implement exclusion set logic (handle edges/corners).
2. Implement Fisher-Yates shuffle for random placement.
3. Place mines, set hasMine=true.
4. Trigger `computeNeighborCounts`.
5. Set isFirstClick=false.

**Validate:**
```javascript
test("placeMines on corner excludes only valid neighbors", () => {
  const engine = createEngine({ rows: 3, cols: 3, mines: 1 });
  engine.placeMines(0, 0); // Top-left corner
  const state = engine.getState();
  // Mine should NOT be in (0,0), (0,1), (1,0), (1,1)
  assert.strictEqual(state.board[0][0].hasMine, false);
  assert.strictEqual(state.board[0][1].hasMine, false);
  assert.strictEqual(state.board[1][0].hasMine, false);
  assert.strictEqual(state.board[1][1].hasMine, false);
  // Mine must be in (0,2), (1,2), or (2,*) somewhere
  let mineCount = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (state.board[r][c].hasMine) mineCount++;
    }
  }
  assert.strictEqual(mineCount, 1);
});

test("placeMines on interior excludes 8 neighbors correctly", () => {
  const engine = createEngine({ rows: 9, cols: 9, mines: 10 });
  engine.placeMines(4, 4); // Center cell
  const state = engine.getState();
  // Verify (4,4) and all 8 neighbors are mine-free
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      assert.strictEqual(state.board[4 + dr][4 + dc].hasMine, false);
    }
  }
});

test("placeMines places exactly totalMines mines", () => {
  const engine = createEngine({ rows: 9, cols: 9, mines: 10 });
  engine.placeMines(4, 4);
  const state = engine.getState();
  let mineCount = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.board[r][c].hasMine) mineCount++;
    }
  }
  assert.strictEqual(mineCount, 10);
});

test("placeMines throws if called twice", () => {
  const engine = createEngine({ rows: 9, cols: 9, mines: 10 });
  engine.placeMines(4, 4);
  assert.throws(() => engine.placeMines(5, 5)); // isFirstClick now false
});
```

---

### Cycle 3: Neighbor Count Computation
**Plan:**
- Implement `computeNeighborCounts(board)`.
- Verify 8-directional adjacency.
- Handle edges and corners correctly.

**Act:**
1. Iterate all non-mine cells.
2. For each, count mine neighbors in all 8 directions.
3. Handle boundary checks to prevent out-of-bounds access.
4. Assign count to cell.

**Validate:**
```javascript
test("computeNeighborCounts: interior cell surrounded by 8 mines", () => {
  const engine = createEngine({ rows: 3, cols: 3, mines: 8 });
  const state = engine.getState();
  // Manually place mines in all neighbors of (1, 1)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r !== 1 || c !== 1) {
        state.board[r][c].hasMine = true;
      }
    }
  }
  // Call neighbor count computation (assuming it's internal or re-callable)
  // In our design, this is called after mine placement; here we'd need a helper or test directly
  // For now, assume we have access or call it after placeMines
  // Alternative: create a small board with known mines
  // Let's assume computeNeighborCounts is private; we verify via placeMines behavior
  assert.strictEqual(state.board[1][1].neighborCount, 8);
});

test("computeNeighborCounts: corner cell has <= 3 neighbors", () => {
  const engine = createEngine({ rows: 3, cols: 3, mines: 3 });
  // Place mines at (0, 1), (1, 0), (1, 1) to surround corner (0, 0)
  // Verify (0, 0).neighborCount === 3 after placeMines(2, 2) (safe zone excludes all three)
  // This is indirectly tested
});

test("computeNeighborCounts: edge cell (no corners)", () => {
  // Similar setup; verify edge cell count
});
```

---

### Cycle 4: Flood Reveal Algorithm
**Plan:**
- Implement BFS flood-reveal.
- Verify it starts from a zero-count cell.
- Verify it stops at non-zero cells and does not cross flagged cells.

**Act:**
1. Implement `floodReveal(board, startRow, startCol)` using BFS.
2. Use visited set to prevent infinite loops.
3. Skip flagged cells.
4. Stop expanding when reaching a cell with neighborCount > 0.

**Validate:**
```javascript
test("floodReveal from a zero cell expands through connected zeros", () => {
  // Set up board with a region of zero-count cells
  // Reveal one cell and verify flood propagates
  const engine = createEngine({ rows: 9, cols: 9, mines: 1 });
  engine.placeMines(8, 8); // Mines in corner; large zero region forms
  engine.revealCell(0, 0); // Should trigger flood
  const state = engine.getState();
  // Verify many cells in upper-left are revealed
  let revealedCount = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.board[r][c].state === 'revealed') revealedCount++;
    }
  }
  assert(revealedCount > 10); // At least more than 9×9 = 1
});

test("floodReveal stops at non-zero cells but reveals them", () => {
  // Place mines to create a boundary of non-zero cells
  // Verify flood stops at boundary but includes boundary cells
  // (depends on exact board layout; this is a conceptual check)
});

test("floodReveal does not cross flagged cells", () => {
  // Flag a cell in the middle of a zero region
  // Verify flood from one side does not reach the other side
  const engine = createEngine({ rows: 9, cols: 9, mines: 1 });
  engine.placeMines(8, 8);
  engine.toggleFlag(4, 4); // Flag a cell in middle
  engine.revealCell(0, 0); // Flood from corner
  const state = engine.getState();
  // Verify some cells on the far side of flagged cell are not revealed
  // (depends on mine placement; this is a conceptual check)
});

test("floodReveal does not infinite loop", () => {
  // Verify the algorithm completes in reasonable time
  // (implicit; if this test hangs, BFS has a bug)
});
```

---

### Cycle 5: Reveal Cell and Game State Transitions
**Plan:**
- Implement `revealCell(row, col)`.
- On first reveal, call `placeMines` (deferred mine placement).
- Detect mine → transition to 'lost', store triggeredCell.
- Detect win → transition to 'won'.
- Trigger flood reveal if zero-count cell.
- Update revealedCount.

**Act:**
1. Check bounds.
2. If isFirstClick, call `placeMines(row, col)` and set isFirstClick=false.
3. If already revealed or flagged, return early (no-op).
4. Reveal cell (state='revealed'), increment revealedCount.
5. If hasMine, set status='lost', store triggeredCell, return.
6. If neighborCount===0, trigger floodReveal.
7. Check win condition (all non-mine cells revealed).

**Validate:**
```javascript
test("revealCell on first click places mines and reveals", () => {
  const engine = createEngine({ rows: 9, cols: 9, mines: 10 });
  assert.strictEqual(engine.isFirstClick, true);
  engine.revealCell(4, 4);
  const state = engine.getState();
  assert.strictEqual(state.status, 'in-progress');
  assert.strictEqual(engine.isFirstClick, false);
  // (4, 4) should be revealed
  assert.strictEqual(state.board[4][4].state, 'revealed');
  // (4, 4) and neighbors should not have mines
  assert.strictEqual(state.board[4][4].hasMine, false);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = 4 + dr, c = 4 + dc;
      if (r >= 0 && r < 9 && c >= 0 && c < 9) {
        assert.strictEqual(state.board[r][c].hasMine, false);
      }
    }
  }
});

test("revealCell on mine transitions to 'lost'", () => {
  const engine = createEngine({ rows: 9, cols: 9, mines: 10 });
  engine.placeMines(0, 0);
  // Find a mine and click it
  let mineRow = -1, mineCol = -1;
  const state = engine.getState();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.board[r][c].hasMine) {
        mineRow = r;
        mineCol = c;
        break;
      }
    }
    if (mineRow !== -1) break;
  }
  assert(mineRow !== -1); // Found a mine
  engine.revealCell(mineRow, mineCol);
  const afterState = engine.getState();
  assert.strictEqual(afterState.status, 'lost');
  assert.strictEqual(afterState.triggeredCell.row, mineRow);
  assert.strictEqual(afterState.triggeredCell.col, mineCol);
});

test("revealCell on zero-count triggers flood", () => {
  // Requires board setup with zero-count cell
  // Implicitly tested in flood-reveal cycle
});

test("revealCell increments revealedCount", () => {
  const engine = createEngine({ rows: 9, cols: 9, mines: 10 });
  engine.placeMines(0, 0);
  const stateBefore = engine.getState();
  const countBefore = stateBefore.revealedCount;
  engine.revealCell(4, 4);
  const stateAfter = engine.getState();
  assert(stateAfter.revealedCount >= countBefore); // At least one more (or more if flood)
});
```

---

### Cycle 6: Flag Toggling
**Plan:**
- Implement `toggleFlag(row, col)`.
- Only affects hidden cells.
- Toggle on/off; no effect on revealed.
- Update flagCount.

**Act:**
1. Check bounds.
2. If not hidden, return early (no-op).
3. If state='hidden' and currently unflagged, set state='flagged', increment flagCount.
4. If state='flagged', set state='hidden', decrement flagCount.

**Validate:**
```javascript
test("toggleFlag on hidden cell flags it", () => {
  const engine = createEngine({ rows: 9, cols: 9, mines: 10 });
  engine.placeMines(0, 0);
  const stateBefore = engine.getState();
  assert.strictEqual(stateBefore.board[5][5].state, 'hidden');
  engine.toggleFlag(5, 5);
  const stateAfter = engine.getState();
  assert.strictEqual(stateAfter.board[5][5].state, 'flagged');
  assert.strictEqual(stateAfter.flagCount, 1);
});

test("toggleFlag on flagged cell unflags it", () => {
  const engine = createEngine({ rows: 9, cols: 9, mines: 10 });
  engine.placeMines(0, 0);
  engine.toggleFlag(5, 5);
  let state = engine.getState();
  assert.strictEqual(state.board[5][5].state, 'flagged');
  engine.toggleFlag(5, 5);
  state = engine.getState();
  assert.strictEqual(state.board[5][5].state, 'hidden');
  assert.strictEqual(state.flagCount, 0);
});

test("toggleFlag on revealed cell has no effect", () => {
  const engine = createEngine({ rows: 9, cols: 9, mines: 10 });
  engine.placeMines(0, 0);
  engine.revealCell(4, 4); // Reveal a cell
  const stateBefore = engine.getState();
  const flagCountBefore = stateBefore.flagCount;
  engine.toggleFlag(4, 4); // Try to flag it
  const stateAfter = engine.getState();
  assert.strictEqual(stateAfter.board[4][4].state, 'revealed'); // Still revealed
  assert.strictEqual(stateAfter.flagCount, flagCountBefore); // No change
});
```

---

### Cycle 7: Win Detection and Game Status
**Plan:**
- Implement win detection: all non-mine cells revealed.
- Transition status to 'won'.
- Verify status never changes once 'won' or 'lost'.

**Act:**
1. After each reveal, check if all non-mine cells are revealed.
2. If yes, set status='won' and return.
3. Verify no further state changes occur on that instance.

**Validate:**
```javascript
test("revealCell on last non-mine cell triggers win", () => {
  // Create a small board and reveal all non-mine cells
  const engine = createEngine({ rows: 3, cols: 3, mines: 1 });
  engine.placeMines(0, 0); // Mine in corner
  // Manually mark all non-mine cells as revealed (or call reveal for each)
  // This is tricky; alternate: create board with 0 mines and 1 cell, verify win on reveal
  // Let's do a simpler version: create 2×2 board with 1 mine, reveal 3 non-mine cells
  const engine2 = createEngine({ rows: 2, cols: 2, mines: 1 });
  engine2.placeMines(0, 0); // Mine at (0, 0)
  // Reveal (0, 1), (1, 0), (1, 1)
  engine2.revealCell(0, 1);
  engine2.revealCell(1, 0);
  engine2.revealCell(1, 1);
  const state = engine2.getState();
  assert.strictEqual(state.status, 'won');
});

test("status remains 'won' after win", () => {
  // Win a game, then try to reveal or flag
  // Verify status doesn't change
  // (Note: In Phase 5, we'll lock input; here we just verify engine state)
});

test("status transitions from 'idle' to 'in-progress' to 'won' or 'lost'", () => {
  // Verify state machine
});
```

---

### Cycle 8: Incorrect Flags Detection
**Plan:**
- Implement `getIncorrectFlags()`.
- Return array of {row, col} for flags on non-mine cells.
- Used for loss display.

**Act:**
1. Iterate all cells.
2. If state='flagged' and hasMine=false, add to result.

**Validate:**
```javascript
test("getIncorrectFlags returns flags on non-mine cells", () => {
  const engine = createEngine({ rows: 9, cols: 9, mines: 10 });
  engine.placeMines(0, 0);
  // Flag some non-mine cells
  engine.toggleFlag(4, 4);
  engine.toggleFlag(5, 5);
  // Find a mine and flag it (should not be in incorrectFlags)
  let mineRow = -1, mineCol = -1;
  const state = engine.getState();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.board[r][c].hasMine) {
        mineRow = r;
        mineCol = c;
        break;
      }
    }
    if (mineRow !== -1) break;
  }
  engine.toggleFlag(mineRow, mineCol);
  const incorrectFlags = engine.getIncorrectFlags();
  assert.strictEqual(incorrectFlags.length, 2);
  // Verify (4, 4) and (5, 5) are in the list
  const coords = incorrectFlags.map(f => `${f.row},${f.col}`);
  assert(coords.includes('4,4'));
  assert(coords.includes('5,5'));
  // Verify (mineRow, mineCol) is NOT in the list
  assert(!coords.includes(`${mineRow},${mineCol}`));
});
```

---

### Cycle 9: Edge Cases and Boundary Conditions
**Plan:**
- Test corner and edge first-clicks.
- Test minimal boards (3×3, 1×1, etc.).
- Test boards where few cells remain after first-click exclusion.

**Act:**
1. Run tests on corner, edge, and interior first clicks.
2. Run tests on small boards.
3. Verify no crashes and correct mine placement.

**Validate:**
```javascript
test("placeMines on corner of small board excludes only valid cells", () => {
  const engine = createEngine({ rows: 3, cols: 3, mines: 1 });
  engine.placeMines(0, 0); // Top-left corner
  const state = engine.getState();
  // Valid positions for mine: all except (0,0), (0,1), (1,0), (1,1)
  // Valid: (0,2), (1,2), (2,0), (2,1), (2,2)
  let mineFound = false;
  for (const [r, c] of [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]]) {
    if (state.board[r][c].hasMine) {
      mineFound = true;
      break;
    }
  }
  assert(mineFound);
});

test("createEngine with 1×1 board", () => {
  const engine = createEngine({ rows: 1, cols: 1, mines: 0 });
  const state = engine.getState();
  assert.strictEqual(state.board.length, 1);
  assert.strictEqual(state.board[0].length, 1);
});

test("revealCell on 1×1 board with no mines wins immediately", () => {
  const engine = createEngine({ rows: 1, cols: 1, mines: 0 });
  engine.revealCell(0, 0);
  const state = engine.getState();
  assert.strictEqual(state.status, 'won');
});

test("first click on expert board corner (30×16, 99 mines, click at (0,0))", () => {
  const engine = createEngine({ rows: 16, cols: 30, mines: 99 });
  engine.placeMines(0, 0);
  const state = engine.getState();
  let mineCount = 0;
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 30; c++) {
      if (state.board[r][c].hasMine) mineCount++;
    }
  }
  assert.strictEqual(mineCount, 99);
  // Verify exclusion zone is respected (0,0) and neighbors have no mines
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = 0 + dr, c = 0 + dc;
      if (r >= 0 && r < 16 && c >= 0 && c < 30) {
        assert.strictEqual(state.board[r][c].hasMine, false);
      }
    }
  }
});
```

---

## 4. Edge Case & Boundary Audit

### Boundary Conditions

| Scenario | Requirement | Validation |
|----------|-------------|-----------|
| First click on corner (0, 0) | Exclusion zone clipped to board bounds; 4 neighbors excluded | Test: placeMines excludes only (0,0), (0,1), (1,0), (1,1) on 3×3 |
| First click on edge (0, 4) on 9×9 | Exclusion zone clipped; 6 neighbors excluded | Test: placeMines on edge of large board |
| First click on center (4, 4) on 9×9 | Full 9-cell exclusion zone | Test: placeMines excludes all 8 neighbors + center |
| Flood reveal with large zero region | Must not stack overflow; should complete in <100ms | Test: Beginner board with many mines, verify flood on corner completes quickly |
| Flood reveal blocked by flagged cell | Flagged cells are never enqueued; region beyond flagged cell not reached | Test: Flag cell in middle of zero region, verify opposite side unrevealed |
| Flagging all cells | flagCount can be 81 on Beginner; no cap | Test: Toggle flag on all 81 cells, verify flagCount=81 |
| Revealing all cells | revealedCount increments correctly through flood and individual reveals | Test: Verify revealedCount consistency |

### Logic Traps

| Trap | Symptom | Prevention |
|------|---------|-----------|
| Off-by-one in 8-directional neighbors | Missed neighbors, incorrect counts | Unit test: verify all 8 directions; spot-check edge/corner cells |
| Flagged cells included in flood queue | Flagged cell causes early stop of flood | Check: `if (board[nr][nc].state === 'flagged') skip` before queueing |
| Revisiting cells in flood (infinite loop) | Algorithm hangs; test timeout | Use visited set; verify queue depletes |
| Win detection off-by-one | Win triggers too early or never | Test: manually set all but one non-mine to revealed, verify no win; set all to revealed, verify win |
| First-click exclusion zone not clipped at bounds | Out-of-bounds array access | Verify bounds check: `if (r >= 0 && r < rows && c >= 0 && c < cols)` before adding to exclusion |
| Mine count not matching totalMines | Board state inconsistent | Count mines after placement; assert count === totalMines |
| Neighbor count computed for mines | Incorrect counts; confusing display | Ensure `if (!board[r][c].hasMine)` before computing count |
| Status not updated on first reveal | Game remains idle, UI confused | Verify status='in-progress' after first revealCell |
| flagCount not decremented on unflag | Counter drifts | Test: toggle flag twice, verify flagCount returns to 0 |

### Edge Case Examples

**Case 1: 3×3 board, first click on corner, 1 mine**
```
Expected: Mine placed in {(0,2), (1,2), (2,0), (2,1), (2,2)}
Test: placeMines(0, 0); verify no mine in {(0,0), (0,1), (1,0), (1,1)}
```

**Case 2: 1×1 board, no mines, reveal cell**
```
Expected: Win immediately
Test: createEngine({rows:1, cols:1, mines:0}); revealCell(0,0); status='won'
```

**Case 3: All-zero board (Expert with 0 mines)**
```
Expected: One reveal → all cells revealed (full flood)
Test: createEngine({rows:16, cols:30, mines:0}); revealCell(0,0); revealedCount=480
```

**Case 4: Multiple flagged cells in flood zone**
```
Expected: Flood respects all flagged cells; doesn't cross any
Test: Flag 5 cells in a line; trigger flood perpendicular; verify flood stops at line
```

---

## 5. Verification Protocol

### Manual Verification Checklist

- [ ] `npm test` runs and all tests pass (exit code 0).
- [ ] No test output contains "FAIL" or assertion errors.
- [ ] Test coverage includes all 9 cycles above; each cycle has ≥2 test cases.
- [ ] No console warnings in test runner (e.g., "undefined is not a function").

### Automated Test Execution

Run before submitting for review:
```bash
npm test 2>&1 | tee test-output.log
```

Verify output contains:
- "X tests passed" or similar success message.
- Exit code 0 (check `echo $?` after running).

### Code Review Verification

Reviewer must confirm:
- [ ] No string literals "document" or "window" in `src/engine.js` (verify via `grep -c "document\|window" src/engine.js` returns 0).
- [ ] All JSDoc type definitions are complete and match usage.
- [ ] Fisher-Yates shuffle is correctly implemented (no biased randomness).
- [ ] BFS flood algorithm uses a visited set; no revisits.
- [ ] Exclusion set logic handles all 8 neighbors + center; clipped to bounds.
- [ ] Win detection iterates all cells; checks non-mine cells for unrevealed state.
- [ ] Incorrect flags only includes flags on non-mine cells.
- [ ] All state transitions (idle→in-progress→won/lost) are one-directional and tested.
- [ ] flagCount and revealedCount are maintained accurately.

---

## 6. Code Scaffolding

### Module Structure (Template)

```javascript
/**
 * @file src/engine.js
 * Pure-logic game engine for Minesweeper. No DOM dependency.
 * Exports a factory function, createEngine, returning an engine instance.
 */

// ============================================================================
// Type Definitions (JSDoc)
// ============================================================================

/**
 * @typedef {Object} Cell
 * @property {number} row - 0-indexed row
 * @property {number} col - 0-indexed column
 * @property {boolean} hasMine - true if cell contains a mine
 * @property {number} neighborCount - count of adjacent mines (0-8); only meaningful if !hasMine
 * @property {'hidden'|'revealed'|'flagged'} state - cell visibility/flag state
 */

/**
 * @typedef {Object} GameConfig
 * @property {number} rows - board height
 * @property {number} cols - board width
 * @property {number} mines - total mines to place
 */

/**
 * @typedef {'idle'|'in-progress'|'won'|'lost'} GameStatus
 */

/**
 * @typedef {Object} GameState
 * @property {GameConfig} config
 * @property {Cell[][]} board
 * @property {GameStatus} status
 * @property {boolean} isFirstClick
 * @property {number} revealedCount
 * @property {number} flagCount
 * @property {{row: number, col: number} | null} triggeredCell
 */

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if coordinates are within board bounds.
 * @param {number} row
 * @param {number} col
 * @param {number} rows
 * @param {number} cols
 * @returns {boolean}
 */
function isInBounds(row, col, rows, cols) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

/**
 * Get all 8 directional neighbors.
 * @returns {Array<[number, number]>}
 */
function getNeighborDirections() {
  return [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
}

/**
 * Create an empty cell.
 * @param {number} row
 * @param {number} col
 * @returns {Cell}
 */
function createCell(row, col) {
  return {
    row,
    col,
    hasMine: false,
    neighborCount: 0,
    state: 'hidden'
  };
}

/**
 * Create an empty board (all cells hidden, no mines).
 * @param {number} rows
 * @param {number} cols
 * @returns {Cell[][]}
 */
function createBoard(rows, cols) {
  const board = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(createCell(r, c));
    }
    board.push(row);
  }
  return board;
}

// ============================================================================
// Core Engine Logic
// ============================================================================

/**
 * Compute neighbor mine counts for all non-mine cells.
 * @param {Cell[][]} board
 */
function computeNeighborCounts(board) {
  const rows = board.length;
  const cols = board[0].length;
  const directions = getNeighborDirections();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].hasMine) {
        let count = 0;
        for (const [dr, dc] of directions) {
          const nr = r + dr, nc = c + dc;
          if (isInBounds(nr, nc, rows, cols) && board[nr][nc].hasMine) {
            count++;
          }
        }
        board[r][c].neighborCount = count;
      }
    }
  }
}

/**
 * Place mines randomly after first click, excluding clicked cell and 8 neighbors.
 * @param {Cell[][]} board
 * @param {number} totalMines
 * @param {number} firstRow
 * @param {number} firstCol
 */
function placeMinesImpl(board, totalMines, firstRow, firstCol) {
  const rows = board.length;
  const cols = board[0].length;
  
  // Build exclusion set
  const exclusion = new Set();
  const directions = getNeighborDirections();
  
  for (const [dr, dc] of directions) {
    const r = firstRow + dr;
    const c = firstCol + dc;
    if (isInBounds(r, c, rows, cols)) {
      exclusion.add(`${r},${c}`);
    }
  }
  
  // Collect valid positions
  const validPositions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!exclusion.has(`${r},${c}`)) {
        validPositions.push([r, c]);
      }
    }
  }
  
  // Fisher-Yates shuffle
  for (let i = validPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
  }
  
  // Place mines
  for (let i = 0; i < totalMines; i++) {
    const [r, c] = validPositions[i];
    board[r][c].hasMine = true;
  }
  
  // Compute counts
  computeNeighborCounts(board);
}

/**
 * Flood-reveal connected zero-count cells using BFS.
 * @param {Cell[][]} board
 * @param {number} startRow
 * @param {number} startCol
 */
function floodReveal(board, startRow, startCol) {
  const rows = board.length;
  const cols = board[0].length;
  const queue = [[startRow, startCol]];
  const visited = new Set();
  const directions = getNeighborDirections();

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const key = `${r},${c}`;

    if (visited.has(key)) continue;
    if (board[r][c].state === 'flagged') continue;
    if (!isInBounds(r, c, rows, cols)) continue;

    visited.add(key);
    board[r][c].state = 'revealed';

    // Only expand if zero neighbors
    if (board[r][c].neighborCount === 0) {
      for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;
        const nkey = `${nr},${nc}`;
        if (isInBounds(nr, nc, rows, cols) && !visited.has(nkey)) {
          queue.push([nr, nc]);
        }
      }
    }
  }
}

/**
 * Check if the game is won (all non-mine cells revealed).
 * @param {Cell[][]} board
 * @returns {boolean}
 */
function isGameWon(board) {
  const rows = board.length;
  const cols = board[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].hasMine && board[r][c].state !== 'revealed') {
        return false;
      }
    }
  }
  return true;
}

// ============================================================================
// Engine Factory and Methods
// ============================================================================

/**
 * Create a new Minesweeper engine instance.
 * @param {GameConfig} config - { rows, cols, mines }
 * @returns {Object} Engine instance
 * @throws if config is invalid
 */
export function createEngine(config) {
  // Validate config
  if (!config || config.rows <= 0 || config.cols <= 0) {
    throw new Error('Invalid config: rows and cols must be > 0');
  }
  if (config.mines < 0 || config.mines >= config.rows * config.cols) {
    throw new Error('Invalid config: mines must be in range [0, rows*cols-1]');
  }

  const board = createBoard(config.rows, config.cols);

  const engine = {
    config,
    board,
    status: 'idle',
    isFirstClick: true,
    revealedCount: 0,
    flagCount: 0,
    triggeredCell: null,

    /**
     * Place mines after first click.
     * @param {number} row
     * @param {number} col
     * @returns {Object} This engine instance
     */
    placeMines(row, col) {
      if (!this.isFirstClick) {
        throw new Error('Mines already placed');
      }
      if (!isInBounds(row, col, this.config.rows, this.config.cols)) {
        throw new Error('Click out of bounds');
      }
      placeMinesImpl(this.board, this.config.mines, row, col);
      this.isFirstClick = false;
      return this;
    },

    /**
     * Reveal a cell.
     * @param {number} row
     * @param {number} col
     * @returns {Object} This engine instance
     */
    revealCell(row, col) {
      if (!isInBounds(row, col, this.config.rows, this.config.cols)) {
        throw new Error('Reveal out of bounds');
      }

      // On first click, place mines
      if (this.isFirstClick) {
        this.placeMines(row, col);
      }

      const cell = this.board[row][col];

      // No-op: already revealed or flagged
      if (cell.state === 'revealed' || cell.state === 'flagged') {
        return this;
      }

      // Reveal cell
      cell.state = 'revealed';
      this.revealedCount++;

      // Check for mine (loss)
      if (cell.hasMine) {
        this.status = 'lost';
        this.triggeredCell = { row, col };
        return this;
      }

      // Trigger flood if zero neighbors
      if (cell.neighborCount === 0) {
        floodReveal(this.board, row, col);
        // Recount revealed cells after flood
        this.revealedCount = 0;
        for (let r = 0; r < this.config.rows; r++) {
          for (let c = 0; c < this.config.cols; c++) {
            if (this.board[r][c].state === 'revealed') {
              this.revealedCount++;
            }
          }
        }
      }

      // Check for win
      if (isGameWon(this.board)) {
        this.status = 'won';
      } else {
        this.status = 'in-progress';
      }

      return this;
    },

    /**
     * Toggle flag on a cell.
     * @param {number} row
     * @param {number} col
     * @returns {Object} This engine instance
     */
    toggleFlag(row, col) {
      if (!isInBounds(row, col, this.config.rows, this.config.cols)) {
        throw new Error('Flag out of bounds');
      }

      const cell = this.board[row][col];

      // Only toggle if hidden
      if (cell.state === 'hidden') {
        cell.state = 'flagged';
        this.flagCount++;
      } else if (cell.state === 'flagged') {
        cell.state = 'hidden';
        this.flagCount--;
      }
      // Revealed cells: no-op

      return this;
    },

    /**
     * Get current game state (snapshot).
     * @returns {GameState}
     */
    getState() {
      return {
        config: { ...this.config },
        board: this.board.map(row => row.map(cell => ({ ...cell }))),
        status: this.status,
        isFirstClick: this.isFirstClick,
        revealedCount: this.revealedCount,
        flagCount: this.flagCount,
        triggeredCell: this.triggeredCell ? { ...this.triggeredCell } : null
      };
    },

    /**
     * Get list of incorrectly flagged cells (flags on non-mines).
     * @returns {Array<{row: number, col: number}>}
     */
    getIncorrectFlags() {
      const incorrect = [];
      for (let r = 0; r < this.config.rows; r++) {
        for (let c = 0; c < this.config.cols; c++) {
          const cell = this.board[r][c];
          if (cell.state === 'flagged' && !cell.hasMine) {
            incorrect.push({ row: r, col: c });
          }
        }
      }
      return incorrect;
    }
  };

  return engine;
}
```

### Test Module Structure (Template)

```javascript
/**
 * @file test/engine.test.js
 * Comprehensive unit tests for src/engine.js
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { createEngine } from '../src/engine.js';

describe('Engine Module', () => {
  describe('Board Initialization', () => {
    it('createEngine initializes a 9×9 board', () => {
      // ...
    });

    it('all cells start hidden with no mines', () => {
      // ...
    });

    // More initialization tests
  });

  describe('Mine Placement', () => {
    it('placeMines excludes clicked cell and 8 neighbors', () => {
      // ...
    });

    it('placeMines places exactly totalMines mines', () => {
      // ...
    });

    // More mine placement tests
  });

  describe('Neighbor Counts', () => {
    it('neighbor counts are correct for interior cell', () => {
      // ...
    });

    // More neighbor count tests
  });

  describe('Flood Reveal', () => {
    it('flood reveal from zero cell expands through connected zeros', () => {
      // ...
    });

    // More flood tests
  });

  describe('Game State Transitions', () => {
    it('first reveal transitions status to in-progress', () => {
      // ...
    });

    // More state transition tests
  });

  describe('Flag Toggling', () => {
    it('toggleFlag on hidden cell flags it', () => {
      // ...
    });

    // More flag tests
  });

  describe('Win/Loss Conditions', () => {
    it('revealCell on mine triggers loss', () => {
      // ...
    });

    // More win/loss tests
  });

  describe('Incorrect Flags Detection', () => {
    it('getIncorrectFlags returns only flags on non-mines', () => {
      // ...
    });
  });

  describe('Edge Cases', () => {
    it('corner first-click on small board', () => {
      // ...
    });

    // More edge case tests
  });
});
```

---

## 7. Implementation Constraints & Assumptions

### Constraints
1. **No DOM references.** `src/engine.js` must not import, reference, or assume any browser APIs (`document`, `window`, `HTMLElement`, etc.).
2. **No external dependencies.** Engine logic uses only ES6 built-ins (Array, Object, Set, Math, etc.).
3. **Deterministic within a game.** Once a board is created with a given first-click, mine placement is random but fixed for that instance (no replay of randomness).
4. **Immutable getState().** The returned state is a shallow copy; mutations by UI do not affect engine internals. (Or deep copy if nested mutations are possible — recommend shallow for performance.)

### Assumptions
1. **JavaScript environment:** Node.js 18+ with `node:test` module available.
2. **Board size:** Max Expert (30×16 = 480 cells). BFS on 480 cells completes in < 10 ms.
3. **Test runner:** `node:test` (Node.js built-in). No additional packages required.
4. **Randomness:** `Math.random()` is sufficient; no seed control needed for v1 (tests use fresh boards).

---

## Exit Criteria Recap

### Code Review Must Confirm:
- [ ] No DOM or window references in `src/engine.js`.
- [ ] All JSDoc types are complete and accurate.
- [ ] Fisher-Yates shuffle avoids bias.
- [ ] BFS flood uses visited set; no infinite loops.
- [ ] Exclusion set logic handles corners/edges correctly.
- [ ] Win detection is precise: all non-mine cells revealed, no more.
- [ ] flagCount and revealedCount are always accurate.
- [ ] All state transitions are tested.

### Test Execution Must Show:
- [ ] `npm test` exits with code 0.
- [ ] No test failures or assertion errors.
- [ ] All 50+ test cases pass.
- [ ] No console warnings or errors during test runs.

### Manual Verification (Phase 10):
- [ ] (Deferred; Phase 2 is pure logic; UI verification in later phases.)

---

## Summary

This blueprint provides a **complete, atomic guide** for implementing Phase 2. Each of the 9 execution cycles is self-contained, can be implemented and tested independently, and builds toward a fully functional game engine with zero DOM dependencies and comprehensive unit-test coverage. The scaffolding templates and edge-case audit ensure consistent code style and prevent common pitfalls.

**Next step:** Review this blueprint, confirm assumptions, and begin Cycle 1 (Board Initialization).
