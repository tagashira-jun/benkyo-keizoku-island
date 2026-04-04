"use client";

import { useState, useCallback } from "react";
import { Category, Log } from "@/lib/types";
import { getCategoryXP } from "@/lib/gameLogic";
import ComboBox from "./ComboBox";

interface RecordPanelProps {
  categories: Category[];
  logs: Log[];
  todayMinutes: number;
  onRecord: (categoryId: string, content: string, minutes: number) => void;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

export default function RecordPanel({ categories, logs, todayMinutes, onRecord }: RecordPanelProps) {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [addedMinutes, setAddedMinutes] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedCat = categories.find((c) => c.id === selectedCatId);

  // Sort content history by frequency
  const contentOptions = selectedCat
    ? sortByFrequency(selectedCat.contentHistory, logs, selectedCat.id)
    : [];

  const handleAddTime = useCallback(() => {
    if (!selectedCatId) return;
    const newMinutes = addedMinutes + 15;
    setAddedMinutes(newMinutes);

    // Auto-commit after a short delay (debounce)
    setShowConfirm(true);
  }, [selectedCatId, addedMinutes]);

  const handleConfirm = useCallback(() => {
    if (!selectedCatId || addedMinutes <= 0) return;
    onRecord(selectedCatId, content, addedMinutes);
    setAddedMinutes(0);
    setContent("");
    setShowConfirm(false);
  }, [selectedCatId, content, addedMinutes, onRecord]);

  const handleReset = useCallback(() => {
    setAddedMinutes(0);
    setShowConfirm(false);
  }, []);

  return (
    <div className="bg-gray-900/90 backdrop-blur rounded-t-2xl p-4 space-y-4">
      {/* Category Selection */}
      <div>
        <div className="text-xs text-gray-400 mb-2">カテゴリを選択</div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCatId(cat.id);
                setContent("");
                setAddedMinutes(0);
                setShowConfirm(false);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedCatId === cat.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
              <span className="text-[10px] ml-1 opacity-60">
                {formatTime(getCategoryXP(logs, cat.id))}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Input & Time */}
      {selectedCatId && (
        <>
          {/* Content ComboBox */}
          <div>
            <div className="text-xs text-gray-400 mb-1">内容（任意）</div>
            <ComboBox
              options={contentOptions}
              value={content}
              onChange={setContent}
              placeholder="例：Python Flask, AWS講座…"
            />
          </div>

          {/* Time Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleAddTime}
              className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-green-600/20 active:scale-95 transition-all"
            >
              ＋15分
            </button>
            {addedMinutes > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {formatTime(addedMinutes)}
                </div>
                <div className="text-xs text-gray-400">追加予定</div>
              </div>
            )}
          </div>

          {/* Confirm / Cancel */}
          {showConfirm && addedMinutes > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all active:scale-95"
              >
                記録する ✓
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-all"
              >
                取消
              </button>
            </div>
          )}

          {/* Today summary */}
          <div className="text-center text-xs text-gray-500">
            今日の累計：{formatTime(todayMinutes)}
          </div>
        </>
      )}
    </div>
  );
}

function sortByFrequency(history: string[], logs: Log[], categoryId: string): string[] {
  const freq = new Map<string, number>();
  for (const h of history) freq.set(h, 0);
  for (const log of logs) {
    if (log.categoryId === categoryId && log.content) {
      freq.set(log.content, (freq.get(log.content) || 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}
