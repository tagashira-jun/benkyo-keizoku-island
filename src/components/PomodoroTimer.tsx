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
  /** 永続化キー（異なる栽培/タスクごとに別タイマーを維持したい場合に使う） */
  persistKey?: string;
}

/** localStorage に保存するタイマー状態 */
interface PersistedPomodoro {
  phase: PomodoroPhase;
  workMin: number;
  breakMin: number;
  /** 現フェーズの開始時刻（ms）。idle/awaiting_break の時は null */
  startedAt: number | null;
  /** work/break の全体秒数（当該フェーズの） */
  totalSec: number;
  /** 完了セッション数 */
  sessions: number;
  /** idle 時に awaiting_break から引き継ぐための保留分数 */
  pendingMinutes: number | null;
}

const DEFAULT_KEY = "kinoko_pomodoro_state_v1";

function loadPersisted(key: string): PersistedPomodoro | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedPomodoro;
  } catch {
    return null;
  }
}

function savePersisted(key: string, state: PersistedPomodoro): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function clearPersisted(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * ポモドーロタイマー
 * - 作業中: 中央のキャラクターが筋トレ風にバウンド（💪 + 汗）
 * - 休憩中: キャラクターがゆったり揺れて寛ぐ（☕ + Zzz）
 * - 1ワーク完了ごとに onWorkComplete(分) が呼ばれる
 * - 画面遷移・タブ閉じを挟んでも localStorage + startedAt から残り時間を復元する
 */
const PomodoroTimer = forwardRef(function PomodoroTimer(
  {
    cultivation,
    onWorkComplete,
    defaultWork = 25,
    defaultBreak = 5,
    persistKey = DEFAULT_KEY,
  }: Props,
  ref: ForwardedRef<PomodoroTimerHandle>,
) {
  // 初期化（SSR安全: 初期値は定数、マウント後に localStorage から復元）
  const [workMin, setWorkMin] = useState(defaultWork);
  const [breakMin, setBreakMin] = useState(defaultBreak);
  const [phase, setPhase] = useState<PomodoroPhase>("idle");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(defaultWork * 60);
  const [sessions, setSessions] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeFiredRef = useRef(false);
  const onWorkCompleteRef = useRef(onWorkComplete);

  useEffect(() => {
    onWorkCompleteRef.current = onWorkComplete;
  }, [onWorkComplete]);

  /** 現在の状態を localStorage に保存 */
  function persistCurrent(
    next: Partial<PersistedPomodoro> & { phase?: PomodoroPhase },
  ) {
    const state: PersistedPomodoro = {
      phase: next.phase ?? phase,
      workMin: next.workMin ?? workMin,
      breakMin: next.breakMin ?? breakMin,
      startedAt: next.startedAt ?? startedAt,
      totalSec:
        next.totalSec ??
        ((next.phase ?? phase) === "break"
          ? (next.breakMin ?? breakMin) * 60
          : (next.workMin ?? workMin) * 60),
      sessions: next.sessions ?? sessions,
      pendingMinutes: next.pendingMinutes ?? null,
    };
    savePersisted(persistKey, state);
  }

  // 初回マウント: localStorage から状態を復元
  useEffect(() => {
    const saved = loadPersisted(persistKey);
    if (!saved) return;
    setWorkMin(saved.workMin);
    setBreakMin(saved.breakMin);
    setSessions(saved.sessions);

    if (saved.phase === "work" || saved.phase === "break") {
      // 経過時間から残り秒数を計算
      if (saved.startedAt) {
        const elapsed = Math.floor((Date.now() - saved.startedAt) / 1000);
        const remaining = saved.totalSec - elapsed;
        if (remaining > 0) {
          setPhase(saved.phase);
          setStartedAt(saved.startedAt);
          setSecondsLeft(remaining);
          return;
        }
        // すでにタイマーは 0 以下 → フェーズ終了処理へ流す
        if (saved.phase === "work") {
          // work が完了済み扱い → onWorkComplete を発火して awaiting_break に
          completeFiredRef.current = true; // 二重発火防止
          onWorkCompleteRef.current(saved.workMin);
          setPhase("awaiting_break");
          setStartedAt(null);
          setSecondsLeft(0);
          setSessions((n) => n + 1);
          persistCurrent({
            phase: "awaiting_break",
            startedAt: null,
            sessions: saved.sessions + 1,
            pendingMinutes: saved.workMin,
          });
          return;
        }
        // break が完了済み → idle に戻す（次の work 開始待ち）
        setPhase("idle");
        setStartedAt(null);
        setSecondsLeft(saved.workMin * 60);
        clearPersisted(persistKey);
        return;
      }
    }

    if (saved.phase === "awaiting_break") {
      setPhase("awaiting_break");
      setSecondsLeft(0);
      return;
    }

    // idle 等: workMin を秒数に反映
    setPhase("idle");
    setSecondsLeft(saved.workMin * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  // idle 状態で作業分数が変わったら表示を更新＋永続化
  useEffect(() => {
    if (phase === "idle") {
      setSecondsLeft(workMin * 60);
      persistCurrent({ phase: "idle" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workMin]);

  // カウントダウン: startedAt からの経過で残り時間を毎秒再計算（タブ非アクティブ耐性あり）
  useEffect(() => {
    if (phase !== "work" && phase !== "break") return;
    if (!startedAt) return;

    const totalSec = (phase === "break" ? breakMin : workMin) * 60;

    function updateRemaining() {
      const elapsed = Math.floor((Date.now() - (startedAt as number)) / 1000);
      setSecondsLeft(Math.max(0, totalSec - elapsed));
    }
    updateRemaining();
    tickRef.current = setInterval(updateRemaining, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, startedAt, workMin, breakMin]);

  // 0 到達処理
  useEffect(() => {
    if (secondsLeft > 0) return;
    if (phase === "work") {
      if (completeFiredRef.current) {
        // 復元ルートで既に発火済み
        completeFiredRef.current = false;
        return;
      }
      onWorkCompleteRef.current(workMin);
      const nextSessions = sessions + 1;
      setSessions(nextSessions);
      setPhase("awaiting_break");
      setStartedAt(null);
      persistCurrent({
        phase: "awaiting_break",
        startedAt: null,
        sessions: nextSessions,
        pendingMinutes: workMin,
      });
    } else if (phase === "break") {
      setPhase("idle");
      setStartedAt(null);
      setSecondsLeft(workMin * 60);
      clearPersisted(persistKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  useImperativeHandle(ref, () => ({
    startBreak: () => {
      const now = Date.now();
      setPhase("break");
      setStartedAt(now);
      setSecondsLeft(breakMin * 60);
      persistCurrent({
        phase: "break",
        startedAt: now,
        totalSec: breakMin * 60,
        pendingMinutes: null,
      });
    },
  }));

  function start() {
    const now = Date.now();
    setPhase("work");
    setStartedAt(now);
    setSecondsLeft(workMin * 60);
    persistCurrent({
      phase: "work",
      startedAt: now,
      totalSec: workMin * 60,
      pendingMinutes: null,
    });
  }

  function stop() {
    if (tickRef.current) clearInterval(tickRef.current);
    setPhase("idle");
    setStartedAt(null);
    setSecondsLeft(workMin * 60);
    clearPersisted(persistKey);
  }

  function skip() {
    setSecondsLeft(0);
  }

  const totalSec = phase === "break" ? breakMin * 60 : workMin * 60;
  const progress = 1 - secondsLeft / totalSec;
  const mm = Math.max(0, Math.floor(secondsLeft / 60));
  const ss = Math.max(0, secondsLeft % 60).toString().padStart(2, "0");

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
          <circle cx={150} cy={150} r={R} fill="none" stroke="#1f2937" strokeWidth={10} />
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
            {phase === "work" && (
              <>
                <div className="absolute text-2xl" style={{ top: "35%", left: "-18px" }}>💪</div>
                <div className="absolute text-2xl" style={{ top: "35%", right: "-18px" }}>📖</div>
                <div className="absolute text-lg pomo-sweat" style={{ top: "10%", right: "10%" }}>💦</div>
              </>
            )}
            {phase === "break" && (
              <>
                <div className="absolute text-2xl" style={{ top: "45%", right: "-22px" }}>☕</div>
                <div className="absolute text-xl pomo-zzz" style={{ top: "5%", left: "55%" }}>💤</div>
              </>
            )}
          </div>
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

      <div className="text-xs text-gray-400 mt-2">
        完了セッション: <span className="text-emerald-300 font-semibold">{sessions}</span>
      </div>

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
