// solver.js
// Generated from solver.ts for browser runtime compatibility.

const SIZE = 9;
const BOX_SIZE = 3;

const digits = () => [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function solveBoard(board) {
  const working = cloneBoard(board);
  const solved = solveRecursive(working);
  return solved ? working : null;
}

export function hasUniqueSolution(board) {
  const copy = cloneBoard(board);
  return countSolutions(copy, 0, 2) === 1;
}

export function countSolutions(board, startIndex = 0, limit = Infinity) {
  let solutions = 0;

  const search = (index = 0) => {
    if (solutions >= limit) return;

    const empty = findNextEmpty(board, index);
    if (!empty) {
      solutions += 1;
      return;
    }

    const [row, col, idx] = empty;
    for (const num of shuffledDigits()) {
      if (isSafe(board, row, col, num)) {
        board[row][col] = num;
        search(idx + 1);
        board[row][col] = 0;
        if (solutions >= limit) return;
      }
    }
  };

  search(startIndex);
  return solutions;
}

function solveRecursive(board, index = 0) {
  const empty = findNextEmpty(board, index);
  if (!empty) return true;

  const [row, col, idx] = empty;
  for (const num of shuffledDigits()) {
    if (isSafe(board, row, col, num)) {
      board[row][col] = num;
      if (solveRecursive(board, idx + 1)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

function findNextEmpty(board, start = 0) {
  for (let idx = start; idx < SIZE * SIZE; idx += 1) {
    const row = Math.floor(idx / SIZE);
    const col = idx % SIZE;
    if (board[row][col] === 0) return [row, col, idx];
  }
  return null;
}

function isSafe(board, row, col, num) {
  for (let i = 0; i < SIZE; i += 1) {
    if (board[row][i] === num || board[i][col] === num) return false;
  }

  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

  for (let r = 0; r < BOX_SIZE; r += 1) {
    for (let c = 0; c < BOX_SIZE; c += 1) {
      if (board[boxRow + r][boxCol + c] === num) return false;
    }
  }
  return true;
}

function shuffledDigits() {
  const arr = digits().slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function createEmptyBoard() {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => 0),
  );
}

export function isPlacementValid(board, row, col, value) {
  if (value < 1 || value > 9) return false;
  return isSafe(board, row, col, value);
}
