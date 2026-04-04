"use client";

import { PlayerState, EnergyLevel } from "@/lib/types";

interface StatusBarProps {
  playerState: PlayerState;
  energyLevel: EnergyLevel;
  todayMinutes: number;
}

const ENERGY_LABELS: Record<EnergyLevel, { label: string; color: string }> = {
  5: { label: "絶好調！", color: "text-yellow-300" },
  4: { label: "元気", color: "text-green-400" },
  3: { label: "ダレ気味", color: "text-blue-300" },
  2: { label: "元気ない", color: "text-orange-400" },
  1: { label: "座り込み…", color: "text-red-400" },
};

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

export default function StatusBar({ playerState, energyLevel, todayMinutes }: StatusBarProps) {
  const energyInfo = ENERGY_LABELS[energyLevel];

  return (
    <div className="bg-gray-900/80 backdrop-blur border-y border-gray-700 px-4 py-2">
      <div className="flex items-center justify-around max-w-xl mx-auto text-center">
        <div>
          <div className="text-[10px] text-gray-500">今日</div>
          <div className="text-sm font-bold text-green-300">{formatTime(todayMinutes)}</div>
        </div>
        <div className="w-px h-6 bg-gray-700" />
        <div>
          <div className="text-[10px] text-gray-500">元気度</div>
          <div className={`text-sm font-bold ${energyInfo.color}`}>
            {"★".repeat(energyLevel)}{"☆".repeat(5 - energyLevel)}
          </div>
          <div className={`text-[9px] ${energyInfo.color}`}>{energyInfo.label}</div>
        </div>
        <div className="w-px h-6 bg-gray-700" />
        <div>
          <div className="text-[10px] text-gray-500">住民</div>
          <div className="text-sm font-bold text-white">
            {playerState.population}<span className="text-[10px] font-normal text-gray-400">人</span>
          </div>
        </div>
        <div className="w-px h-6 bg-gray-700" />
        <div>
          <div className="text-[10px] text-gray-500">最長連続</div>
          <div className="text-sm font-bold text-purple-300">
            {playerState.maxStreak}<span className="text-[10px] font-normal text-gray-400">日</span>
          </div>
        </div>
      </div>
    </div>
  );
}
