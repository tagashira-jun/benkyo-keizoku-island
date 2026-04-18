/**
 * 学習ロードマップのパーサー / プロンプトビルダー。
 *
 * Gemini出力は以下の「固定フォーマット」で書いてもらう前提でパースする。
 * 許容する軽い揺れ：
 *  - 章行: "# 1章 タイトル" / "## 章1: タイトル" / "## Chapter 1 - タイトル"
 *  - タスク行: "- [25m] ..." / "* [25m] ..." / "- [ ] ..." / "- [x] ..."
 *  - 分数指定は半角数字＋"m"（"min" 等も許容）。25以下ならポモドーロ、超えたらチェックボックス扱い。
 *  - 分数指定なしの [ ] / [x] / 空チェックボックスはチェックボックスタスクになる（60分扱い）。
 */

import {
  RoadmapChapter,
  RoadmapTask,
} from "./types";

/** Geminiに渡す固定フォーマットのプロンプトを生成 */
export function buildGeminiPrompt(params: {
  certificationName: string;
  goalText: string;
  estimatedDays?: number;
}): string {
  const { certificationName, goalText, estimatedDays } = params;
  const periodLine = estimatedDays && estimatedDays > 0
    ? `想定学習期間: 約${estimatedDays}日`
    : "想定学習期間: 記載なし（標準的な期間で提案してください）";

  return `あなたは学習設計の専門家です。以下の条件で「章立てされた学習ロードマップ」を作ってください。

# 入力
- 対象資格 / 目標: ${certificationName}
- この人の目的・動機: ${goalText || "（未記入）"}
- ${periodLine}

# 出力ルール（厳守・このMarkdown形式で出力）
- トップに「# ロードマップ」と書く
- 章は "## 章X: 章タイトル" の形式で4〜8章に分割する
- 各章の最初に1行で章のねらいを書く（"> 〜" の引用ブロック）
- タスクは箇条書き。以下の2種類のみを使う：
  - ポモドーロ向きの小タスク: "- [25m] タスク名"（5〜25分で終わる粒度）
  - 長めの課題・まとまった取り組み: "- [ ] タスク名（目安60m）"
- 1章につきタスクは5〜12個
- 学習順に並べる。依存がある場合は章をまたいで整合させる
- 日本語で記述する
- 出力の最後にMarkdown以外の説明文を付けない

# 例
## 章1: 基礎の地固め
> 試験範囲の土台となる概念を押さえる
- [25m] 教科書 第1章 をざっと通読
- [25m] 用語カードを10個作る
- [ ] 章末問題を全て解く（目安60m）

では出力してください。`;
}

/** Gemini URL（プロンプトを貼るだけにしておく用のトップURL） */
export const GEMINI_URL = "https://gemini.google.com/app";

// ---------------- パーサー ----------------

/** 章見出し判定: "## 章1: xxx" / "## Chapter 1 - xxx" / "# 1章 xxx" など */
function matchChapterHeading(line: string): string | null {
  const trimmed = line.trim();
  // "## 章1: タイトル" / "## 第1章 タイトル"
  const m1 = trimmed.match(/^#{1,3}\s*(?:章|第)?\s*\d+\s*(?:章)?\s*[:：\-ー 　]\s*(.+)$/);
  if (m1) return m1[1].trim();
  // "## Chapter 1: タイトル"
  const m2 = trimmed.match(/^#{1,3}\s*Chapter\s*\d+\s*[:：\-ー]\s*(.+)$/i);
  if (m2) return m2[1].trim();
  // "## タイトル" （# ロードマップ を除外）
  const m3 = trimmed.match(/^#{2,3}\s+(?!ロードマップ$)(.+)$/);
  if (m3) return m3[1].trim();
  return null;
}

/** 章ねらい（引用）判定 */
function matchChapterSummary(line: string): string | null {
  const m = line.trim().match(/^>\s*(.+)$/);
  return m ? m[1].trim() : null;
}

/** タスク行判定 */
interface ParsedTaskLine {
  minutes: number;
  type: "pomodoro" | "checkbox";
  title: string;
}

function matchTaskLine(line: string): ParsedTaskLine | null {
  const trimmed = line.trim();
  // "- [25m] タスク名" / "- [25 m] タスク名" / "- [25min] タスク名"
  const m1 = trimmed.match(/^[-*]\s*\[\s*(\d+)\s*m(?:in)?\s*\]\s*(.+)$/i);
  if (m1) {
    const minutes = Math.max(1, parseInt(m1[1], 10));
    return {
      minutes,
      type: minutes <= 25 ? "pomodoro" : "checkbox",
      title: m1[2].trim(),
    };
  }
  // "- [ ] タスク名（目安60m）" など、チェックボックス＋末尾に目安
  const m2 = trimmed.match(/^[-*]\s*\[\s*[xX ]?\s*\]\s*(.+)$/);
  if (m2) {
    const rest = m2[1];
    // 目安分数を抽出
    const mMin = rest.match(/[（(]\s*(?:目安|約)?\s*(\d+)\s*(?:m|min|分)\s*[)）]/i);
    const minutes = mMin ? Math.max(1, parseInt(mMin[1], 10)) : 60;
    // 末尾の (目安..) を除去
    const title = rest.replace(/\s*[（(][^）)]*[）)]\s*$/, "").trim();
    return {
      minutes,
      type: minutes <= 25 ? "pomodoro" : "checkbox",
      title: title || rest.trim(),
    };
  }
  // "- タスク名 (25m)" / "- タスク名（25分）"
  const m3 = trimmed.match(/^[-*]\s*(.+?)\s*[（(]\s*(\d+)\s*(?:m|min|分)\s*[)）]\s*$/i);
  if (m3) {
    const minutes = Math.max(1, parseInt(m3[2], 10));
    return {
      minutes,
      type: minutes <= 25 ? "pomodoro" : "checkbox",
      title: m3[1].trim(),
    };
  }
  // 単なる "- タスク名"
  const m4 = trimmed.match(/^[-*]\s+(.+)$/);
  if (m4) {
    return { minutes: 25, type: "pomodoro", title: m4[1].trim() };
  }
  return null;
}

/** ランダムID（依存を増やさないためcrypto.randomUUID fallback付き） */
function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      /* fallthrough */
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Gemini出力を章・タスクにパース */
export function parseRoadmapMarkdown(raw: string): RoadmapChapter[] {
  const lines = raw.split(/\r?\n/);
  const chapters: RoadmapChapter[] = [];
  let current: RoadmapChapter | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    const chapterTitle = matchChapterHeading(line);
    if (chapterTitle) {
      current = {
        id: randomId(),
        title: chapterTitle,
        tasks: [],
      };
      chapters.push(current);
      continue;
    }

    // 章サマリ（引用）
    const summary = matchChapterSummary(line);
    if (summary && current && !current.summary) {
      current.summary = summary;
      continue;
    }

    // タスク
    const task = matchTaskLine(line);
    if (task && current) {
      const t: RoadmapTask = {
        id: randomId(),
        title: task.title,
        estimatedMinutes: task.minutes,
        type: task.type,
        isCompleted: false,
      };
      current.tasks.push(t);
    }
  }

  // 章がひとつも取れなかった場合、「その他」章を1つ作ってタスクだけ拾う
  if (chapters.length === 0) {
    const fallback: RoadmapChapter = {
      id: randomId(),
      title: "学習ロードマップ",
      tasks: [],
    };
    for (const line of lines) {
      const t = matchTaskLine(line);
      if (t) {
        fallback.tasks.push({
          id: randomId(),
          title: t.title,
          estimatedMinutes: t.minutes,
          type: t.type,
          isCompleted: false,
        });
      }
    }
    if (fallback.tasks.length > 0) chapters.push(fallback);
  }

  // タスクが0の章は除外
  return chapters.filter((c) => c.tasks.length > 0);
}

/** 章・タスクから総数を算出 */
export function countTasks(chapters: RoadmapChapter[]): {
  total: number;
  completed: number;
} {
  let total = 0;
  let completed = 0;
  for (const c of chapters) {
    for (const t of c.tasks) {
      total++;
      if (t.isCompleted) completed++;
    }
  }
  return { total, completed };
}

/** 章単位の完了判定 */
export function isChapterComplete(chapter: RoadmapChapter): boolean {
  return chapter.tasks.length > 0 && chapter.tasks.every((t) => t.isCompleted);
}
