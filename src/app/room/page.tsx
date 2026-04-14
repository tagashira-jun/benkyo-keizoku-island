"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserRoom, getUserHarvestedMushrooms, getUserAchievements, updateRoom } from "@/lib/firestore";
import { getMushroomSpecies, ACHIEVEMENTS, getCertificationById } from "@/lib/masterdata";
import type { Room, HarvestedMushroom, UserAchievement } from "@/lib/types";
import MushroomSVG from "@/components/mushroom/MushroomSVG";
import Link from "next/link";

export default function RoomPage() {
  const { firebaseUser } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [harvested, setHarvested] = useState<HarvestedMushroom[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;
    loadData();
  }, [firebaseUser]);

  async function loadData() {
    if (!firebaseUser) return;
    const [r, h, a] = await Promise.all([
      getUserRoom(firebaseUser.uid),
      getUserHarvestedMushrooms(firebaseUser.uid),
      getUserAchievements(firebaseUser.uid),
    ]);
    setRoom(r);
    setHarvested(h);
    setAchievements(a);
  }

  async function toggleDisplay(mushroomId: string) {
    if (!firebaseUser || !room) return;
    const current = room.displayedMushroomIds || [];
    const updated = current.includes(mushroomId)
      ? current.filter(id => id !== mushroomId)
      : [...current, mushroomId];
    await updateRoom(firebaseUser.uid, { displayedMushroomIds: updated });
    setRoom({ ...room, displayedMushroomIds: updated });
  }

  const displayedMushrooms = harvested.filter(h => room?.displayedMushroomIds?.includes(h.id));
  const unlockedAchievementIds = new Set(achievements.map(a => a.achievementId));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">&larr;</Link>
          <h1 className="text-lg font-bold text-emerald-400">マイルーム</h1>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className="text-sm text-gray-400 hover:text-white"
        >
          {editMode ? "完了" : "編集"}
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 部屋ビュー（展示棚） */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 min-h-[200px]">
          <h2 className="text-sm text-gray-500 mb-4 font-medium">展示棚</h2>

          {displayedMushrooms.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>まだキノコが展示されていません</p>
              <p className="text-xs mt-1">収穫したキノコを棚に飾りましょう</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {displayedMushrooms.map(h => (
                <div key={h.id} className="bg-gray-800 rounded-xl p-2 text-center relative">
                  <MushroomSVG
                    morphology={h.finalMorphology}
                    phase={6}
                    speciesId={h.mushroomSpeciesId}
                    width={64}
                    height={90}
                    category={getCertificationById(h.certificationId)?.category}
                  />
                  <p className="text-[10px] text-gray-400 mt-1 truncate">
                    {h.certificationName}
                  </p>
                  {editMode && (
                    <button
                      onClick={() => toggleDisplay(h.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full text-xs flex items-center justify-center"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 収穫済みキノコ一覧（展示管理） */}
        {editMode && harvested.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm text-gray-500 mb-3 font-medium">収穫済みキノコ</h3>
            <div className="grid grid-cols-3 gap-3">
              {harvested.map(h => {
                const isDisplayed = room?.displayedMushroomIds?.includes(h.id);
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleDisplay(h.id)}
                    className={`bg-gray-900 rounded-xl p-3 text-center border transition ${
                      isDisplayed ? "border-emerald-500" : "border-gray-800"
                    }`}
                  >
                    <MushroomSVG
                      morphology={h.finalMorphology}
                      phase={6}
                      speciesId={h.mushroomSpeciesId}
                      width={64}
                      height={90}
                      category={getCertificationById(h.certificationId)?.category}
                    />
                    <p className="text-xs text-gray-400 mt-1 truncate">{h.certificationName}</p>
                    <p className="text-[10px] mt-0.5">
                      {isDisplayed
                        ? <span className="text-emerald-400">展示中</span>
                        : <span className="text-gray-600">未展示</span>
                      }
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 実績一覧（カテゴリ別） */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-200">実績</h3>
            <span className="text-xs text-gray-300">
              {unlockedAchievementIds.size} / {ACHIEVEMENTS.length} 解除
            </span>
          </div>

          {(["cultivation", "study", "social"] as const).map(cat => {
            const catAchievements = ACHIEVEMENTS.filter(a => a.category === cat);
            if (catAchievements.length === 0) return null;
            const catLabel = cat === "cultivation" ? "栽培・配合" : cat === "study" ? "学習継続" : "ソーシャル";
            return (
              <div key={cat} className="mb-5">
                <h4 className="text-xs font-medium text-emerald-300 mb-2 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  {catLabel}
                </h4>
                <div className="space-y-2">
                  {catAchievements.map(ach => {
                    const isUnlocked = unlockedAchievementIds.has(ach.id);
                    return (
                      <div
                        key={ach.id}
                        className={`rounded-lg px-3 py-3 flex items-start gap-3 border ${
                          isUnlocked
                            ? "bg-emerald-950/40 border-emerald-700/50"
                            : "bg-gray-900 border-gray-800"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 ${
                            isUnlocked ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400"
                          }`}
                        >
                          {isUnlocked ? "✓" : "🔒"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm ${isUnlocked ? "text-white" : "text-gray-200"}`}>
                            {ach.name}
                          </div>
                          <div className={`text-xs mt-0.5 ${isUnlocked ? "text-emerald-200" : "text-gray-300"}`}>
                            {ach.description}
                          </div>
                          {/* 解除条件：未解除時に目立たせる */}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className={isUnlocked ? "text-emerald-300" : "text-amber-300"}>
                              📋 条件: {ach.condition}
                            </span>
                            <span className="text-purple-300">
                              🎁 報酬: {ach.rewardItemName}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
