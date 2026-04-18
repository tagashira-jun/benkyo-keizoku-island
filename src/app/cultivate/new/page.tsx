"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getUserHarvestedMushrooms,
  startCultivation,
  saveRoadmap,
} from "@/lib/firestore";
import {
  CERTIFICATIONS,
  getMushroomSpecies,
  buildCustomCertMeta,
  CUSTOM_CERT_TEMPLATES,
} from "@/lib/masterdata";
import { calculateMatingCompatibility } from "@/lib/cultivation";
import {
  buildGeminiPrompt,
  GEMINI_URL,
  parseRoadmapMarkdown,
} from "@/lib/roadmap";
import type {
  HarvestedMushroom,
  CertificationMaster,
  CustomCertificationMeta,
  MatingCompatibility,
  RoadmapChapter,
} from "@/lib/types";
import MushroomSVG from "@/components/mushroom/MushroomSVG";
import Link from "next/link";

/** 系統グループの表示名とアイコン */
const LINEAGE_META: Record<string, { label: string; icon: string; accent: string }> = {
  ipa:            { label: "IPA系（国家試験）",        icon: "🏛️", accent: "bg-emerald-500" },
  aws:            { label: "AWS系（クラウド認定）",    icon: "☁️", accent: "bg-orange-500" },
  azure:          { label: "Azure系（Microsoft認定）",  icon: "🔷", accent: "bg-sky-500" },
  linux:          { label: "Linux系",                  icon: "🐧", accent: "bg-yellow-500" },
  network:        { label: "ネットワーク系",           icon: "🔌", accent: "bg-cyan-500" },
  db:             { label: "データベース系",           icon: "🗄️", accent: "bg-indigo-500" },
  python:         { label: "Python系",                 icon: "🐍", accent: "bg-lime-500" },
  java:           { label: "Java系",                   icon: "☕", accent: "bg-red-500" },
  ruby:           { label: "Ruby系",                   icon: "💎", accent: "bg-rose-500" },
  ai:             { label: "AI・データサイエンス系",    icon: "🤖", accent: "bg-violet-500" },
  testing:        { label: "テスト・QA系",             icon: "🧪", accent: "bg-teal-500" },
  pm:             { label: "PM・サービス管理系",       icon: "📋", accent: "bg-amber-500" },
  virtualization: { label: "仮想化系",                 icon: "🖥️", accent: "bg-fuchsia-500" },
  business:       { label: "ビジネス・経理系",          icon: "💼", accent: "bg-stone-500" },
  personal:       { label: "個人開発",                 icon: "🛠️", accent: "bg-pink-500" },
};

/** 系統の表示順（学習ルートとして推奨される順序） */
const LINEAGE_ORDER = [
  "ipa", "aws", "azure", "linux", "network", "db",
  "python", "java", "ruby", "ai", "testing",
  "pm", "virtualization", "business", "personal",
];

function getCertificationsByLineage(): { group: string; label: string; icon: string; accent: string; certs: CertificationMaster[] }[] {
  const groups = new Map<string, CertificationMaster[]>();
  for (const cert of CERTIFICATIONS) {
    const g = cert.lineageGroup;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(cert);
  }
  const result: { group: string; label: string; icon: string; accent: string; certs: CertificationMaster[] }[] = [];
  const ordered = [
    ...LINEAGE_ORDER.filter((g) => groups.has(g)),
    ...[...groups.keys()].filter((g) => !LINEAGE_ORDER.includes(g)),
  ];
  for (const group of ordered) {
    const certs = groups.get(group)!;
    const sorted: CertificationMaster[] = [];
    const remaining = [...certs];
    const placed = new Set<string>();
    while (remaining.length > 0) {
      const idx = remaining.findIndex(c => c.prerequisiteId === null || placed.has(c.prerequisiteId));
      if (idx === -1) break;
      const cert = remaining.splice(idx, 1)[0];
      sorted.push(cert);
      placed.add(cert.id);
    }
    sorted.push(...remaining);
    const meta = LINEAGE_META[group] ?? { label: group, icon: "📚", accent: "bg-gray-500" };
    result.push({ group, label: meta.label, icon: meta.icon, accent: meta.accent, certs: sorted });
  }
  return result;
}

type Step = "select" | "custom" | "mating" | "goal" | "roadmap" | "confirm";

export default function NewCultivationPage() {
  const { firebaseUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("select");
  const [selectedCert, setSelectedCert] = useState<CertificationMaster | null>(null);
  const [customCert, setCustomCert] = useState<CustomCertificationMeta | null>(null);
  /** 選択が custom かマスター資格か */
  const [isCustom, setIsCustom] = useState(false);

  // カスタム資格の入力バッファ
  const [customName, setCustomName] = useState("");
  const [customTemplate, setCustomTemplate] = useState<string>(CUSTOM_CERT_TEMPLATES[0].id);
  const [customDifficulty, setCustomDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [customDays, setCustomDays] = useState<number>(60);

  const [harvested, setHarvested] = useState<HarvestedMushroom[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<HarvestedMushroom | null>(null);
  const [compatibilities, setCompatibilities] = useState<MatingCompatibility[]>([]);
  const [goalStatement, setGoalStatement] = useState("");

  // ロードマップ関連
  const [roadmapRaw, setRoadmapRaw] = useState("");
  const [copied, setCopied] = useState(false);
  const [promptCopyStatus, setPromptCopyStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const lineageGroups = useMemo(getCertificationsByLineage, []);

  // ─── 資格選択ステップのUI状態 ───
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLineage, setActiveLineage] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  // 最初の2系統だけ自動展開。他は折り畳み
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const init = new Set<string>();
    lineageGroups.slice(0, 2).forEach((g) => init.add(g.group));
    return init;
  });

  function toggleGroup(group: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  /** フィルタ適用済みの系統グループ */
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return lineageGroups
      .map((grp) => {
        if (activeLineage !== "all" && grp.group !== activeLineage) return { ...grp, certs: [] };
        const certs = grp.certs.filter((c) => {
          if (difficultyFilter !== 0 && c.difficulty !== difficultyFilter) return false;
          if (!q) return true;
          return (
            c.name.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.tips.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q)
          );
        });
        return { ...grp, certs };
      })
      .filter((g) => g.certs.length > 0);
  }, [lineageGroups, searchQuery, activeLineage, difficultyFilter]);

  const totalFilteredCount = filteredGroups.reduce((acc, g) => acc + g.certs.length, 0);

  // 検索 or フィルタ中は全グループを展開（結果が見えないのを防ぐ）
  const isFiltering = searchQuery.trim() !== "" || activeLineage !== "all" || difficultyFilter !== 0;

  useEffect(() => {
    if (!firebaseUser) return;
    getUserHarvestedMushrooms(firebaseUser.uid).then(setHarvested);
  }, [firebaseUser]);

  // 資格選択後の配合適合性計算
  useEffect(() => {
    if (!selectedCert || harvested.length === 0) {
      setCompatibilities([]);
      return;
    }
    const comps = harvested.map((h) => calculateMatingCompatibility(selectedCert, h));
    comps.sort((a, b) => b.sharedDomainCount - a.sharedDomainCount);
    setCompatibilities(comps);
  }, [selectedCert, harvested]);

  function handleCertSelect(cert: CertificationMaster) {
    setIsCustom(false);
    setCustomCert(null);
    setSelectedCert(cert);
    setSelectedPartner(null);
    if (harvested.length > 0) setStep("mating");
    else setStep("goal");
  }

  function handleOpenCustom() {
    setIsCustom(true);
    setSelectedCert(null);
    setCustomCert(null);
    setStep("custom");
  }

  function handleConfirmCustom() {
    if (!customName.trim()) return;
    const meta = buildCustomCertMeta({
      name: customName,
      templateId: customTemplate,
      difficulty: customDifficulty,
      estimatedDays: customDays,
    });
    setCustomCert(meta);
    // カスタム資格はマスター互換のダミーを作って以降の画面で使う
    const dummyCert: CertificationMaster = {
      id: "custom",
      name: meta.name,
      category: "Custom",
      mushroomSpeciesId: meta.mushroomSpeciesId,
      difficulty: meta.difficulty,
      domains: meta.domains,
      estimatedDays: meta.estimatedDays,
      description: meta.description,
      tips: meta.tips,
      prerequisiteId: null,
      lineageGroup: "custom",
      phaseThresholds: meta.phaseThresholds,
    };
    setSelectedCert(dummyCert);
    setSelectedPartner(null);
    if (harvested.length > 0) setStep("mating");
    else setStep("goal");
  }

  function handlePartnerSelect(partner: HarvestedMushroom | null) {
    setSelectedPartner(partner);
    setStep("goal");
  }

  const activeCertName = selectedCert?.name ?? "";
  const activeCertDays = selectedCert?.estimatedDays ?? 60;

  const geminiPrompt = useMemo(
    () => buildGeminiPrompt({
      certificationName: activeCertName || "（未選択）",
      goalText: goalStatement,
      estimatedDays: activeCertDays,
    }),
    [activeCertName, goalStatement, activeCertDays],
  );

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(geminiPrompt);
      setPromptCopyStatus("✓ プロンプトをコピーしました");
      setCopied(true);
      setTimeout(() => setPromptCopyStatus(""), 2500);
    } catch {
      setPromptCopyStatus("コピーに失敗しました。テキストを選択してコピーしてください");
    }
  }

  const parsedChapters: RoadmapChapter[] = useMemo(
    () => (roadmapRaw.trim() ? parseRoadmapMarkdown(roadmapRaw) : []),
    [roadmapRaw],
  );
  const parsedTaskCount = parsedChapters.reduce((acc, c) => acc + c.tasks.length, 0);

  async function handleStart() {
    if (!firebaseUser || !selectedCert) return;
    setSubmitting(true);
    try {
      const cultivationId = await startCultivation(
        firebaseUser.uid,
        isCustom ? "custom" : selectedCert.id,
        selectedPartner,
        goalStatement,
        isCustom ? (customCert ?? undefined) : undefined,
      );
      // ロードマップが入力されていれば同時保存
      if (parsedChapters.length > 0) {
        await saveRoadmap({
          userId: firebaseUser.uid,
          cultivationId,
          goalText: goalStatement,
          rawContent: roadmapRaw,
          chapters: parsedChapters,
        });
      }
      router.push(`/?cultivationId=${cultivationId}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!firebaseUser) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <Link href="/login">ログインしてください</Link>
    </div>;
  }

  const stepOrder: Step[] = ["select", "custom", "mating", "goal", "roadmap", "confirm"];
  const stepLabels: Partial<Record<Step, string>> = {
    select: "資格選択",
    mating: "菌株配合",
    goal: "目標宣言",
    roadmap: "ロードマップ",
    confirm: "確認",
  };
  const visibleSteps: Step[] = isCustom
    ? (harvested.length > 0
      ? ["select", "mating", "goal", "roadmap", "confirm"]
      : ["select", "goal", "roadmap", "confirm"])
    : (harvested.length > 0
      ? ["select", "mating", "goal", "roadmap", "confirm"]
      : ["select", "goal", "roadmap", "confirm"]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => {
            if (step === "select") router.push("/");
            else if (step === "custom") setStep("select");
            else if (step === "mating") setStep(isCustom ? "custom" : "select");
            else if (step === "goal") setStep(harvested.length > 0 ? "mating" : (isCustom ? "custom" : "select"));
            else if (step === "roadmap") setStep("goal");
            else if (step === "confirm") setStep("roadmap");
          }}
          className="text-gray-400 hover:text-white text-sm"
        >
          &larr; 戻る
        </button>
        <h1 className="text-lg font-bold text-emerald-400">新しい栽培を始める</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* ステップ表示 */}
        <div className="flex gap-2 mb-6">
          {visibleSteps.map((s, i) => {
            const label = stepLabels[s] ?? s;
            const isActive = step === s;
            const isDone = visibleSteps.indexOf(step) > i;
            return (
              <div key={s} className="flex-1 text-center">
                <div className={`h-1 rounded-full mb-1 ${isActive ? "bg-emerald-500" : isDone ? "bg-emerald-700" : "bg-gray-700"}`} />
                <span className={`text-[11px] ${isActive ? "text-emerald-400" : "text-gray-300"}`}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Step: 資格選択（系統樹 + カスタム） */}
        {step === "select" && (
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm text-gray-300 font-medium">育てる資格を選択</h2>
              <span className="text-[11px] text-gray-500">
                全 {CERTIFICATIONS.length} 件 / 表示 {totalFilteredCount} 件
              </span>
            </div>

            {/* 検索バー（sticky） */}
            <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm -mx-4 px-4 pb-3 mb-3 border-b border-gray-800/60">
              <div className="relative mb-3">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="資格名・キーワードで検索（例: AWS, Python, 簿記）"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-9 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 flex items-center justify-center text-sm"
                    aria-label="クリア"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 系統フィルタ（横スクロールのピル） */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 mb-2 scrollbar-thin">
                <button
                  onClick={() => setActiveLineage("all")}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
                    activeLineage === "all"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-800"
                  }`}
                >
                  すべて
                </button>
                {lineageGroups.map(({ group, label, icon }) => (
                  <button
                    key={group}
                    onClick={() => setActiveLineage(activeLineage === group ? "all" : group)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
                      activeLineage === group
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-800"
                    }`}
                  >
                    <span className="mr-1">{icon}</span>
                    {label.replace(/（.+?）/, "")}
                  </button>
                ))}
              </div>

              {/* 難易度フィルタ */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-gray-500 shrink-0">難易度:</span>
                <button
                  onClick={() => setDifficultyFilter(0)}
                  className={`px-2 py-0.5 rounded ${
                    difficultyFilter === 0
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-900 border border-gray-700 text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  全て
                </button>
                {([1, 2, 3, 4, 5] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficultyFilter(difficultyFilter === d ? 0 : d)}
                    className={`px-2 py-0.5 rounded ${
                      difficultyFilter === d
                        ? "bg-amber-600 text-white"
                        : "bg-gray-900 border border-gray-700 text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    {"★".repeat(d)}
                  </button>
                ))}
              </div>
            </div>

            {/* 結果リスト */}
            <div className="space-y-3">
              {filteredGroups.length === 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-sm text-gray-400">
                  該当する資格が見つかりませんでした。
                  <div className="mt-2">
                    <button
                      onClick={() => { setSearchQuery(""); setActiveLineage("all"); setDifficultyFilter(0); }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                    >
                      フィルタをリセット
                    </button>
                  </div>
                </div>
              )}

              {filteredGroups.map(({ group, label, icon, accent, certs }) => {
                const isExpanded = isFiltering || expandedGroups.has(group);
                return (
                  <div key={group} className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
                    {/* グループヘッダー（クリックで折り畳み） */}
                    <button
                      onClick={() => toggleGroup(group)}
                      disabled={isFiltering}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-900 transition disabled:cursor-default"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${accent} inline-block`} />
                        <span className="text-base">{icon}</span>
                        <span className="text-sm font-medium text-gray-200">{label}</span>
                        <span className="text-[11px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{certs.length}</span>
                      </div>
                      {!isFiltering && (
                        <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                      )}
                    </button>

                    {/* 資格カード */}
                    {isExpanded && (
                      <div className="px-2 pb-2 space-y-1.5">
                        {certs.map((cert) => {
                          const species = getMushroomSpecies(cert.mushroomSpeciesId);
                          const hasPrereq = cert.prerequisiteId !== null;
                          const prereqCert = hasPrereq ? CERTIFICATIONS.find(c => c.id === cert.prerequisiteId) : null;
                          const isSelected = selectedCert?.id === cert.id;
                          return (
                            <button
                              key={cert.id}
                              onClick={() => handleCertSelect(cert)}
                              className={`w-full bg-gray-900 hover:bg-gray-800 border rounded-lg p-3 text-left transition ${
                                isSelected ? "border-emerald-500 ring-1 ring-emerald-500/40" : "border-gray-800"
                              } ${hasPrereq ? "ml-3" : ""}`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-xl shrink-0">
                                  🍄
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="font-medium text-sm text-white truncate">{cert.name}</div>
                                    <span className="text-[10px] text-amber-400 shrink-0 mt-0.5">
                                      {"★".repeat(cert.difficulty)}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                    <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">{species?.nameJa}</span>
                                    {cert.estimatedDays > 0 && (
                                      <span>📅 目安 {cert.estimatedDays}日</span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-gray-400 mt-1 line-clamp-2">{cert.description}</div>
                                  {prereqCert && (
                                    <div className="text-[11px] text-purple-300 mt-1">
                                      ↑ {prereqCert.name} の後に挑戦推奨
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* カスタム資格カード */}
              <div className="pt-2">
                <button
                  onClick={handleOpenCustom}
                  className="w-full bg-gray-900 hover:bg-gray-800 border border-dashed border-amber-600/60 rounded-xl p-4 text-left transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-amber-900/30 rounded-lg flex items-center justify-center text-2xl shrink-0">
                      ✏️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-amber-200">一覧にない資格を自由入力</div>
                      <div className="text-xs text-gray-300 mt-0.5">
                        TOEIC・オリジナルプロジェクトなど、マスターにない目標もOK。
                      </div>
                      <div className="text-xs text-amber-300 mt-1">
                        💡 ジャンル・難易度・目安日数だけ入れればキノコが生えます
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: カスタム資格入力 */}
        {step === "custom" && (
          <div className="space-y-4">
            <h2 className="text-sm text-gray-300 font-medium">資格・目標の情報を入力</h2>
            <p className="text-xs text-gray-400">
              一覧にない目標も自由に追加できます。難易度や日数はあとから感覚でOKです。
            </p>

            <div>
              <label className="text-xs text-gray-300 block mb-1">目標名 <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value.slice(0, 50))}
                placeholder="例：日商簿記2級 / TOEIC 800点 / Flutterでアプリ1本"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
              />
              <div className="text-[11px] text-gray-500 text-right mt-0.5">{customName.length}/50</div>
            </div>

            <div>
              <label className="text-xs text-gray-300 block mb-1">ジャンル（キノコの種類・性質に反映）</label>
              <div className="grid grid-cols-2 gap-2">
                {CUSTOM_CERT_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setCustomTemplate(t.id)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs transition ${
                      customTemplate === t.id
                        ? "bg-emerald-600/30 border-emerald-500 text-emerald-100"
                        : "bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-300 block mb-1">難易度</label>
                <div className="flex gap-1">
                  {([1, 2, 3, 4, 5] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setCustomDifficulty(d)}
                      className={`flex-1 py-2 rounded text-sm ${
                        customDifficulty === d
                          ? "bg-amber-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {"★".repeat(d)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-300 block mb-1">目安学習日数</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={7}
                    max={365}
                    value={customDays}
                    onChange={(e) => setCustomDays(Math.max(7, Math.min(365, Number(e.target.value) || 60)))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                  <span className="text-xs text-gray-400 shrink-0">日</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmCustom}
              disabled={!customName.trim()}
              className={`w-full py-2 rounded-lg font-medium ${
                customName.trim()
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
            >
              この内容で次へ
            </button>
          </div>
        )}

        {/* Step: 菌株配合 */}
        {step === "mating" && selectedCert && (
          <div>
            <h2 className="text-sm text-gray-300 mb-1 font-medium">菌株配合（Plasmogamy）</h2>
            <p className="text-xs text-gray-600 mb-4">
              過去に収穫したキノコの一核体菌糸と接合させることで、知識を引き継げます。
            </p>
            <button
              onClick={() => handlePartnerSelect(null)}
              className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-4 mb-2 text-left"
            >
              <div className="font-medium text-gray-300">接合しない（純粋培養）</div>
              <div className="text-xs text-gray-600">独自の形態を楽しむ</div>
            </button>
            {compatibilities.map((compat) => {
              const partner = harvested.find(h => h.id === compat.partnerId);
              if (!partner) return null;
              const species = getMushroomSpecies(partner.mushroomSpeciesId);
              const levelColors: Record<string, string> = {
                strong: "text-emerald-400",
                moderate: "text-yellow-400",
                weak: "text-orange-400",
                incompatible: "text-red-400",
              };
              const levelLabels: Record<string, string> = {
                strong: "強い適合",
                moderate: "適合",
                weak: "弱い接合",
                incompatible: "不適合",
              };
              return (
                <button
                  key={partner.id}
                  onClick={() => compat.compatibilityLevel !== "incompatible" && handlePartnerSelect(partner)}
                  disabled={compat.compatibilityLevel === "incompatible"}
                  className={`w-full bg-gray-900 border rounded-xl p-4 mb-2 text-left transition ${
                    compat.compatibilityLevel === "incompatible"
                      ? "border-gray-800 opacity-50 cursor-not-allowed"
                      : "border-gray-800 hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14">
                      <MushroomSVG
                        morphology={partner.finalMorphology}
                        phase={6}
                        speciesId={partner.mushroomSpeciesId}
                        width={56}
                        height={78}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{partner.certificationName}</div>
                      <div className="text-xs text-gray-300">{species?.nameJa}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${levelColors[compat.compatibilityLevel]}`}>
                          {levelLabels[compat.compatibilityLevel]}
                        </span>
                        {compat.growthAcceleration > 0 && (
                          <span className="text-xs text-emerald-600">+{compat.growthAcceleration}%加速</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step: 目標宣言（Epic Meaning） */}
        {step === "goal" && selectedCert && (
          <div>
            <h2 className="text-sm text-gray-300 mb-1 font-medium">
              なぜ挑むのかを宣言する（任意）
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              自分の言葉で「なぜこの旅を始めるのか」を書き残すと、迷った日に立ち戻れる拠り所になります。
              この文章は次画面でGeminiに渡す「あなた専用のロードマップ」生成にも使われます。
            </p>

            <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4 mb-4">
              <div className="text-xs text-emerald-400 font-medium mb-2">
                📜 {selectedCert.name} に挑む理由
              </div>
              <textarea
                value={goalStatement}
                onChange={(e) => setGoalStatement(e.target.value.slice(0, 200))}
                placeholder="例：インフラ担当から脱却してアプリ側の設計もできるようになりたい／転職で武器になる肩書きが欲しい／半年後の自分を証明したい…"
                rows={4}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none"
              />
              <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                <span>※ 空欄のままでも次に進めます</span>
                <span>{goalStatement.length}/200</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setGoalStatement("")}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm"
              >
                空欄のままにする
              </button>
              <button
                onClick={() => setStep("roadmap")}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                次へ（ロードマップ作成）
              </button>
            </div>
          </div>
        )}

        {/* Step: ロードマップ生成・貼付 */}
        {step === "roadmap" && selectedCert && (
          <div className="space-y-4">
            <h2 className="text-sm text-gray-300 font-medium">
              Geminiに学習ロードマップを作ってもらう（任意）
            </h2>
            <p className="text-xs text-gray-400">
              プロンプトをコピーしてGeminiに貼り付け、出力結果を下のテキストエリアに貼り付けてください。
              章立て＋25分以内のタスクに分解して、ポモドーロ／チェックボックスに自動変換します。
              <span className="block mt-1 text-[11px] text-gray-500">※ スキップして空のまま栽培だけ始めることもできます。</span>
            </p>

            {/* プロンプト表示 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-emerald-400 font-medium">① Geminiに渡すプロンプト</span>
                <button
                  onClick={handleCopyPrompt}
                  className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded-md"
                >
                  📋 コピー
                </button>
              </div>
              <textarea
                readOnly
                value={geminiPrompt}
                rows={6}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-[11px] text-gray-200 font-mono leading-relaxed resize-none"
                onFocus={(e) => e.currentTarget.select()}
              />
              {promptCopyStatus && (
                <div className="text-xs text-emerald-300 mt-1">{promptCopyStatus}</div>
              )}
              <a
                href={GEMINI_URL}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1 mt-2 text-xs rounded-md px-3 py-1.5 ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-800 text-gray-200 hover:bg-gray-700"
                }`}
              >
                ② Geminiを開く →
              </a>
            </div>

            {/* ペースト */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <div className="text-xs text-emerald-400 font-medium mb-2">
                ③ Geminiの返答をここに貼り付け
              </div>
              <textarea
                value={roadmapRaw}
                onChange={(e) => setRoadmapRaw(e.target.value)}
                rows={10}
                placeholder={"## 章1: 基礎の地固め\n> 試験範囲の土台を押さえる\n- [25m] 教科書 第1章 を通読\n- [25m] 用語カードを10個作る\n- [ ] 章末問題を全て解く（目安60m）\n\n## 章2: ..."}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-100 font-mono leading-relaxed resize-none"
              />
              {parsedChapters.length > 0 && (
                <div className="mt-2 text-xs text-emerald-300">
                  ✓ {parsedChapters.length}章 / {parsedTaskCount}タスクを認識しました
                </div>
              )}
              {roadmapRaw.trim() && parsedChapters.length === 0 && (
                <div className="mt-2 text-xs text-amber-300">
                  ⚠ 章やタスク行が認識できませんでした。形式を見直してみてください。
                </div>
              )}
            </div>

            {/* プレビュー */}
            {parsedChapters.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                <div className="text-xs text-gray-300 font-medium mb-2">プレビュー</div>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {parsedChapters.map((c) => (
                    <div key={c.id}>
                      <div className="text-sm font-semibold text-emerald-200">{c.title}</div>
                      {c.summary && (
                        <div className="text-xs text-gray-400 italic">{c.summary}</div>
                      )}
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {c.tasks.map((t) => (
                          <li key={t.id} className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                              t.type === "pomodoro"
                                ? "bg-orange-900/50 text-orange-200"
                                : "bg-gray-800 text-gray-300"
                            }`}>
                              {t.type === "pomodoro" ? "🍅" : "☑"}
                              {t.estimatedMinutes}m
                            </span>
                            <span className="text-gray-200">{t.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setRoadmapRaw(""); setStep("confirm"); }}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm"
              >
                スキップ
              </button>
              <button
                onClick={() => setStep("confirm")}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        {/* Step: 確認 */}
        {step === "confirm" && selectedCert && (
          <div>
            <h2 className="text-sm text-gray-300 mb-4 font-medium">栽培内容の確認</h2>
            <div className="bg-gray-900 rounded-2xl p-6 mb-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold">{selectedCert.name}</h3>
                <p className="text-sm text-gray-400">
                  {getMushroomSpecies(selectedCert.mushroomSpeciesId)?.nameJa}
                  {isCustom && " (カスタム)"}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  難易度 {"★".repeat(selectedCert.difficulty)}{"☆".repeat(5 - selectedCert.difficulty)}
                  {selectedCert.estimatedDays > 0 && ` / 目安${selectedCert.estimatedDays}日`}
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-3 mb-4 text-sm text-gray-400">
                {selectedCert.description}
              </div>

              <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-lg p-3 mb-4">
                <div className="text-xs text-emerald-500 font-medium mb-1">💡 アドバイス</div>
                <div className="text-sm text-emerald-300">{selectedCert.tips}</div>
              </div>

              {selectedPartner && (
                <div className="bg-gray-800 rounded-lg p-3 mb-4">
                  <div className="text-xs text-gray-300 mb-1">配合相手</div>
                  <div className="text-purple-400 font-medium">{selectedPartner.certificationName}</div>
                </div>
              )}
              {!selectedPartner && (
                <div className="bg-gray-800 rounded-lg p-3 mb-4 text-sm text-gray-300">
                  純粋培養（配合なし）
                </div>
              )}

              {goalStatement.trim() && (
                <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-3 mb-4">
                  <div className="text-xs text-emerald-400 font-medium mb-1">📜 目標宣言</div>
                  <div className="text-sm text-emerald-100 whitespace-pre-wrap">
                    {goalStatement.trim()}
                  </div>
                </div>
              )}

              {parsedChapters.length > 0 && (
                <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-3 mb-4">
                  <div className="text-xs text-amber-300 font-medium mb-1">
                    🗺 ロードマップ ({parsedChapters.length}章 / {parsedTaskCount}タスク)
                  </div>
                  <div className="text-[11px] text-amber-200 space-y-0.5 max-h-40 overflow-y-auto">
                    {parsedChapters.map((c) => (
                      <div key={c.id}>・{c.title}（{c.tasks.length}タスク）</div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleStart}
                disabled={submitting}
                className={`w-full py-3 rounded-xl font-medium text-lg transition ${
                  submitting
                    ? "bg-gray-700 text-gray-300"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {submitting ? "開始中..." : "栽培を開始する"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
