"use client";

import { useState } from "react";
import { Category, BUILDING_TYPES } from "@/lib/types";

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (label: string, icon: string, buildingType: string) => void;
  onUpdate: (id: string, label: string, icon: string) => void;
  onDelete: (id: string) => void;
}

const ICONS = ["💻", "📺", "📝", "📚", "🎯", "🧪", "🎨", "🎵", "🏃", "🔧", "📊", "🌐", "✏️", "🧠"];

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

export default function CategoryManager({
  categories,
  onAdd,
  onUpdate,
  onDelete,
}: CategoryManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("💻");
  const [buildingType, setBuildingType] = useState<string>("workshop");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const usedBuildings = new Set(categories.map((c) => c.buildingType));
  const availableBuildings = BUILDING_TYPES.filter(
    (b) => !usedBuildings.has(b)
  );

  const handleAdd = () => {
    if (!label.trim()) return;
    onAdd(label.trim(), icon, buildingType);
    setLabel("");
    setIcon("💻");
    setIsAdding(false);
  };

  const handleUpdate = (id: string) => {
    if (!label.trim()) return;
    onUpdate(id, label.trim(), icon);
    setEditingId(null);
    setLabel("");
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setLabel(cat.label);
    setIcon(cat.icon);
    setIsAdding(false);
  };

  return (
    <div className="bg-gray-900/90 backdrop-blur rounded-t-2xl p-4 space-y-4">
      <h2 className="text-lg font-bold text-white">カテゴリ設定</h2>

      {/* Category List */}
      <div className="space-y-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-gray-800 rounded-xl p-3 flex items-center gap-3"
          >
            {editingId === cat.id ? (
              <>
                <div className="flex flex-wrap gap-1">
                  {ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setIcon(ic)}
                      className={`text-lg p-1 rounded ${
                        icon === ic ? "bg-blue-600" : "hover:bg-gray-700"
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  autoFocus
                />
                <button
                  onClick={() => handleUpdate(cat.id)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded-lg"
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <span className="text-xl">{cat.icon}</span>
                <span className="flex-1 text-white text-sm font-medium">
                  {cat.label}
                </span>
                <span className="text-xs text-gray-500">
                  {BUILDING_LABELS[cat.buildingType] || cat.buildingType}
                </span>
                <button
                  onClick={() => handleStartEdit(cat)}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg"
                >
                  編集
                </button>
                {confirmDelete === cat.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        onDelete(cat.id);
                        setConfirmDelete(null);
                      }}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg"
                    >
                      削除
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-lg"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(cat.id)}
                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-red-900 text-gray-400 rounded-lg"
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add New Category */}
      {isAdding ? (
        <div className="bg-gray-800 rounded-xl p-4 space-y-3">
          <div className="text-sm text-gray-300 font-medium">
            新しいカテゴリ
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">アイコン</div>
            <div className="flex flex-wrap gap-1">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`text-lg p-1 rounded ${
                    icon === ic ? "bg-blue-600" : "hover:bg-gray-700"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">カテゴリ名</div>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例：読書、英語学習…"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
              autoFocus
            />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">建物タイプ</div>
            <div className="flex flex-wrap gap-2">
              {availableBuildings.map((b) => (
                <button
                  key={b}
                  onClick={() => setBuildingType(b)}
                  className={`px-3 py-1 text-xs rounded-lg ${
                    buildingType === b
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300"
                  }`}
                >
                  {BUILDING_LABELS[b] || b}
                </button>
              ))}
              {availableBuildings.length === 0 && (
                <span className="text-xs text-gray-500">
                  利用可能な建物タイプがありません
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!label.trim()}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm"
            >
              追加
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setLabel("");
              }}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-xl text-sm"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-3 border-2 border-dashed border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300 rounded-xl text-sm font-medium transition-all"
        >
          ＋ カテゴリを追加
        </button>
      )}
    </div>
  );
}
