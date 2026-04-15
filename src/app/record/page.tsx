"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import { getUserCultivations, addStudyLog, getStudyLogsByCultivation } from "@/lib/firestore";
import { getCertificationById } from "@/lib/masterdata";
import { MINUTES_OPTIONS, INPUT_SUGGESTIONS, OUTPUT_SUGGESTIONS, CONDITION_OPTIONS, FULFILLMENT_OPTIONS } from "@/lib/types";
import type { Cultivation, StudyLog } from "@/lib/types";
import Link from "next/link";
import PomodoroTimer, { type PomodoroTimerHandle } from "@/components/PomodoroTimer";

function RecordContent() {
  const { firebaseUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("cultivationId");

  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [selectedCultivationId, setSelectedCultivationId] = useState<string>(preselectedId || "");
  const [recordType, setRecordType] = useState<"input" | "output">("input");
  const [subType, setSubType] = useState<string>("");
  const [subTypeInput, setSubTypeInput] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [minutes, setMinutes] = useState<number>(30);
  const [condition, setCondition] = useState<number>(3);
  const [fulfillment, setFulfillment] = useState<number>(3);
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mode, setMode] = useState<"manual" | "pomodoro">("manual");
  const [pomoStatus, setPomoStatus] = useState<string>("");
  /** ワーク完了後、フォーム入力と記録待ちの分数。null=作業中/未開始 */
  const [pomoPending, setPomoPending] = useState<number | null>(null);
  const pomoTimerRef = useRef<PomodoroTimerHandle>(null);
  const [recentLogs, setRecentLogs] = useState<StudyLog[]>([]);
  const [customHistory, setCustomHistory] = useState<{ input: string[]; output: string[] }>({ input: [], output: [] });
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    getUserCultivations(firebaseUser.uid).then((c) => {
      setCultivations(c);
      if (c.length > 0 && !selectedCultivationId) {
        setSelectedCultivationId(c[0].id);
      }
    });
  }, [firebaseUser]);

  useEffect(() => {
    if (!selectedCultivationId) return;
    getStudyLogsByCultivation(selectedCultivationId).then((logs) => {
      setRecentLogs(logs);
      // 過去の種別をカスタム履歴として収集
      const inputHistory = new Set<string>();
      const outputHistory = new Set<string>();
      for (const log of logs) {
        if (log.type === "input") inputHistory.add(log.subType);
        else outputHistory.add(log.subType);
      }
      setCustomHistory({
        input: [...inputHistory],
        output: [...outputHistory],
      });
    });
  }, [selectedCultivationId]);

  // 種別候補リスト（サジェスト + 過去履歴、重複排除）
  const suggestions = (() => {
    const defaults = recordType === "input" ? INPUT_SUGGESTIONS : OUTPUT_SUGGESTIONS;
    const history = recordType === "input" ? customHistory.input : customHistory.output;
    const all = [...new Set([...history, ...defaults])];
    if (!subTypeInput) return all;
    return all.filter(s => s.toLowerCase().includes(subTypeInput.toLowerCase()));
  })();

  // 外部クリックでサジェスト閉じる
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectSubType(value: string) {
    setSubType(value);
    setSubTypeInput(value);
    setShowSuggestions(false);
  }

  async function handleSubmit() {
    if (!firebaseUser || !selectedCultivationId || minutes <= 0) return;
    const finalSubType = subTypeInput.trim() || subType || (recordType === "input" ? "インプット" : "アウトプット");
    setSubmitting(true);
    try {
      const result = await addStudyLog({
        userId: firebaseUser.uid,
        cultivationId: selectedCultivationId,
        type: recordType,
        subType: finalSubType,
        minutes,
        memo,
        date,
        condition,
        fulfillment,
        isPomodoro: false,
      });
      // メイン画面に遷移して変化をハイライト
      const params = new URLSearchParams({
        updated: "1",
        cultivationId: selectedCultivationId,
        minutes: String(minutes),
        type: recordType,
        phaseBefore: String(result.phaseBefore),
        phaseAfter: String(result.phaseAfter),
      });
      if (result.newlyUnlockedAchievements.length > 0) {
        params.set("achievements", result.newlyUnlockedAchievements.join(","));
      }
      router.push(`/?${params.toString()}`);
    } finally {
      setSubmitting(false);
    }
  }

  /** ポモドーロのワークセッション1回完了時に呼ばれる（タイマー停止→フォーム入力待ち） */
  function handlePomodoroComplete(workedMinutes: number) {
    setPomoPending(workedMinutes);
    setMemo("");
    setPomoStatus(`🎉 ${workedMinutes}分完了！体調・充実感・メモを入力して記録してください`);
  }

  /** ポモドーロの記録ボタン押下：保存 → 休憩フェーズ開始 */
  async function handlePomodoroSave() {
    if (!firebaseUser || !selectedCultivationId || pomoPending == null) return;
    const finalSubType = subTypeInput.trim() || subType || (recordType === "input" ? "インプット" : "アウトプット");
    setSubmitting(true);
    try {
      await addStudyLog({
        userId: firebaseUser.uid,
        cultivationId: selectedCultivationId,
        type: recordType,
        subType: finalSubType,
        minutes: pomoPending,
        memo,
        date: new Date().toISOString().split("T")[0],
        condition,
        fulfillment,
        isPomodoro: true,
      });
      setPomoStatus(`✓ ${pomoPending}分を記録（+30% ボーナス）`);
      setPomoPending(null);
      pomoTimerRef.current?.startBreak();
      setTimeout(() => setPomoStatus(""), 4000);
    } catch {
      setPomoStatus("記録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  /** 時間を表示用にフォーマット（分のみ統一） */
  function formatMinutes(m: number): string {
    return `${m}分`;
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <Link href="/login">ログインしてください</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-white text-sm">&larr; 戻る</Link>
        <h1 className="text-lg font-bold text-emerald-400">学習記録</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 栽培選択 */}
        {cultivations.length > 1 && (
          <div className="mb-4">
            <label className="text-sm text-gray-200 block mb-1">栽培中のキノコ</label>
            <select
              value={selectedCultivationId}
              onChange={(e) => setSelectedCultivationId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            >
              {cultivations.map((c) => {
                const cert = getCertificationById(c.certificationId);
                return <option key={c.id} value={c.id}>{cert?.name ?? "不明"}</option>;
              })}
            </select>
          </div>
        )}

        {/* モード切替: 手動 / ポモドーロ */}
        <div className="flex gap-2 mb-4 bg-gray-900 p-1 rounded-lg border border-gray-800">
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-2 rounded-md font-medium text-sm transition ${
              mode === "manual"
                ? "bg-emerald-600 text-white"
                : "text-gray-400 hover:bg-gray-800"
            }`}
          >
            📝 手動で記録
          </button>
          <button
            onClick={() => setMode("pomodoro")}
            className={`flex-1 py-2 rounded-md font-medium text-sm transition ${
              mode === "pomodoro"
                ? "bg-orange-600 text-white"
                : "text-gray-400 hover:bg-gray-800"
            }`}
          >
            🍅 ポモドーロタイマー <span className="text-[10px] opacity-90">+30%</span>
          </button>
        </div>

        {/* Input / Output 切替 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setRecordType("input"); setSubType(""); setSubTypeInput(""); }}
            className={`flex-1 py-2 rounded-lg font-medium text-sm transition ${
              recordType === "input"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            インプット
          </button>
          <button
            onClick={() => { setRecordType("output"); setSubType(""); setSubTypeInput(""); }}
            className={`flex-1 py-2 rounded-lg font-medium text-sm transition ${
              recordType === "output"
                ? "bg-orange-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            アウトプット
          </button>
        </div>

        {/* 種別（自由入力 + セレクトボックス） */}
        <div className="mb-4 relative" ref={suggestionsRef}>
          <label className="text-sm text-gray-200 block mb-1">種別</label>
          <input
            type="text"
            value={subTypeInput}
            onChange={(e) => { setSubTypeInput(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="入力または選択..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => selectSubType(s)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ポモドーロタイマー（種別の下に配置） */}
        {mode === "pomodoro" && (
          <div className="mb-6">
            <PomodoroTimer
              ref={pomoTimerRef}
              cultivation={cultivations.find((c) => c.id === selectedCultivationId) ?? null}
              onWorkComplete={handlePomodoroComplete}
            />
            {pomoStatus && (
              <div className="mt-3 bg-orange-900/40 border border-orange-700 rounded-lg px-4 py-2 text-orange-200 text-center text-sm">
                {pomoStatus}
              </div>
            )}
            {pomoPending == null && (
              <div className="mt-4 bg-gray-900/60 border border-gray-800 rounded-lg p-4 leading-relaxed space-y-3">
                <div className="font-semibold text-gray-100 text-sm flex items-center gap-2">
                  🍅 ポモドーロタイマーとは？
                </div>

                <p className="text-xs text-gray-300">
                  1960年代にフランチェスコ・シリロが考案した<span className="text-orange-300 font-semibold">時間管理術</span>です。
                  「集中 → 休憩」を1セットとして繰り返すことで、脳の疲れを防ぎながら高い集中力を維持できます。
                </p>

                <div className="text-xs text-gray-400 space-y-1.5">
                  <div className="font-medium text-gray-200">⏱ 基本サイクル</div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold shrink-0">1.</span>
                    <span>タイマーを <span className="text-white">25分</span> にセットして、ひとつの課題だけに集中する</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold shrink-0">2.</span>
                    <span>タイマーが鳴ったら <span className="text-emerald-300">5分</span> 休憩する（席を立つ・水を飲むなど）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold shrink-0">3.</span>
                    <span>4セット繰り返したら <span className="text-emerald-300">15〜30分</span> の長休憩を取る</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400 space-y-1">
                  <div className="font-medium text-gray-200">✅ このアプリでの使い方</div>
                  <ol className="list-decimal list-inside space-y-1 pl-1">
                    <li>種別（参考書・問題集など）を選ぶ</li>
                    <li>▶ スタート を押して集中を開始</li>
                    <li>タイマーが終わったら体調・充実感・メモを入力</li>
                    <li>🍅 記録して休憩へ を押すと保存＆休憩スタート</li>
                  </ol>
                </div>

                <div className="text-xs bg-orange-950/40 border border-orange-800/50 rounded-md px-3 py-2">
                  <span className="text-orange-300 font-semibold">+30% 成長ボーナス</span>
                  <span className="text-gray-300"> がつくので、手動記録より効率よくキノコが育ちます！</span>
                </div>

                <p className="text-[11px] text-gray-500">
                  💡 時間は上の設定で変更できます。集中が続かない初心者は <span className="text-gray-400">15分</span> から始めるのもおすすめです。
                </p>
              </div>
            )}
          </div>
        )}

        {/* 時間（15分刻み） - 手動モードのみ */}
        {mode === "manual" && (
        <div className="mb-4">
          <label className="text-sm text-gray-200 block mb-2">学習時間</label>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setMinutes(Math.max(15, minutes - 15))}
              className="w-10 h-10 bg-gray-800 rounded-lg text-xl text-gray-300 hover:bg-gray-700 flex items-center justify-center"
            >
              -
            </button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-bold text-white">{formatMinutes(minutes)}</span>
            </div>
            <button
              onClick={() => setMinutes(minutes + 15)}
              className="w-10 h-10 bg-gray-800 rounded-lg text-xl text-gray-300 hover:bg-gray-700 flex items-center justify-center"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MINUTES_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                className={`px-2 py-1 rounded text-xs transition ${
                  minutes === m
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                }`}
              >
                {formatMinutes(m)}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* 体調・充実感・メモ: 手動モード常時 / ポモドーロモードは完了後のみ表示 */}
        {(mode === "manual" || pomoPending != null) && (<>
        {/* 体調（学習中の状態） */}
        <div className="mb-4">
          <label className="text-sm text-gray-200 block mb-2">
            体調 <span className="text-xs text-gray-400">（学習時の調子）</span>
          </label>
          <div className="flex gap-1.5">
            {CONDITION_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => setCondition(c.value)}
                className={`flex-1 py-2 rounded-lg flex flex-col items-center transition ${
                  condition === c.value
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <span className="text-xl leading-none">{c.emoji}</span>
                <span className="text-[10px] mt-0.5">{c.label}</span>
              </button>
            ))}
          </div>
          {condition <= 2 && (
            <p className="text-xs text-amber-300 mt-1">
              ⚠ 無理は禁物。成長ポイントが少し減ります。休息も大切に。
            </p>
          )}
        </div>

        {/* 充実感・達成感 */}
        <div className="mb-4">
          <label className="text-sm text-gray-200 block mb-2">
            充実感 <span className="text-xs text-gray-400">（やり終えた手応え）</span>
          </label>
          <div className="flex gap-1.5">
            {FULFILLMENT_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFulfillment(f.value)}
                className={`flex-1 py-2 rounded-lg flex flex-col items-center transition ${
                  fulfillment === f.value
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <span className="text-xl leading-none">{f.emoji}</span>
                <span className="text-[10px] mt-0.5">{f.label}</span>
              </button>
            ))}
          </div>
          {fulfillment >= 4 && (
            <p className="text-xs text-emerald-300 mt-1">
              ✨ 充実した学習はキノコの成長を加速させます！
            </p>
          )}
        </div>

        {/* 日付 - 手動モードのみ（ポモドーロは今日扱い） */}
        {mode === "manual" && (
        <div className="mb-4">
          <label className="text-sm text-gray-200 block mb-1">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          />
        </div>
        )}

        {/* メモ */}
        <div className="mb-6">
          <label className="text-sm text-gray-200 block mb-1">メモ（任意）</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white resize-none"
            placeholder="学んだこと、つまづいたこと..."
          />
        </div>
        </>)}

        {/* ポモドーロ記録ボタン（完了後に表示） */}
        {mode === "pomodoro" && pomoPending != null && (
          <button
            onClick={handlePomodoroSave}
            disabled={submitting || !selectedCultivationId}
            className={`w-full py-3 rounded-xl font-medium text-lg transition ${
              submitting
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-orange-600 hover:bg-orange-700 text-white"
            }`}
          >
            {submitting ? "記録中..." : `🍅 ${pomoPending}分を記録して休憩へ（+30%）`}
          </button>
        )}

        {/* 記録ボタン - 手動モードのみ */}
        {mode === "manual" && (
        <button
          onClick={handleSubmit}
          disabled={submitting || minutes <= 0 || !selectedCultivationId}
          className={`w-full py-3 rounded-xl font-medium text-lg transition ${
            submitting || minutes <= 0
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          {submitting ? "記録中..." : "記録する"}
        </button>
        )}

        {showSuccess && (
          <div className="mt-3 bg-emerald-900/50 border border-emerald-700 rounded-lg px-4 py-2 text-emerald-300 text-center text-sm">
            記録しました！キノコの環境が更新されました。
          </div>
        )}

        {/* 最近の記録 */}
        {recentLogs.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm text-gray-200 mb-3 font-medium">最近の記録</h3>
            <div className="space-y-2">
              {recentLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="bg-gray-900 rounded-lg px-3 py-2 flex items-center gap-3 text-sm"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      log.type === "input" ? "bg-blue-500" : "bg-orange-500"
                    }`}
                  />
                  <span className="text-gray-200 flex-1">{log.subType}</span>
                  <span className="text-white font-medium">{formatMinutes(log.minutes)}</span>
                  <span className="text-gray-400 text-xs">{log.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <RecordContent />
    </Suspense>
  );
}
