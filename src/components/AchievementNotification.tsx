"use client";

import { useEffect } from "react";
import { getAllAchievements } from "@/lib/gameLogic";

interface AchievementNotificationProps {
  achievementIds: string[];
  onDismiss: () => void;
}

export default function AchievementNotification({
  achievementIds,
  onDismiss,
}: AchievementNotificationProps) {
  const allAchievements = getAllAchievements();

  useEffect(() => {
    if (achievementIds.length > 0) {
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievementIds, onDismiss]);

  if (achievementIds.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="space-y-2 animate-bounce-slow">
        {achievementIds.map((id) => {
          const a = allAchievements.find((x) => x.id === id);
          if (!a) return null;
          return (
            <div
              key={id}
              onClick={onDismiss}
              className="pointer-events-auto bg-gradient-to-r from-yellow-900/95 to-amber-800/95 backdrop-blur border border-yellow-500/50 rounded-2xl px-6 py-4 shadow-2xl shadow-yellow-500/20 cursor-pointer"
            >
              <div className="text-center">
                <div className="text-3xl mb-1">{a.icon}</div>
                <div className="text-yellow-300 font-bold text-sm">
                  実績解除！
                </div>
                <div className="text-white font-bold text-lg">{a.name}</div>
                <div className="text-yellow-200/70 text-xs mt-1">
                  {a.description}
                </div>
                <div className="text-yellow-400/60 text-[10px] mt-1">
                  島に「{a.decoration}」が追加されました
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
