"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { getUserCultivations, getUserHarvestedMushrooms, getUserStudyLogs, updateUserName } from "@/lib/firestore";
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
              {logs.slice(0, 15).map((log) => (
                <div key={log.id} className="bg-gray-900 rounded-lg px-3 py-2 flex items-center gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full ${log.type === "input" ? "bg-blue-500" : "bg-orange-500"}`} />
                  <span className="text-gray-400 flex-1">{log.subType}</span>
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
