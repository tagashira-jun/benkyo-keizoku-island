"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "ki-guide-seen";

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
}

export function useGuideModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  const close = () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const show = () => setOpen(true);

  return { open, close, show };
}

export default function GuideModal({ open, onClose }: GuideModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="text-center pt-6 pb-3 px-6">
          <div className="text-4xl mb-2">🏝️</div>
          <h2 className="text-xl font-bold text-white">知識の島へようこそ！</h2>
          <p className="text-xs text-gray-400 mt-1">
            学習を記録して、あなただけの島を育てよう
          </p>
        </div>

        {/* Steps */}
        <div className="px-6 pb-4 space-y-4">
          <Step
            num={1}
            icon="✏️"
            title="学習を記録する"
            desc="カテゴリを選んで「＋15分」をタップ。連打で時間を追加できます。内容の入力は任意です。"
          />
          <Step
            num={2}
            icon="🏝️"
            title="島が発展する"
            desc="記録するたびにXPが貯まり、島がレベルアップ。岩だけの小島から天空都市まで10段階で進化します。"
          />
          <Step
            num={3}
            icon="🧑‍🤝‍🧑"
            title="住民が増える"
            desc="レベルが上がると住民が増加。毎日続けると住民が元気に動き回り、サボると元気がなくなります。"
          />
          <Step
            num={4}
            icon="🏅"
            title="実績を解除する"
            desc="連続記録や累計時間で実績バッジを獲得。島に旗や噴水などの装飾が追加されます。"
          />
          <Step
            num={5}
            icon="📋"
            title="レポート出力"
            desc="期間を指定して学習レポートを生成。MBO報告書にそのままコピペできます。"
          />

          {/* Tips */}
          <div className="bg-gray-800/80 rounded-xl p-3">
            <div className="text-xs text-gray-400 font-bold mb-1.5">ポイント</div>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>- 1タップ15分。気軽に記録を続けましょう</li>
              <li>- 建物はカテゴリごとの累計時間で成長します</li>
              <li>- サボっても建物や実績は消えません。安心！</li>
              <li>- 右上の🔇ボタンでBGMを再生できます</li>
            </ul>
          </div>
        </div>

        {/* Close button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all active:scale-95"
          >
            はじめる
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  num,
  icon,
  title,
  desc,
}: {
  num: number;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
        <span className="text-sm">{icon}</span>
      </div>
      <div>
        <div className="text-sm font-bold text-white">
          <span className="text-blue-400 mr-1">{num}.</span>
          {title}
        </div>
        <div className="text-xs text-gray-400 leading-relaxed mt-0.5">
          {desc}
        </div>
      </div>
    </div>
  );
}
