
import { createEngine } from '../src/engine.js';

import test from 'node:test';
import assert from 'node:assert/strict';

test('createEngine initializes an empty 9×9 board', () => {
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

test('createEngine rejects invalid config (rows <= 0)', () => {
  assert.throws(() => createEngine({ rows: 0, cols: 9, mines: 10 }));
});

test('createEngine rejects invalid config (mines > cells - 1)', () => {
  assert.throws(() => createEngine({ rows: 3, cols: 3, mines: 9 }));
});
