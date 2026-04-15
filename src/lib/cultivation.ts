// ============================================
// キノコ栽培 成長計算・配合ロジック
// ============================================

import {
  DomainValues,
  DomainId,
  DOMAIN_IDS,
  GrowthPhase,
  EnvironmentParams,
  Morphology,
  Cultivation,
  HarvestedMushroom,
  StudyLog,
  MatingCompatibility,
  CertificationMaster,
} from "./types";
import { getCertificationById, getMushroomSpecies } from "./masterdata";

// ============================================
// 配合（菌糸接合）ロジック
// ============================================

/**
 * 2つの一核体間の接合適合性を計算する
 *
 * 菌類学的根拠：
 * - 実際の菌類では交配型（Mating Type）遺伝子が一致する相手としか融合できない
 * - ゲーム内では「共有する知識ドメイン」が交配型の代わりを果たす
 * - 共有ドメイン数が多いほど適合性が高く、効果も大きい
 */
export function calculateMatingCompatibility(
  newCertification: CertificationMaster,
  partner: HarvestedMushroom
): MatingCompatibility {
  const newDomains = newCertification.domains;
  const partnerDomains = partner.finalDomainValues;

  // 共有ドメインを特定（双方が1以上）
  const sharedDomains: DomainId[] = [];
  for (let i = 0; i < 10; i++) {
    if (newDomains[i] >= 1 && partnerDomains[i] >= 1) {
      sharedDomains.push(DOMAIN_IDS[i]);
    }
  }
  const sharedCount = sharedDomains.length;

  // 適合レベル判定
  let compatibilityLevel: MatingCompatibility["compatibilityLevel"];
  if (sharedCount >= 4) compatibilityLevel = "strong";
  else if (sharedCount >= 2) compatibilityLevel = "moderate";
  else if (sharedCount === 1) compatibilityLevel = "weak";
  else compatibilityLevel = "incompatible";

  // 接合ボーナス計算
  const predictedBonus = calculateMatingBonus(newDomains, partnerDomains, sharedCount);

  // 成長加速率（共有ドメインが多いほど加速）
  const growthAcceleration = sharedCount >= 2
    ? Math.min(sharedCount * 6, 40) // 最大40%加速
    : sharedCount === 1
      ? 3 // 弱い接合は3%
      : 0;

  return {
    partnerId: partner.id,
    partnerName: partner.certificationName,
    partnerSpecies: partner.mushroomSpeciesId,
    sharedDomainCount: sharedCount,
    sharedDomains,
    compatibilityLevel,
    predictedBonus,
    growthAcceleration,
  };
}

/**
 * 配合ボーナス値を計算する
 *
 * 菌類学的根拠：
 * - 二核体（Dikaryon）は両方の核の遺伝子を持つが、発現するかは環境に依存する
 * - ゲーム内では「新資格にそのドメインの受け皿がある」場合のみボーナスが発現する
 * - 弱い接合（共有ドメイン1個）は効果が50%に減衰
 */
function calculateMatingBonus(
  newDomains: DomainValues,
  partnerDomains: DomainValues,
  sharedCount: number
): DomainValues {
  const bonus: number[] = new Array(10).fill(0);
  const multiplier = sharedCount === 1 ? 0.15 : 0.3; // 弱い接合は半分

  for (let i = 0; i < 10; i++) {
    if (newDomains[i] >= 1 && partnerDomains[i] >= 1) {
      bonus[i] = Math.ceil(partnerDomains[i] * multiplier);
    }
    // 新資格の値が0 → 受け皿がない → ボーナスなし
  }

  return bonus as unknown as DomainValues;
}

// ============================================
// 環境パラメータ計算
// ============================================

/**
 * 学習記録群から環境パラメータを算出する
 *
 * すべての記録が時間（分）ベースに統一されたため、
 * インプット/アウトプットの時間量で各パラメータを算出する。
 *
 * 菌類学的対応：
 * - インプット時間 → 培地栄養（炭素源・窒素源・ミネラル・水分を均等配分）
 * - アウトプット時間 → 結実環境（温度・湿度・CO2・光を均等配分）
 * - 総時間 → 全体サイズ
 * - I/Oバランス → 形態の歪み
 */
export function calculateEnvironmentParams(logs: StudyLog[]): EnvironmentParams {
  const params: EnvironmentParams = {
    carbonSource: 0,
    nitrogenSource: 0,
    minerals: 0,
    moisture: 0,
    temperature: 0,
    humidity: 0,
    co2: 0,
    light: 0,
  };

  for (const log of logs) {
    const minutes = log.minutes;
    if (log.type === "input") {
      // インプット時間を培地栄養に均等配分
      params.carbonSource += minutes * 0.3;
      params.nitrogenSource += minutes * 0.25;
      params.minerals += minutes * 0.2;
      params.moisture += minutes * 0.25;
    } else {
      // アウトプット時間を結実環境に均等配分
      params.temperature += minutes * 0.3;
      params.humidity += minutes * 0.25;
      params.co2 += minutes * 0.2;
      params.light += minutes * 0.25;
    }
  }

  return params;
}

// ============================================
// ポイント計算（時間ベース統一）
// ============================================

/**
 * 学習記録1件のポイント
 * 体調・充実感により補正：
 *   - 体調1（つらい）: ×0.7   体調5（絶好調）: ×1.15
 *   - 充実感1（いまいち）: ×0.85  充実感5（最高）: ×1.15
 * 無理して学習しても、体調が悪ければ成長は鈍る。
 */
export function calculatePoints(
  minutes: number,
  condition: number = 3,
  fulfillment: number = 3,
  isPomodoro: boolean = false,
): number {
  const conditionMult =
    condition <= 1 ? 0.7 :
    condition === 2 ? 0.85 :
    condition === 3 ? 1.0 :
    condition === 4 ? 1.08 :
    1.15;
  const fulfillmentMult =
    fulfillment <= 1 ? 0.85 :
    fulfillment === 2 ? 0.95 :
    fulfillment === 3 ? 1.0 :
    fulfillment === 4 ? 1.08 :
    1.15;
  // ポモドーロで集中して取り組んだ学習は +30% ボーナス
  const pomodoroMult = isPomodoro ? 1.3 : 1.0;
  return minutes * conditionMult * fulfillmentMult * pomodoroMult;
}

// ============================================
// 成長フェーズ判定
// ============================================

/**
 * 現在の状態からフェーズを判定する
 *
 * 菌類学的プロセス：
 * 1. 胞子発芽：培地に接種した直後。栄養を吸収し始める
 * 2. 菌糸伸長：菌糸が培地内に伸び始める。インプット中心
 * 3. 菌糸蔓延：培地全体を菌糸が覆い尽くす。アウトプットの準備完了
 * 4. 原基形成：温度ショック等のトリガーで小さな突起が形成される
 * 5. 子実体成長：キノコとして目に見える形で成長
 * 6. 成熟：胞子を形成し、収穫可能な状態
 */
export function determineGrowthPhase(
  cultivation: Cultivation,
  cert: CertificationMaster
): GrowthPhase {
  const { totalInputPoints, totalOutputPoints } = cultivation;
  const t = cert.phaseThresholds;

  // 成長加速率の適用（配合ボーナス）
  const acceleration = 1 + (cultivation.sharedDomainCount >= 2
    ? Math.min(cultivation.sharedDomainCount * 6, 40) / 100
    : cultivation.sharedDomainCount === 1 ? 0.03 : 0);

  const adjustedInput = totalInputPoints * acceleration;
  const adjustedOutput = totalOutputPoints * acceleration;
  const adjustedTotal = adjustedInput + adjustedOutput;

  if (cultivation.isCompleted) return 6;

  // ── 化け物フェーズ（Phase 7-9）──
  if (t.legendaryTotal     && adjustedTotal >= t.legendaryTotal)     return 9;
  if (t.transformationTotal && adjustedTotal >= t.transformationTotal) return 8;
  if (t.awakeningTotal     && adjustedTotal >= t.awakeningTotal)     return 7;

  // ── 通常フェーズ（Phase 1-6）──
  if (adjustedTotal >= t.maturationTotal && adjustedOutput >= t.fruitingTrigger) return 6;
  if (adjustedOutput >= t.fruitingTrigger) return 5;
  if (adjustedOutput >= t.primordiaOutput) return 4;
  if (adjustedInput >= t.colonizationInput) return 3;
  if (adjustedInput >= t.germinationInput) return 2;
  return 1;
}

// ============================================
// 形態（Morphology）計算
// ============================================

/**
 * 環境パラメータ・ドメイン値・フェーズから最終的な形態を計算する
 *
 * 菌類学的に各パラメータが形態に与える影響：
 * - 栄養量（炭素+窒素）→ 全体サイズ
 * - I/Oバランス → 歪み度（バランスが悪いと歪む）
 * - CO2濃度 → 柄が伸びる（実際の菌類でもCO2が高いと柄が長くなる）
 * - 光 → 色が鮮やかになる（光屈性と色素生成）
 * - 湿度 → ぬめり具合
 * - 温度 → 傘の広がり（適温で傘が開く）
 */
export function calculateMorphology(
  env: EnvironmentParams,
  domainValues: DomainValues,
  phase: GrowthPhase,
  speciesId: string,
  totalInput: number,
  totalOutput: number
): Morphology {
  const species = getMushroomSpecies(speciesId);
  if (!species) {
    return getDefaultMorphology();
  }

  const base = species.baseMorphology;
  const totalNutrients = env.carbonSource + env.nitrogenSource + env.minerals + env.moisture;

  // I/Oバランス（0〜1、0.5が理想）
  const total = totalInput + totalOutput;
  const ioBalance = total > 0 ? totalOutput / total : 0;
  const balanceDeviation = Math.abs(ioBalance - 0.4); // 理想は4:6（Input:Output）

  // フェーズに応じた成長率（0〜1）
  const phaseGrowth = Math.min((phase - 1) / 5, 1);

  // 栄養による全体サイズ係数（対数的に増加）
  const sizeFactor = Math.min(Math.log(totalNutrients + 1) / 6, 1.5);

  // 各形態パラメータの計算
  const capDiameter = base.capDiameter * sizeFactor * phaseGrowth
    * (1 + env.temperature * 0.005); // 温度が高いと傘が広がる

  const capRoundness = base.capRoundness
    * (1 - balanceDeviation * 0.5); // バランスが悪いと丸みが崩れる

  const stipeLength = base.stipeLength * sizeFactor * phaseGrowth
    * (1 + env.co2 * 0.01); // CO2が高いと柄が伸びる（菌学的に正確）

  const stipeWidth = base.stipeWidth * sizeFactor * phaseGrowth
    * (1 + env.moisture * 0.003); // 水分が多いと柄が太る

  const gillDensity = base.gillDensity
    * (1 + totalOutput * 0.002); // アウトプットが多いとひだが密になる

  // 色の計算
  const colorHue = species.baseHue
    + (ioBalance - 0.4) * 30; // バランスで色相がシフト

  const colorSaturation = Math.min(
    0.3 + env.light * 0.02 + phaseGrowth * 0.3,
    1.0
  ); // 光が多いと鮮やか

  const colorBrightness = Math.min(
    0.3 + env.minerals * 0.005 + phaseGrowth * 0.2,
    0.8
  ); // ミネラルで明るく

  // 歪み度（バランスが悪いほど歪む）
  const irregularity = Math.min(balanceDeviation * 2, 1.0);

  // 湿り具合（環境の湿度に依存）
  const moistureLevel = Math.min(env.humidity * 0.01, 1.0);

  return {
    capDiameter: clamp(capDiameter, 0, 2),
    capRoundness: clamp(capRoundness, 0, 1),
    stipeLength: clamp(stipeLength, 0, 2),
    stipeWidth: clamp(stipeWidth, 0, 2),
    gillDensity: clamp(gillDensity, 0, 1),
    colorHue: ((colorHue % 360) + 360) % 360,
    colorSaturation: clamp(colorSaturation, 0, 1),
    colorBrightness: clamp(colorBrightness, 0.1, 0.9),
    irregularity: clamp(irregularity, 0, 1),
    moistureLevel: clamp(moistureLevel, 0, 1),
    clusterCount: base.clusterCount,
  };
}

function getDefaultMorphology(): Morphology {
  return {
    capDiameter: 0.5, capRoundness: 0.5, stipeLength: 0.5, stipeWidth: 0.5,
    gillDensity: 0.5, colorHue: 30, colorSaturation: 0.4, colorBrightness: 0.5,
    irregularity: 0, moistureLevel: 0.3, clusterCount: 1,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================
// 栽培の初期状態を生成
// ============================================

export function createInitialCultivation(
  certId: string,
  userId: string,
  matingPartner: HarvestedMushroom | null
): Omit<Cultivation, "id" | "createdAt" | "updatedAt"> {
  const cert = getCertificationById(certId);
  if (!cert) throw new Error(`Unknown certification: ${certId}`);

  // 配合ボーナス計算
  let matingBonus: DomainValues = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let sharedDomainCount = 0;
  let matingPartnerId: string | null = null;
  let matingPartnerName: string | null = null;

  if (matingPartner) {
    const compat = calculateMatingCompatibility(cert, matingPartner);
    if (compat.compatibilityLevel !== "incompatible") {
      matingBonus = compat.predictedBonus;
      sharedDomainCount = compat.sharedDomainCount;
      matingPartnerId = matingPartner.id;
      matingPartnerName = matingPartner.certificationName;
    }
  }

  // 初期ドメイン値 = 資格固有値 + ボーナス
  const currentDomainValues = cert.domains.map(
    (v, i) => v + matingBonus[i]
  ) as unknown as DomainValues;

  const today = new Date().toISOString().split("T")[0];

  return {
    userId,
    certificationId: certId,
    mushroomSpeciesId: cert.mushroomSpeciesId,
    phase: 1,
    startDate: today,
    totalInputPoints: 0,
    totalOutputPoints: 0,
    totalInputMinutes: 0,
    totalOutputMinutes: 0,
    environmentParams: {
      carbonSource: 0, nitrogenSource: 0, minerals: 0, moisture: 0,
      temperature: 0, humidity: 0, co2: 0, light: 0,
    },
    matingPartnerId,
    matingPartnerName,
    matingBonus,
    sharedDomainCount,
    currentDomainValues,
    morphology: getDefaultMorphology(),
    streakDays: 0,
    totalDays: 0,
    lastRecordDate: null,
    isCompleted: false,
    completedDate: null,
  };
}

// ============================================
// 栽培状態の更新（記録追加時）
// ============================================

/**
 * 新しい学習記録が追加された時に栽培状態を更新する
 */
export function updateCultivationWithLog(
  cultivation: Cultivation,
  newLog: StudyLog,
  allLogs: StudyLog[]
): Partial<Cultivation> {
  const cert = getCertificationById(cultivation.certificationId);
  if (!cert) return {};

  // ポイント再計算（体調・充実感を反映、日次上限を適用）
  // 1日あたり 240分（4時間）までは満額、超過分は50%に減衰
  // 詰め込み学習を抑制し、継続的な学習を促す
  const DAILY_CAP = 240;

  // 実分数の集計（補正なし・表示用）
  let totalInputMinutes = 0;
  let totalOutputMinutes = 0;
  for (const log of allLogs) {
    if (log.type === "input") totalInputMinutes += log.minutes;
    else totalOutputMinutes += log.minutes;
  }

  const pointsByDay = new Map<string, { input: number; output: number }>();
  for (const log of allLogs) {
    const pts = calculatePoints(log.minutes, log.condition ?? 3, log.fulfillment ?? 3, log.isPomodoro ?? false);
    const cur = pointsByDay.get(log.date) || { input: 0, output: 0 };
    if (log.type === "input") cur.input += pts;
    else cur.output += pts;
    pointsByDay.set(log.date, cur);
  }
  let totalInput = 0;
  let totalOutput = 0;
  for (const v of pointsByDay.values()) {
    const dayTotal = v.input + v.output;
    if (dayTotal <= DAILY_CAP) {
      totalInput += v.input;
      totalOutput += v.output;
    } else {
      // 超過分を比率維持で50%減衰
      const ratio = v.input / dayTotal;
      const capInput = DAILY_CAP * ratio;
      const capOutput = DAILY_CAP * (1 - ratio);
      const excessInput = v.input - capInput;
      const excessOutput = v.output - capOutput;
      totalInput += capInput + excessInput * 0.5;
      totalOutput += capOutput + excessOutput * 0.5;
    }
  }

  // 体調・充実感の平均（直近14件から算出）
  const recentLogs = [...allLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  const conditionLogs = recentLogs.filter(l => typeof l.condition === "number");
  const fulfillmentLogs = recentLogs.filter(l => typeof l.fulfillment === "number");
  const avgCondition = conditionLogs.length > 0
    ? conditionLogs.reduce((sum, l) => sum + (l.condition || 3), 0) / conditionLogs.length
    : undefined;
  const avgFulfillment = fulfillmentLogs.length > 0
    ? fulfillmentLogs.reduce((sum, l) => sum + (l.fulfillment || 3), 0) / fulfillmentLogs.length
    : undefined;

  // 無理しすぎ警告：直近3件連続で体調2以下
  const last3 = recentLogs.slice(0, 3);
  const conditionWarning =
    last3.length >= 3 && last3.every(l => typeof l.condition === "number" && (l.condition as number) <= 2);

  // 環境パラメータ再計算
  const environmentParams = calculateEnvironmentParams(allLogs);

  // 連続記録日数の計算
  const sortedDates = [...new Set(allLogs.map(l => l.date))].sort();
  const streakDays = calculateStreak(sortedDates);

  // 経過日数
  const startDate = new Date(cultivation.startDate);
  const now = new Date();
  const totalDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // フェーズ判定
  const updatedCultivation = {
    ...cultivation,
    totalInputPoints: totalInput,
    totalOutputPoints: totalOutput,
    environmentParams,
    streakDays,
    totalDays,
    lastRecordDate: newLog.date,
  };

  const phase = determineGrowthPhase(updatedCultivation, cert);

  // 形態計算
  const morphology = calculateMorphology(
    environmentParams,
    cultivation.currentDomainValues,
    phase,
    cultivation.mushroomSpeciesId,
    totalInput,
    totalOutput
  );

  return {
    totalInputPoints: totalInput,
    totalOutputPoints: totalOutput,
    totalInputMinutes,
    totalOutputMinutes,
    environmentParams,
    phase,
    morphology,
    streakDays,
    totalDays,
    lastRecordDate: newLog.date,
    avgCondition,
    avgFulfillment,
    conditionWarning,
  };
}

/** 連続記録日数を計算 */
function calculateStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;

  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  let checkDate = new Date(today);

  // 今日から遡って連続日数をカウント
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (sortedDates[i] === dateStr) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (sortedDates[i] < dateStr) {
      // 日付が飛んだ = 連続途切れ
      // ただし今日まだ記録していない場合は昨日からカウント
      if (streak === 0 && i === sortedDates.length - 1) {
        checkDate.setDate(checkDate.getDate() - 1);
        i++; // リトライ
        continue;
      }
      break;
    }
  }

  return streak;
}

// ============================================
// 収穫（キノコ完成）
// ============================================

// ============================================
// 実績判定ロジック
// ============================================

/**
 * 現在の状態から解除条件を満たす実績IDのリストを返す
 */
export function evaluateAchievements(context: {
  cultivations: Cultivation[];
  harvested: HarvestedMushroom[];
  allLogs: StudyLog[];
  totalStudyMinutes: number;
}): string[] {
  const { cultivations, harvested, allLogs, totalStudyMinutes } = context;
  const unlocked: string[] = [];

  // ─── 栽培系 ───
  if (allLogs.length >= 1) unlocked.push("first_sprout");
  if (cultivations.some(c => c.phase >= 3) || harvested.length > 0) unlocked.push("phase_colonization");
  if (cultivations.some(c => c.phase >= 4) || harvested.length > 0) unlocked.push("phase_primordia");
  if (cultivations.some(c => c.phase >= 6) || harvested.length > 0) unlocked.push("first_flush");
  if (harvested.length >= 1) unlocked.push("first_harvest");
  if (harvested.length >= 3) unlocked.push("mycelium_network");
  const uniqueSpecies = new Set(harvested.map(h => h.mushroomSpeciesId));
  if (uniqueSpecies.size >= 5) unlocked.push("master_cultivator");
  if (harvested.some(h => h.finalMorphology.capDiameter >= 1.0)) unlocked.push("big_cap");
  if (harvested.some(h => h.cultivationDays > 0 && h.cultivationDays <= 30)) unlocked.push("quick_harvest");
  if (cultivations.filter(c => !c.isCompleted).length >= 3) unlocked.push("multi_cultivation");

  // ─── 配合系 ───
  const matedCultivations = [
    ...cultivations.filter(c => c.matingPartnerId),
    ...harvested.filter(h => h.matingPartnerId),
  ];
  if (matedCultivations.length >= 1) unlocked.push("first_mating");
  if (cultivations.some(c => c.sharedDomainCount >= 4)) unlocked.push("strong_mating");
  if (matedCultivations.length >= 5) unlocked.push("mating_master");

  // ─── 連続日数系 ───
  const maxStreak = Math.max(0, ...cultivations.map(c => c.streakDays));
  if (maxStreak >= 3) unlocked.push("streak_3");
  if (maxStreak >= 7) unlocked.push("streak_7");
  if (maxStreak >= 30) unlocked.push("streak_30");
  if (maxStreak >= 100) unlocked.push("streak_100");

  // ─── 累計時間系 ───
  if (totalStudyMinutes >= 600) unlocked.push("total_10h");
  if (totalStudyMinutes >= 3000) unlocked.push("total_50h");
  if (totalStudyMinutes >= 6000) unlocked.push("total_100h");
  if (totalStudyMinutes >= 30000) unlocked.push("total_500h");

  // 1日4時間以上
  const minutesByDay = new Map<string, number>();
  for (const log of allLogs) {
    minutesByDay.set(log.date, (minutesByDay.get(log.date) || 0) + log.minutes);
  }
  if ([...minutesByDay.values()].some(m => m >= 240)) unlocked.push("deep_dive");

  // ─── インプット/アウトプット系 ───
  const outputLogs = allLogs.filter(l => l.type === "output");
  if (outputLogs.length >= 1) unlocked.push("first_output");
  if (outputLogs.length >= 10) unlocked.push("output_10");

  // 黄金比の日: 同じ日の I/O 比が 0.3〜0.5 のアウトプット比、かつ60分以上
  const dayIO = new Map<string, { input: number; output: number }>();
  for (const log of allLogs) {
    const cur = dayIO.get(log.date) || { input: 0, output: 0 };
    if (log.type === "input") cur.input += log.minutes;
    else cur.output += log.minutes;
    dayIO.set(log.date, cur);
  }
  if ([...dayIO.values()].some(({ input, output }) => {
    const total = input + output;
    if (total < 60) return false;
    const outRatio = output / total;
    return outRatio >= 0.3 && outRatio <= 0.5;
  })) unlocked.push("balanced_one_day");

  // 種別のバラエティ
  const uniqueSubTypes = new Set(allLogs.map(l => l.subType));
  if (uniqueSubTypes.size >= 5) unlocked.push("variety_5");
  if (uniqueSubTypes.size >= 10) unlocked.push("variety_10");

  return unlocked;
}

export function createHarvestedMushroom(
  cultivation: Cultivation
): Omit<HarvestedMushroom, "id" | "createdAt"> {
  const total = cultivation.totalInputPoints + cultivation.totalOutputPoints;
  const ioBalance = total > 0 ? cultivation.totalOutputPoints / total : 0;

  return {
    userId: cultivation.userId,
    certificationId: cultivation.certificationId,
    certificationName: getCertificationById(cultivation.certificationId)?.name ?? "",
    mushroomSpeciesId: cultivation.mushroomSpeciesId,
    finalDomainValues: [...cultivation.currentDomainValues] as unknown as DomainValues,
    finalMorphology: { ...cultivation.morphology },
    harvestedDate: new Date().toISOString().split("T")[0],
    cultivationDays: cultivation.totalDays,
    totalInputPoints: cultivation.totalInputPoints,
    totalOutputPoints: cultivation.totalOutputPoints,
    ioBalance,
    matingPartnerId: cultivation.matingPartnerId,
    matingPartnerName: cultivation.matingPartnerName,
    isDisplayed: false,
  };
}
