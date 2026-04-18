"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCultivation,
  getRoadmapByCultivation,
  toggleRoadmapTask,
  incrementTaskPomodoro,
  addStudyLog,
  checkAndUnlockAchievements,
} from "@/lib/firestore";
import { resolveCultivationCert, getAchievementById } from "@/lib/masterdata";
import { isChapterComplete } from "@/lib/roadmap";
import type {
  Cultivation,
  StudyRoadmap,
  RoadmapChapter,
  RoadmapTask,
} from "@/lib/types";
import PomodoroTimer, { type PomodoroTimerHandle } from "@/components/PomodoroTimer";
import Link from "next/link";

export default function RoadmapPage() {
  const { firebaseUser } = useAuth();
  const router = useRouter();
  const params = useParams<{ cultivationId: string }>();
  const cultivationId = params?.cultivationId;

  const [cultivation, setCultivation] = useState<Cultivation | null>(null);
  const [roadmap, setRoadmap] = useState<StudyRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<{ chapterId: string; taskId: string } | null>(null);
  const [toast, setToast] = useState<string>("");
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const pomoRef = useRef<PomodoroTimerHandle>(null);
  const [pomoPending, setPomoPending] = useState<number | null>(null);

  // 初回訪問チュートリアル
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem("kinoko_tutorial_roadmap_v1");
    if (!seen) setShowTutorial(true);
  }, []);

  function closeTutorial() {
    if (typeof window !== "undefined") {
      localStorage.setItem("kinoko_tutorial_roadmap_v1", "1");
    }
    setShowTutorial(false);
  }

  async function reload() {
    if (!cultivationId) return;
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        getCultivation(cultivationId),
        getRoadmapByCultivation(cultivationId),
      ]);
      setCultivation(c);
      setRoadmap(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!firebaseUser || !cultivationId) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, cultivationId]);

  const cert = cultivation ? resolveCultivationCert(cultivation) : null;

  const stats = useMemo(() => {
    if (!roadmap) return { total: 0, completed: 0, chapters: 0, chaptersClear: 0 };
    let total = 0;
    let completed = 0;
    let chaptersClear = 0;
    for (const c of roadmap.chapters) {
      for (const t of c.tasks) {
        total++;
        if (t.isCompleted) completed++;
      }
      if (isChapterComplete(c)) chaptersClear++;
    }
    return { total, completed, chapters: roadmap.chapters.length, chaptersClear };
  }, [roadmap]);

  async function handleToggle(task: RoadmapTask, chapter: RoadmapChapter) {
    if (!roadmap) return;
    const next = !task.isCompleted;
    // optimistic update
    setRoadmap({
      ...roadmap,
      chapters: roadmap.chapters.map((c) =>
        c.id === chapter.id
          ? { ...c, tasks: c.tasks.map((t) => (t.id === task.id ? { ...t, isCompleted: next } : t)) }
          : c,
      ),
    });
    try {
      const res = await toggleRoadmapTask({
        roadmapId: roadmap.id,
        chapterId: chapter.id,
        taskId: task.id,
        nextCompleted: next,
      });
      setRoadmap({ ...roadmap, chapters: res.updatedChapters });
      if (next && res.chapterCleared) {
        showToast(`🎉 章「${chapter.title}」クリア！ +${50} XP ボーナス`);
      } else if (next && res.totalXpGained > 0) {
        showToast(`+${res.totalXpGained} XP`);
      }
      if (next && firebaseUser) {
        void evaluateUnlocks();
      }
    } catch {
      reload();
    }
  }

  async function evaluateUnlocks() {
    if (!firebaseUser) return;
    try {
      const newIds = await checkAndUnlockAchievements(firebaseUser.uid);
      if (newIds.length === 0) return;
      const names = newIds
        .map((id) => getAchievementById(id)?.name)
        .filter(Boolean)
        .slice(0, 3)
        .join("、");
      if (names) showToast(`🏆 実績解除: ${names}`);
    } catch {
      // 実績評価の失敗は画面体験を壊さないよう無視
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  // タスクをポモドーロで実行開始（現在のポモドーロセッションとタスクを紐づけ）
  function startPomodoroForTask(task: RoadmapTask, chapter: RoadmapChapter) {
    setActiveTask({ chapterId: chapter.id, taskId: task.id });
    // スクロール補助
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handlePomodoroComplete(workedMinutes: number) {
    setPomoPending(workedMinutes);
  }

  async function handlePomodoroSave() {
    if (!firebaseUser || !cultivation || !roadmap || !activeTask || pomoPending == null) return;
    const chapter = roadmap.chapters.find((c) => c.id === activeTask.chapterId);
    const task = chapter?.tasks.find((t) => t.id === activeTask.taskId);
    if (!chapter || !task) return;
    try {
      // 学習記録として保存（種別はタスクタイトルから）
      await addStudyLog({
        userId: firebaseUser.uid,
        cultivationId: cultivation.id,
        type: "input",
        subType: chapter.title,
        minutes: pomoPending,
        memo: `🗺 ${task.title}`,
        date: new Date().toISOString().split("T")[0],
        isPomodoro: true,
      });
      await incrementTaskPomodoro({
        roadmapId: roadmap.id,
        chapterId: chapter.id,
        taskId: task.id,
      });
      // タスクが25分以内のポモドーロタスクなら、1ポモで完了扱いにする
      if (task.type === "pomodoro" && !task.isCompleted) {
        await toggleRoadmapTask({
          roadmapId: roadmap.id,
          chapterId: chapter.id,
          taskId: task.id,
          nextCompleted: true,
        });
      }
      showToast(`✓ ${pomoPending}分を記録（+30% ボーナス）`);
      setPomoPending(null);
      pomoRef.current?.startBreak();
      reload();
      void evaluateUnlocks();
    } catch {
      showToast("保存に失敗しました");
    }
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <Link href="/login">ログインしてください</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center">読み込み中…</div>;
  }

  if (!cultivation) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center">
        <p>栽培が見つかりません。</p>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Header cultivationName={cert?.name ?? ""} onBack={() => router.push("/")} cultivationId={cultivation.id} />
        <div className="max-w-lg mx-auto px-4 py-10 text-center">
          <div className="text-5xl mb-3">🗺</div>
          <h2 className="text-lg font-bold mb-2">ロードマップがまだ作られていません</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            栽培開始時にGeminiへプロンプトを貼ってロードマップを作るか、下のボタンから手動で追加できます。
          </p>
          <Link
            href={`/cultivate/new`}
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm"
          >
            栽培を作り直す（ロードマップ付き）
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header cultivationName={cert?.name ?? ""} onBack={() => router.push("/")} cultivationId={cultivation.id} />
      {showTutorial && (
        <RoadmapTutorial
          step={tutorialStep}
          setStep={setTutorialStep}
          onClose={closeTutorial}
        />
      )}

      <div className="max-w-lg mx-auto px-4 py-5">
        {/* 進捗ヘッダー */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-emerald-300">🗺 学習ロードマップ</h2>
            <span className="text-xs text-gray-400">
              {stats.completed} / {stats.total} タスク
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all"
              style={{ width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : "0%" }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
            <div className="bg-gray-800 rounded-lg py-2">
              <div className="text-gray-400">章クリア</div>
              <div className="text-emerald-300 font-bold">{stats.chaptersClear} / {stats.chapters}</div>
            </div>
            <div className="bg-gray-800 rounded-lg py-2">
              <div className="text-gray-400">累計XP</div>
              <div className="text-amber-300 font-bold">{roadmap.totalXp ?? 0}</div>
            </div>
            <div className="bg-gray-800 rounded-lg py-2">
              <div className="text-gray-400">進捗率</div>
              <div className="text-emerald-300 font-bold">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* ポモドーロセクション */}
        {activeTask && (
          <div className="bg-gray-900 border border-orange-700/40 rounded-2xl p-4 mb-4">
            {(() => {
              const chapter = roadmap.chapters.find((c) => c.id === activeTask.chapterId);
              const task = chapter?.tasks.find((t) => t.id === activeTask.taskId);
              if (!task || !chapter) return null;
              return (
                <>
                  <div className="text-xs text-orange-300 mb-1">取り組み中のタスク</div>
                  <div className="text-sm font-semibold mb-3">{task.title}</div>
                  <PomodoroTimer
                    ref={pomoRef}
                    cultivation={cultivation}
                    onWorkComplete={handlePomodoroComplete}
                    defaultWork={Math.min(25, task.estimatedMinutes)}
                    persistKey={`kinoko_pomo_roadmap_${roadmap.id}_${task.id}`}
                  />
                  {pomoPending != null && (
                    <button
                      onClick={handlePomodoroSave}
                      className="w-full mt-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium"
                    >
                      🍅 {pomoPending}分を記録して休憩へ（+30%）
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTask(null)}
                    className="w-full mt-2 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-xs"
                  >
                    別のタスクに戻る
                  </button>
                </>
              );
            })()}
          </div>
        )}

        {/* 章リスト */}
        <div className="space-y-4">
          {roadmap.chapters.map((chapter) => {
            const cleared = isChapterComplete(chapter);
            const chCompleted = chapter.tasks.filter((t) => t.isCompleted).length;
            return (
              <div
                key={chapter.id}
                className={`bg-gray-900 rounded-2xl p-4 border ${
                  cleared ? "border-emerald-600/60" : "border-gray-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-bold ${cleared ? "text-emerald-300" : "text-white"}`}>
                    {cleared && "✅ "}{chapter.title}
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {chCompleted}/{chapter.tasks.length}
                  </span>
                </div>
                {chapter.summary && (
                  <div className="text-xs text-gray-400 italic mb-3">{chapter.summary}</div>
                )}
                <ul className="space-y-2">
                  {chapter.tasks.map((task) => (
                    <li
                      key={task.id}
                      className={`bg-gray-800 rounded-lg p-3 flex items-start gap-3 ${
                        task.isCompleted ? "opacity-60" : ""
                      }`}
                    >
                      {task.type === "checkbox" ? (
                        <button
                          onClick={() => handleToggle(task, chapter)}
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                            task.isCompleted
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-gray-500 hover:border-emerald-400"
                          }`}
                        >
                          {task.isCompleted && <span className="text-white text-xs">✓</span>}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggle(task, chapter)}
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            task.isCompleted
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-orange-500 hover:border-orange-300"
                          }`}
                          title={task.isCompleted ? "完了を取り消す" : "完了にする"}
                        >
                          {task.isCompleted && <span className="text-white text-xs">✓</span>}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm ${
                            task.isCompleted ? "line-through text-gray-400" : "text-white"
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              task.type === "pomodoro"
                                ? "bg-orange-900/50 text-orange-200"
                                : "bg-gray-700 text-gray-300"
                            }`}
                          >
                            {task.type === "pomodoro" ? "🍅" : "☑"} {task.estimatedMinutes}m
                          </span>
                          {(task.pomodoroCount ?? 0) > 0 && (
                            <span className="text-amber-300">🍅 ×{task.pomodoroCount}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {task.type === "pomodoro" && !task.isCompleted && (
                          <button
                            onClick={() => startPomodoroForTask(task, chapter)}
                            className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded-md"
                          >
                            ▶ 開始
                          </button>
                        )}
                        <Link
                          href={{
                            pathname: "/ai-guide",
                            query: {
                              cert: cert?.name ?? "",
                              chapter: chapter.title,
                              task: task.title,
                            },
                          }}
                          className="text-[11px] bg-emerald-700 hover:bg-emerald-600 text-white px-2 py-1 rounded-md text-center whitespace-nowrap"
                          title="NotebookLMで学習教材を作成する"
                        >
                          📚 教材を作成
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-40">
          {toast}
        </div>
      )}
    </div>
  );
}

function Header({ cultivationName, onBack, cultivationId }: { cultivationName: string; onBack: () => void; cultivationId: string }) {
  return (
    <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm">&larr; 戻る</button>
      <div>
        <h1 className="text-sm font-bold text-emerald-400">ロードマップ</h1>
        <div className="text-[11px] text-gray-400">{cultivationName}</div>
      </div>
      <Link
        href={`/record?cultivationId=${cultivationId}`}
        title="ロードマップ外で学習を手動記録"
        className="ml-auto inline-flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg px-2.5 py-1 text-xs"
      >
        <span>📝</span>
        <span>手動記録</span>
      </Link>
    </div>
  );
}

function RoadmapTutorial({
  step,
  setStep,
  onClose,
}: {
  step: number;
  setStep: (n: number) => void;
  onClose: () => void;
}) {
  const steps = [
    { emoji: "🗺", title: "学習ロードマップとは", body: "Geminiが作った章立てを、25分以内の小タスク(🍅)と長めのタスク(☑)に分解したものです。" },
    { emoji: "🍅", title: "小タスクはポモドーロで", body: "「▶ 開始」を押すとポモドーロタイマーが起動。25分後に自動で記録され、タスクが完了します。" },
    { emoji: "☑", title: "長いタスクはチェックボックス", body: "60分超などの大きな課題は、終わったら手動でチェックを入れてください。" },
    { emoji: "🏆", title: "章クリアで追加ボーナス", body: "章のタスクを全部終えると +50 XP。進捗率やXPはヘッダーで見られます。" },
    { emoji: "🌱", title: "少しずつで大丈夫", body: "1日1タスクでもキノコは育ちます。無理せず、気持ちの良い範囲で進めましょう。" },
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
