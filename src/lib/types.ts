export interface Log {
  id: string;
  categoryId: string;
  content: string;
  minutes: number;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO8601
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  buildingType: string;
  contentHistory: string[];
}

export interface PlayerState {
  totalXP: number;
  level: number;
  currentStreak: number;
  maxStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  achievements: string[];
  population: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (logs: Log[], state: PlayerState, categories?: Category[]) => boolean;
  decoration: string;
  icon: string;
}

export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export interface StageInfo {
  stage: number;
  name: string;
  requiredXP: number;
}

export const STAGES: StageInfo[] = [
  { stage: 1, name: "岩だけの小島", requiredXP: 0 },
  { stage: 2, name: "草が生え始める", requiredXP: 300 },
  { stage: 3, name: "木と小屋", requiredXP: 800 },
  { stage: 4, name: "集落", requiredXP: 1800 },
  { stage: 5, name: "村", requiredXP: 3500 },
  { stage: 6, name: "町", requiredXP: 6000 },
  { stage: 7, name: "城下町", requiredXP: 10000 },
  { stage: 8, name: "城", requiredXP: 16000 },
  { stage: 9, name: "王都", requiredXP: 25000 },
  { stage: 10, name: "天空都市", requiredXP: 40000 },
];

export const BUILDING_TYPES = [
  "server-tower",
  "library",
  "magic-tower",
  "workshop",
  "observatory",
  "shrine",
  "market",
  "arena",
] as const;

export type BuildingType = (typeof BUILDING_TYPES)[number];

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "programming",
    label: "プログラミング",
    icon: "💻",
    buildingType: "server-tower",
    contentHistory: [],
  },
  {
    id: "video-learning",
    label: "動画学習",
    icon: "📺",
    buildingType: "library",
    contentHistory: [],
  },
  {
    id: "certification",
    label: "資格勉強",
    icon: "📝",
    buildingType: "magic-tower",
    contentHistory: [],
  },
];

export type TabId = "record" | "achievements" | "report" | "settings";
