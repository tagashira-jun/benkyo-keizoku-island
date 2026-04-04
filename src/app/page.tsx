"use client";

import { useState } from "react";
import { TabId } from "@/lib/types";
import { useGameState } from "@/hooks/useGameState";
import { getStageInfo } from "@/lib/gameLogic";
import Island from "@/components/Island";
import StatusBar from "@/components/StatusBar";
import RecordPanel from "@/components/RecordPanel";
import Achievements from "@/components/Achievements";
import ReportGenerator from "@/components/ReportGenerator";
import CategoryManager from "@/components/CategoryManager";
import AchievementNotification from "@/components/AchievementNotification";
import BgmPlayer from "@/components/BgmPlayer";
import GuideModal, { useGuideModal } from "@/components/GuideModal";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "record", label: "記録", icon: "✏️" },
  { id: "achievements", label: "実績", icon: "🏅" },
  { id: "report", label: "レポート", icon: "📋" },
  { id: "settings", label: "設定", icon: "⚙️" },
];

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("record");
  const {
    logs,
    categories,
    playerState,
    energyLevel,
    todayMinutes,
    newAchievementIds,
    loaded,
    addRecord,
    addCategory,
    updateCategory,
    deleteCategory,
    clearAchievementNotification,
  } = useGameState();

  const guide = useGuideModal();

  if (!loaded || !playerState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🏝️</div>
          <div className="text-gray-400 text-sm">読み込み中...</div>
        </div>
      </div>
    );
  }

  const stageInfo = getStageInfo(playerState.totalXP);

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col max-w-2xl mx-auto">
      {/* Achievement Notification */}
      <AchievementNotification
        achievementIds={newAchievementIds}
        onDismiss={clearAchievementNotification}
      />

      {/* Guide Modal */}
      <GuideModal open={guide.open} onClose={guide.close} />

      {/* App Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={guide.show}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm"
          title="使い方"
        >
          ?
        </button>
        <h1 className="text-lg font-bold text-white tracking-wider">
          🏝️ 知識の島
        </h1>
        <BgmPlayer />
      </header>

      {/* Level & Status Strip */}
      <div className="bg-gray-900/90 border-b border-gray-800 px-4 py-2">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {/* Level */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">
              Lv.{playerState.level}
            </span>
            <span className="text-xs text-gray-400">{stageInfo.name}</span>
            {stageInfo.next && (
              <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${stageInfo.progress * 100}%` }}
                />
              </div>
            )}
          </div>
          {/* Key stats */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-orange-400 font-bold">
              🔥 {playerState.currentStreak}日
            </span>
            <span className="text-cyan-300">
              {formatTime(playerState.totalXP)}
            </span>
          </div>
        </div>
      </div>

      {/* Island Visualization */}
      <div className="relative overflow-hidden">
        <Island
          playerState={playerState}
          categories={categories}
          logs={logs}
          energyLevel={energyLevel}
        />
      </div>

      {/* Detail Status Bar */}
      <StatusBar
        playerState={playerState}
        energyLevel={energyLevel}
        todayMinutes={todayMinutes}
      />

      {/* Tab Navigation */}
      <div className="bg-gray-900 border-b border-gray-800 px-2">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-center text-xs font-medium transition-all relative ${
                activeTab === tab.id
                  ? "text-white tab-active"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <span className="block text-base mb-0.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "record" && (
          <RecordPanel
            categories={categories}
            logs={logs}
            todayMinutes={todayMinutes}
            onRecord={addRecord}
            onAddCategory={addCategory}
          />
        )}
        {activeTab === "achievements" && (
          <Achievements playerState={playerState} />
        )}
        {activeTab === "report" && (
          <ReportGenerator logs={logs} categories={categories} />
        )}
        {activeTab === "settings" && (
          <CategoryManager
            categories={categories}
            onAdd={addCategory}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
          />
        )}
      </div>
    </main>
  );
}
