import { useSyncExternalStore } from 'react';

export type ProgressState = {
  learned: Record<string, number>;
  stars: Record<string, number>;
  gamesPlayed: number;
};

const STORAGE_KEY = 'wordy-world-progress-v1';

const emptyState: ProgressState = { learned: {}, stars: {}, gamesPlayed: 0 };

function load(): ProgressState {
  if (typeof window === 'undefined') return emptyState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      learned: typeof parsed.learned === 'object' && parsed.learned ? parsed.learned : {},
      stars: typeof parsed.stars === 'object' && parsed.stars ? parsed.stars : {},
      gamesPlayed: typeof parsed.gamesPlayed === 'number' ? parsed.gamesPlayed : 0,
    };
  } catch {
    return emptyState;
  }
}

let state: ProgressState = load();
const listeners = new Set<() => void>();

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Storage can be full or blocked; the app still works without it. */
  }
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ProgressState {
  return state;
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function markLearned(wordId: string): void {
  if (state.learned[wordId]) return;
  state = { ...state, learned: { ...state.learned, [wordId]: Date.now() } };
  persist();
  emit();
}

export function isLearned(wordId: string): boolean {
  return Boolean(state.learned[wordId]);
}

/** Keeps the best star score a child has earned in each game. */
export function recordGame(gameId: string, stars: number): void {
  const best = Math.max(state.stars[gameId] ?? 0, Math.min(3, Math.max(1, stars)));
  state = {
    ...state,
    stars: { ...state.stars, [gameId]: best },
    gamesPlayed: state.gamesPlayed + 1,
  };
  persist();
  emit();
}

export function resetProgress(): void {
  state = { learned: {}, stars: {}, gamesPlayed: 0 };
  persist();
  emit();
}

export function learnedIn(ids: readonly string[]): number {
  return ids.reduce((total, id) => (state.learned[id] ? total + 1 : total), 0);
}

export function totalStars(): number {
  return Object.values(state.stars).reduce((sum, value) => sum + value, 0);
}
