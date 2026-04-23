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


/**
 * Create a new game engine instance.
 * @param {GameConfig} config
 * @returns {GameEngine}
 */
export function createEngine(config) {
  // Validate config
  if (!config || typeof config.rows !== 'number' || typeof config.cols !== 'number' || typeof config.mines !== 'number') {
    throw new Error('Invalid config: missing or non-numeric rows/cols/mines');
  }
  const { rows, cols, mines } = config;
  if (rows <= 0 || cols <= 0) throw new Error('rows and cols must be > 0');
  if (mines < 0) throw new Error('mines must be >= 0');
  if (mines > rows * cols - 1) throw new Error('mines must be <= cells - 1');

  // Cell factory
  function makeCell(row, col) {
    return {
      row,
      col,
      hasMine: false,
      neighborCount: 0,
      state: 'hidden',
    };
  }

  // Board initialization
  const board = [];
  for (let r = 0; r < rows; r++) {
    const rowArr = [];
    for (let c = 0; c < cols; c++) {
      rowArr.push(makeCell(r, c));
    }
    board.push(rowArr);
  }

  // Engine state
  let status = 'idle';
  let isFirstClick = true;
  let revealedCount = 0;
  let flagCount = 0;
  let triggeredCell = null;

  // getState returns a deep copy of board and metadata
  function getState() {
    // Deep copy board
    const boardCopy = board.map(row => row.map(cell => ({ ...cell })));
    return {
      config: { rows, cols, mines },
      board: boardCopy,
      status,
      isFirstClick,
      revealedCount,
      flagCount,
      triggeredCell,
    };
  }

  // Engine API
  return {
    getState,
    // Placeholders for later methods
    // placeMines, revealCell, toggleFlag, getIncorrectFlags, etc.
    get isFirstClick() { return isFirstClick; },
    get status() { return status; },
  };
}
