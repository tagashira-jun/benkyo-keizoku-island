"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getUserCultivations, getUserHarvestedMushrooms } from "@/lib/firestore";
import { getCertificationById, getMushroomSpecies, ACHIEVEMENTS, DOMAIN_LIST } from "@/lib/masterdata";
import { PHASE_NAMES } from "@/lib/types";
import type { Cultivation, HarvestedMushroom } from "@/lib/types";
import MushroomSVG from "@/components/mushroom/MushroomSVG";
import Link from "next/link";

function HomeContent() {
  const { firebaseUser, loading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [harvested, setHarvested] = useState<HarvestedMushroom[]>([]);
  const [selectedCultivation, setSelectedCultivation] = useState<Cultivation | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [pulseSvg, setPulseSvg] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // 初回訪問チェック
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem("kinoko_tutorial_seen");
    if (!seen) setShowTutorial(true);
  }, []);

  function closeTutorial() {
    if (typeof window !== "undefined") {
      localStorage.setItem("kinoko_tutorial_seen", "1");
    }
    setShowTutorial(false);
    setTutorialStep(0);
  }

  // 記録完了パラメータ
  const updated = searchParams.get("updated") === "1";
  const updatedCultivationId = searchParams.get("cultivationId");
  const updatedMinutes = parseInt(searchParams.get("minutes") || "0", 10);
  const updatedType = searchParams.get("type") as "input" | "output" | null;
  const phaseBefore = parseInt(searchParams.get("phaseBefore") || "0", 10);
  const phaseAfter = parseInt(searchParams.get("phaseAfter") || "0", 10);
  const phaseChanged = phaseBefore > 0 && phaseAfter > phaseBefore;
  const unlockedAchievementIds = (searchParams.get("achievements") || "")
    .split(",")
    .filter(Boolean);

  useEffect(() => {
    if (!firebaseUser) return;
    loadData();
  }, [firebaseUser]);

  // 更新通知が来たら該当栽培を選択 + SVGをパルスアニメ
  useEffect(() => {
    if (!updated || !updatedCultivationId || cultivations.length === 0) return;
    const target = cultivations.find(c => c.id === updatedCultivationId);
    if (target) setSelectedCultivation(target);
    setPulseSvg(true);
    const timer = setTimeout(() => setPulseSvg(false), 2500);
    return () => clearTimeout(timer);
  }, [updated, updatedCultivationId, cultivations]);

  // 5秒後にクエリパラメータをクリア
  useEffect(() => {
    if (!updated) return;
    const timer = setTimeout(() => {
      router.replace("/");
    }, 8000);
    return () => clearTimeout(timer);
  }, [updated, router]);

  async function loadData() {
    if (!firebaseUser) return;
    setLoadingData(true);
    try {
      const [culti, harv] = await Promise.all([
        getUserCultivations(firebaseUser.uid),
        getUserHarvestedMushrooms(firebaseUser.uid),
      ]);
      setCultivations(culti);
      setHarvested(harv);
      if (culti.length > 0 && !selectedCultivation) {
        setSelectedCultivation(culti[0]);
      }
    } finally {
      setLoadingData(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300">
        <p>Loading...</p>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Kinoko Lab</h1>
          <p className="text-gray-300 mb-6">キノコ栽培ゲーミフィケーション学習アプリ</p>
          <Link href="/login" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg">
            ログイン
          </Link>
        </div>
      </div>
    );
  }

  const activeCultivation = selectedCultivation;
  const cert = activeCultivation ? getCertificationById(activeCultivation.certificationId) : null;
  const species = activeCultivation ? getMushroomSpecies(activeCultivation.mushroomSpeciesId) : null;

  // 関連知識レベル（0〜3）：過去の収穫キノコと現在栽培中の共通ドメイン数から算出
  const experienceLevel = (() => {
    if (!cert || harvested.length === 0) return 0;
    let maxShared = 0;
    for (const h of harvested) {
      let shared = 0;
      for (let i = 0; i < 10; i++) {
        if (cert.domains[i] >= 1 && h.finalDomainValues[i] >= 1) shared++;
      }
      if (shared > maxShared) maxShared = shared;
    }
    // 共有数で段階化: 2〜3 → Lv1, 4〜5 → Lv2, 6+ → Lv3
    return maxShared >= 6 ? 3 : maxShared >= 4 ? 2 : maxShared >= 2 ? 1 : 0;
  })();

  // 経験済みドメイン（過去の収穫キノコから現在の資格と共通するドメインを抽出、強い順に最大3件）
  const experienceDomains = (() => {
    if (!cert || harvested.length === 0) return [];
    // ドメインごとの合計経験値を集計
    const domainScores: number[] = new Array(10).fill(0);
    for (const h of harvested) {
      for (let i = 0; i < 10; i++) {
        if (cert.domains[i] >= 1) {
          domainScores[i] += h.finalDomainValues[i];
        }
      }
    }
    // スコアが1以上のドメインを強い順に並べ、最大3件のIDを返す
    return DOMAIN_LIST
      .map((d, i) => ({ id: d.id, score: domainScores[i] }))
      .filter(x => x.score >= 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(x => x.id);
  })();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* チュートリアルモーダル */}
      {showTutorial && <TutorialModal step={tutorialStep} setStep={setTutorialStep} onClose={closeTutorial} />}

      {/* ヘッダーバー */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-emerald-300">Kinoko Lab</h1>
        <div className="flex gap-4 text-sm">
          <button onClick={() => setShowTutorial(true)} className="text-gray-300 hover:text-white">使い方</button>
          <Link href="/room" className="text-gray-200 hover:text-white">部屋</Link>
          <Link href="/mypage" className="text-gray-200 hover:text-white">マイページ</Link>
        </div>
      </div>

      {/* 更新バナー */}
      {updated && (
        <div className="max-w-lg mx-auto px-4 pt-4 space-y-2">
          <div className="bg-emerald-900/60 border border-emerald-600 rounded-lg px-4 py-3 text-emerald-100 text-sm flex items-center gap-2">
            <span className="text-lg">🌱</span>
            <div>
              <div className="font-medium">
                {updatedType === "input" ? "インプット" : "アウトプット"} {updatedMinutes}分 記録しました
              </div>
              <div className="text-xs text-emerald-200">キノコの環境が更新されました</div>
            </div>
          </div>

          {phaseChanged && phaseAfter >= 1 && phaseAfter <= 6 && (
            <div className="bg-amber-900/60 border border-amber-500 rounded-lg px-4 py-3 text-amber-100 text-sm flex items-center gap-2 animate-pulse">
              <span className="text-lg">✨</span>
              <div>
                <div className="font-medium">
                  フェーズ進化！ Phase {phaseBefore} → Phase {phaseAfter}
                </div>
                <div className="text-xs text-amber-200">
                  {PHASE_NAMES[phaseAfter as 1 | 2 | 3 | 4 | 5 | 6].ja} に到達
                </div>
              </div>
            </div>
          )}

          {unlockedAchievementIds.length > 0 && (
            <div className="bg-purple-900/60 border border-purple-500 rounded-lg px-4 py-3 text-purple-100 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🏆</span>
                <span className="font-medium">実績解除！</span>
              </div>
              <div className="space-y-1">
                {unlockedAchievementIds.map(id => {
                  const ach = ACHIEVEMENTS.find(a => a.id === id);
                  if (!ach) return null;
                  return (
                    <div key={id} className="text-xs">
                      ・<span className="text-purple-100 font-medium">{ach.name}</span>
                      <span className="text-purple-300 ml-2">（{ach.description}）</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 栽培中のキノコがない場合 */}
        {cultivations.length === 0 && !loadingData && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🍄</div>
            <h2 className="text-xl font-bold mb-2">まだ栽培が始まっていません</h2>
            <p className="text-gray-300 mb-6">資格を選んでキノコ栽培を始めましょう</p>
            <Link
              href="/cultivate/new"
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              新しい栽培を始める
            </Link>
          </div>
        )}

        {/* 栽培中キノコの選択タブ */}
        {cultivations.length > 0 && (
          <>
            {cultivations.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {cultivations.map((c) => {
                  const cCert = getCertificationById(c.certificationId);
                  const isSelected = selectedCultivation?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCultivation(c)}
                      className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-800 text-gray-200 hover:bg-gray-700"
                      }`}
                    >
                      {cCert?.name ?? "不明"}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 無理しすぎ警告 */}
            {activeCultivation?.conditionWarning && (
              <div className="bg-amber-900/60 border border-amber-500 rounded-lg px-4 py-3 mb-4 text-amber-100 text-sm flex items-center gap-2">
                <span className="text-lg">🚨</span>
                <div>
                  <div className="font-medium">無理しすぎかも？</div>
                  <div className="text-xs text-amber-200">
                    体調が優れない日が続いています。休息もキノコの成長に必要です。
                  </div>
                </div>
              </div>
            )}

            {/* キノコビューア */}
            {activeCultivation && cert && species && (
              <div className="bg-gray-900 rounded-2xl p-6 mb-4">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-bold text-white">{cert.name}</h2>
                  <p className="text-sm text-gray-300">
                    {species.nameJa}（{species.nameEn}）
                  </p>
                </div>

                {/* キノコキャラクター（栽培ブース内） */}
                <div className={`flex justify-center mb-4 transition-transform duration-500 ${pulseSvg ? "scale-110" : ""}`}>
                  <div className={pulseSvg ? "animate-pulse" : ""}>
                    <MushroomSVG
                      morphology={activeCultivation.morphology}
                      phase={activeCultivation.phase}
                      speciesId={activeCultivation.mushroomSpeciesId}
                      width={240}
                      height={280}
                      daysSinceLastRecord={daysSince(activeCultivation.lastRecordDate)}
                      category={cert?.category}
                      experienceLevel={experienceLevel}
                      experienceDomains={experienceDomains}
                    />
                  </div>
                </div>

                {/* フェーズ表示 */}
                <div className="text-center mb-4">
                  <span className="text-sm text-gray-300">Phase {activeCultivation.phase} / 6</span>
                  <p className="text-emerald-300 font-bold text-lg">
                    {PHASE_NAMES[activeCultivation.phase].ja}
                  </p>
                  <p className="text-xs text-gray-400">
                    {PHASE_NAMES[activeCultivation.phase].en}
                  </p>
                </div>

                {/* フェーズ進捗バー */}
                <div className="flex gap-1 mb-4">
                  {([1, 2, 3, 4, 5, 6] as const).map((p) => (
                    <div
                      key={p}
                      className={`h-2 flex-1 rounded-full transition ${
                        p <= activeCultivation.phase ? "bg-emerald-500" : "bg-gray-700"
                      }`}
                    />
                  ))}
                </div>

                {/* ステータス */}
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="bg-gray-800 rounded-lg p-2">
                    <div className="text-gray-300 text-xs">インプット</div>
                    <div className="font-bold text-blue-300">
                      {Math.round(activeCultivation.totalInputPoints)}分
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2">
                    <div className="text-gray-300 text-xs">アウトプット</div>
                    <div className="font-bold text-orange-300">
                      {Math.round(activeCultivation.totalOutputPoints)}分
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2">
                    <div className="text-gray-300 text-xs">連続</div>
                    <div className="font-bold text-emerald-300">
                      {activeCultivation.streakDays}日
                    </div>
                  </div>
                </div>

                {/* 体調・充実感インジケータ */}
                {(activeCultivation.avgCondition !== undefined || activeCultivation.avgFulfillment !== undefined) && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {activeCultivation.avgCondition !== undefined && (
                      <div className="bg-gray-800 rounded-lg p-2 flex items-center justify-between">
                        <span className="text-gray-300">体調</span>
                        <span className="text-white font-medium">
                          {conditionEmoji(activeCultivation.avgCondition)} {activeCultivation.avgCondition.toFixed(1)}/5
                        </span>
                      </div>
                    )}
                    {activeCultivation.avgFulfillment !== undefined && (
                      <div className="bg-gray-800 rounded-lg p-2 flex items-center justify-between">
                        <span className="text-gray-300">充実感</span>
                        <span className="text-white font-medium">
                          {fulfillmentEmoji(activeCultivation.avgFulfillment)} {activeCultivation.avgFulfillment.toFixed(1)}/5
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* I/Oバランスバー */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-300 mb-1">
                    <span>Input</span>
                    <span>Output</span>
                  </div>
                  <BalanceBar
                    input={activeCultivation.totalInputPoints}
                    output={activeCultivation.totalOutputPoints}
                  />
                  <p className="text-xs text-gray-400 text-center mt-1">
                    理想比率 6:4（Input:Output）
                  </p>
                </div>

                {/* 配合情報 */}
                {activeCultivation.matingPartnerName && (
                  <div className="mt-4 bg-gray-800 rounded-lg p-3 text-sm">
                    <span className="text-gray-300">配合相手：</span>
                    <span className="text-purple-300 font-medium">{activeCultivation.matingPartnerName}</span>
                    <span className="text-gray-400 ml-2">
                      （共有{activeCultivation.sharedDomainCount}ドメイン）
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* アクションボタン */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Link
                href={`/record${activeCultivation ? `?cultivationId=${activeCultivation.id}` : ""}`}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-center font-medium"
              >
                学習を記録する
              </Link>
              <Link
                href="/cultivate/new"
                className="bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-3 text-center font-medium"
              >
                新しい栽培を始める
              </Link>
            </div>
          </>
        )}

        {/* 収穫済みキノコ */}
        {harvested.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm text-gray-300 mb-3 font-medium">収穫済みキノコ</h3>
            <div className="grid grid-cols-3 gap-3">
              {harvested.map((h) => {
                const hCert = getCertificationById(h.certificationId);
                return (
                <div key={h.id} className="bg-gray-900 rounded-xl p-3 text-center">
                  <MushroomSVG
                    morphology={h.finalMorphology}
                    phase={6}
                    speciesId={h.mushroomSpeciesId}
                    width={80}
                    height={112}
                    category={hCert?.category}
                  />
                  <p className="text-xs text-gray-200 mt-1 truncate">
                    {h.certificationName}
                  </p>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BalanceBar({ input, output }: { input: number; output: number }) {
  const total = input + output;
  if (total === 0) {
    return <div className="h-3 bg-gray-700 rounded-full" />;
  }
  const inputRatio = (input / total) * 100;

  return (
    <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
      <div className="bg-blue-500 transition-all" style={{ width: `${inputRatio}%` }} />
      <div className="bg-orange-500 transition-all" style={{ width: `${100 - inputRatio}%` }} />
    </div>
  );
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

function conditionEmoji(avg: number): string {
  if (avg >= 4.5) return "✨";
  if (avg >= 3.5) return "😊";
  if (avg >= 2.5) return "🙂";
  if (avg >= 1.5) return "😐";
  return "😣";
}

function fulfillmentEmoji(avg: number): string {
  if (avg >= 4.5) return "🔥";
  if (avg >= 3.5) return "😄";
  if (avg >= 2.5) return "🙂";
  if (avg >= 1.5) return "😕";
  return "😩";
}

// ============================================
// チュートリアルモーダル
// ============================================
function TutorialModal({
  step,
  setStep,
  onClose,
}: {
  step: number;
  setStep: (n: number) => void;
  onClose: () => void;
}) {
  const steps = [
    {
      emoji: "🍄",
      title: "Kinoko Lab へようこそ",
      body: "ITエンジニアの資格勉強を「キノコ栽培」で可視化するアプリです。毎日の学習がそのままキノコの成長になります。",
    },
    {
      emoji: "📚",
      title: "① 資格を選んで栽培開始",
      body: "基本情報・AWS・LPIC などから育てたい資格を選ぶと、対応するキノコキャラの栽培が始まります。既に収穫したキノコと「配合」して知識を引き継ぐこともできます。",
    },
    {
      emoji: "⏱️",
      title: "② 学習時間を15分単位で記録",
      body: "参考書・動画はインプット、問題集・模擬試験・ブログ執筆はアウトプット。時間・体調・充実感を記録するだけでキノコの成長に反映されます。",
    },
    {
      emoji: "👶",
      title: "③ キャラクターが段階的に成長",
      body: "胞子 → 幼少期 → 成長期 → 青年期 → 成人期 → 成熟期 と6段階で成長します。インプット過多は太っちょに、アウトプット過多は細身に体型が変化します。理想バランスは 6:4（Input:Output）。",
    },
    {
      emoji: "❤️",
      title: "④ 体調・充実感も成長に影響",
      body: "無理をすると成長ポイントが減ります。体調が悪い日が続くと警告が出るので休息を。充実感が高い学習は逆にブーストされます。",
    },
    {
      emoji: "🏆",
      title: "⑤ 実績で部屋を飾る",
      body: "連続記録・収穫数・配合など多数の実績を用意。解除で報酬アイテムが部屋に増えていきます。まずは「学習を1回記録する」から始めてみましょう！",
    },
  ];
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-emerald-700/50 rounded-2xl max-w-md w-full p-6">
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">{current.emoji}</div>
          <h2 className="text-lg font-bold text-emerald-300">{current.title}</h2>
        </div>
        <p className="text-sm text-gray-200 leading-relaxed mb-5">{current.body}</p>

        {/* ステップドット */}
        <div className="flex justify-center gap-1.5 mb-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition ${
                i === step ? "bg-emerald-400" : i < step ? "bg-emerald-700" : "bg-gray-700"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 text-sm"
            >
              戻る
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 text-sm"
          >
            スキップ
          </button>
          {!isLast ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
            >
              次へ
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
            >
              始める！
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <HomeContent />
    </Suspense>
  );
}
