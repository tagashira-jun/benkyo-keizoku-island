"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserRoom, getUserHarvestedMushrooms, getUserAchievements, updateRoom } from "@/lib/firestore";
import { getMushroomSpecies, ACHIEVEMENTS, getCertificationById } from "@/lib/masterdata";
import type { Room, HarvestedMushroom, UserAchievement, Achievement } from "@/lib/types";
import MushroomSVG from "@/components/mushroom/MushroomSVG";
import Link from "next/link";

/** 実績icon名を絵文字にマップ（コレクション棚の視覚表現） */
function iconToEmoji(icon: string): string {
  const map: Record<string, string> = {
    "sprout": "🌱",
    "git-branch": "🌿",
    "zap": "⚡",
    "award": "🏅",
    "package": "📦",
    "network": "🕸️",
    "trophy": "🏆",
    "maximize": "📏",
    "layers": "📚",
    "git-merge": "🔗",
    "link": "🧬",
    "book-open": "📖",
    "calendar": "📅",
    "flame": "🔥",
    "crown": "👑",
    "clock": "⏰",
    "hourglass": "⏳",
    "trees": "🌳",
    "target": "🎯",
    "pen-tool": "✒️",
    "edit-3": "✏️",
    "scale": "⚖️",
    "palette": "🎨",
    "book": "📓",
    "users": "👥",
  };
  return map[icon] ?? "🎁";
}

export default function RoomPage() {
  const { firebaseUser } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [harvested, setHarvested] = useState<HarvestedMushroom[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [showRewardInfo, setShowRewardInfo] = useState(false);

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

  /** 報酬アイテムの展示状態をトグル（unlockedItemIds を表示中リストとして流用） */
  async function toggleRewardDisplay(itemId: string) {
    if (!firebaseUser || !room) return;
    const current = room.unlockedItemIds || [];
    const updated = current.includes(itemId)
      ? current.filter(id => id !== itemId)
      : [...current, itemId];
    await updateRoom(firebaseUser.uid, { unlockedItemIds: updated });
    setRoom({ ...room, unlockedItemIds: updated });
  }

  const displayedMushrooms = harvested.filter(h => room?.displayedMushroomIds?.includes(h.id));
  const unlockedAchievementIds = new Set(achievements.map(a => a.achievementId));

  // 解除済み実績から報酬アイテムを抽出
  const unlockedRewards: Achievement[] = ACHIEVEMENTS.filter((a) => unlockedAchievementIds.has(a.id));
  const displayedRewardIds = new Set(room?.unlockedItemIds ?? []);
  const displayedRewards = unlockedRewards.filter((a) => displayedRewardIds.has(a.rewardItemId));

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

        {/* コレクション棚（解除済み報酬アイテムを飾る） */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-200">🎁 コレクション棚</h3>
              <button
                onClick={() => setShowRewardInfo(true)}
                className="w-5 h-5 rounded-full bg-purple-900/60 hover:bg-purple-800 text-purple-300 text-xs font-bold flex items-center justify-center transition"
                title="報酬について"
              >
                ？
              </button>
            </div>
            <span className="text-xs text-gray-300">
              解除: {unlockedRewards.length} 点
            </span>
          </div>

          {/* 飾り中の報酬アイテム（木目調の棚風デザイン） */}
          <div
            className="rounded-2xl p-4 min-h-[140px] border border-amber-900/40"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(120, 53, 15, 0.25) 0%, rgba(41, 37, 36, 0.6) 100%)",
              boxShadow: "inset 0 -8px 16px rgba(0,0,0,0.35)",
            }}
          >
            {displayedRewards.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                <div className="text-3xl mb-1 opacity-60">🗄️</div>
                <p>飾られた報酬はまだありません</p>
                <p className="mt-1 text-gray-600">
                  {unlockedRewards.length > 0
                    ? "編集ボタンから飾りたいアイテムを選べます"
                    : "実績を解除するとここに報酬アイテムが並びます"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {displayedRewards.map((ach) => (
                  <div
                    key={ach.rewardItemId}
                    className="bg-gray-900/70 border border-amber-800/30 rounded-lg p-2 text-center relative"
                    title={`${ach.rewardItemName} / ${ach.name}`}
                  >
                    <div className="text-2xl leading-none mb-1">{iconToEmoji(ach.icon)}</div>
                    <div className="text-[9px] text-gray-300 truncate">{ach.rewardItemName}</div>
                    {editMode && (
                      <button
                        onClick={() => toggleRewardDisplay(ach.rewardItemId)}
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

          {/* 編集モード時：解除済みアイテム一覧（飾る/外すの切替） */}
          {editMode && unlockedRewards.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs text-gray-400 mb-2">解除済みアイテムから飾る</h4>
              <div className="grid grid-cols-4 gap-2">
                {unlockedRewards.map((ach) => {
                  const isDisplayed = displayedRewardIds.has(ach.rewardItemId);
                  return (
                    <button
                      key={ach.rewardItemId}
                      onClick={() => toggleRewardDisplay(ach.rewardItemId)}
                      className={`rounded-lg p-2 text-center border transition ${
                        isDisplayed
                          ? "bg-purple-950/40 border-purple-500"
                          : "bg-gray-900 border-gray-800 hover:border-gray-600"
                      }`}
                    >
                      <div className="text-2xl leading-none mb-1">{iconToEmoji(ach.icon)}</div>
                      <div className="text-[9px] text-gray-300 truncate">{ach.rewardItemName}</div>
                      <div className="text-[9px] mt-0.5">
                        {isDisplayed
                          ? <span className="text-purple-300">飾り中</span>
                          : <span className="text-gray-600">倉庫</span>
                        }
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 実績一覧（カテゴリ別） */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-200">実績</h3>
              <button
                onClick={() => setShowRewardInfo(true)}
                className="w-5 h-5 rounded-full bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 text-xs font-bold flex items-center justify-center transition"
                title="報酬について"
              >
                ？
              </button>
            </div>
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

      {/* 報酬の説明モーダル */}
      {showRewardInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowRewardInfo(false)}
        >
          <div
            className="bg-gray-900 border border-emerald-700/50 rounded-2xl max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🎁</div>
              <h2 className="text-lg font-bold text-emerald-300">実績と報酬について</h2>
            </div>

            <div className="space-y-4 text-sm text-gray-200 leading-relaxed">
              <div>
                <div className="font-semibold text-emerald-200 mb-1">📋 実績とは？</div>
                <p className="text-xs text-gray-300">
                  あなたの学習・栽培の歩みを記録する「証」です。
                  「3日連続で記録」「初めてアウトプット」など、条件を満たすと <span className="text-emerald-300 font-medium">自動で解除</span> されます。
                </p>
              </div>

              <div>
                <div className="font-semibold text-emerald-200 mb-1">⚡ 受け取り方</div>
                <p className="text-xs text-gray-300">
                  <span className="text-emerald-300 font-medium">すべて自動受け取りです。</span>
                  条件を満たした瞬間、記録画面からトップに戻った時に「🎉 実績解除！」のバナーで通知されます。
                  この画面の実績カードも <span className="text-emerald-300">✓</span> 点灯状態に変わります。
                </p>
              </div>

              <div>
                <div className="font-semibold text-purple-200 mb-1">🎁 報酬アイテムとは？</div>
                <p className="text-xs text-gray-300">
                  実績と対になる <span className="text-purple-300 font-medium">記念コレクション</span> です（例：シャーレ、培地バッグ、炎バッジ）。
                  解除されたアイテムは自動で「倉庫」に入り、
                  <span className="text-purple-300 font-medium">🎁 コレクション棚</span> にいつでも飾れます。
                </p>
              </div>

              <div>
                <div className="font-semibold text-purple-200 mb-1">🗄️ 飾り方</div>
                <p className="text-xs text-gray-300">
                  右上の <span className="text-white font-medium">「編集」</span> ボタン → コレクション棚の下に表示される「解除済みアイテム」からタップで飾る／外すを切り替えできます。
                  飾り中は <span className="text-purple-300">紫枠＋「飾り中」</span>、倉庫に戻すと非表示になります。
                </p>
              </div>

              <div>
                <div className="font-semibold text-amber-200 mb-1">🍄 展示棚とは別物です</div>
                <p className="text-xs text-gray-300">
                  上の「展示棚」に飾れるのは <span className="text-amber-300 font-medium">あなたが収穫したキノコ</span>（資格取得の成果物）です。
                  実績報酬（コレクション棚）とは別枠で、Phase 6 まで育てて「収穫」したキノコが追加されていきます。
                </p>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-lg px-3 py-2">
                <p className="text-xs text-emerald-200">
                  💡 <span className="font-semibold">確認方法</span>：このページの実績一覧で、✓がついているものが解除済み・🔒がついているものが未解除です。下までスクロールして全体を見渡せます。
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRewardInfo(false)}
              className="w-full mt-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
            >
              なるほど！
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
