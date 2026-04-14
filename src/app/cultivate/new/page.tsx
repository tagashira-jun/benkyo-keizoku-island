"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserHarvestedMushrooms, startCultivation } from "@/lib/firestore";
import { CERTIFICATIONS, getMushroomSpecies } from "@/lib/masterdata";
import { calculateMatingCompatibility } from "@/lib/cultivation";
import type { HarvestedMushroom, CertificationMaster, MatingCompatibility } from "@/lib/types";
import MushroomSVG from "@/components/mushroom/MushroomSVG";
import Link from "next/link";

/** 系統グループの表示名 */
const LINEAGE_LABELS: Record<string, string> = {
  ipa: "IPA系（国家試験）",
  aws: "AWS系（クラウド認定）",
  linux: "Linux系",
  network: "ネットワーク系",
  db: "データベース系",
  python: "Python系",
  java: "Java系",
  ai: "AI・データサイエンス系",
  personal: "個人開発",
};

/** 資格を系統グループでまとめ、前提順にソート */
function getCertificationsByLineage(): { group: string; label: string; certs: CertificationMaster[] }[] {
  const groups = new Map<string, CertificationMaster[]>();

  for (const cert of CERTIFICATIONS) {
    const g = cert.lineageGroup;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(cert);
  }

  // 各グループ内を前提順にソート（prerequisiteId === null が先）
  const result: { group: string; label: string; certs: CertificationMaster[] }[] = [];
  for (const [group, certs] of groups) {
    // トポロジカルソート（簡易版：前提がないものを先に）
    const sorted: CertificationMaster[] = [];
    const remaining = [...certs];
    const placed = new Set<string>();

    while (remaining.length > 0) {
      const idx = remaining.findIndex(c => c.prerequisiteId === null || placed.has(c.prerequisiteId));
      if (idx === -1) break; // 循環参照防止
      const cert = remaining.splice(idx, 1)[0];
      sorted.push(cert);
      placed.add(cert.id);
    }
    sorted.push(...remaining);

    result.push({
      group,
      label: LINEAGE_LABELS[group] || group,
      certs: sorted,
    });
  }

  return result;
}

export default function NewCultivationPage() {
  const { firebaseUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<"select" | "mating" | "confirm">("select");
  const [selectedCert, setSelectedCert] = useState<CertificationMaster | null>(null);
  const [harvested, setHarvested] = useState<HarvestedMushroom[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<HarvestedMushroom | null>(null);
  const [compatibilities, setCompatibilities] = useState<MatingCompatibility[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const lineageGroups = getCertificationsByLineage();

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
    setSelectedCert(cert);
    setSelectedPartner(null);
    if (harvested.length > 0) {
      setStep("mating");
    } else {
      setStep("confirm");
    }
  }

  function handlePartnerSelect(partner: HarvestedMushroom | null) {
    setSelectedPartner(partner);
    setStep("confirm");
  }

  async function handleStart() {
    if (!firebaseUser || !selectedCert) return;
    setSubmitting(true);
    try {
      await startCultivation(firebaseUser.uid, selectedCert.id, selectedPartner);
      router.push("/");
    } finally {
      setSubmitting(false);
    }
  }

  if (!firebaseUser) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <Link href="/login">ログインしてください</Link>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => step === "select" ? router.push("/") : setStep("select")} className="text-gray-400 hover:text-white text-sm">
          &larr; 戻る
        </button>
        <h1 className="text-lg font-bold text-emerald-400">新しい栽培を始める</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* ステップ表示 */}
        <div className="flex gap-2 mb-6">
          {["資格選択", "菌株配合", "確認"].map((label, i) => {
            const stepIndex = i === 0 ? "select" : i === 1 ? "mating" : "confirm";
            const isActive = step === stepIndex;
            const isDone = (step === "mating" && i === 0) || (step === "confirm" && i <= 1);
            return (
              <div key={i} className="flex-1 text-center">
                <div className={`h-1 rounded-full mb-1 ${isActive ? "bg-emerald-500" : isDone ? "bg-emerald-700" : "bg-gray-700"}`} />
                <span className={`text-xs ${isActive ? "text-emerald-400" : "text-gray-300"}`}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Step 1: 資格選択（系統樹表示） */}
        {step === "select" && (
          <div>
            <h2 className="text-sm text-gray-300 mb-3 font-medium">育てる資格を選択</h2>
            <div className="space-y-6">
              {lineageGroups.map(({ group, label, certs }) => (
                <div key={group}>
                  <h3 className="text-xs text-gray-300 font-medium mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                    {label}
                  </h3>
                  <div className="space-y-2">
                    {certs.map((cert, idx) => {
                      const species = getMushroomSpecies(cert.mushroomSpeciesId);
                      const hasPrereq = cert.prerequisiteId !== null;
                      const prereqCert = hasPrereq ? CERTIFICATIONS.find(c => c.id === cert.prerequisiteId) : null;

                      return (
                        <div key={cert.id} className="relative">
                          {/* 系統の接続線 */}
                          {hasPrereq && (
                            <div className="absolute left-6 -top-2 w-0.5 h-2 bg-emerald-800" />
                          )}
                          <button
                            onClick={() => handleCertSelect(cert)}
                            className={`w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-4 text-left transition ${
                              selectedCert?.id === cert.id ? "border-emerald-500" : ""
                            } ${hasPrereq ? "ml-4 w-[calc(100%-1rem)]" : ""}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-2xl shrink-0">
                                🍄
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">{cert.name}</div>
                                <div className="text-xs text-gray-300">
                                  {species?.nameJa} / 難易度 {"★".repeat(cert.difficulty)}{"☆".repeat(5 - cert.difficulty)}
                                  {cert.estimatedDays > 0 && ` / 目安${cert.estimatedDays}日`}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">{cert.description}</div>
                                {/* Tips（前提資格のアドバイス） */}
                                <div className="text-xs text-emerald-300 mt-1">
                                  💡 {cert.tips}
                                </div>
                                {/* 前提資格の明示 */}
                                {prereqCert && (
                                  <div className="text-xs text-purple-300 mt-0.5">
                                    ↑ {prereqCert.name} の後に挑戦推奨
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: 菌株配合 */}
        {step === "mating" && selectedCert && (
          <div>
            <h2 className="text-sm text-gray-300 mb-1 font-medium">菌株配合（Plasmogamy）</h2>
            <p className="text-xs text-gray-600 mb-4">
              過去に収穫したキノコの一核体菌糸と接合させることで、知識を引き継げます。
            </p>

            {/* 接合しない選択肢 */}
            <button
              onClick={() => handlePartnerSelect(null)}
              className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-4 mb-2 text-left"
            >
              <div className="font-medium text-gray-300">接合しない（純粋培養）</div>
              <div className="text-xs text-gray-600">独自の形態を楽しむ</div>
            </button>

            {/* 収穫済みキノコ一覧 */}
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
                          <span className="text-xs text-emerald-600">
                            +{compat.growthAcceleration}%加速
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 3: 確認（ドメイン表示なし、tips表示） */}
        {step === "confirm" && selectedCert && (
          <div>
            <h2 className="text-sm text-gray-300 mb-4 font-medium">栽培内容の確認</h2>

            <div className="bg-gray-900 rounded-2xl p-6 mb-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold">{selectedCert.name}</h3>
                <p className="text-sm text-gray-400">
                  {getMushroomSpecies(selectedCert.mushroomSpeciesId)?.nameJa}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  難易度 {"★".repeat(selectedCert.difficulty)}{"☆".repeat(5 - selectedCert.difficulty)}
                  {selectedCert.estimatedDays > 0 && ` / 目安${selectedCert.estimatedDays}日`}
                </p>
              </div>

              {/* 資格の説明 */}
              <div className="bg-gray-800 rounded-lg p-3 mb-4 text-sm text-gray-400">
                {selectedCert.description}
              </div>

              {/* Tips */}
              <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-lg p-3 mb-4">
                <div className="text-xs text-emerald-500 font-medium mb-1">💡 アドバイス</div>
                <div className="text-sm text-emerald-300">{selectedCert.tips}</div>
              </div>

              {/* 配合情報 */}
              {selectedPartner && (
                <div className="bg-gray-800 rounded-lg p-3 mb-4">
                  <div className="text-xs text-gray-300 mb-1">配合相手</div>
                  <div className="text-purple-400 font-medium">{selectedPartner.certificationName}</div>
                  {(() => {
                    const compat = compatibilities.find(c => c.partnerId === selectedPartner.id);
                    if (!compat) return null;
                    return (
                      <div className="text-xs text-gray-300 mt-1">
                        +{compat.growthAcceleration}%加速
                      </div>
                    );
                  })()}
                </div>
              )}

              {!selectedPartner && (
                <div className="bg-gray-800 rounded-lg p-3 mb-4 text-sm text-gray-300">
                  純粋培養（配合なし）
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
