"use client";

import { useState, useCallback } from "react";
import { Category, Log, BUILDING_TYPES } from "@/lib/types";
import { getCategoryXP } from "@/lib/gameLogic";
import ComboBox from "./ComboBox";

interface RecordPanelProps {
  categories: Category[];
  logs: Log[];
  todayMinutes: number;
  onRecord: (categoryId: string, content: string, minutes: number) => void;
  onAddCategory: (label: string, icon: string, buildingType: string) => void;
}

const QUICK_ICONS = ["💻", "📺", "📝", "📚", "🎯", "🧪", "🎨", "🎵", "🏃", "🔧", "📊", "🌐", "✏️", "🧠"];

const BUILDING_LABELS: Record<string, string> = {
  "server-tower": "サーバー塔",
  library: "図書館",
  "magic-tower": "魔法塔",
  workshop: "工房",
  observatory: "天文台",
  shrine: "神社",
  market: "市場",
  arena: "闘技場",
};

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

export default function RecordPanel({ categories, logs, todayMinutes, onRecord, onAddCategory }: RecordPanelProps) {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [addedMinutes, setAddedMinutes] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  // Inline add category
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("📚");
  const [newBuilding, setNewBuilding] = useState("");

  const selectedCat = categories.find((c) => c.id === selectedCatId);

  const contentOptions = selectedCat
    ? sortByFrequency(selectedCat.contentHistory, logs, selectedCat.id)
    : [];

  const usedBuildings = new Set(categories.map((c) => c.buildingType));
  const availableBuildings = BUILDING_TYPES.filter((b) => !usedBuildings.has(b));

  const handleAddTime = useCallback(() => {
    if (!selectedCatId) return;
    setAddedMinutes((prev) => prev + 15);
    setShowConfirm(true);
  }, [selectedCatId]);

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

  const handleOpenAdd = () => {
    setIsAdding(true);
    setNewLabel("");
    setNewIcon("📚");
    setNewBuilding(availableBuildings[0] || "workshop");
  };

  const handleAddCategory = () => {
    if (!newLabel.trim()) return;
    onAddCategory(newLabel.trim(), newIcon, newBuilding);
    setIsAdding(false);
    setNewLabel("");
  };

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
                setIsAdding(false);
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
          {/* Add category button */}
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl text-sm font-medium border-2 border-dashed border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 transition-all"
          >
            ＋ 追加
          </button>
        </div>
      </div>

      {/* Inline Add Category Form */}
      {isAdding && (
        <div className="bg-gray-800 rounded-xl p-4 space-y-3">
          <div className="text-sm text-gray-300 font-medium">新しいカテゴリ</div>
          {/* Icon picker */}
          <div className="flex flex-wrap gap-1">
            {QUICK_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setNewIcon(ic)}
                className={`text-lg p-1 rounded ${
                  newIcon === ic ? "bg-blue-600" : "hover:bg-gray-700"
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
          {/* Name */}
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="カテゴリ名（例：読書、英語学習…）"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-400"
            autoFocus
          />
          {/* Building type */}
          <div>
            <div className="text-xs text-gray-400 mb-1">建物タイプ</div>
            <div className="flex flex-wrap gap-1.5">
              {availableBuildings.map((b) => (
                <button
                  key={b}
                  onClick={() => setNewBuilding(b)}
                  className={`px-2.5 py-1 text-xs rounded-lg ${
                    newBuilding === b
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {BUILDING_LABELS[b] || b}
                </button>
              ))}
              {availableBuildings.length === 0 && (
                <span className="text-xs text-gray-500">空きなし</span>
              )}
            </div>
          </div>
          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleAddCategory}
              disabled={!newLabel.trim()}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-all"
            >
              追加する
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Content Input & Time */}
      {selectedCatId && !isAdding && (
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
