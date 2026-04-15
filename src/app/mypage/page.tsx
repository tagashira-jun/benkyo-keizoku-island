"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { getUserCultivations, getUserHarvestedMushrooms, getUserStudyLogs, updateUserName, updateUserPreferences } from "@/lib/firestore";
import { getCertificationById } from "@/lib/masterdata";
import type { Cultivation, HarvestedMushroom, StudyLog } from "@/lib/types";
import Link from "next/link";

export default function MyPage() {
  const { firebaseUser, userProfile, refreshProfile } = useAuth();
  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [harvested, setHarvested] = useState<HarvestedMushroom[]>([]);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!firebaseUser) return;
    Promise.all([
      getUserCultivations(firebaseUser.uid),
      getUserHarvestedMushrooms(firebaseUser.uid),
      getUserStudyLogs(firebaseUser.uid, 20),
    ]).then(([c, h, l]) => {
      setCultivations(c);
      setHarvested(h);
      setLogs(l);
    });
  }, [firebaseUser]);

  async function handleNameSave() {
    if (!firebaseUser || !newName.trim()) return;
    await updateUserName(firebaseUser.uid, newName.trim());
    await refreshProfile();
    setEditingName(false);
  }

  async function handleQuietModeToggle(value: boolean) {
    if (!firebaseUser) return;
    await updateUserPreferences(firebaseUser.uid, { quietMode: value });
    await refreshProfile();
  }

  async function handleStoppingPointToggle(value: boolean) {
    if (!firebaseUser) return;
    await updateUserPreferences(firebaseUser.uid, { stoppingPointEnabled: value });
    await refreshProfile();
  }

  /** 時間を表示用にフォーマット（分のみ統一） */
  function formatMinutes(m: number): string {
    return `${m}分`;
  }

  if (!firebaseUser || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <Link href="/login">ログインしてください</Link>
      </div>
    );
  }

  // 累計学習時間を計算
  const totalMinutes = userProfile.totalStudyMinutes || 0;
  const freezeTokens = userProfile.freezeTokens ?? 0;
  const quietMode = userProfile.preferences?.quietMode ?? false;
  const stoppingPointEnabled = userProfile.preferences?.stoppingPointEnabled ?? true;

  // cultivationId → 資格名・カテゴリ色 のマップ（記録一覧で表示するため）
  const cultivationInfoMap = new Map<string, { certName: string; categoryColor: string }>();
  for (const c of cultivations) {
    const cert = getCertificationById(c.certificationId);
    // カテゴリごとに色分け（視認性向上）
    const categoryColor =
      cert?.category === "IPA" ? "bg-emerald-900/60 text-emerald-200"
      : cert?.category === "AWS" ? "bg-orange-900/60 text-orange-200"
      : cert?.category === "Linux" ? "bg-amber-900/60 text-amber-200"
      : cert?.category === "Network" ? "bg-sky-900/60 text-sky-200"
      : cert?.category === "Database" ? "bg-indigo-900/60 text-indigo-200"
      : cert?.category === "Programming" ? "bg-purple-900/60 text-purple-200"
      : cert?.category === "AI" ? "bg-yellow-900/60 text-yellow-200"
      : cert?.category === "PersonalDev" ? "bg-pink-900/60 text-pink-200"
      : "bg-gray-800 text-gray-300";
    cultivationInfoMap.set(c.id, {
      certName: cert?.name ?? "不明な栽培",
      categoryColor,
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-white text-sm">&larr;</Link>
        <h1 className="text-lg font-bold text-emerald-400">マイページ</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* プロフィール */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-4">
            {userProfile.photoURL && (
              <img src={userProfile.photoURL} alt="" className="w-14 h-14 rounded-full" />
            )}
            <div className="flex-1">
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm flex-1"
                  />
                  <button onClick={handleNameSave} className="text-emerald-400 text-sm">保存</button>
                  <button onClick={() => setEditingName(false)} className="text-gray-200 text-sm">戻す</button>
                </div>
              ) : (
                <div>
                  <h2 className="font-bold text-lg">{userProfile.displayName}</h2>
                  <button
                    onClick={() => { setEditingName(true); setNewName(userProfile.displayName); }}
                    className="text-xs text-gray-200 hover:text-gray-300"
                  >
                    名前を変更
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* 累計学習時間 */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="text-sm text-gray-200">累計学習時間</div>
            <div className="text-xl font-bold text-emerald-400">{formatMinutes(totalMinutes)}</div>
          </div>

          {/* 菌糸休眠チケット残数 */}
          <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-200">菌糸休眠チケット</div>
              <div className="text-[11px] text-gray-500 leading-tight">
                1枚で1日休んでも連続記録を維持できます
              </div>
            </div>
            <div className="text-xl font-bold text-sky-300 flex items-center gap-1">
              <span>🧊</span>
              <span>{freezeTokens}枚</span>
            </div>
          </div>
        </div>

        {/* 設定（オプトアウト・ウェルビーイング） */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-200 mb-3">設定</h3>

          {/* 静かな栽培モード */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1">
              <div className="text-sm text-white font-medium">🌿 静かな栽培モード</div>
              <div className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                連続記録日数や実績のポップアップなど、競争・焦燥感につながる表示を抑えます。
                自分のペースで淡々と栽培したい時にどうぞ。
              </div>
            </div>
            <button
              onClick={() => handleQuietModeToggle(!quietMode)}
              className={`shrink-0 relative w-11 h-6 rounded-full transition ${
                quietMode ? "bg-emerald-500" : "bg-gray-700"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  quietMode ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* 停止ポイント通知 */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-sm text-white font-medium">⏸ 停止ポイント通知</div>
              <div className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                1日の学習が4時間を超えたら「休息もキノコの成長に必要です」と知らせます。
                ウェルビーイングを守るための安全網です。
              </div>
            </div>
            <button
              onClick={() => handleStoppingPointToggle(!stoppingPointEnabled)}
              className={`shrink-0 relative w-11 h-6 rounded-full transition ${
                stoppingPointEnabled ? "bg-emerald-500" : "bg-gray-700"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  stoppingPointEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 統計 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{cultivations.length}</div>
            <div className="text-xs text-gray-200">栽培中</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">{harvested.length}</div>
            <div className="text-xs text-gray-200">収穫済み</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{logs.length}</div>
            <div className="text-xs text-gray-200">記録数</div>
          </div>
        </div>

        {/* 最近の記録 */}
        {logs.length > 0 && (
          <div>
            <h3 className="text-sm text-gray-200 mb-3 font-medium">最近の記録</h3>
            <div className="space-y-2">
              {logs.slice(0, 15).map((log) => {
                const info = cultivationInfoMap.get(log.cultivationId);
                return (
                  <div
                    key={log.id}
                    className="bg-gray-900 rounded-lg px-3 py-2 text-sm"
                  >
                    {/* 1段目: 資格バッジ + 日付 */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium truncate ${
                          info?.categoryColor ?? "bg-gray-800 text-gray-400"
                        }`}
                        title={info?.certName ?? ""}
                      >
                        🍄 {info?.certName ?? "不明な栽培"}
                      </span>
                      <span className="text-gray-400 text-xs shrink-0">{log.date}</span>
                    </div>
                    {/* 2段目: I/O種別 + 時間 */}
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          log.type === "input"
                            ? "bg-blue-900/60 text-blue-200"
                            : "bg-orange-900/60 text-orange-200"
                        }`}
                      >
                        {log.type === "input" ? "IN" : "OUT"}
                      </span>
                      <span className="text-gray-300 flex-1 truncate">{log.subType}</span>
                      <span className="text-white font-medium shrink-0">{formatMinutes(log.minutes)}</span>
                    </div>
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
