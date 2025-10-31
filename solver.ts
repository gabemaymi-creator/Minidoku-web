// solver.ts
// Backtracking solver used for generating puzzles and validating user input.

const SIZE = 9;
const BOX_SIZE = 3;

type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type CellValue = Digit | 0;
type EmptyCell = [row: number, col: number, index: number];
export type Board = CellValue[][];

const digits = (): Digit[] => [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function solveBoard(board: Board): Board | null {
  const working = cloneBoard(board);
  const solved = solveRecursive(working);
  return solved ? working : null;
}

export function hasUniqueSolution(board: Board): boolean {
  const copy = cloneBoard(board);
  return countSolutions(copy, 0, 2) === 1;
}

export function countSolutions(
  board: Board,
  startIndex: number = 0,
  limit: number = Infinity,
): number {
  let solutions = 0;

  const search = (index: number = 0) => {
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

function solveRecursive(board: Board, index: number = 0): boolean {
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

function findNextEmpty(board: Board, start: number = 0): EmptyCell | null {
  for (let idx = start; idx < SIZE * SIZE; idx += 1) {
    const row = Math.floor(idx / SIZE);
    const col = idx % SIZE;
    if (board[row][col] === 0) return [row, col, idx];
  }
  return null;
}

function isSafe(board: Board, row: number, col: number, num: Digit): boolean {
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

function shuffledDigits(): Digit[] {
  const arr = digits().slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice() as CellValue[]);
}

export function createEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => 0 as CellValue),
  );
}

export function isPlacementValid(
  board: Board,
  row: number,
  col: number,
  value: Digit,
): boolean {
  if (value < 1 || value > 9) return false;
  return isSafe(board, row, col, value);
}
