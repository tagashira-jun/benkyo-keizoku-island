"use client";

import { PlayerState } from "@/lib/types";
import { getAllAchievements } from "@/lib/gameLogic";

interface AchievementsProps {
  playerState: PlayerState;
}

export default function Achievements({ playerState }: AchievementsProps) {
  const achievements = getAllAchievements();
  const unlocked = new Set(playerState.achievements);

  return (
    <div className="bg-gray-900/90 backdrop-blur rounded-t-2xl p-4">
      <h2 className="text-lg font-bold text-white mb-4">実績一覧</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {achievements.map((a) => {
          const isUnlocked = unlocked.has(a.id);
          return (
            <div
              key={a.id}
              className={`p-3 rounded-xl border transition-all ${
                isUnlocked
                  ? "bg-gray-800 border-yellow-600/50 shadow-lg shadow-yellow-600/10"
                  : "bg-gray-800/50 border-gray-700 opacity-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`text-2xl ${
                    isUnlocked ? "" : "grayscale opacity-40"
                  }`}
                >
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-bold ${
                      isUnlocked ? "text-yellow-300" : "text-gray-500"
                    }`}
                  >
                    {a.name}
                  </div>
                  <div className="text-xs text-gray-400">{a.description}</div>
                  {isUnlocked && (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      島の装飾：{a.decoration}
                    </div>
                  )}
                </div>
                {isUnlocked && (
                  <div className="text-yellow-400 text-xs font-bold">
                    解除済
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
