// generator.js
// Generates Sudoku puzzles with a unique solution using backtracking search.

import {
  createEmptyBoard,
  cloneBoard,
  countSolutions,
} from './solver.js';

const SIZE = 9;
const DIFFICULTY_CLUES = {
  easy: 40,
  medium: 34,
  hard: 30,
  expert: 26,
};

export function generateSudoku(difficulty = 'medium') {
  const targetClues = DIFFICULTY_CLUES[difficulty] ?? DIFFICULTY_CLUES.medium;
  const solved = buildCompleteBoard();
  const puzzle = carvePuzzle(solved, targetClues);
  return { puzzle, solution: solved };
}

function buildCompleteBoard() {
  const board = createEmptyBoard();
  fillBoard(board);
  return board;
}

function fillBoard(board, cellIndex = 0) {
  if (cellIndex >= SIZE * SIZE) return true;
  const row = Math.floor(cellIndex / SIZE);
  const col = cellIndex % SIZE;

  if (board[row][col] !== 0) {
    return fillBoard(board, cellIndex + 1);
  }

  const numbers = shuffleDigits();
  for (const num of numbers) {
    if (isSafe(board, row, col, num)) {
      board[row][col] = num;
      if (fillBoard(board, cellIndex + 1)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

function carvePuzzle(solutionBoard, targetClues) {
  const puzzle = cloneBoard(solutionBoard);
  const positions = Array.from({ length: SIZE * SIZE }, (_, idx) => idx);
  shuffleArray(positions);

  const maxRemovals = SIZE * SIZE - targetClues;
  let removed = 0;

  for (const position of positions) {
    if (removed >= maxRemovals) break;
    const row = Math.floor(position / SIZE);
    const col = position % SIZE;
    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    const testBoard = cloneBoard(puzzle);
    const solutions = countSolutions(testBoard, 0, 2);
    if (solutions !== 1) {
      puzzle[row][col] = backup;
    } else {
      removed += 1;
    }
  }

  return puzzle;
}

function isSafe(board, row, col, num) {
  for (let i = 0; i < SIZE; i += 1) {
    if (board[row][i] === num || board[i][col] === num) return false;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      if (board[boxRow + r][boxCol + c] === num) return false;
    }
  }

  return true;
}

function shuffleDigits() {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  shuffleArray(digits);
  return digits;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

