// storage.js
// Local persistence helpers for game state and statistics.

const GAME_KEY = 'minidoku::currentGame';
const STATS_KEY = 'minidoku::stats';
const ONBOARDING_KEY = 'minidoku::onboardingSeen';
const LEGACY_KEYS = {
  game: 'pocketsudoku::currentGame',
  stats: 'pocketsudoku::stats',
  onboarding: 'pocketsudoku::onboardingSeen',
};

const defaultStats = {
  difficulty: {
    easy: buildStatsRecord(),
    medium: buildStatsRecord(),
    hard: buildStatsRecord(),
    expert: buildStatsRecord(),
  },
};

export function saveGameState(state) {
  try {
    const payload = JSON.stringify(state);
    window.localStorage.setItem(GAME_KEY, payload);
    window.localStorage.removeItem(LEGACY_KEYS.game);
  } catch (error) {
    console.warn('Failed to save game state', error);
  }
}

export function loadGameState() {
  try {
    const raw = readWithFallback(GAME_KEY, LEGACY_KEYS.game);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to load game state', error);
    return null;
  }
}

export function clearGameState() {
  try {
    window.localStorage.removeItem(GAME_KEY);
    window.localStorage.removeItem(LEGACY_KEYS.game);
  } catch (error) {
    console.warn('Failed to clear game state', error);
  }
}

export function saveStats(stats) {
  try {
    const payload = JSON.stringify(stats);
    window.localStorage.setItem(STATS_KEY, payload);
    window.localStorage.removeItem(LEGACY_KEYS.stats);
  } catch (error) {
    console.warn('Failed to save stats', error);
  }
}

export function loadStats() {
  try {
    const raw = readWithFallback(STATS_KEY, LEGACY_KEYS.stats);
    if (!raw) return clone(defaultStats);
    const stats = JSON.parse(raw);
    return mergeStats(defaultStats, stats);
  } catch (error) {
    console.warn('Failed to load stats', error);
    return clone(defaultStats);
  }
}

export function loadOnboardingSeen() {
  try {
    const value = readWithFallback(ONBOARDING_KEY, LEGACY_KEYS.onboarding);
    return value === 'true';
  } catch (error) {
    console.warn('Failed to load onboarding status', error);
    return false;
  }
}

export function saveOnboardingSeen() {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, 'true');
    window.localStorage.removeItem(LEGACY_KEYS.onboarding);
  } catch (error) {
    console.warn('Failed to persist onboarding status', error);
  }
}

function buildStatsRecord() {
  return {
    gamesStarted: 0,
    gamesFinished: 0,
    totalSeconds: 0,
    bestSeconds: null,
    hintsUsed: 0,
  };
}

function mergeStats(base, incoming) {
  const merged = clone(base);
  for (const [mode, record] of Object.entries(merged.difficulty)) {
    if (incoming.difficulty?.[mode]) {
      const next = incoming.difficulty[mode];
      record.gamesStarted = next.gamesStarted ?? record.gamesStarted;
      record.gamesFinished = next.gamesFinished ?? record.gamesFinished;
      record.totalSeconds = next.totalSeconds ?? record.totalSeconds;
      record.bestSeconds = next.bestSeconds ?? record.bestSeconds;
      record.hintsUsed = next.hintsUsed ?? record.hintsUsed;
    }
  }
  return merged;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readWithFallback(primaryKey, legacyKey) {
  const storage = window.localStorage;
  const current = storage.getItem(primaryKey);
  if (current !== null) {
    return current;
  }
  if (!legacyKey) {
    return null;
  }
  const legacy = storage.getItem(legacyKey);
  if (legacy === null) {
    return null;
  }
  try {
    storage.setItem(primaryKey, legacy);
    storage.removeItem(legacyKey);
  } catch (error) {
    console.warn('Failed to migrate legacy storage key', error);
  }
  return legacy;
}
