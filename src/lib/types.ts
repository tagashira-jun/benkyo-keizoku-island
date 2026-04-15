// ============================================
// キノコ栽培ゲーミフィケーション 型定義
// ============================================

import { Timestamp } from "firebase/firestore";

// --- ユーザー ---
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  totalStudyMinutes: number;
  /**
   * 菌糸休眠チケット（ストリーク・フリーズ）の残枚数。
   * 1枚で過去の学習を1日分「菌糸が休眠していた」ことにでき、連続記録を途切れさせない。
   * ストリーク実績解除時に配布される。
   */
  freezeTokens?: number;
  /**
   * これまでに獲得した菌糸休眠チケット累計（実績配布重複を避けるため）
   */
  freezeTokensGranted?: number;
  /** ユーザー設定（オプトアウト等） */
  preferences?: UserPreferences;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * ゲーミフィケーション機能のオプトアウト設定。
 * 競争・比較・焦燥感を避けたいユーザー向けの「静かな栽培モード」。
 */
export interface UserPreferences {
  /** 静かな栽培モード: ストリーク・連続記録表示を抑制（自分のペースで栽培したい人向け） */
  quietMode?: boolean;
  /** 停止ポイント通知: 長時間学習時に休息を促す（デフォルトON） */
  stoppingPointEnabled?: boolean;
}

// ============================================
// 知識ドメイン（遺伝子モデル）
// ============================================

/** 10個の知識ドメインID */
export const DOMAIN_IDS = [
  "CS",   // コンピュータ科学基礎
  "NW",   // ネットワーク
  "DB",   // データベース
  "SEC",  // セキュリティ
  "OS",   // Linux/OS
  "CLD",  // クラウド
  "PG",   // プログラミング
  "AI",   // AI/データ分析
  "ARC",  // システム設計
  "DEV",  // 開発プロセス
] as const;

export type DomainId = typeof DOMAIN_IDS[number];

/** ドメイン値の配列（10要素、各0〜3+ボーナス） */
export type DomainValues = [number, number, number, number, number, number, number, number, number, number];

export interface DomainInfo {
  id: DomainId;
  name: string;
  shortName: string;
  description: string;
}

// ============================================
// キノコ種
// ============================================

export type MushroomSpeciesId =
  | "mushroom"       // マッシュルーム
  | "enoki"          // エノキタケ
  | "shiitake"       // シイタケ
  | "bunashimeji"    // ブナシメジ
  | "eringi"         // エリンギ
  | "nameko"         // ナメコ
  | "hiratake"       // ヒラタケ
  | "king_mushroom"  // 大型マッシュルーム
  | "yamabushi"      // ヤマブシタケ
  | "tamogitake"     // タモギタケ
  | "maitake";       // マイタケ

export interface MushroomSpecies {
  id: MushroomSpeciesId;
  nameJa: string;
  nameEn: string;
  description: string;
  /** 基本色相（HSL の H値） */
  baseHue: number;
  /** 形態特徴の基本パラメータ */
  baseMorphology: BaseMorphology;
}

export interface BaseMorphology {
  capDiameter: number;    // 傘径（相対値 0〜1）
  capRoundness: number;   // 傘の丸み（0:平ら 〜 1:球状）
  stipeLength: number;    // 柄の長さ（相対値 0〜1）
  stipeWidth: number;     // 柄の太さ（相対値 0〜1）
  gillDensity: number;    // ひだの密度（0〜1）
  clusterCount: number;   // 群生数（1=単生、2+=群生）
}

// ============================================
// 資格マスター
// ============================================

export interface CertificationMaster {
  id: string;
  name: string;
  category: string;       // "IPA" | "AWS" | "Linux" | "Programming" 等
  mushroomSpeciesId: MushroomSpeciesId;
  difficulty: 1 | 2 | 3 | 4 | 5;
  domains: DomainValues;  // 各ドメインの強度（0〜3）
  estimatedDays: number;  // 目安学習日数
  description: string;
  /** 初心者向けアドバイス（先に取っておくべき資格など） */
  tips: string;
  /** 前提となる推奨資格ID（系統の親） */
  prerequisiteId: string | null;
  /** 系統グループ（同じ値のものが同じ系統樹に属する） */
  lineageGroup: string;
  /** 成長フェーズ移行に必要な閾値 */
  phaseThresholds: PhaseThresholds;
}

export interface PhaseThresholds {
  /** Phase1→2: 菌糸伸長に必要なインプットポイント */
  germinationInput: number;
  /** Phase2→3: 菌糸蔓延に必要なインプットポイント */
  colonizationInput: number;
  /** Phase3→4: 原基形成に必要なアウトプットポイント */
  primordiaOutput: number;
  /** Phase4→5: 子実体成長に必要な模擬試験 or 一定のアウトプット */
  fruitingTrigger: number;
  /** Phase5→6: 成熟に必要な総ポイント */
  maturationTotal: number;
  /** Phase6→7: 覚醒（化け物化開始）に必要な総ポイント */
  awakeningTotal: number;
  /** Phase7→8: 変容に必要な総ポイント */
  transformationTotal: number;
  /** Phase8→9: 化け物（最終形態）に必要な総ポイント */
  legendaryTotal: number;
}

// ============================================
// 栽培状態
// ============================================

/** 成長フェーズ（Phase 7-9 は化け物フェーズ） */
export type GrowthPhase =
  | 1  // 胞子発芽（Spore Germination）
  | 2  // 菌糸伸長（Mycelial Growth）
  | 3  // 菌糸蔓延（Full Colonization）
  | 4  // 原基形成（Primordia Formation）
  | 5  // 子実体成長（Fruiting Body Development）
  | 6  // 成熟・収穫（Maturation & Harvest）
  | 7  // 覚醒（Awakening）— 目が光る
  | 8  // 変容（Transformation）— 傘巨大化・角
  | 9; // 化け物（Legendary Monster）— 最終形態

export const PHASE_NAMES: Record<GrowthPhase, { ja: string; en: string }> = {
  1: { ja: "胞子発芽", en: "Spore Germination" },
  2: { ja: "菌糸伸長", en: "Mycelial Growth" },
  3: { ja: "菌糸蔓延", en: "Full Colonization" },
  4: { ja: "原基形成", en: "Primordia Formation" },
  5: { ja: "子実体成長", en: "Fruiting Body" },
  6: { ja: "成熟", en: "Maturation" },
  7: { ja: "覚醒", en: "Awakening" },
  8: { ja: "変容", en: "Transformation" },
  9: { ja: "化け物", en: "Legendary" },
};

/** 環境パラメータ（学習記録から算出） */
export interface EnvironmentParams {
  carbonSource: number;     // 炭素源（参考書由来）
  nitrogenSource: number;   // 窒素源（動画由来）
  minerals: number;         // ミネラル（ドキュメント由来）
  moisture: number;         // 水分（ハンズオン由来）
  temperature: number;      // 温度（問題集由来）
  humidity: number;         // 湿度（問題集正答率由来）
  co2: number;              // CO2（ブログ由来）
  light: number;            // 光（投稿由来）
}

/** キノコの形態パラメータ（環境から算出） */
export interface Morphology {
  capDiameter: number;      // 傘径
  capRoundness: number;     // 傘の丸み
  stipeLength: number;      // 柄の長さ
  stipeWidth: number;       // 柄の太さ
  gillDensity: number;      // ひだの密度
  colorHue: number;         // 色相
  colorSaturation: number;  // 彩度
  colorBrightness: number;  // 明度
  irregularity: number;     // 歪み度（0:完璧 〜 1:ぐちゃぐちゃ）
  moistureLevel: number;    // 湿り具合（0:乾燥 〜 1:ぬめぬめ）
  clusterCount: number;     // 群生数
}

/** 栽培中のキノコ */
export interface Cultivation {
  id: string;
  userId: string;
  certificationId: string;
  mushroomSpeciesId: MushroomSpeciesId;
  phase: GrowthPhase;
  startDate: string;        // YYYY-MM-DD

  // ポイント累計（体調・充実感補正後）
  totalInputPoints: number;
  totalOutputPoints: number;

  // 実際の学習分数累計（補正なし・表示用）
  totalInputMinutes: number;
  totalOutputMinutes: number;

  // 環境パラメータ（学習記録から毎回再計算）
  environmentParams: EnvironmentParams;

  // 配合情報
  matingPartnerId: string | null;     // 配合相手の HarvestedMushroom ID
  matingPartnerName: string | null;   // 配合相手の資格名（表示用）
  matingBonus: DomainValues;          // 配合ボーナス値
  sharedDomainCount: number;          // 共有ドメイン数

  // 現在のドメイン値（= 資格固有値 + ボーナス）
  currentDomainValues: DomainValues;

  // 形態パラメータ
  morphology: Morphology;

  // 日次記録のサマリ
  streakDays: number;       // 連続記録日数
  totalDays: number;        // 開始からの経過日数
  lastRecordDate: string | null;   // 最終記録日

  // 体調・充実感系
  avgCondition?: number;      // 直近記録の平均体調（1〜5）
  avgFulfillment?: number;    // 直近記録の平均充実感（1〜5）
  conditionWarning?: boolean; // 無理しすぎ警告（体調2以下が3日以上続いた）

  /**
   * 菌糸休眠チケット（フリーズ）で連続記録を維持した日付のリスト。
   * ストリーク計算時は「記録があった日」と同等に扱われる。
   */
  frozenDates?: string[];

  /**
   * 目標宣言（Epic Meaning）：なぜこの資格・プロジェクトに挑むのか。
   * 栽培開始時にユーザーが自ら宣言する、自律性を高めるための文脈情報。
   * 空文字列なら宣言をスキップしたことを意味する。
   */
  goalStatement?: string;

  isCompleted: boolean;
  completedDate: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// 収穫済みキノコ（一核体菌糸として保存）
// ============================================

export interface HarvestedMushroom {
  id: string;
  userId: string;
  certificationId: string;
  certificationName: string;
  mushroomSpeciesId: MushroomSpeciesId;

  // 最終状態
  finalDomainValues: DomainValues;
  finalMorphology: Morphology;

  // 統計
  harvestedDate: string;
  cultivationDays: number;
  totalInputPoints: number;
  totalOutputPoints: number;
  ioBalance: number;        // I/Oバランス比率（0〜1、0.5が完璧）

  // 配合履歴
  matingPartnerId: string | null;
  matingPartnerName: string | null;

  // 部屋での展示状態
  isDisplayed: boolean;

  createdAt: Timestamp;
}

// ============================================
// 学習記録
// ============================================

/**
 * 学習記録
 * - type: "input"（インプット）or "output"（アウトプット）
 * - subType: ユーザーが自由入力した種別名（過去入力はセレクトボックスで選択可能）
 * - minutes: 学習時間（15分単位）
 */
export interface StudyLog {
  id: string;
  userId: string;
  cultivationId: string;
  type: "input" | "output";
  subType: string;            // 自由入力（例: "参考書読み", "Udemy", "問題集", "模擬試験" 等）
  minutes: number;            // 学習時間（15分単位）
  memo: string;
  date: string;               // YYYY-MM-DD
  /** 体調スコア（1:つらい 2:だるい 3:ふつう 4:好調 5:絶好調）。省略時=3 */
  condition?: number;
  /** 学習後の充実感・達成感（1:いまいち 2:まあまあ 3:ふつう 4:やりきった 5:最高）。省略時=3 */
  fulfillment?: number;
  /** ポモドーロタイマーで計測した記録（ポイント×1.3ボーナス） */
  isPomodoro?: boolean;
  createdAt: Timestamp;
}

/** 体調の選択肢（学習前・学習中の体調） */
export const CONDITION_OPTIONS: { value: number; emoji: string; label: string; color: string }[] = [
  { value: 1, emoji: "😣", label: "つらい",   color: "#ef4444" },
  { value: 2, emoji: "😐", label: "だるい",   color: "#f59e0b" },
  { value: 3, emoji: "🙂", label: "ふつう",   color: "#9ca3af" },
  { value: 4, emoji: "😊", label: "好調",     color: "#10b981" },
  { value: 5, emoji: "✨", label: "絶好調",   color: "#3b82f6" },
];

/** 充実感・達成感の選択肢（学習後の手応え） */
export const FULFILLMENT_OPTIONS: { value: number; emoji: string; label: string; color: string }[] = [
  { value: 1, emoji: "😩", label: "いまいち",     color: "#9ca3af" },
  { value: 2, emoji: "😕", label: "まあまあ",     color: "#a78bfa" },
  { value: 3, emoji: "🙂", label: "ふつう",       color: "#60a5fa" },
  { value: 4, emoji: "😄", label: "やりきった",   color: "#34d399" },
  { value: 5, emoji: "🔥", label: "最高！",       color: "#f97316" },
];

/** 時間の選択肢（15分刻み） */
export const MINUTES_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240, 300, 360, 420, 480] as const;

/** インプットの種別サジェスト（初期候補、ユーザーが追加可能） */
export const INPUT_SUGGESTIONS: string[] = [
  "参考書",
  "動画講義",
  "公式ドキュメント",
  "ハンズオン",
  "写経",
  "Udemy",
  "技術書",
];

/** アウトプットの種別サジェスト（初期候補、ユーザーが追加可能） */
export const OUTPUT_SUGGESTIONS: string[] = [
  "問題集",
  "模擬試験",
  "技術ブログ",
  "Qiita/Zenn投稿",
  "LT登壇",
  "人に説明",
  "コーディング",
];

// ============================================
// 部屋・実績
// ============================================

export interface Room {
  userId: string;
  displayedMushroomIds: string[];   // 展示中のキノコID
  unlockedItemIds: string[];        // 解除済み小道具ID
  wallpaperId: string;              // 壁紙ID
  roomLevel: number;                // 部屋サイズ段階（1〜5）
  updatedAt: Timestamp;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: "cultivation" | "study" | "social";
  condition: string;       // 条件の説明
  rewardItemId: string;    // 報酬アイテムID
  rewardItemName: string;  // 報酬アイテム名
  icon: string;
}

export interface UserAchievement {
  id: string;               // `${userId}_${achievementId}`
  userId: string;
  achievementId: string;
  unlockedAt: Timestamp;
}

// ============================================
// 配合（菌糸接合）
// ============================================

/** 配合適合性の結果 */
export interface MatingCompatibility {
  partnerId: string;
  partnerName: string;
  partnerSpecies: MushroomSpeciesId;
  sharedDomainCount: number;
  sharedDomains: DomainId[];
  compatibilityLevel: "strong" | "moderate" | "weak" | "incompatible";
  /** 各ドメインへの予測ボーナス */
  predictedBonus: DomainValues;
  /** 成長加速率（%） */
  growthAcceleration: number;
}

// ============================================
// 個人開発プロジェクト用
// ============================================

export interface PersonalProject {
  id: string;
  userId: string;
  name: string;
  description: string;
  techStack: string[];
  milestones: ProjectMilestone[];
  targetDays: number;
  createdAt: Timestamp;
}

export interface ProjectMilestone {
  id: string;
  name: string;
  isCompleted: boolean;
  completedDate: string | null;
}
