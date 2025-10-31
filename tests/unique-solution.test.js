import { describe, it, expect } from 'vitest';
import { generateSudoku } from '../generator.js';
import { hasUniqueSolution, solveBoard } from '../solver.js';

const difficulties = ['easy', 'medium', 'hard', 'expert'];

describe('Sudoku generator', () => {
  difficulties.forEach((difficulty) => {
    it(`produces a single-solution puzzle for ${difficulty}`, () => {
      const { puzzle } = generateSudoku(difficulty);
      expect(hasUniqueSolution(puzzle)).toBe(true);
    });
  });

  it('produces puzzles the solver can solve', () => {
    const { puzzle } = generateSudoku('medium');
    const solved = solveBoard(puzzle);
    expect(solved).not.toBeNull();
  });
});
