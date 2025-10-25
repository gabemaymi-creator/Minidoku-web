// app.js
// Minidoku web prototype — orchestrates UI, gameplay, theming, persistence, and difficulty modifiers.

import { generateSudoku } from './generator.js';
import {
  cloneBoard,
  createEmptyBoard,
  isPlacementValid,
} from './solver.js';
import {
  loadGameState,
  saveGameState,
  clearGameState,
  loadStats,
  saveStats,
  loadOnboardingSeen,
  saveOnboardingSeen,
} from './storage.js';

const SIZE = 9;
const INITIAL_HINTS = 3;
const difficulties = ['easy', 'medium', 'hard', 'expert'];
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

const DOM = {
  board: document.querySelector('[data-board]'),
  boardStage: document.querySelector('[data-board-stage]'),
  overlay: document.querySelector('[data-overlay]'),
  overlayMessage: document.querySelector('[data-overlay-message]'),
  overlayContinue: document.querySelector('[data-overlay-continue]'),
  numberPalette: document.querySelector('[data-number-palette]'),
  notesToggle: document.querySelector('#notesToggle'),
  hintButton: document.querySelector('#hintButton'),
  newGameButton: document.querySelector('#newGameButton'),
  onboardingTip: document.querySelector('[data-onboarding-tip]'),
  difficultySelect: document.querySelector('#difficultySelect'),
  timerValue: document.querySelector('[data-timer]'),
  statsContainer: document.querySelector('[data-stats]'),
  themeButton: document.querySelector('#themeButton'),
  themeMenu: document.querySelector('[data-theme-menu]'),
  timerControl: document.querySelector('#timerControl'),
  messageBar: document.querySelector('[data-message]'),
};

DOM.themeOptions = DOM.themeMenu
  ? Array.from(DOM.themeMenu.querySelectorAll('[data-theme-option]'))
  : [];
DOM.hintButtonCount = DOM.hintButton?.querySelector('[data-hint-count]') ?? null;

const paletteButtons = new Map();

const state = {
  puzzle: createEmptyBoard(),
  solution: createEmptyBoard(),
  userBoard: createEmptyBoard(),
  notes: createEmptyNotes(),
  givens: createBooleanGrid(false),
  selected: null,
  notesMode: false,
  autoCleanNotes: true,
  difficulty: 'easy',
  remainingHints: INITIAL_HINTS,
  sessionHints: 0,
  hintedCells: new Set(),
  theme: 'system',
  stats: loadStats(),
  startTimestamp: null,
  elapsedSeconds: 0,
  timerId: null,
  timerRunning: false,
  gameStatus: 'idle',
  hasRecordedStart: false,
  completed: false,
  cellRefs: [],
  onboardingSeen: loadOnboardingSeen(),
  mistakes: 0,
};

let onboardingTimerId = null;

init();

function init() {
  buildBoardGrid();
  buildNumberPalette();
  bindEvents();
  hydrateFromStorage();
  applyTheme(state.theme);
  if (!state.onboardingSeen) {
    maybeShowOnboardingTip();
  }
  renderStats();
}

function buildBoardGrid() {
  DOM.board.setAttribute('role', 'grid');
  DOM.board.innerHTML = '';
  state.cellRefs = Array.from({ length: SIZE }, () => Array(SIZE));

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('board-cell');
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', `Row ${row + 1} Column ${col + 1}`);

      const value = document.createElement('span');
      value.classList.add('cell-value');

      const notes = document.createElement('div');
      notes.classList.add('cell-notes');
      for (let n = 1; n <= 9; n += 1) {
        const note = document.createElement('span');
        notes.appendChild(note);
      }

      button.append(value, notes);
      button.addEventListener('click', () => handleCellSelection(row, col));
      DOM.board.appendChild(button);
      state.cellRefs[row][col] = button;
    }
  }
}

function buildNumberPalette() {
  DOM.numberPalette.innerHTML = '';
  paletteButtons.clear();
  for (let value = 1; value <= 9; value += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('palette-button');
    button.dataset.value = String(value);
    button.innerHTML = `
      <span class="palette-button__value">${value}</span>
      <span class="palette-button__count" data-count>9</span>
    `;
    button.addEventListener('click', () => handlePalettePress(value));
    DOM.numberPalette.appendChild(button);
    paletteButtons.set(value, button);
  }
}

function handlePalettePress(value) {
  if (state.completed || state.gameStatus !== 'running') return;
  if (!state.selected) {
    showMessage('Select a cell first to place a number.', 'info');
    return;
  }

  if (state.notesMode) {
    toggleNote(state.selected.row, state.selected.col, value);
    persistGameState();
  } else {
    handleNumberInput(value, { origin: 'palette' });
  }
}

function updateNumberPadMetrics() {
  if (!paletteButtons.size) return;
  const counts = Array(10).fill(0);
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const value = state.userBoard[row][col];
      if (value >= 1 && value <= 9) {
        counts[value] += 1;
      }
    }
  }

  paletteButtons.forEach((button, digit) => {
    const value = Number(digit);
    const remaining = Math.max(0, 9 - counts[value]);
    const countEl = button.querySelector('.palette-button__count');
    if (countEl) {
      countEl.textContent = String(remaining);
    }
    button.dataset.complete = remaining === 0 ? 'true' : 'false';
  });
}

function bindEvents() {
  if (DOM.notesToggle) {
    DOM.notesToggle.addEventListener('click', () => {
      state.notesMode = !state.notesMode;
      DOM.notesToggle.setAttribute('aria-pressed', state.notesMode ? 'true' : 'false');
      DOM.notesToggle.classList.toggle('is-active', state.notesMode);
      showMessage(state.notesMode ? 'Notes mode enabled' : 'Notes mode disabled', 'info');
      persistGameState();
    });
  }

  DOM.overlayContinue?.addEventListener('click', () => {
    if (state.gameStatus === 'paused') {
      resumeTimer();
      showMessage('Game resumed.', 'info');
    }
  });

  DOM.hintButton?.addEventListener('click', handleHint);
  DOM.newGameButton?.addEventListener('click', () => startNewGame(state.difficulty, { announce: true }));

  DOM.difficultySelect?.addEventListener('change', (event) => {
    const difficulty = event.target.value;
    state.difficulty = difficulty;
    persistGameState();
    startNewGame(difficulty, { announce: true });
  });

  DOM.themeButton?.addEventListener('click', toggleThemeMenu);

  DOM.themeOptions.forEach((option) => {
    option.addEventListener('click', () => {
      const value = option.dataset.themeOption;
      state.theme = value;
      applyTheme(state.theme);
      closeThemeMenu();
      persistGameState();
    });
  });

  document.addEventListener('click', (event) => {
    if (!DOM.themeMenu || !DOM.themeButton) return;
    if (DOM.themeMenu.hidden) return;
    if (
      event.target === DOM.themeButton
      || DOM.themeButton.contains(event.target)
      || DOM.themeMenu.contains(event.target)
    ) {
      return;
    }
    closeThemeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && DOM.themeMenu && !DOM.themeMenu.hidden) {
      closeThemeMenu();
      DOM.themeButton?.focus();
    }
  });

  if (DOM.timerControl) {
    DOM.timerControl.addEventListener('click', toggleTimerControl);
  }

  document.addEventListener('keydown', handleKeyInput);
  if (prefersDark.addEventListener) {
    prefersDark.addEventListener('change', handleSystemThemeChange);
  } else if (prefersDark.addListener) {
    prefersDark.addListener(handleSystemThemeChange);
  }
}

function toggleThemeMenu() {
  if (!DOM.themeMenu || !DOM.themeButton) return;
  if (!DOM.themeMenu.hidden) {
    closeThemeMenu();
  } else {
    openThemeMenu();
  }
}

function openThemeMenu() {
  if (!DOM.themeMenu || !DOM.themeButton) return;
  DOM.themeMenu.hidden = false;
  window.requestAnimationFrame(() => {
    DOM.themeMenu.classList.add('is-visible');
    DOM.themeButton.setAttribute('aria-expanded', 'true');
  });
  syncThemeMenuSelection();
}

function closeThemeMenu() {
  if (!DOM.themeMenu || DOM.themeMenu.hidden) return;
  DOM.themeMenu.classList.remove('is-visible');
  DOM.themeButton?.setAttribute('aria-expanded', 'false');
  window.setTimeout(() => {
    if (!DOM.themeMenu.classList.contains('is-visible')) {
      DOM.themeMenu.hidden = true;
    }
  }, 160);
}

function hydrateFromStorage() {
  const saved = loadGameState();
  if (!saved) {
    DOM.difficultySelect.value = state.difficulty;
    startNewGame(state.difficulty, { announce: false, initial: true });
    maybeShowOnboardingTip();
    return;
  }

  try {
    state.puzzle = saved.puzzle ? parseBoard(saved.puzzle) : createEmptyBoard();
    state.solution = saved.solution ? parseBoard(saved.solution) : createEmptyBoard();
    state.userBoard = saved.userBoard ? parseBoard(saved.userBoard) : createEmptyBoard();
    state.notes = parseNotes(saved.notes);
    state.givens = buildGivens(state.puzzle);
    state.difficulty = saved.difficulty ?? state.difficulty;
    state.remainingHints = saved.remainingHints ?? INITIAL_HINTS;
    state.sessionHints = saved.sessionHints ?? (INITIAL_HINTS - state.remainingHints);
    state.hintedCells = new Set(saved.hintedCells ?? []);
    state.notesMode = saved.notesMode ?? false;
    state.autoCleanNotes = true;
    state.theme = saved.theme ?? state.theme;
    state.elapsedSeconds = saved.elapsedSeconds ?? 0;
    state.timerRunning = saved.timerRunning ?? false;
    state.gameStatus = saved.gameStatus ?? (state.timerRunning ? 'running' : 'paused');
    if (state.gameStatus === 'idle') {
      state.gameStatus = 'running';
    }
    state.completed = saved.completed ?? false;
    state.selected = saved.selected ?? null;
    state.hasRecordedStart = saved.hasRecordedStart ?? false;
    state.mistakes = saved.mistakes ?? 0;

    if (DOM.notesToggle) {
      DOM.notesToggle.setAttribute('aria-pressed', state.notesMode ? 'true' : 'false');
      DOM.notesToggle.classList.toggle('is-active', state.notesMode);
    }
    if (DOM.difficultySelect) {
      DOM.difficultySelect.value = state.difficulty;
    }

    renderEntireBoard();
    updateNumberPadMetrics();
    updateHintsDisplay();
    updateTimerDisplay(state.elapsedSeconds);
    if (state.selected) {
      const { row, col } = state.selected;
      focusCell(row, col);
    }
    if (!state.completed) {
      if (state.timerRunning) {
        state.timerRunning = false;
        resumeTimer();
      } else if (state.gameStatus === 'running') {
        resumeTimer();
      } else {
        updateTimerControl();
        updateOverlay();
        persistGameState();
      }
    } else {
      updateTimerControl();
      updateOverlay();
    }
  } catch (error) {
    console.warn('Failed to restore saved game, starting new puzzle', error);
    startNewGame(state.difficulty, { announce: false, initial: true });
  }
}

function startNewGame(difficulty = state.difficulty, { announce = false, initial = false } = {}) {
  state.difficulty = difficulty;
  const { puzzle, solution } = generateSudoku(difficulty);
  state.puzzle = puzzle.map((row) => row.slice());
  state.solution = solution.map((row) => row.slice());
  state.userBoard = puzzle.map((row) => row.slice());
  state.notes = createEmptyNotes();
  state.givens = buildGivens(state.puzzle);
  state.selected = null;
  state.notesMode = false;
  state.autoCleanNotes = true;
  state.remainingHints = INITIAL_HINTS;
  state.sessionHints = 0;
  state.hintedCells = new Set();
  state.mistakes = 0;
  state.completed = false;
  state.hasRecordedStart = false;
  state.gameStatus = 'running';
  stopTimer('idle', { resetElapsed: true });
  state.elapsedSeconds = 0;

  if (DOM.notesToggle) {
    DOM.notesToggle.setAttribute('aria-pressed', 'false');
    DOM.notesToggle.classList.remove('is-active');
  }
  if (DOM.difficultySelect) {
    DOM.difficultySelect.value = difficulty;
  }

  updateHintsDisplay();
  updateTimerDisplay(0);
  renderEntireBoard();
  updateNumberPadMetrics();
  updateTimerControl();
  updateOverlay();
  persistGameState();
  resumeTimer({ resetBase: true });
  recordGameStarted(difficulty);

  if (announce) {
    showMessage(`New ${difficulty} puzzle ready.`, 'info');
  } else if (initial) {
    showMessage('Puzzle ready. Tap a cell to begin.', 'info');
  }

  maybeShowOnboardingTip();
}

function renderEntireBoard() {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      renderCell(row, col);
    }
  }
}

function renderCell(row, col) {
  const cell = state.cellRefs[row][col];
  const valueEl = cell.querySelector('.cell-value');
  const notesEl = cell.querySelector('.cell-notes');
  const noteSpans = notesEl.querySelectorAll('span');
  const value = state.userBoard[row][col];
  const notes = state.notes[row][col];
  const isGiven = state.givens[row][col];
  const showIncorrectFeedback = state.difficulty === 'easy' || state.difficulty === 'medium';

  cell.classList.toggle('cell--given', isGiven);
  cell.classList.toggle('cell--hinted', state.hintedCells.has(cellId(row, col)));
  cell.dataset.value = value ? String(value) : '';

  let ariaLabel = `Row ${row + 1} Column ${col + 1}, empty`;
  if (value) {
    valueEl.textContent = value;
    valueEl.hidden = false;
    notesEl.hidden = true;
    noteSpans.forEach((span) => {
      span.textContent = '';
    });
    ariaLabel = `Row ${row + 1} Column ${col + 1}, contains ${value}${isGiven ? ' (given)' : ''}`;
  } else {
    valueEl.textContent = '';
    valueEl.hidden = true;
    notesEl.hidden = false;
    noteSpans.forEach((span, index) => {
      const noteValue = index + 1;
      span.textContent = notes.has(noteValue) ? String(noteValue) : '';
    });
    if (notes.size > 0) {
      ariaLabel = `Row ${row + 1} Column ${col + 1}, notes ${Array.from(notes).sort().join(' ')}`;
    }
  }
  cell.setAttribute('aria-label', ariaLabel);
  const isIncorrect = showIncorrectFeedback && value && !isGiven && state.solution[row][col] !== value;
  cell.classList.toggle('cell--incorrect', Boolean(isIncorrect));
}

function handleCellSelection(row, col) {
  if (state.completed || state.gameStatus !== 'running') return;
  state.selected = { row, col };
  focusCell(row, col);
  persistGameState();
}

function focusCell(row, col) {
  const cell = state.cellRefs[row][col];
  cell.focus();
  updateHighlights();
}

function updateHighlights() {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const cell = state.cellRefs[row][col];
      cell.classList.remove('cell--selected', 'cell--related', 'cell--same');
      cell.removeAttribute('aria-selected');
    }
  }

  if (!state.selected) return;
  const { row, col } = state.selected;
  const selectedValue = state.userBoard[row][col];

  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const cell = state.cellRefs[r][c];
      const sameRow = r === row;
      const sameCol = c === col;
      const sameBox = Math.floor(r / 3) === Math.floor(row / 3)
        && Math.floor(c / 3) === Math.floor(col / 3);

      if (sameRow && sameCol) {
        cell.classList.add('cell--selected');
        cell.setAttribute('aria-selected', 'true');
      } else if (sameRow || sameCol || sameBox) {
        cell.classList.add('cell--related');
      }

      if (selectedValue && state.userBoard[r][c] === selectedValue) {
        cell.classList.add('cell--same');
      }
    }
  }
}

function handleNumberInput(value, { origin = 'keyboard' } = {}) {
  if (state.completed || state.gameStatus !== 'running') return;

  if (!state.selected) {
    showMessage('Select a cell first to place a number.', 'info');
    return;
  }

  const { row, col } = state.selected;

  if (state.notesMode) {
    toggleNote(row, col, value);
    persistGameState();
    return;
  }

  if (state.givens[row][col]) {
    showMessage('Preset numbers cannot be changed.', 'warn');
    return;
  }

  const changed = applyValue(row, col, value);
  if (state.gameStatus === 'failed') {
    return;
  }
}

function toggleNote(row, col, value) {
  const notes = state.notes[row][col];
  if (notes.has(value)) {
    notes.delete(value);
  } else {
    notes.add(value);
  }
  renderCell(row, col);
  updateHighlights();
}

function applyValue(row, col, value, { animate = true } = {}) {
  const solutionValue = state.solution[row][col];
  const previous = state.userBoard[row][col];
  if (previous === value) {
    state.userBoard[row][col] = 0;
    state.notes[row][col].clear();
    renderCell(row, col);
    updateHighlights();
    updateNumberPadMetrics();
    persistGameState();
    return true;
  }

  if (!isUserPlacementValid(cloneBoard(state.userBoard), row, col, value)) {
    recordMistake();
    flashInvalid(state.cellRefs[row][col]);
    showMessage('That number conflicts with existing numbers.', 'warn');
    return false;
  }

  state.userBoard[row][col] = value;
  state.notes[row][col].clear();
  renderCell(row, col);

  if (value !== solutionValue && !state.givens[row][col]) {
    recordMistake();
    if (state.gameStatus === 'failed') {
      updateHighlights();
      return true;
    }
  }

  if (animate) animateCellValue(row, col);
  updateHighlights();
  if (state.autoCleanNotes) {
    cleanNotes(row, col, value);
  }
  updateNumberPadMetrics();
  evaluateCompletion();
  persistGameState();
  return true;
}

function handleDelete() {
  if (!state.selected || state.completed || state.gameStatus !== 'running') return;
  const { row, col } = state.selected;
  if (state.givens[row][col]) return;
  state.userBoard[row][col] = 0;
  state.notes[row][col].clear();
  renderCell(row, col);
  updateHighlights();
  updateNumberPadMetrics();
  persistGameState();
}

async function handleHint() {
  if (!state.selected || state.completed || state.gameStatus !== 'running') return;
  if (state.remainingHints <= 0) {
    showMessage('No hints remaining.', 'warn');
    return;
  }
  const { row, col } = state.selected;
  if (state.givens[row][col]) {
    showMessage('Select an empty cell for a hint.', 'warn');
    return;
  }

  await simulateAdWatch();
  const correctValue = state.solution[row][col];
  state.userBoard[row][col] = correctValue;
  state.notes[row][col].clear();
  state.hintedCells.add(cellId(row, col));
  state.remainingHints -= 1;
  state.sessionHints += 1;
  recordHintUsage();
  renderCell(row, col);
  animateCellValue(row, col);
  updateHighlights();
  updateHintsDisplay();
  updateNumberPadMetrics();
  persistGameState();
  evaluateCompletion();
}

function handleKeyInput(event) {
  if (state.completed || state.gameStatus !== 'running') return;
  const key = event.key;
  const selected = state.selected;

  if (key === 'Escape') {
    state.selected = null;
    updateHighlights();
    persistGameState();
    return;
  }

  if (key >= '1' && key <= '9') {
    handleNumberInput(Number(key), { origin: 'keyboard' });
    event.preventDefault();
    return;
  }

  if (!selected) return;

  const navigation = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };

  if (navigation[key]) {
    const [dRow, dCol] = navigation[key];
    moveSelection(dRow, dCol);
    event.preventDefault();
    return;
  }

  if (key === 'Backspace' || key === 'Delete' || key === '0') {
    handleDelete();
    event.preventDefault();
    return;
  }

  if (key === 'n' || key === 'N') {
    state.notesMode = !state.notesMode;
    if (DOM.notesToggle) {
      DOM.notesToggle.setAttribute('aria-pressed', state.notesMode ? 'true' : 'false');
      DOM.notesToggle.classList.toggle('is-active', state.notesMode);
    }
    showMessage(state.notesMode ? 'Notes mode enabled' : 'Notes mode disabled', 'info');
    persistGameState();
    event.preventDefault();
  }
}

function moveSelection(deltaRow, deltaCol) {
  if (!state.selected || state.gameStatus !== 'running') return;
  let { row, col } = state.selected;
  row = clamp(row + deltaRow, 0, SIZE - 1);
  col = clamp(col + deltaCol, 0, SIZE - 1);
  state.selected = { row, col };
  focusCell(row, col);
  persistGameState();
}

function isUserPlacementValid(board, row, col, value) {
  board[row][col] = 0;
  return isPlacementValid(board, row, col, value);
}

function cleanNotes(row, col, value) {
  for (let i = 0; i < SIZE; i += 1) {
    state.notes[row][i].delete(value);
    state.notes[i][col].delete(value);
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      state.notes[boxRow + r][boxCol + c].delete(value);
    }
  }

  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      renderCell(r, c);
    }
  }
}

function animateCellValue(row, col) {
  const cell = state.cellRefs[row][col];
  if (!cell) return;
  const valueEl = cell.querySelector('.cell-value');
  if (!valueEl) return;
  valueEl.classList.remove('animate-in');
  void valueEl.offsetWidth;
  valueEl.classList.add('animate-in');
}

function evaluateCompletion() {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (state.userBoard[row][col] !== state.solution[row][col]) return;
    }
  }
  handlePuzzleSolved();
}

function handlePuzzleSolved() {
  if (state.completed) return;
  state.completed = true;
  stopTimer('completed');
  clearGameState();
  const elapsed = getElapsedSeconds();
  recordGameFinished(elapsed);
  renderStats();
  showMessage(`Solved in ${formatTime(elapsed)}. Nice work!`, 'success');
  updateOverlay();
  updateTimerControl();
}

function recordMistake() {
  if (state.completed && state.gameStatus === 'failed') return;
  if (state.difficulty === 'medium') {
    state.mistakes += 1;
    if (state.mistakes >= 3) {
      showMessage('Three mistakes made — puzzle failed.', 'warn');
      handlePuzzleFailed();
    } else {
      showMessage(`Mistake ${state.mistakes}/3. Three strikes ends the game.`, 'warn');
    }
    persistGameState();
  } else if (state.difficulty === 'easy') {
    showMessage('Careful! That placement is incorrect.', 'warn');
  }
}

function handlePuzzleFailed() {
  stopTimer('failed');
  state.completed = true;
  clearGameState();
  updateOverlay();
  updateTimerControl();
  showMessage('Puzzle failed. Start a new puzzle to try again.', 'warn');
}

function resumeTimer({ resetBase = false } = {}) {
  if (state.completed || state.timerRunning) return;
  if (resetBase) {
    state.elapsedSeconds = 0;
  }
  state.gameStatus = 'running';
  state.completed = false;
  state.timerRunning = true;
  state.startTimestamp = Date.now();
  updateTimerDisplay(getElapsedSeconds());
  if (state.timerId) {
    window.clearInterval(state.timerId);
  }
  state.timerId = window.setInterval(() => {
    updateTimerDisplay(getElapsedSeconds());
  }, 1000);
  updateOverlay();
  updateTimerControl();
  persistGameState();
}

function pauseTimer() {
  if (!state.timerRunning && state.gameStatus !== 'running') return;
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
  state.elapsedSeconds = getElapsedSeconds();
  state.startTimestamp = null;
  state.timerRunning = false;
  state.gameStatus = 'paused';
  updateTimerDisplay(state.elapsedSeconds);
  updateOverlay();
  updateTimerControl();
  persistGameState();
}

function stopTimer(nextStatus = state.gameStatus, { resetElapsed = false } = {}) {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
  const elapsed = getElapsedSeconds();
  state.elapsedSeconds = resetElapsed ? 0 : elapsed;
  state.startTimestamp = null;
  state.timerRunning = false;
  if (nextStatus) {
    state.gameStatus = nextStatus;
    state.completed = nextStatus === 'completed' || nextStatus === 'failed';
  }
  updateTimerDisplay(state.elapsedSeconds);
  updateOverlay();
  updateTimerControl();
}

function getElapsedSeconds() {
  const base = state.elapsedSeconds ?? 0;
  if (!state.startTimestamp) return base;
  const delta = Math.floor((Date.now() - state.startTimestamp) / 1000);
  return base + delta;
}

function updateTimerDisplay(seconds) {
  DOM.timerValue.textContent = formatTime(seconds);
}

function updateHintsDisplay() {
  if (DOM.hintButtonCount) {
    DOM.hintButtonCount.textContent = String(state.remainingHints);
  }
  if (DOM.hintButton) {
    const label =
      state.remainingHints === 1
        ? 'Use Hint (1 remaining)'
        : `Use Hint (${state.remainingHints} remaining)`;
    DOM.hintButton.setAttribute('aria-label', label);
    DOM.hintButton.title = label;
  }
}

function updateOverlay() {
  if (!DOM.overlay || !DOM.boardStage) return;
  const status = state.gameStatus;
  const classes = DOM.overlay.classList;
  classes.remove('is-visible');
  if (DOM.overlayContinue) {
    DOM.overlayContinue.hidden = true;
  }
  let focusOverlayAction = false;

  if (status === 'running' || status === 'idle') {
    DOM.overlay.hidden = true;
    DOM.boardStage.classList.remove('board-stage--hidden', 'board-stage--covered');
    return;
  }

  let message = '';
  if (status === 'paused') {
    message = 'Game paused.';
    if (DOM.overlayContinue) {
      DOM.overlayContinue.hidden = false;
      focusOverlayAction = true;
    }
  } else if (status === 'completed') {
    message = 'Puzzle solved! Start a new puzzle to keep going.';
  } else if (status === 'failed') {
    message = 'Puzzle failed. Start a new puzzle to try again.';
  }

  if (DOM.overlayMessage) {
    DOM.overlayMessage.textContent = message;
  }
  DOM.overlay.hidden = false;
  void DOM.overlay.offsetWidth;
  classes.add('is-visible');
  const coverBoard = status === 'paused' || status === 'failed';
  DOM.boardStage.classList.toggle('board-stage--hidden', status === 'paused');
  DOM.boardStage.classList.toggle('board-stage--covered', coverBoard);
  if (focusOverlayAction && DOM.overlayContinue) {
    window.requestAnimationFrame(() => DOM.overlayContinue?.focus());
  }
}

function updateTimerControl() {
  if (!DOM.timerControl) return;
  const status = state.gameStatus;
  DOM.timerControl.disabled = false;

  switch (status) {
    case 'running':
      DOM.timerControl.textContent = 'Pause';
      break;
    case 'paused':
      DOM.timerControl.textContent = 'Continue';
      break;
    case 'idle':
      DOM.timerControl.textContent = 'Start';
      break;
    case 'completed':
      DOM.timerControl.textContent = 'Solved';
      DOM.timerControl.disabled = true;
      break;
    case 'failed':
      DOM.timerControl.textContent = 'Failed';
      DOM.timerControl.disabled = true;
      break;
    default:
      DOM.timerControl.textContent = 'Start';
      DOM.timerControl.disabled = false;
  }
}

function recordGameStarted(difficulty) {
  if (state.hasRecordedStart) return;
  const stats = state.stats.difficulty[difficulty];
  stats.gamesStarted += 1;
  state.hasRecordedStart = true;
  saveStats(state.stats);
  renderStats();
}

function recordHintUsage() {
  const stats = state.stats.difficulty[state.difficulty];
  stats.hintsUsed += 1;
  saveStats(state.stats);
  renderStats();
}

function recordGameFinished(elapsedSeconds) {
  const stats = state.stats.difficulty[state.difficulty];
  stats.gamesFinished += 1;
  stats.totalSeconds += elapsedSeconds;
  if (!stats.bestSeconds || elapsedSeconds < stats.bestSeconds) {
    stats.bestSeconds = elapsedSeconds;
  }
  saveStats(state.stats);
  renderStats();
}

function renderStats() {
  const fragment = document.createDocumentFragment();
  difficulties.forEach((difficulty) => {
    const record = state.stats.difficulty[difficulty];
    const averageSeconds = record.gamesFinished
      ? Math.round(record.totalSeconds / record.gamesFinished)
      : null;

    const container = document.createElement('div');
    container.classList.add('stats-card');
    container.innerHTML = `
      <h3 class="stats-title">${capitalize(difficulty)}</h3>
      <dl>
        <div><dt>Started</dt><dd>${record.gamesStarted}</dd></div>
        <div><dt>Finished</dt><dd>${record.gamesFinished}</dd></div>
        <div><dt>Best</dt><dd>${record.bestSeconds ? formatTime(record.bestSeconds) : '—'}</dd></div>
        <div><dt>Average</dt><dd>${averageSeconds ? formatTime(averageSeconds) : '—'}</dd></div>
        <div><dt>Hints used</dt><dd>${record.hintsUsed}</dd></div>
      </dl>
    `;
    fragment.appendChild(container);
  });
  DOM.statsContainer.innerHTML = '';
  DOM.statsContainer.appendChild(fragment);
}

function applyTheme(theme) {
  const root = document.documentElement;
  const applied = theme === 'system' ? (prefersDark.matches ? 'dark' : 'light') : theme;
  root.dataset.theme = applied;
  syncThemeMenuSelection();
}

function syncThemeMenuSelection() {
  if (DOM.themeOptions) {
    DOM.themeOptions.forEach((option) => {
      const isCurrent = option.dataset.themeOption === state.theme;
      option.setAttribute('aria-checked', isCurrent ? 'true' : 'false');
    });
  }
  if (DOM.themeButton) {
    DOM.themeButton.setAttribute('aria-label', `Change theme (current: ${formatThemeLabel(state.theme)})`);
    DOM.themeButton.dataset.theme = state.theme;
  }
}

function handleSystemThemeChange() {
  if (state.theme === 'system') {
    applyTheme('system');
  }
}

function persistGameState() {
  if (state.completed && (state.gameStatus === 'completed' || state.gameStatus === 'failed')) {
    clearGameState();
    return;
  }

  const payload = {
    puzzle: state.puzzle,
    solution: state.solution,
    userBoard: state.userBoard,
    notes: serialiseNotes(state.notes),
    difficulty: state.difficulty,
    remainingHints: state.remainingHints,
    sessionHints: state.sessionHints,
    hintedCells: Array.from(state.hintedCells),
    notesMode: state.notesMode,
    autoCleanNotes: state.autoCleanNotes,
    theme: state.theme,
    elapsedSeconds: getElapsedSeconds(),
    timerRunning: state.timerRunning,
    gameStatus: state.gameStatus,
    selected: state.selected,
    completed: state.completed,
    hasRecordedStart: state.hasRecordedStart,
    mistakes: state.mistakes,
  };
  saveGameState(payload);
}

function flashInvalid(cell) {
  cell.classList.add('cell--invalid');
  window.setTimeout(() => cell.classList.remove('cell--invalid'), 300);
}

function showMessage(message, variant = 'info') {
  if (!DOM.messageBar) return;
  DOM.messageBar.textContent = message;
  DOM.messageBar.dataset.variant = variant;
  DOM.messageBar.classList.add('visible');
  window.clearTimeout(DOM.messageBar.hideTimer);
  DOM.messageBar.hideTimer = window.setTimeout(() => {
    DOM.messageBar.classList.remove('visible');
  }, 4000);
}

function maybeShowOnboardingTip() {
  if (!DOM.onboardingTip || state.onboardingSeen) return;
  DOM.onboardingTip.hidden = false;
  window.clearTimeout(onboardingTimerId);
  onboardingTimerId = window.setTimeout(() => {
    if (DOM.onboardingTip) {
      DOM.onboardingTip.hidden = true;
    }
  }, 4200);
  state.onboardingSeen = true;
  saveOnboardingSeen();
}

async function simulateAdWatch() {
  showMessage('Playing ad… (stub)', 'info');
  await new Promise((resolve) => window.setTimeout(resolve, 1200));
  showMessage('Hint unlocked!', 'success');
}

function toggleTimerControl() {
  if (state.gameStatus === 'running') {
    pauseTimer();
    showMessage('Game paused.', 'info');
  } else if (state.gameStatus === 'paused') {
    resumeTimer();
    showMessage('Game resumed.', 'info');
  } else if (state.gameStatus === 'failed') {
    showMessage('Puzzle failed. Start a new puzzle to try again.', 'warn');
  } else if (state.gameStatus === 'completed') {
    showMessage('Puzzle finished. Start a new game to keep playing.', 'info');
  } else {
    startNewGame(state.difficulty, { announce: true });
  }
}

function parseBoard(board) {
  return board.map((row) => row.slice());
}

function parseNotes(notes) {
  if (!notes) return createEmptyNotes();
  return notes.map((row) => row.map((values) => new Set(values)));
}

function serialiseNotes(notes) {
  return notes.map((row) => row.map((set) => Array.from(set.values())));
}

function createEmptyNotes() {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => new Set()));
}

function formatThemeLabel(theme) {
  if (theme === 'system') {
    return `System (${prefersDark.matches ? 'dark' : 'light'})`;
  }
  if (theme === 'high-contrast') return 'High contrast';
  return theme
    .split('-')
    .map((part) => capitalize(part))
    .join(' ');
}

function buildGivens(puzzle) {
  return puzzle.map((row) => row.map((value) => value !== 0));
}

function createBooleanGrid(initial = false) {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => initial));
}

function cellId(row, col) {
  return `${row}-${col}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
