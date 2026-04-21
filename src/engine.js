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

export function createEngine(config) {
  void config;
  return {
    status: 'idle'
  };
}
