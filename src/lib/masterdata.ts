// ============================================
// マスターデータ（資格・ドメイン・キノコ種）
// ============================================

import {
  DomainInfo,
  DomainId,
  DomainValues,
  MushroomSpecies,
  CertificationMaster,
  Achievement,
} from "./types";

// ============================================
// 知識ドメイン定義
// ============================================

export const DOMAINS: Record<DomainId, DomainInfo> = {
  CS:  { id: "CS",  name: "コンピュータ科学基礎", shortName: "CS基礎",   description: "アルゴリズム、データ構造、計算理論" },
  NW:  { id: "NW",  name: "ネットワーク",         shortName: "NW",       description: "TCP/IP、ルーティング、プロトコル" },
  DB:  { id: "DB",  name: "データベース",         shortName: "DB",       description: "SQL、正規化、トランザクション" },
  SEC: { id: "SEC", name: "セキュリティ",         shortName: "SEC",      description: "暗号、認証、脅威対策" },
  OS:  { id: "OS",  name: "Linux/OS",            shortName: "OS",       description: "カーネル、シェル、プロセス管理" },
  CLD: { id: "CLD", name: "クラウド",             shortName: "CLD",      description: "仮想化、IaaS/PaaS、スケーリング" },
  PG:  { id: "PG",  name: "プログラミング",        shortName: "PG",       description: "OOP、関数型、設計パターン" },
  AI:  { id: "AI",  name: "AI/データ分析",        shortName: "AI",       description: "機械学習、統計、データ処理" },
  ARC: { id: "ARC", name: "システム設計",          shortName: "設計",     description: "アーキテクチャ、可用性、設計判断" },
  DEV: { id: "DEV", name: "開発プロセス",          shortName: "開発",     description: "Git、CI/CD、テスト、アジャイル" },
};

export const DOMAIN_LIST: DomainInfo[] = Object.values(DOMAINS);

// ============================================
// キノコ種定義
// ============================================

export const MUSHROOM_SPECIES: Record<string, MushroomSpecies> = {
  mushroom: {
    id: "mushroom",
    nameJa: "マッシュルーム",
    nameEn: "Agaricus bisporus",
    description: "万能で基本的なキノコ。どんな環境にも適応し、安定した形態を示す。",
    baseHue: 30,
    baseMorphology: { capDiameter: 0.6, capRoundness: 0.8, stipeLength: 0.4, stipeWidth: 0.5, gillDensity: 0.6, clusterCount: 1 },
  },
  enoki: {
    id: "enoki",
    nameJa: "エノキタケ",
    nameEn: "Flammulina velutipes",
    description: "細く長い柄に小さな傘が特徴。群生し、スクリプト的な手軽さを象徴する。",
    baseHue: 45,
    baseMorphology: { capDiameter: 0.2, capRoundness: 0.9, stipeLength: 0.9, stipeWidth: 0.1, gillDensity: 0.3, clusterCount: 8 },
  },
  shiitake: {
    id: "shiitake",
    nameJa: "シイタケ",
    nameEn: "Lentinula edodes",
    description: "原木栽培の代表格。地道なインフラ作業のように、着実に育つ。",
    baseHue: 25,
    baseMorphology: { capDiameter: 0.7, capRoundness: 0.4, stipeLength: 0.4, stipeWidth: 0.4, gillDensity: 0.8, clusterCount: 1 },
  },
  bunashimeji: {
    id: "bunashimeji",
    nameJa: "ブナシメジ",
    nameEn: "Hypsizygus tessellatus",
    description: "安定・堅実なキノコ。型安全な言語のように信頼性が高い。",
    baseHue: 220,
    baseMorphology: { capDiameter: 0.35, capRoundness: 0.7, stipeLength: 0.6, stipeWidth: 0.25, gillDensity: 0.5, clusterCount: 5 },
  },
  eringi: {
    id: "eringi",
    nameJa: "エリンギ",
    nameEn: "Pleurotus eryngii",
    description: "太い柄が特徴。ネットワークの太い幹線を象徴する。",
    baseHue: 35,
    baseMorphology: { capDiameter: 0.4, capRoundness: 0.3, stipeLength: 0.7, stipeWidth: 0.7, gillDensity: 0.4, clusterCount: 1 },
  },
  nameko: {
    id: "nameko",
    nameJa: "ナメコ",
    nameEn: "Pholiota microspora",
    description: "ぬめりのある粘膜に覆われた小型キノコ。データの粘着性を象徴する。",
    baseHue: 30,
    baseMorphology: { capDiameter: 0.3, capRoundness: 0.9, stipeLength: 0.3, stipeWidth: 0.2, gillDensity: 0.5, clusterCount: 6 },
  },
  hiratake: {
    id: "hiratake",
    nameJa: "ヒラタケ",
    nameEn: "Pleurotus ostreatus",
    description: "広く薄い傘が特徴。クラウドの広がりを象徴する。",
    baseHue: 210,
    baseMorphology: { capDiameter: 0.85, capRoundness: 0.2, stipeLength: 0.25, stipeWidth: 0.35, gillDensity: 0.7, clusterCount: 3 },
  },
  king_mushroom: {
    id: "king_mushroom",
    nameJa: "大型マッシュルーム",
    nameEn: "Agaricus bisporus (King)",
    description: "マッシュルームの上位種。基本情報から応用情報への進化を体現する。",
    baseHue: 28,
    baseMorphology: { capDiameter: 0.85, capRoundness: 0.75, stipeLength: 0.5, stipeWidth: 0.6, gillDensity: 0.8, clusterCount: 1 },
  },
  yamabushi: {
    id: "yamabushi",
    nameJa: "ヤマブシタケ",
    nameEn: "Hericium erinaceus",
    description: "珊瑚状の複雑な構造。システム設計の複雑さを象徴する。傘を持たない独特の形態。",
    baseHue: 40,
    baseMorphology: { capDiameter: 0.0, capRoundness: 0.0, stipeLength: 0.3, stipeWidth: 0.8, gillDensity: 0.0, clusterCount: 1 },
  },
  tamogitake: {
    id: "tamogitake",
    nameJa: "タモギタケ",
    nameEn: "Pleurotus cornucopiae var. citrinopileatus",
    description: "鮮やかな黄金色が特徴。AI/データの輝きを象徴する。",
    baseHue: 50,
    baseMorphology: { capDiameter: 0.6, capRoundness: 0.3, stipeLength: 0.4, stipeWidth: 0.3, gillDensity: 0.6, clusterCount: 4 },
  },
  maitake: {
    id: "maitake",
    nameJa: "マイタケ",
    nameEn: "Grifola frondosa",
    description: "波打つ多数の傘が重なり合う群生体。複数機能が有機的に育つ個人開発を象徴する。",
    baseHue: 20,
    baseMorphology: { capDiameter: 0.5, capRoundness: 0.1, stipeLength: 0.2, stipeWidth: 0.5, gillDensity: 0.3, clusterCount: 12 },
  },
};

// ============================================
// 資格マスターデータ
// ============================================

/**
 * 資格マスターデータ
 *
 * 系統（lineageGroup）：
 *  - "ipa"    : IPA系（基本情報 → 応用情報）
 *  - "aws"    : AWS系（CLF → SAA）
 *  - "linux"  : Linux系（単独）
 *  - "java"   : Java系（単独）
 *  - "network": ネットワーク系（単独、ただしAWSと配合で相性良い）
 *  - "db"     : データベース系（単独）
 *  - "python" : Python系（単独、G検定と配合で相性良い）
 *  - "ai"     : AI系（Python → G検定の流れ推奨）
 *  - "personal": 個人開発（どの系統にも属さない独立種）
 */
export const CERTIFICATIONS: CertificationMaster[] = [
  // ─── IPA系統（マッシュルーム系統樹） ───
  {
    id: "fe",
    name: "基本情報技術者",
    category: "IPA",
    mushroomSpeciesId: "mushroom",
    difficulty: 1,
    domains:         [2,  1,  1,  1,   1,  0,   1,  0,  1,   1] as DomainValues,
    estimatedDays: 90,
    description: "ITエンジニアの登竜門。幅広い基礎知識を証明する国家試験。",
    tips: "IT業界で最初に取る資格として最適。他のすべての資格の土台になります。",
    prerequisiteId: null,
    lineageGroup: "ipa",
    phaseThresholds: { germinationInput: 540, colonizationInput: 2160, primordiaOutput: 864, fruitingTrigger: 324, maturationTotal: 5400, awakeningTotal: 6750, transformationTotal: 8640, legendaryTotal: 10800 },
  },
  {
    id: "ap",
    name: "応用情報技術者",
    category: "IPA",
    mushroomSpeciesId: "king_mushroom",
    difficulty: 3,
    domains:         [3,  2,  2,  2,   1,  1,   2,  1,  2,   2] as DomainValues,
    estimatedDays: 120,
    description: "ITエンジニアとしての応用力を証明する国家試験。",
    tips: "基本情報技術者の合格後に挑戦するのが王道ルート。午後は選択問題なので得意分野を活かせます。",
    prerequisiteId: "fe",
    lineageGroup: "ipa",
    phaseThresholds: { germinationInput: 720, colonizationInput: 2880, primordiaOutput: 1152, fruitingTrigger: 432, maturationTotal: 7200, awakeningTotal: 9000, transformationTotal: 11520, legendaryTotal: 14400 },
  },
  // ─── AWS系統（ヒラタケ → ヤマブシタケ系統樹） ───
  {
    id: "aws_clf",
    name: "AWS クラウドプラクティショナー",
    category: "AWS",
    mushroomSpeciesId: "hiratake",
    difficulty: 2,
    domains:         [0,  1,  1,  1,   1,  3,   0,  0,  2,   1] as DomainValues,
    estimatedDays: 45,
    description: "AWSクラウドの基礎知識を証明するエントリーレベル認定。",
    tips: "AWS資格の入口。基本情報やLPICの知識があると学習がスムーズです。",
    prerequisiteId: null,
    lineageGroup: "aws",
    phaseThresholds: { germinationInput: 270, colonizationInput: 1080, primordiaOutput: 432, fruitingTrigger: 162, maturationTotal: 2700, awakeningTotal: 3375, transformationTotal: 4320, legendaryTotal: 5400 },
  },
  {
    id: "aws_saa",
    name: "AWS ソリューションアーキテクト アソシエイト",
    category: "AWS",
    mushroomSpeciesId: "yamabushi",
    difficulty: 3,
    domains:         [0,  2,  1,  2,   1,  3,   0,  0,  3,   1] as DomainValues,
    estimatedDays: 90,
    description: "AWSでのシステム設計スキルを証明する中級認定。",
    tips: "CLFの合格後に挑戦を。CCNAやLPICの知識があるとNW・OSの設問が楽になります。",
    prerequisiteId: "aws_clf",
    lineageGroup: "aws",
    phaseThresholds: { germinationInput: 540, colonizationInput: 2160, primordiaOutput: 864, fruitingTrigger: 324, maturationTotal: 5400, awakeningTotal: 6750, transformationTotal: 8640, legendaryTotal: 10800 },
  },
  // ─── Linux系統（独立） ───
  {
    id: "lpic1",
    name: "LPIC レベル1",
    category: "Linux",
    mushroomSpeciesId: "shiitake",
    difficulty: 2,
    domains:         [1,  1,  0,  1,   3,  0,   1,  0,  0,   1] as DomainValues,
    estimatedDays: 60,
    description: "Linuxの基本操作・管理スキルを証明する国際資格。",
    tips: "サーバーやインフラに関わるなら必須級。基本情報の後に取ると理解が深まります。",
    prerequisiteId: null,
    lineageGroup: "linux",
    phaseThresholds: { germinationInput: 360, colonizationInput: 1440, primordiaOutput: 576, fruitingTrigger: 216, maturationTotal: 3600, awakeningTotal: 4500, transformationTotal: 5760, legendaryTotal: 7200 },
  },
  // ─── ネットワーク系統（独立） ───
  {
    id: "ccna",
    name: "CCNA",
    category: "Network",
    mushroomSpeciesId: "eringi",
    difficulty: 3,
    domains:         [0,  3,  0,  2,   1,  1,   0,  0,  1,   0] as DomainValues,
    estimatedDays: 90,
    description: "ネットワークの設計・実装・運用スキルを証明するCisco認定資格。",
    tips: "ネットワーク専門の道へ進むなら。基本情報のNW知識が前提になります。",
    prerequisiteId: null,
    lineageGroup: "network",
    phaseThresholds: { germinationInput: 540, colonizationInput: 2160, primordiaOutput: 864, fruitingTrigger: 324, maturationTotal: 5400, awakeningTotal: 6750, transformationTotal: 8640, legendaryTotal: 10800 },
  },
  // ─── データベース系統（独立） ───
  {
    id: "ossdb_silver",
    name: "OSS-DB Silver",
    category: "Database",
    mushroomSpeciesId: "nameko",
    difficulty: 2,
    domains:         [1,  0,  3,  1,   1,  0,   0,  0,  1,   0] as DomainValues,
    estimatedDays: 60,
    description: "PostgreSQLを中心としたOSSデータベースの技術力を証明する資格。",
    tips: "バックエンド開発やデータ分析に関わるなら。SQLの基礎知識があると良いです。",
    prerequisiteId: null,
    lineageGroup: "db",
    phaseThresholds: { germinationInput: 360, colonizationInput: 1440, primordiaOutput: 576, fruitingTrigger: 216, maturationTotal: 3600, awakeningTotal: 4500, transformationTotal: 5760, legendaryTotal: 7200 },
  },
  // ─── プログラミング系統（独立） ───
  {
    id: "python3",
    name: "Python 3 エンジニア認定基礎試験",
    category: "Programming",
    mushroomSpeciesId: "enoki",
    difficulty: 1,
    domains:         [1,  0,  0,  0,   0,  0,   3,  1,  0,   1] as DomainValues,
    estimatedDays: 45,
    description: "Python言語の基礎力を証明する認定試験。",
    tips: "プログラミング初心者でも取りやすい。G検定やデータ分析への足がかりにも。",
    prerequisiteId: null,
    lineageGroup: "python",
    phaseThresholds: { germinationInput: 270, colonizationInput: 1080, primordiaOutput: 432, fruitingTrigger: 162, maturationTotal: 2700, awakeningTotal: 3375, transformationTotal: 4320, legendaryTotal: 5400 },
  },
  {
    id: "java_silver",
    name: "Java Programmer Silver SE",
    category: "Programming",
    mushroomSpeciesId: "bunashimeji",
    difficulty: 2,
    domains:         [2,  0,  0,  0,   0,  0,   3,  0,  1,   1] as DomainValues,
    estimatedDays: 60,
    description: "Javaプログラミングの基本スキルを証明するOracle認定資格。",
    tips: "エンタープライズ系の開発をするなら。オブジェクト指向の理解が深まります。",
    prerequisiteId: null,
    lineageGroup: "java",
    phaseThresholds: { germinationInput: 360, colonizationInput: 1440, primordiaOutput: 576, fruitingTrigger: 216, maturationTotal: 3600, awakeningTotal: 4500, transformationTotal: 5760, legendaryTotal: 7200 },
  },
  // ─── AI系統（Python → G検定の流れ推奨） ───
  {
    id: "g_cert",
    name: "G検定",
    category: "AI",
    mushroomSpeciesId: "tamogitake",
    difficulty: 3,
    domains:         [1,  0,  0,  0,   0,  1,   1,  3,  0,   0] as DomainValues,
    estimatedDays: 60,
    description: "ディープラーニングの基礎知識を証明するJDLA認定試験。",
    tips: "Python基礎試験の後に挑戦すると効率的。AI・機械学習の全体像が掴めます。",
    prerequisiteId: null,
    lineageGroup: "ai",
    phaseThresholds: { germinationInput: 360, colonizationInput: 1440, primordiaOutput: 576, fruitingTrigger: 216, maturationTotal: 3600, awakeningTotal: 4500, transformationTotal: 5760, legendaryTotal: 7200 },
  },
  {
    id: "genai_passport",
    name: "生成AIパスポート",
    category: "AI",
    mushroomSpeciesId: "tamogitake",
    difficulty: 1,
    domains:         [1,  0,  0,  1,   0,  1,   0,  3,  0,   1] as DomainValues,
    estimatedDays: 30,
    description: "生成AIの基礎知識と活用リテラシーを証明する一般社団法人生成AI活用普及協会(GUGA)の認定試験。",
    tips: "AI初学者におすすめ。生成AIの仕組み・活用法・リスクを網羅的に学べます。G検定の前段としても最適。",
    prerequisiteId: null,
    lineageGroup: "ai",
    phaseThresholds: { germinationInput: 180, colonizationInput: 720, primordiaOutput: 288, fruitingTrigger: 108, maturationTotal: 1800, awakeningTotal: 2250, transformationTotal: 2880, legendaryTotal: 3600 },
  },
  // ─── 個人開発（独立種） ───
  {
    id: "personal_dev",
    name: "個人開発プロジェクト",
    category: "PersonalDev",
    mushroomSpeciesId: "maitake",
    difficulty: 0 as any,
    domains:         [1,  0,  1,  0,   0,  1,   3,  0,  2,   3] as DomainValues,
    estimatedDays: 90,
    description: "自分のアプリ・OSS・ポートフォリオ等の個人開発プロジェクト。",
    tips: "どの資格とも独立して始められます。取得した資格の知識を配合で活かしましょう。",
    prerequisiteId: null,
    lineageGroup: "personal",
    phaseThresholds: { germinationInput: 540, colonizationInput: 2160, primordiaOutput: 864, fruitingTrigger: 324, maturationTotal: 5400, awakeningTotal: 6750, transformationTotal: 8640, legendaryTotal: 10800 },
  },
];

/** IDから資格を取得 */
export function getCertificationById(id: string): CertificationMaster | undefined {
  return CERTIFICATIONS.find(c => c.id === id);
}

/** IDからキノコ種を取得 */
export function getMushroomSpecies(id: string): MushroomSpecies | undefined {
  return MUSHROOM_SPECIES[id];
}

// ============================================
// 実績マスターデータ
// ============================================

export const ACHIEVEMENTS: Achievement[] = [
  // ─────────────────────────────
  // 栽培系（Cultivation）
  // ─────────────────────────────
  {
    id: "first_sprout",
    name: "発芽の兆し",
    description: "初めて学習を記録してキノコの栽培を開始",
    category: "cultivation",
    condition: "学習記録を1回つける",
    rewardItemId: "petri_dish",
    rewardItemName: "シャーレ",
    icon: "sprout",
  },
  {
    id: "phase_colonization",
    name: "菌糸蔓延",
    description: "キノコをPhase 3（菌糸蔓延）まで育てる",
    category: "cultivation",
    condition: "1つの栽培をPhase 3以上に到達させる",
    rewardItemId: "substrate_bag",
    rewardItemName: "培地バッグ",
    icon: "git-branch",
  },
  {
    id: "phase_primordia",
    name: "原基形成",
    description: "キノコをPhase 4（原基形成）まで育てる",
    category: "cultivation",
    condition: "1つの栽培をPhase 4以上に到達させる",
    rewardItemId: "hygrometer",
    rewardItemName: "温湿度計",
    icon: "zap",
  },
  {
    id: "first_flush",
    name: "First Flush",
    description: "初めて子実体を成熟（Phase 6）まで育てる",
    category: "cultivation",
    condition: "1つの栽培をPhase 6に到達させる",
    rewardItemId: "shelf_basic",
    rewardItemName: "基本展示棚",
    icon: "award",
  },
  {
    id: "first_harvest",
    name: "初収穫",
    description: "育てたキノコを収穫する",
    category: "cultivation",
    condition: "1体のキノコを収穫",
    rewardItemId: "basket",
    rewardItemName: "収穫カゴ",
    icon: "package",
  },
  {
    id: "mycelium_network",
    name: "Mycelium Network",
    description: "3種類の資格キノコを収穫",
    category: "cultivation",
    condition: "収穫済みキノコ3体",
    rewardItemId: "wallpaper_mycelium",
    rewardItemName: "菌糸壁紙",
    icon: "network",
  },
  {
    id: "master_cultivator",
    name: "Master Cultivator",
    description: "5種類の異なるキノコ種を収穫",
    category: "cultivation",
    condition: "5種の異なるキノコ種（シイタケ・エノキ等）を収穫",
    rewardItemId: "lab_coat",
    rewardItemName: "白衣ハンガー",
    icon: "trophy",
  },
  {
    id: "big_cap",
    name: "巨大子実体",
    description: "傘径1.0以上の大型キノコを収穫",
    category: "cultivation",
    condition: "capDiameter ≥ 1.0 のキノコを1体収穫",
    rewardItemId: "caliper",
    rewardItemName: "計測キャリパー",
    icon: "maximize",
  },
  {
    id: "quick_harvest",
    name: "速成培養",
    description: "30日以内に1つのキノコを完成させる",
    category: "cultivation",
    condition: "開始から30日以内に収穫",
    rewardItemId: "stopwatch",
    rewardItemName: "タイマー",
    icon: "zap",
  },
  {
    id: "multi_cultivation",
    name: "並列栽培者",
    description: "同時に3つ以上の栽培を進める",
    category: "cultivation",
    condition: "同時に栽培中のキノコが3体以上",
    rewardItemId: "rack_shelf",
    rewardItemName: "多段培養棚",
    icon: "layers",
  },

  // ─────────────────────────────
  // 配合系（Mating）
  // ─────────────────────────────
  {
    id: "first_mating",
    name: "Plasmogamy",
    description: "初めて菌糸接合（配合）を行う",
    category: "cultivation",
    condition: "栽培開始時に配合相手を選択",
    rewardItemId: "petri_mating",
    rewardItemName: "接合シャーレ",
    icon: "git-merge",
  },
  {
    id: "strong_mating",
    name: "強接合",
    description: "共有ドメイン4つ以上の強い配合を行う",
    category: "cultivation",
    condition: "strong適合（共有4ドメイン以上）で配合",
    rewardItemId: "gene_chart",
    rewardItemName: "交配型チャート",
    icon: "link",
  },
  {
    id: "mating_master",
    name: "配合師",
    description: "5回の配合を実施する",
    category: "cultivation",
    condition: "配合ありの栽培を累計5回開始",
    rewardItemId: "breeding_journal",
    rewardItemName: "交配日誌",
    icon: "book-open",
  },

  // ─────────────────────────────
  // 学習継続系（Streak）
  // ─────────────────────────────
  {
    id: "streak_3",
    name: "三日坊主回避",
    description: "3日連続で学習記録を残す",
    category: "study",
    condition: "3日連続で記録",
    rewardItemId: "sticky_note",
    rewardItemName: "付箋メモ",
    icon: "calendar",
  },
  {
    id: "streak_7",
    name: "継続の菌糸",
    description: "7日間連続で学習記録を残す",
    category: "study",
    condition: "7日連続で記録",
    rewardItemId: "flame_badge",
    rewardItemName: "炎バッジ",
    icon: "flame",
  },
  {
    id: "streak_30",
    name: "培養マスター",
    description: "30日間連続で学習記録を残す",
    category: "study",
    condition: "30日連続で記録",
    rewardItemId: "clean_bench",
    rewardItemName: "クリーンベンチ",
    icon: "zap",
  },
  {
    id: "streak_100",
    name: "不屈の菌糸体",
    description: "100日連続で学習記録を残す",
    category: "study",
    condition: "100日連続で記録",
    rewardItemId: "trophy_gold",
    rewardItemName: "ゴールドトロフィー",
    icon: "crown",
  },

  // ─────────────────────────────
  // 累計学習時間系（Total Minutes）
  // ─────────────────────────────
  {
    id: "total_10h",
    name: "10時間培養",
    description: "累計10時間の学習を達成",
    category: "study",
    condition: "累計学習時間が600分以上",
    rewardItemId: "clock_simple",
    rewardItemName: "シンプル時計",
    icon: "clock",
  },
  {
    id: "total_50h",
    name: "50時間培養",
    description: "累計50時間の学習を達成",
    category: "study",
    condition: "累計学習時間が3,000分以上",
    rewardItemId: "hourglass",
    rewardItemName: "砂時計",
    icon: "hourglass",
  },
  {
    id: "total_100h",
    name: "百時間培養",
    description: "累計100時間の学習を達成",
    category: "study",
    condition: "累計学習時間が6,000分以上",
    rewardItemId: "autoclave",
    rewardItemName: "オートクレーブ",
    icon: "clock",
  },
  {
    id: "total_500h",
    name: "五百時間の森",
    description: "累計500時間の学習を達成",
    category: "study",
    condition: "累計学習時間が30,000分以上",
    rewardItemId: "forest_tapestry",
    rewardItemName: "森林タペストリー",
    icon: "trees",
  },
  {
    id: "deep_dive",
    name: "没頭の一日",
    description: "1日に4時間以上学習する",
    category: "study",
    condition: "同じ日に累計240分以上記録",
    rewardItemId: "focus_candle",
    rewardItemName: "集中のキャンドル",
    icon: "target",
  },

  // ─────────────────────────────
  // インプット/アウトプット系
  // ─────────────────────────────
  {
    id: "first_output",
    name: "初アウトプット",
    description: "初めてアウトプットを記録する",
    category: "study",
    condition: "アウトプット記録を1回つける",
    rewardItemId: "pen",
    rewardItemName: "羽根ペン",
    icon: "pen-tool",
  },
  {
    id: "output_10",
    name: "アウトプッター",
    description: "アウトプットを10回記録する",
    category: "study",
    condition: "アウトプット記録を累計10回",
    rewardItemId: "whiteboard",
    rewardItemName: "ホワイトボード",
    icon: "edit-3",
  },
  {
    id: "balanced_one_day",
    name: "黄金比の日",
    description: "1日でI/Oバランスを理想（6:4）に近づける",
    category: "study",
    condition: "同じ日のInput:Output比が5:5〜7:3の範囲で1時間以上記録",
    rewardItemId: "balance_scale",
    rewardItemName: "天秤",
    icon: "scale",
  },
  {
    id: "variety_5",
    name: "多彩な学習",
    description: "5種類以上の種別で記録する",
    category: "study",
    condition: "異なる種別名を累計5種類記録",
    rewardItemId: "spice_rack",
    rewardItemName: "スパイスラック",
    icon: "palette",
  },
  {
    id: "variety_10",
    name: "博学の胞子",
    description: "10種類以上の種別で記録する",
    category: "study",
    condition: "異なる種別名を累計10種類記録",
    rewardItemId: "encyclopedia",
    rewardItemName: "百科事典",
    icon: "book",
  },

  // ─────────────────────────────
  // ソーシャル系
  // ─────────────────────────────
  {
    id: "spore_liberator",
    name: "Spore Liberator",
    description: "他人の部屋を10件訪問する",
    category: "social",
    condition: "部屋訪問10件",
    rewardItemId: "spore_canister",
    rewardItemName: "胞子キャニスター",
    icon: "users",
  },
];

/** IDから実績を取得 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}
