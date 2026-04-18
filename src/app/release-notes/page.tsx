"use client";

import { useState } from "react";
import Link from "next/link";

// ============================================
// リリースノートデータ
// ============================================
type ReleaseNote = {
  version: string;
  date: string;
  title: string;
  summary: string;
  details: { label: string; items: string[] }[];
};

const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "v1.3.0",
    date: "2026-04-18",
    title: "菌糸休眠チケット & 静かな栽培モード",
    summary: "連続記録を守る「菌糸休眠チケット」と、競争要素を隠す「静かな栽培モード」を追加しました。",
    details: [
      {
        label: "新機能",
        items: [
          "🧊 菌糸休眠チケット：連続7/30/100日達成で獲得。休んだ日に1枚自動消費して連続記録を保護",
          "🌙 静かな栽培モード：マイページからONにすると連続日数・ストリーク表示を非表示化",
          "📜 この旅を始めた理由：栽培開始時に200文字の目標宣言を記録できる欄を追加",
        ],
      },
      {
        label: "改善",
        items: [
          "学習記録後のバナーに、チケット消費・配布の通知を追加",
          "体調が悪い日が続いた際の「無理しすぎ警告」バナーを追加",
        ],
      },
    ],
  },
  {
    version: "v1.2.0",
    date: "2026-03-10",
    title: "AI学習ガイド & ロードマップ機能",
    summary: "NotebookLM連携によるAI学習ガイドと、章ごとに進捗を管理できるロードマップ機能を追加しました。",
    details: [
      {
        label: "新機能",
        items: [
          "🤖 AI学習ガイド：NotebookLMで教材作成 → ポモドーロ学習 → 理解度チェックのフローを提案",
          "🗺 学習ロードマップ：資格ごとの章立てで進捗を管理できる専用ページを追加",
        ],
      },
      {
        label: "改善",
        items: [
          "キノコの体型変化ロジックを改善（I/Oバランスをより細かく反映）",
          "フェーズ進化時のアニメーションを追加",
        ],
      },
    ],
  },
  {
    version: "v1.1.0",
    date: "2026-02-01",
    title: "配合システム & 実績・報酬",
    summary: "過去に収穫したキノコと「配合」して知識を引き継ぐ機能と、実績解除・報酬アイテムシステムを追加しました。",
    details: [
      {
        label: "新機能",
        items: [
          "🧬 配合システム：収穫済みキノコと新栽培を配合。共有ドメイン数に応じたボーナスを付与",
          "🏆 実績システム：連続記録・収穫数など多数の実績を追加",
          "🎁 報酬アイテム：実績解除で部屋に飾れるアイテムを獲得",
          "🏠 マイルーム：実績・報酬アイテムを閲覧できる専用ページ",
        ],
      },
      {
        label: "改善",
        items: [
          "体調・充実感の記録欄を追加（学習記録フォーム）",
          "I/Oバランスバーをホーム画面に表示",
        ],
      },
    ],
  },
  {
    version: "v1.0.0",
    date: "2026-01-10",
    title: "Kinoko Lab 正式リリース",
    summary: "IT資格学習をキノコ栽培で可視化するアプリ「Kinoko Lab」の正式リリースです。",
    details: [
      {
        label: "初期機能",
        items: [
          "🍄 キノコキャラクターの栽培・成長システム（Phase 1〜6）",
          "📚 基本情報・AWS・LPIC など主要IT資格に対応",
          "⏱️ 15分単位のインプット／アウトプット学習記録",
          "📊 ドメインスコアに基づくキノコの形態変化",
          "👤 Googleアカウントでのログイン",
        ],
      },
    ],
  },
];

export default function ReleaseNotesPage() {
  const [selectedRelease, setSelectedRelease] = useState<ReleaseNote | null>(null);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* リリースノート詳細モーダル */}
      {selectedRelease && (
        <ReleaseModal release={selectedRelease} onClose={() => setSelectedRelease(null)} />
      )}

      {/* ヘッダーバー */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-300 hover:text-white text-sm">
            ← 戻る
          </Link>
          <h1 className="text-lg font-bold text-emerald-300">リリースノート</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-sm text-gray-400 mb-4">
          各バージョンの更新内容です。タップすると詳細を表示します。
        </p>
        <div className="space-y-2">
          {RELEASE_NOTES.map((rel) => (
            <button
              key={rel.version}
              onClick={() => setSelectedRelease(rel)}
              className="w-full text-left bg-gray-900 hover:bg-gray-800 rounded-xl px-4 py-3 transition flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono text-emerald-400 font-semibold">
                    {rel.version}
                  </span>
                  <span className="text-[11px] text-gray-500">{rel.date}</span>
                </div>
                <div className="text-sm text-gray-100 font-medium truncate">{rel.title}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{rel.summary}</div>
              </div>
              <span className="shrink-0 text-gray-500 text-sm">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// リリースノートモーダル
// ============================================
function ReleaseModal({ release, onClose }: { release: ReleaseNote; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-emerald-400 font-bold">{release.version}</span>
              <span className="text-xs text-gray-500">{release.date}</span>
            </div>
            <h2 className="text-lg font-bold text-white leading-tight">{release.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 ml-3 text-gray-500 hover:text-gray-300 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed mb-5">{release.summary}</p>

        {release.details.map((section) => (
          <div key={section.label} className="mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {section.label}
            </div>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="text-sm text-gray-200 leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <button
          onClick={onClose}
          className="mt-2 w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
