import {
  Log,
  PlayerState,
  Achievement,
  EnergyLevel,
  STAGES,
  Category,
} from "./types";
import { getTodayString } from "./storage";

// --- Level calculation ---

export function calculateLevel(totalXP: number): number {
  // Every 60 XP (1 hour) = roughly 0.2 levels. Lv10 at ~40000 XP.
  // Using sqrt-based scaling for satisfying early progression
  if (totalXP <= 0) return 1;
  return Math.min(10, Math.floor(1 + Math.sqrt(totalXP / 100)));
}

// --- Stage calculation ---

export function calculateStage(totalXP: number): number {
  let stage = 1;
  for (const s of STAGES) {
    if (totalXP >= s.requiredXP) stage = s.stage;
  }
  return stage;
}

export function getStageInfo(totalXP: number) {
  const stage = calculateStage(totalXP);
  const current = STAGES[stage - 1];
  const next = STAGES[stage] || null;
  const progress = next
    ? (totalXP - current.requiredXP) / (next.requiredXP - current.requiredXP)
    : 1;
  return { stage, name: current.name, progress: Math.min(1, progress), next };
}

// --- Streak calculation ---

export function calculateStreak(logs: Log[], today: string): number {
  const uniqueDates = [...new Set(logs.map((l) => l.date))].sort().reverse();
  if (uniqueDates.length === 0) return 0;

  // Check if today or yesterday is the latest
  const yesterday = getDateOffset(today, -1);
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

  let streak = 0;
  let checkDate = uniqueDates[0] === today ? today : yesterday;

  for (let i = 0; i < 365; i++) {
    if (uniqueDates.includes(checkDate)) {
      streak++;
      checkDate = getDateOffset(checkDate, -1);
    } else {
      break;
    }
  }
  return streak;
}

function getDateOffset(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// --- Energy level ---

export function calculateEnergyLevel(
  lastActiveDate: string,
  level: number
): EnergyLevel {
  if (!lastActiveDate) return 1;

  const today = new Date(getTodayString() + "T00:00:00");
  const last = new Date(lastActiveDate + "T00:00:00");
  const daysSince = Math.floor(
    (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Adaptive severity based on player level
  if (level <= 3) {
    // Beginners: gentle
    if (daysSince <= 0) return 5;
    if (daysSince <= 3) return 4;
    if (daysSince <= 5) return 3;
    if (daysSince <= 8) return 2;
    return 1;
  } else if (level <= 6) {
    // Intermediate: standard
    if (daysSince <= 0) return 5;
    if (daysSince <= 1) return 4;
    if (daysSince <= 3) return 3;
    if (daysSince <= 6) return 2;
    return 1;
  } else {
    // Advanced: strict
    if (daysSince <= 0) return 5;
    if (daysSince <= 1) return 4;
    if (daysSince <= 2) return 3;
    if (daysSince <= 4) return 2;
    return 1;
  }
}

// --- Population ---

export function calculatePopulation(
  level: number,
  energyLevel: EnergyLevel,
  currentPop: number
): number {
  const maxPop = getMaxPopulation(level);
  // Population grows toward max based on energy
  if (energyLevel >= 4) {
    return Math.min(maxPop, Math.max(currentPop, getBasePop(level)));
  } else if (energyLevel === 3) {
    return currentPop; // stable
  } else if (energyLevel === 2) {
    return Math.max(1, currentPop - (level >= 4 ? 1 : 0));
  } else {
    return Math.max(1, currentPop - (level >= 7 ? 2 : level >= 4 ? 1 : 0));
  }
}

function getMaxPopulation(level: number): number {
  if (level <= 1) return 1;
  if (level <= 3) return 3;
  if (level <= 5) return 5;
  if (level <= 8) return 8;
  return 12;
}

function getBasePop(level: number): number {
  if (level <= 1) return 1;
  if (level <= 3) return 2;
  if (level <= 5) return 4;
  if (level <= 8) return 6;
  return 10;
}

// --- Building level ---

export function getBuildingLevel(categoryXP: number): number {
  if (categoryXP >= 5000) return 4; // Luxurious
  if (categoryXP >= 2000) return 3; // Large
  if (categoryXP >= 500) return 2; // Medium
  if (categoryXP >= 60) return 1; // Small
  return 0; // None
}

export function getCategoryXP(logs: Log[], categoryId: string): number {
  return logs
    .filter((l) => l.categoryId === categoryId)
    .reduce((sum, l) => sum + l.minutes, 0);
}

// --- Achievements ---

export function getAllAchievements(): Achievement[] {
  return [
    // Streak-based
    {
      id: "first-step",
      name: "はじめの一歩",
      description: "初めての記録",
      condition: (logs) => logs.length >= 1,
      decoration: "旗",
      icon: "🚩",
    },
    {
      id: "3-days",
      name: "3日坊主突破",
      description: "3日連続達成",
      condition: (_, state) => state.maxStreak >= 3,
      decoration: "花壇",
      icon: "🌸",
    },
    {
      id: "7-days",
      name: "一週間の壁",
      description: "7日連続達成",
      condition: (_, state) => state.maxStreak >= 7,
      decoration: "噴水",
      icon: "⛲",
    },
    {
      id: "14-days",
      name: "習慣の芽生え",
      description: "14日連続達成",
      condition: (_, state) => state.maxStreak >= 14,
      decoration: "虹",
      icon: "🌈",
    },
    {
      id: "30-days",
      name: "継続は力なり",
      description: "30日連続達成",
      condition: (_, state) => state.maxStreak >= 30,
      decoration: "黄金の像",
      icon: "🏆",
    },
    // Count-based
    {
      id: "10-records",
      name: "十の修練",
      description: "累計10回記録",
      condition: (logs) => logs.length >= 10,
      decoration: "灯台",
      icon: "🗼",
    },
    {
      id: "50-records",
      name: "五十の研鑽",
      description: "累計50回記録",
      condition: (logs) => logs.length >= 50,
      decoration: "風車",
      icon: "🎡",
    },
    {
      id: "100-records",
      name: "百戦錬磨",
      description: "累計100回記録",
      condition: (logs) => logs.length >= 100,
      decoration: "時計塔",
      icon: "🕰️",
    },
    // Time-based
    {
      id: "10-hours",
      name: "10時間の道",
      description: "累計10時間",
      condition: (_, state) => state.totalXP >= 600,
      decoration: "橋",
      icon: "🌉",
    },
    {
      id: "50-hours",
      name: "50時間の修行",
      description: "累計50時間",
      condition: (_, state) => state.totalXP >= 3000,
      decoration: "船着場",
      icon: "⚓",
    },
    // Variety
    {
      id: "all-categories",
      name: "万能学徒",
      description: "全カテゴリで記録",
      condition: (logs, _, categories?) => {
        if (!categories || categories.length === 0) return false;
        const usedCats = new Set(logs.map((l) => l.categoryId));
        return categories.every((c: Category) => usedCats.has(c.id));
      },
      decoration: "道標",
      icon: "🪧",
    },
  ];
}

export function checkNewAchievements(
  logs: Log[],
  state: PlayerState,
  categories: Category[]
): string[] {
  const achievements = getAllAchievements();
  const newlyUnlocked: string[] = [];

  for (const a of achievements) {
    if (!state.achievements.includes(a.id)) {
      if (a.condition(logs, state, categories)) {
        newlyUnlocked.push(a.id);
      }
    }
  }

  return newlyUnlocked;
}

// --- Report generation ---

export function generateReport(
  logs: Log[],
  categories: Category[],
  startDate: string,
  endDate: string
): string {
  const filtered = logs.filter((l) => l.date >= startDate && l.date <= endDate);

  const totalMinutes = filtered.reduce((sum, l) => sum + l.minutes, 0);
  const totalRecords = filtered.length;

  const uniqueDays = new Set(filtered.map((l) => l.date)).size;
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const totalDays =
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const studyRate = totalDays > 0 ? ((uniqueDays / totalDays) * 100).toFixed(1) : "0.0";

  // Calculate max streak within range
  const datesInRange = [...new Set(filtered.map((l) => l.date))].sort();
  let maxStreak = 0;
  let streak = 0;
  for (let i = 0; i < datesInRange.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(datesInRange[i - 1] + "T00:00:00");
      const curr = new Date(datesInRange[i] + "T00:00:00");
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      streak = diff === 1 ? streak + 1 : 1;
    }
    maxStreak = Math.max(maxStreak, streak);
  }

  const formatTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}時間${m}分` : `${h}時間`;
  };

  // Group by category
  const catMap = new Map<string, { minutes: number; count: number; contents: Map<string, number> }>();
  for (const log of filtered) {
    if (!catMap.has(log.categoryId)) {
      catMap.set(log.categoryId, { minutes: 0, count: 0, contents: new Map() });
    }
    const entry = catMap.get(log.categoryId)!;
    entry.minutes += log.minutes;
    entry.count++;
    const contentKey = log.content || "その他";
    entry.contents.set(contentKey, (entry.contents.get(contentKey) || 0) + log.minutes);
  }

  const fmtStart = startDate.replace(/-/g, "/");
  const fmtEnd = endDate.replace(/-/g, "/");

  let report = `===== 自己啓発活動レポート =====\n`;
  report += `期間：${fmtStart} 〜 ${fmtEnd}\n\n`;
  report += `【概要】\n`;
  report += `- 総学習時間：${formatTime(totalMinutes)}\n`;
  report += `- 総記録回数：${totalRecords}回\n`;
  report += `- 学習日数：${uniqueDays}日 / ${totalDays}日間（学習率 ${studyRate}%）\n`;
  report += `- 最長連続記録：${maxStreak}日\n\n`;
  report += `【カテゴリ別実績】\n`;

  for (const [catId, data] of catMap) {
    const cat = categories.find((c) => c.id === catId);
    const label = cat ? cat.label : catId;
    report += `\n■ ${label}（${formatTime(data.minutes)} / ${data.count}回）\n`;

    const sorted = [...data.contents.entries()].sort((a, b) => b[1] - a[1]);
    for (const [content, min] of sorted) {
      report += `  - ${content}（${formatTime(min)}）\n`;
    }
  }

  report += `\n===================================\n`;
  return report;
}
