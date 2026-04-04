import { Log, Category, PlayerState, DEFAULT_CATEGORIES } from "./types";

const KEYS = {
  logs: "ki-logs",
  categories: "ki-categories",
  playerState: "ki-player-state",
} as const;

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Logs ---

export function loadLogs(): Log[] {
  return getItem<Log[]>(KEYS.logs, []);
}

export function saveLogs(logs: Log[]): void {
  setItem(KEYS.logs, logs);
}

export function addLog(log: Log): Log[] {
  const logs = loadLogs();
  logs.push(log);
  saveLogs(logs);
  return logs;
}

// --- Categories ---

export function loadCategories(): Category[] {
  return getItem<Category[]>(KEYS.categories, DEFAULT_CATEGORIES);
}

export function saveCategories(categories: Category[]): void {
  setItem(KEYS.categories, categories);
}

export function addContentToHistory(
  categoryId: string,
  content: string
): Category[] {
  const categories = loadCategories();
  const cat = categories.find((c) => c.id === categoryId);
  if (cat && content && !cat.contentHistory.includes(content)) {
    cat.contentHistory.push(content);
  }
  saveCategories(categories);
  return categories;
}

// --- Player State ---

const DEFAULT_PLAYER_STATE: PlayerState = {
  totalXP: 0,
  level: 1,
  currentStreak: 0,
  maxStreak: 0,
  lastActiveDate: "",
  achievements: [],
  population: 1,
};

export function loadPlayerState(): PlayerState {
  return getItem<PlayerState>(KEYS.playerState, DEFAULT_PLAYER_STATE);
}

export function savePlayerState(state: PlayerState): void {
  setItem(KEYS.playerState, state);
}

// --- Utility ---

export function getLogsForDate(date: string): Log[] {
  return loadLogs().filter((l) => l.date === date);
}

export function getLogsInRange(start: string, end: string): Log[] {
  return loadLogs().filter((l) => l.date >= start && l.date <= end);
}

export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
