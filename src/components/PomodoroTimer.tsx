"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ForwardedRef } from "react";
import MushroomSVG from "@/components/mushroom/MushroomSVG";
import type { Cultivation } from "@/lib/types";

export type PomodoroPhase = "idle" | "work" | "awaiting_break" | "break";

export interface PomodoroTimerHandle {
  /** 作業完了後の awaiting_break から休憩フェーズへ進める */
  startBreak: () => void;
}

interface Props {
  cultivation: Cultivation | null;
  /** 1回のワークセッションが完了したときに呼ばれる（分）。呼び出し後、タイマーは awaiting_break で停止する */
  onWorkComplete: (minutes: number) => void;
  /** デフォルト作業分数 */
  defaultWork?: number;
  /** デフォルト休憩分数 */
  defaultBreak?: number;
}

/**
 * ポモドーロタイマー
 * - 作業中: 中央のキャラクターが筋トレ風にバウンド（💪 + 汗）
 * - 休憩中: キャラクターがゆったり揺れて寛ぐ（☕ + Zzz）
 * - 1ワーク完了ごとに onWorkComplete(分) が呼ばれる
 */
const PomodoroTimer = forwardRef(function PomodoroTimer(
  {
    cultivation,
    onWorkComplete,
    defaultWork = 25,
    defaultBreak = 5,
  }: Props,
  ref: ForwardedRef<PomodoroTimerHandle>,
) {
  const [workMin, setWorkMin] = useState(defaultWork);
  const [breakMin, setBreakMin] = useState(defaultBreak);
  const [phase, setPhase] = useState<PomodoroPhase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(defaultWork * 60);
  const [sessions, setSessions] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // フェーズ切替時に残り時間をリセット
  useEffect(() => {
    if (phase === "idle") setSecondsLeft(workMin * 60);
    if (phase === "work") setSecondsLeft(workMin * 60);
    if (phase === "break") setSecondsLeft(breakMin * 60);
    // phase 変更時のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // idle 状態で設定変更したら表示も更新
  useEffect(() => {
    if (phase === "idle") setSecondsLeft(workMin * 60);
  }, [workMin, phase]);

  // カウントダウン
  useEffect(() => {
    if (phase === "idle" || phase === "awaiting_break") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // 0 到達処理
  useEffect(() => {
    if (secondsLeft > 0) return;
    if (phase === "work") {
      onWorkComplete(workMin);
      setSessions((n) => n + 1);
      // 休憩へ進むのは親が startBreak() を呼んだタイミング（フォーム入力完了後）
      setPhase("awaiting_break");
    } else if (phase === "break") {
      setPhase("work");
    }
  }, [secondsLeft, phase, workMin, onWorkComplete]);

  // 親から休憩開始をトリガーできるようにする
  useImperativeHandle(ref, () => ({
    startBreak: () => {
      setPhase("break");
    },
  }));

  function start() {
    setPhase("work");
  }
  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("idle");
    setSecondsLeft(workMin * 60);
  }
  function skip() {
    setSecondsLeft(0);
  }

  const totalSec = phase === "break" ? breakMin * 60 : workMin * 60;
  const progress = 1 - secondsLeft / totalSec;
  const mm = Math.max(0, Math.floor(secondsLeft / 60));
  const ss = Math.max(0, secondsLeft % 60).toString().padStart(2, "0");

  // 円周進捗バー
  const R = 130;
  const CIRC = 2 * Math.PI * R;
  const dash = CIRC * progress;

  const ringColor =
    phase === "work" ? "#f97316"
    : phase === "break" ? "#10b981"
    : phase === "awaiting_break" ? "#fbbf24"
    : "#374151";

  return (
    <div className="flex flex-col items-center">
      {/* タイマー盤面 */}
      <div className="relative" style={{ width: 300, height: 300 }}>
        <svg width={300} height={300} viewBox="0 0 300 300">
          <circle
            cx={150}
            cy={150}
            r={R}
            fill="none"
            stroke="#1f2937"
            strokeWidth={10}
          />
          <circle
            cx={150}
            cy={150}
            r={R}
            fill="none"
            stroke={ringColor}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            transform="rotate(-90 150 150)"
            style={{ transition: "stroke-dasharray 0.8s linear, stroke 0.3s" }}
          />
        </svg>

        {/* 中央キャラクター */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="relative">
            {cultivation && (
              <div
                className={
                  phase === "work"
                    ? "pomo-workout"
                    : phase === "break"
                    ? "pomo-rest"
                    : ""
                }
              >
                <MushroomSVG
                  morphology={cultivation.morphology}
                  phase={cultivation.phase}
                  speciesId={cultivation.mushroomSpeciesId}
                  width={150}
                  height={170}
                  soloMode
                />
              </div>
            )}
            {/* 作業中: 筋トレアイコン + 汗 */}
            {phase === "work" && (
              <>
                <div
                  className="absolute text-2xl"
                  style={{ top: "35%", left: "-18px" }}
                >
                  💪
                </div>
                <div
                  className="absolute text-2xl"
                  style={{ top: "35%", right: "-18px" }}
                >
                  📖
                </div>
                <div
                  className="absolute text-lg pomo-sweat"
                  style={{ top: "10%", right: "10%" }}
                >
                  💦
                </div>
              </>
            )}
            {/* 休憩中: くつろぎ演出 */}
            {phase === "break" && (
              <>
                <div
                  className="absolute text-2xl"
                  style={{ top: "45%", right: "-22px" }}
                >
                  ☕
                </div>
                <div
                  className="absolute text-xl pomo-zzz"
                  style={{ top: "5%", left: "55%" }}
                >
                  💤
                </div>
              </>
            )}
          </div>
          {/* 残り時間 */}
          <div className="mt-2 text-center">
            <div className="text-3xl font-bold text-white tabular-nums">
              {mm}:{ss}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {phase === "work" && "集中中…"}
              {phase === "break" && "休憩中"}
              {phase === "idle" && "スタートしよう"}
              {phase === "awaiting_break" && "🎉 完了！記録してね"}
            </div>
          </div>
        </div>
      </div>

      {/* セッション数 */}
      <div className="text-xs text-gray-400 mt-2">
        完了セッション: <span className="text-emerald-300 font-semibold">{sessions}</span>
      </div>

      {/* 操作 */}
      <div className="flex gap-2 mt-4">
        {phase === "idle" ? (
          <button
            onClick={start}
            className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            ▶ スタート
          </button>
        ) : phase === "awaiting_break" ? (
          <div className="text-xs text-amber-300 text-center">
            下のフォームに体調・充実感・メモを入力して記録してください
          </div>
        ) : (
          <>
            <button
              onClick={skip}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm"
            >
              スキップ
            </button>
            <button
              onClick={stop}
              className="px-4 py-2 rounded-lg bg-red-900/50 hover:bg-red-900 text-red-200 text-sm"
            >
              停止
            </button>
          </>
        )}
      </div>

      {/* 設定（idle時のみ） */}
      {phase === "idle" && (
        <div className="mt-5 flex gap-4 text-sm text-gray-300">
          <label className="flex items-center gap-1">
            作業
            <input
              type="number"
              min={5}
              max={90}
              value={workMin}
              onChange={(e) => setWorkMin(Math.max(5, Math.min(90, Number(e.target.value) || 25)))}
              className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
            />
            分
          </label>
          <label className="flex items-center gap-1">
            休憩
            <input
              type="number"
              min={1}
              max={30}
              value={breakMin}
              onChange={(e) => setBreakMin(Math.max(1, Math.min(30, Number(e.target.value) || 5)))}
              className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
            />
            分
          </label>
        </div>
      )}
    </div>
  );
});

export default PomodoroTimer;
