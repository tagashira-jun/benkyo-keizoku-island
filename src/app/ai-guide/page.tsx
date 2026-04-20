"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

const NOTEBOOKLM_URL = "https://notebooklm.google.com/";

function buildWebSearchQueries(cert: string, chapter: string, task: string) {
  const subject = [cert, chapter, task].filter(Boolean).join(" ");
  const taskOrChapter = task || chapter || cert;
  return [
    {
      label: "基礎・概要を押さえる",
      query: `${subject} とは 概要 入門 初心者向け 解説`,
    },
    {
      label: "試験で問われるポイント",
      query: `${cert || "資格"} ${taskOrChapter} 試験 頻出 過去問 重要ポイント`,
    },
    {
      label: "具体例・実務でのケース",
      query: `${taskOrChapter} 具体例 事例 実務 わかりやすく`,
    },
    {
      label: "まとめ・チートシート",
      query: `${taskOrChapter} まとめ 一覧 チートシート 早見表`,
    },
    {
      label: "公式・一次情報",
      query: `${cert || "資格"} ${taskOrChapter} 公式 ガイドライン 省庁 site:go.jp OR site:or.jp`,
    },
  ];
}

function buildSourcePrompt(cert: string, chapter: string, task: string) {
  const subject = [cert, chapter, task].filter(Boolean).join(" / ");
  return `# リサーチ対象
${subject || "【資格 / 章 / タスク】"}

# 依頼内容
上記テーマについて、ポモドーロ1回(25分)で学習できる教材としてまとめてください。

# 出力要件
- 全体 3,000〜5,000字程度
- 章立て: 概要 / 重要用語(初出時に1行で定義) / 試験で問われるポイント / 具体例 / よくある誤解 / まとめ
- 資格試験の出題範囲・配点に関係する論点を明示
- 出典URLを末尾に箇条書きで列挙
- 図や数式はテキストで説明`;
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/60 border-b border-gray-700">
        <span className="text-xs text-gray-300">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={`text-xs px-3 py-1 rounded-md transition ${
            copied ? "bg-emerald-700 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"
          }`}
        >
          {copied ? "コピーしました" : "コピー"}
        </button>
      </div>
      <pre className="px-3 py-3 text-xs text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
        {text}
      </pre>
    </div>
  );
}

function SectionCard({
  step,
  title,
  minutes,
  id,
  children,
}: {
  step: string;
  title: string;
  minutes: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id ?? `step-${step}`} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4 scroll-mt-20">
      <div className="flex items-center gap-3 mb-3">
        <span className="shrink-0 w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center">
          {step}
        </span>
        <h2 className="text-base font-bold text-emerald-300 leading-tight">{title}</h2>
        <span className="ml-auto shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-200">
          {minutes}
        </span>
      </div>
      <div className="space-y-3 text-sm text-gray-200 leading-relaxed">{children}</div>
    </section>
  );
}

function AiGuideInner() {
  const sp = useSearchParams();
  const cert = sp?.get("cert") ?? "";
  const chapter = sp?.get("chapter") ?? "";
  const task = sp?.get("task") ?? "";

  const hasContext = Boolean(cert || chapter || task);

  const webQueries = useMemo(() => buildWebSearchQueries(cert, chapter, task), [cert, chapter, task]);
  const sourcePrompt = useMemo(() => buildSourcePrompt(cert, chapter, task), [cert, chapter, task]);

  const notebookTitle = [cert, chapter, task].filter(Boolean).join(" / ") || "【テーマを入力】";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-white text-sm">
          ←
        </Link>
        <h1 className="text-lg font-bold text-emerald-300">NotebookLMで学ぶガイド</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 学習テーマ表示 */}
        {hasContext ? (
          <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-2xl p-5 mb-4">
            <div className="text-[11px] text-emerald-300 mb-1">このロードマップタスク用の教材を作成します</div>
            <div className="space-y-1">
              {cert && (
                <div className="text-sm">
                  <span className="text-emerald-300/80 text-xs">資格: </span>
                  <span className="font-semibold">{cert}</span>
                </div>
              )}
              {chapter && (
                <div className="text-sm">
                  <span className="text-emerald-300/80 text-xs">章: </span>
                  <span>{chapter}</span>
                </div>
              )}
              {task && (
                <div className="text-sm">
                  <span className="text-emerald-300/80 text-xs">タスク: </span>
                  <span>{task}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-emerald-200/80 mt-3 leading-relaxed">
              NotebookLM のウェブソース機能で関連情報を集め、生成されるマインドマップ・クイズで学習します。
              学習開始時は<strong className="text-emerald-200">ロードマップの「▶ 開始」ボタン</strong>からポモドーロを走らせてください。
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
            <p className="text-sm text-gray-300 leading-relaxed">
              ロードマップの各タスクにある<strong className="text-emerald-300">「📚 教材を作成」</strong>ボタンから開くと、
              そのタスク専用のウェブ検索クエリ・プロンプトが自動で埋め込まれます。
            </p>
          </div>
        )}

        {/* STEP 1: NotebookLM でノートブック作成 */}
        <SectionCard step="1" title="NotebookLM で新規ノートブックを作る" minutes="約2分">
          <a
            href={NOTEBOOKLM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            NotebookLM を新しいタブで開く ↗
          </a>
          <ol className="list-decimal list-inside text-sm space-y-1 mt-2">
            <li>Googleアカウントでログイン</li>
            <li>「新しいノートブック」を作成</li>
            <li>ノートブック名を下の値で設定すると後で探しやすくなります</li>
          </ol>
          <CopyBlock label="ノートブック名(コピー用)" text={notebookTitle} />
        </SectionCard>

        {/* STEP 2: ウェブソース追加用の検索クエリ */}
        <SectionCard step="2" title="ウェブ検索して情報を集める" minutes="約5〜10分">
          <p>
            NotebookLM の「ソースを追加 → <strong className="text-emerald-300">ウェブ</strong>」を選ぶと、
            URL を貼るかウェブ検索ができます。下のクエリを Google / Bing にそのまま貼り、
            上位の良質ページ(公式・大手解説サイト・用語辞典など)の URL を拾って追加します。
          </p>
          <div className="space-y-3">
            {webQueries.map((q) => (
              <CopyBlock key={q.label} label={q.label} text={q.query} />
            ))}
          </div>
          <div className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 leading-relaxed">
            💡 ソースは <strong className="text-emerald-300">最低3本、理想5〜7本</strong>。
            視点が偏らないよう公式 / 解説記事 / 実務ブログ を混ぜるのがおすすめです。
          </div>
        </SectionCard>

        {/* STEP 3: ソースが少ない時の補助 */}
        <SectionCard step="3" title="足りなければAIにも教材を作らせる (任意)" minutes="約3分">
          <p>
            ウェブで十分な情報が集まらない時は、ChatGPT / Claude / Gemini に下のプロンプトを投げて
            出力された Markdown を NotebookLM に「コピーしたテキスト」ソースとして追加します。
          </p>
          <CopyBlock label="補助ソース生成プロンプト" text={sourcePrompt} />
        </SectionCard>

        {/* STEP 4: マインドマップで対話学習 */}
        <SectionCard step="4" title="NotebookLMの「マインドマップ」で全体像をつかむ" minutes="約5分">
          <p>
            ソースが揃ったら、ノートブック画面の<strong className="text-emerald-300">「マインドマップ」</strong>ボタンから
            テーマの全体像をツリー状に展開します。中心テーマから枝分かれする主要トピックが一望でき、理解の抜けがひと目で分かります。
          </p>
          <ol className="list-decimal list-inside text-sm space-y-1.5">
            <li>気になるノード（トピック）をクリックすると、その場でNotebookLMが詳細を解説してくれます</li>
            <li>解説を読んだら、さらに深掘りしたい点をチャットで追質問して対話する</li>
            <li>「なぜ？」「具体例は？」「他との違いは？」と問いを重ねて理解度を高めましょう</li>
          </ol>
          <p className="text-xs text-gray-400">
            レポートで一方的に読むよりも、自分の興味に沿って枝を辿り、能動的に対話しながら学べます。
          </p>
        </SectionCard>

        {/* STEP 5: ポモドーロ学習を開始 */}
        <SectionCard step="5" title="ロードマップに戻ってポモドーロ学習を開始" minutes="25分">
          <p>
            準備ができたら<strong className="text-emerald-300">ロードマップ画面の「▶ 開始」ボタン</strong>を押して、
            NotebookLMのマインドマップを辿りながら25分の学習を開始します。
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm text-emerald-200 px-4 py-2 rounded-lg transition"
          >
            ← ロードマップに戻る
          </Link>
        </SectionCard>

        {/* STEP 6: クイズ */}
        <SectionCard step="6" title="NotebookLMの「クイズ」機能で理解度チェック" minutes="25分">
          <p>
            学習直後に、ノートブック画面の<strong className="text-emerald-300">「クイズ」</strong>ボタンから
            問題を自動生成して解きます。採点と解説もそのまま NotebookLM 上で行えます。
          </p>
          <p className="text-xs text-gray-400">
            このステップもロードマップの「▶ 開始」でポモドーロ記録しておくと、学習時間がキノコの成長に反映されます。
          </p>
        </SectionCard>

        {/* 続けるコツ */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-200 mb-2">💡 続けるコツ</h2>
          <ul className="text-sm text-gray-300 space-y-1.5 list-disc list-inside">
            <li>1タスク = 1ノートブック にすると復習が楽</li>
            <li>間違えた問題は NotebookLM に「類題をあと3問」と依頼</li>
            <li>学習時間はロードマップの「▶ 開始」で自動記録される</li>
          </ul>
        </div>

        <div className="text-center">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-300">
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AiGuidePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center">読み込み中…</div>}>
      <AiGuideInner />
    </Suspense>
  );
}
