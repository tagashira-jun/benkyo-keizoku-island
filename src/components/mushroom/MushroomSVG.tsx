"use client";

import { Morphology, GrowthPhase, MushroomSpeciesId } from "@/lib/types";
import { getMushroomSpecies } from "@/lib/masterdata";

interface MushroomSVGProps {
  morphology: Morphology;
  phase: GrowthPhase;
  speciesId: MushroomSpeciesId;
  width?: number;
  height?: number;
  className?: string;
  /** 最終記録からの経過日数（衰退表現に使う） */
  daysSinceLastRecord?: number;
  /** キャラクター単体（栽培ブースなし）で描画 */
  soloMode?: boolean;
  /** 資格カテゴリ（小物表示用）: "IPA" | "AWS" | "Linux" | "Network" | "Database" | "Programming" | "AI" | "PersonalDev" */
  category?: string;
  /** 関連知識レベル（0〜3）。過去収穫した関連キノコが多いほど高い */
  experienceLevel?: number;
  /** 経験済みドメインID配列（最大3件表示）。ex: ["CS","NW","AI"] */
  experienceDomains?: string[];
}

/**
 * キノコ擬人化デフォルメキャラクター
 * - 種ごとに傘形状が異なる（SpeciesHat）
 * - 群生種は子分キャラが周囲に並ぶ（Cluster）
 * - カテゴリに応じた小物（Accessory）
 * - 過去の関連収穫が多いほど光るオーラ（KnowledgeAura）
 */
export default function MushroomSVG({
  morphology,
  phase,
  speciesId,
  width = 240,
  height = 280,
  className = "",
  daysSinceLastRecord = 0,
  soloMode = false,
  category,
  experienceLevel = 0,
  experienceDomains = [],
}: MushroomSVGProps) {
  const species = getMushroomSpecies(speciesId);
  if (!species) return null;

  const bodyType: "fat" | "normal" | "thin" =
    morphology.stipeWidth > 0.6 ? "fat" :
    morphology.stipeLength > 0.7 && morphology.stipeWidth < 0.4 ? "thin" :
    "normal";

  const tirednessLevel: "fresh" | "normal" | "tired" | "exhausted" =
    daysSinceLastRecord >= 14 ? "exhausted" :
    daysSinceLastRecord >= 7 ? "tired" :
    daysSinceLastRecord >= 3 ? "normal" :
    "fresh";

  // 群生: Phase3以降で子分キャラを周りに描画
  const baseCluster = species.baseMorphology.clusterCount;
  const subCount = phase >= 3 ? Math.min(Math.max(baseCluster - 1, 0), 4) : 0;

  const cx = width / 2;
  const cy = soloMode ? height * 0.55 : height * 0.5;

  const hue = Math.round(morphology.colorHue);
  const sat = Math.max(Math.round(morphology.colorSaturation * 100), 45);
  const bri = Math.max(Math.round(morphology.colorBrightness * 100), 40);
  const capColor = `hsl(${hue}, ${sat}%, ${bri}%)`;
  const capDark = `hsl(${hue}, ${sat}%, ${Math.max(bri - 20, 15)}%)`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <defs>
        <linearGradient id="log-bark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6b4a2a" />
          <stop offset="100%" stopColor="#3b2510" />
        </linearGradient>
        <radialGradient id="log-end" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#a77c4a" />
          <stop offset="100%" stopColor="#3b2510" />
        </radialGradient>
        <radialGradient id="aura-gradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#fde68a" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {!soloMode && <Booth width={width} height={height} phase={phase} />}

      {/* 知識オーラ（過去の関連収穫が多いと光る） */}
      {experienceLevel > 0 && (
        <KnowledgeAura cx={cx} cy={cy} radius={width * 0.4} level={experienceLevel} />
      )}

      {/* 群生キャラ（背後に配置） */}
      {subCount > 0 &&
        subClusterPositions(subCount, width, cy).map((pos, i) => (
          <SubMushroom
            key={`sub-${i}`}
            cx={pos.x}
            cy={pos.y}
            size={pos.size}
            speciesId={speciesId}
            capColor={capColor}
            capDark={capDark}
            phase={phase}
          />
        ))}

      {/* メインキャラクター */}
      <Character
        morphology={morphology}
        phase={phase}
        speciesId={speciesId}
        bodyType={bodyType}
        tirednessLevel={tirednessLevel}
        category={category}
        cx={cx}
        cy={cy}
        scale={Math.min(width, height) / 280}
        experienceLevel={experienceLevel}
        experienceDomains={experienceDomains}
      />

      {/* ラベル */}
      {!soloMode && (
        <>
          <text
            x={10}
            y={height - 10}
            fill="#a8957a"
            fontSize={10}
            fontFamily="monospace"
            opacity={0.85}
          >
            Phase {phase}/6 · {stageLabel(phase)}
          </text>
          <text
            x={width - 10}
            y={height - 10}
            fill={bodyTypeColor(bodyType)}
            fontSize={10}
            fontFamily="monospace"
            textAnchor="end"
            opacity={0.85}
          >
            {bodyTypeLabel(bodyType)}
          </text>
          {experienceLevel > 0 && (
            <text
              x={width / 2}
              y={height - 10}
              fill="#fde68a"
              fontSize={10}
              fontFamily="monospace"
              textAnchor="middle"
              opacity={0.85}
            >
              ✨ 知識Lv.{experienceLevel}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

function stageLabel(phase: GrowthPhase): string {
  return phase === 1 ? "胞子" :
         phase === 2 ? "幼少期" :
         phase === 3 ? "成長期" :
         phase === 4 ? "青年期" :
         phase === 5 ? "成人期" :
         phase === 6 ? "成熟期" :
         phase === 7 ? "覚醒" :
         phase === 8 ? "変容" :
         "化け物";
}

function bodyTypeLabel(bt: "fat" | "normal" | "thin"): string {
  return bt === "fat" ? "太め（Input過多）" : bt === "thin" ? "細め（Output過多）" : "バランス型";
}

function bodyTypeColor(bt: "fat" | "normal" | "thin"): string {
  return bt === "fat" ? "#60a5fa" : bt === "thin" ? "#fb923c" : "#6ee7b7";
}

// 群生キャラの配置座標（左右対称に分散）
function subClusterPositions(count: number, width: number, cy: number) {
  const positions: { x: number; y: number; size: number }[] = [];
  const cx = width / 2;
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1; // 偶数=右、奇数=左
    const pair = Math.floor(i / 2);
    const distX = (0.28 + pair * 0.13) * width;
    const distY = pair % 2 === 0 ? 8 : -4; // ペアごとに高さを交互に変える
    positions.push({
      x: cx + side * distX,
      y: cy + distY,
      size: 22 - pair * 2,
    });
  }
  return positions;
}

// ============================================
// 栽培ブース（原木・地面）
// ============================================
function Booth({ width, height, phase }: { width: number; height: number; phase: GrowthPhase }) {
  const logY = height * 0.72;
  const logH = height * 0.16;
  return (
    <g>
      <rect x={0} y={height * 0.85} width={width} height={height * 0.15} fill="#1a1410" />
      <ellipse cx={width / 2} cy={logY + logH + 4} rx={width * 0.42} ry={6} fill="black" opacity={0.4} />
      <rect
        x={width * 0.08}
        y={logY}
        width={width * 0.84}
        height={logH}
        rx={logH / 2}
        fill="url(#log-bark)"
      />
      {Array.from({ length: 6 }).map((_, i) => (
        <line
          key={i}
          x1={width * 0.12 + (width * 0.76 * i) / 6}
          y1={logY + 3}
          x2={width * 0.12 + (width * 0.76 * i) / 6}
          y2={logY + logH - 3}
          stroke="#2a1a08"
          strokeWidth={0.6}
          opacity={0.6}
        />
      ))}
      <ellipse cx={width * 0.08} cy={logY + logH / 2} rx={5} ry={logH / 2} fill="url(#log-end)" />
      <ellipse cx={width * 0.92} cy={logY + logH / 2} rx={5} ry={logH / 2} fill="url(#log-end)" />
      {phase >= 2 && phase <= 3 && (
        <g opacity={0.5}>
          {Array.from({ length: 12 }).map((_, i) => (
            <circle
              key={i}
              cx={width * 0.12 + (width * 0.76 * i) / 12}
              cy={logY + 2 + Math.sin(i) * 4}
              r={1.5}
              fill="#f5e8d0"
            />
          ))}
        </g>
      )}
    </g>
  );
}

// ============================================
// 知識オーラ（関連ドメイン経験のエフェクト）
// ============================================
function KnowledgeAura({ cx, cy, radius, level }: { cx: number; cy: number; radius: number; level: number }) {
  const particles = Math.min(level * 3, 9);
  return (
    <g>
      <circle cx={cx} cy={cy} r={radius} fill="url(#aura-gradient)">
        <animate attributeName="r" values={`${radius * 0.9};${radius * 1.05};${radius * 0.9}`} dur="3s" repeatCount="indefinite" />
      </circle>
      {Array.from({ length: particles }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / particles;
        const r = radius * 0.75;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        return (
          <circle key={i} cx={px} cy={py} r={2.2} fill="#fde68a" opacity={0.85}>
            <animate attributeName="opacity" values="0.85;0.2;0.85" dur="2s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`0 ${cx} ${cy};360 ${cx} ${cy}`}
              dur={`${8 + (i % 3)}s`}
              repeatCount="indefinite"
            />
          </circle>
        );
      })}
    </g>
  );
}

// ============================================
// 子分キノコ（群生用）
// ============================================
function SubMushroom({
  cx, cy, size, speciesId, capColor, capDark, phase,
}: {
  cx: number; cy: number; size: number; speciesId: MushroomSpeciesId;
  capColor: string; capDark: string; phase: GrowthPhase;
}) {
  const capR = size * 0.7;
  const capH = capR * 0.6;
  const stemW = size * 0.3;
  const stemH = size * 0.5;
  return (
    <g opacity={0.9}>
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0 0; 0 -1.5; 0 0"
        dur={`${2.5 + (cx % 5) * 0.1}s`}
        repeatCount="indefinite"
      />
      {/* 柄 */}
      <rect x={cx - stemW / 2} y={cy - stemH / 2} width={stemW} height={stemH} rx={stemW / 2} fill="#f5e8d0" stroke="#a8957a" strokeWidth={0.8} />
      {/* 小さな傘 */}
      <SpeciesHatMini speciesId={speciesId} cx={cx} cy={cy - stemH / 2} capR={capR} capH={capH} capColor={capColor} capDark={capDark} />
      {/* 目だけ */}
      {phase >= 4 && (
        <>
          <circle cx={cx - stemW * 0.3} cy={cy - stemH * 0.1} r={1.2} fill="#1a1a1a" />
          <circle cx={cx + stemW * 0.3} cy={cy - stemH * 0.1} r={1.2} fill="#1a1a1a" />
        </>
      )}
    </g>
  );
}

// ============================================
// キャラクター本体
// ============================================
function Character({
  morphology, phase, speciesId, bodyType, tirednessLevel, category, cx, cy, scale,
  experienceLevel = 0, experienceDomains = [],
}: {
  morphology: Morphology;
  phase: GrowthPhase;
  speciesId: MushroomSpeciesId;
  bodyType: "fat" | "normal" | "thin";
  tirednessLevel: "fresh" | "normal" | "tired" | "exhausted";
  category?: string;
  cx: number; cy: number; scale: number;
  experienceLevel?: number;
  experienceDomains?: string[];
}) {
  const m = morphology;

  const charScale =
    phase === 1 ? 0.35 :
    phase === 2 ? 0.55 :
    phase === 3 ? 0.72 :
    phase === 4 ? 0.85 :
    phase === 5 ? 1.0 :
    phase === 6 ? 1.1 :
    phase === 7 ? 1.22 :   // 覚醒：一回り大きく
    phase === 8 ? 1.38 :   // 変容：さらに大きく
    1.55;                  // Phase 9 化け物MAX

  // 化け物フェーズ判定
  const monsterLevel = phase >= 9 ? 3 : phase >= 8 ? 2 : phase >= 7 ? 1 : 0;

  const size = 80 * scale * charScale;

  const bodyWidthMod = bodyType === "fat" ? 1.35 : bodyType === "thin" ? 0.65 : 1.0;
  const bodyHeightMod = bodyType === "thin" ? 1.2 : 1.0;

  const headRatio =
    phase === 1 ? 1.8 :
    phase === 2 ? 1.5 :
    phase === 3 ? 1.2 :
    phase === 4 ? 1.05 :
    1.0;

  const hue = Math.round(m.colorHue);
  // experienceLevel に応じて彩度・明度をブースト（既存知識があるほど色鮮やか）
  const expBoostSat = experienceLevel * 6;
  const expBoostBri = experienceLevel * 3;
  const sat = Math.min(Math.max(Math.round(m.colorSaturation * 100), 45) + expBoostSat, 95);
  const bri = Math.min(Math.max(Math.round(m.colorBrightness * 100), 40) + expBoostBri, 85);
  const capColor = `hsl(${hue}, ${sat}%, ${bri}%)`;
  const capDark = `hsl(${hue}, ${sat}%, ${Math.max(bri - 20, 15)}%)`;
  const skinColor = `hsl(${hue}, ${Math.max(sat - 40, 10)}%, ${Math.min(bri + 35, 92)}%)`;
  const skinDark = `hsl(${hue}, ${Math.max(sat - 35, 10)}%, ${Math.min(bri + 20, 80)}%)`;

  // 化け物フェーズは傘がさらに巨大化
  const capScaleMod = monsterLevel === 3 ? 1.45 : monsterLevel === 2 ? 1.25 : monsterLevel === 1 ? 1.08 : 1.0;
  const capR = size * 0.7 * headRatio * capScaleMod;
  const capH = capR * Math.max(m.capRoundness, 0.45) * 0.7;

  const bodyW = size * 0.5 * bodyWidthMod;
  const bodyH = size * 0.7 * bodyHeightMod;

  const eyeState: "open" | "half" | "closed" =
    tirednessLevel === "exhausted" ? "closed" :
    tirednessLevel === "tired" ? "half" :
    "open";

  const bounceDuration = tirednessLevel === "exhausted" ? "5s" : tirednessLevel === "tired" ? "3.5s" : "2.2s";
  const bounceAmount = phase >= 4 ? 4 : 2;

  return (
    <g>
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values={`0 0; 0 -${bounceAmount}; 0 0`}
          dur={bounceDuration}
          repeatCount="indefinite"
        />

        {/* 足 */}
        {phase >= 3 && (
          <>
            <ellipse cx={cx - bodyW * 0.3} cy={cy + bodyH * 0.55} rx={bodyW * 0.18} ry={bodyW * 0.1} fill={skinDark} />
            <ellipse cx={cx + bodyW * 0.3} cy={cy + bodyH * 0.55} rx={bodyW * 0.18} ry={bodyW * 0.1} fill={skinDark} />
          </>
        )}

        {/* 胴体 */}
        <ellipse
          cx={cx}
          cy={cy + bodyH * 0.1}
          rx={bodyW * 0.5}
          ry={bodyH * 0.5}
          fill={skinColor}
          stroke={skinDark}
          strokeWidth={1}
        />

        {/* 腕 */}
        {phase >= 3 && (
          <>
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values={`-5 ${cx - bodyW * 0.5} ${cy};5 ${cx - bodyW * 0.5} ${cy};-5 ${cx - bodyW * 0.5} ${cy}`}
                dur={tirednessLevel === "exhausted" ? "6s" : "3s"}
                repeatCount="indefinite"
              />
              <ellipse cx={cx - bodyW * 0.55} cy={cy + bodyH * 0.1} rx={bodyW * 0.14} ry={bodyH * 0.18} fill={skinColor} stroke={skinDark} strokeWidth={0.8} />
              <circle cx={cx - bodyW * 0.62} cy={cy + bodyH * 0.22} r={bodyW * 0.1} fill={skinColor} stroke={skinDark} strokeWidth={0.8} />
            </g>
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values={`5 ${cx + bodyW * 0.5} ${cy};-5 ${cx + bodyW * 0.5} ${cy};5 ${cx + bodyW * 0.5} ${cy}`}
                dur={tirednessLevel === "exhausted" ? "6s" : "3s"}
                repeatCount="indefinite"
              />
              <ellipse cx={cx + bodyW * 0.55} cy={cy + bodyH * 0.1} rx={bodyW * 0.14} ry={bodyH * 0.18} fill={skinColor} stroke={skinDark} strokeWidth={0.8} />
              <circle cx={cx + bodyW * 0.62} cy={cy + bodyH * 0.22} r={bodyW * 0.1} fill={skinColor} stroke={skinDark} strokeWidth={0.8} />
            </g>
          </>
        )}

        {/* 顔 */}
        <g>
          <circle cx={cx - bodyW * 0.28} cy={cy + bodyH * 0.02} r={bodyW * 0.1} fill="#f4a8a8" opacity={0.6} />
          <circle cx={cx + bodyW * 0.28} cy={cy + bodyH * 0.02} r={bodyW * 0.1} fill="#f4a8a8" opacity={0.6} />
          <Eye cx={cx - bodyW * 0.2} cy={cy - bodyH * 0.08} r={bodyW * 0.08} state={eyeState} monsterLevel={monsterLevel} />
          <Eye cx={cx + bodyW * 0.2} cy={cy - bodyH * 0.08} r={bodyW * 0.08} state={eyeState} monsterLevel={monsterLevel} />
          <Mouth cx={cx} cy={cy + bodyH * 0.08} w={bodyW * 0.15} tirednessLevel={tirednessLevel} phase={phase} />
        </g>

        {/* 傘（種ごとに分岐） */}
        <SpeciesHat
          speciesId={speciesId}
          cx={cx}
          cy={cy - bodyH * 0.35}
          capR={capR}
          capH={capH}
          capColor={capColor}
          capDark={capDark}
          skinColor={skinColor}
          phase={phase}
        />

        {/* カテゴリ小物 */}
        {category && phase >= 3 && (
          <CategoryAccessory
            category={category}
            cx={cx + bodyW * 0.75}
            cy={cy + bodyH * 0.15}
            size={bodyW * 0.45}
          />
        )}

        {/* 化け物フェーズのエフェクト */}
        {monsterLevel >= 2 && (
          <MonsterHorns cx={cx} cy={cy - bodyH * 0.35 - capH * 0.8} capR={capR} level={monsterLevel} />
        )}
        {monsterLevel >= 1 && (
          <MonsterAura cx={cx} cy={cy} bodyH={bodyH} level={monsterLevel} />
        )}
        {phase === 9 && (
          <MonsterLightning cx={cx} cy={cy} capR={capR} bodyH={bodyH} />
        )}

        {/* ドメインバッジ（既存知識がある場合、傘の上に浮かぶ） */}
        {experienceDomains.length > 0 && phase >= 3 && (
          <DomainBadges
            cx={cx}
            cy={cy - bodyH * 0.35 - capH * 1.6 - 8}
            domains={experienceDomains}
          />
        )}

        {/* Phase 6 のきらめき */}
        {phase === 6 && tirednessLevel !== "exhausted" && (
          <g>
            <Sparkle cx={cx - capR * 1.1} cy={cy - bodyH * 0.5} />
            <Sparkle cx={cx + capR * 1.05} cy={cy - bodyH * 0.55} />
          </g>
        )}

        {/* Phase 7-8 の禍々しいオーラスパーク */}
        {(phase === 7 || phase === 8) && tirednessLevel !== "exhausted" && (
          <g>
            <Sparkle cx={cx - capR * 1.2} cy={cy - bodyH * 0.6} color="#f97316" />
            <Sparkle cx={cx + capR * 1.15} cy={cy - bodyH * 0.65} color="#ef4444" />
          </g>
        )}

        {/* 疲労時のZZZ */}
        {(tirednessLevel === "tired" || tirednessLevel === "exhausted") && (
          <g>
            <text x={cx + capR * 0.8} y={cy - bodyH * 0.7} fill="#a8b5c9" fontSize={14} fontFamily="sans-serif" opacity={0.8}>
              Z
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
            </text>
            <text x={cx + capR * 0.95} y={cy - bodyH * 0.85} fill="#a8b5c9" fontSize={10} fontFamily="sans-serif" opacity={0.6}>
              z
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" begin="0.5s" repeatCount="indefinite" />
            </text>
          </g>
        )}
      </g>
    </g>
  );
}

// ============================================
// 傘（種ごと）
// ============================================
function SpeciesHat({
  speciesId, cx, cy, capR, capH, capColor, capDark, skinColor, phase,
}: {
  speciesId: MushroomSpeciesId;
  cx: number; cy: number; capR: number; capH: number;
  capColor: string; capDark: string; skinColor: string;
  phase: GrowthPhase;
}) {
  switch (speciesId) {
    case "yamabushi":
      return <CoralHat cx={cx} cy={cy} r={capR * 0.8} color={capColor} accent={skinColor} />;
    case "enoki":
      // 細長い小さな丸傘
      return (
        <g>
          <ellipse cx={cx} cy={cy + capH * 0.2} rx={capR * 0.55} ry={capH * 0.9} fill={capColor} stroke={capDark} strokeWidth={1.2} />
          <ellipse cx={cx - capR * 0.15} cy={cy - capH * 0.05} rx={capR * 0.25} ry={capH * 0.4} fill="white" opacity={0.3} />
        </g>
      );
    case "shiitake":
      // 平たい黒茶＋斑点
      return (
        <g>
          <ellipse cx={cx} cy={cy + capH * 0.15} rx={capR * 1.05} ry={capH * 0.65} fill={capColor} stroke={capDark} strokeWidth={1.5} />
          <circle cx={cx - capR * 0.35} cy={cy + capH * 0.05} r={capR * 0.09} fill={capDark} opacity={0.55} />
          <circle cx={cx + capR * 0.25} cy={cy} r={capR * 0.07} fill={capDark} opacity={0.55} />
          <circle cx={cx + capR * 0.5} cy={cy + capH * 0.2} r={capR * 0.06} fill={capDark} opacity={0.55} />
          <circle cx={cx - capR * 0.1} cy={cy + capH * 0.3} r={capR * 0.05} fill={capDark} opacity={0.55} />
        </g>
      );
    case "bunashimeji":
      // 小ぶり丸
      return (
        <g>
          <ellipse cx={cx} cy={cy + capH * 0.1} rx={capR * 0.75} ry={capH * 0.95} fill={capColor} stroke={capDark} strokeWidth={1.2} />
          <ellipse cx={cx} cy={cy + capH * 0.05} rx={capR * 0.3} ry={capH * 0.35} fill={capDark} opacity={0.2} />
        </g>
      );
    case "eringi":
      // こん棒型（縦長）
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={capR * 0.55} ry={capH * 1.3} fill={capColor} stroke={capDark} strokeWidth={1.3} />
          <ellipse cx={cx - capR * 0.15} cy={cy - capH * 0.3} rx={capR * 0.2} ry={capH * 0.5} fill="white" opacity={0.3} />
        </g>
      );
    case "nameko":
      // ぬめり強め光沢
      return (
        <g>
          <ellipse cx={cx} cy={cy + capH * 0.1} rx={capR} ry={capH} fill={capColor} stroke={capDark} strokeWidth={1.5} />
          <ellipse cx={cx - capR * 0.25} cy={cy - capH * 0.3} rx={capR * 0.55} ry={capH * 0.45} fill="white" opacity={0.55} />
          <ellipse cx={cx + capR * 0.25} cy={cy + capH * 0.15} rx={capR * 0.25} ry={capH * 0.2} fill="white" opacity={0.35} />
        </g>
      );
    case "hiratake":
      // ベレー帽（広く低い）
      return (
        <g>
          <ellipse cx={cx} cy={cy + capH * 0.15} rx={capR * 1.25} ry={capH * 0.55} fill={capColor} stroke={capDark} strokeWidth={1.5} />
          <circle cx={cx} cy={cy - capH * 0.15} r={capR * 0.12} fill={capDark} />
        </g>
      );
    case "king_mushroom":
      // 王冠型（通常の丸傘＋リボン）
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={capR * 1.1} ry={capH * 1.1} fill={capColor} stroke={capDark} strokeWidth={1.5} />
          <rect x={cx - capR * 0.9} y={cy + capH * 0.45} width={capR * 1.8} height={capH * 0.2} fill="#fbbf24" opacity={0.8} />
          <ellipse cx={cx - capR * 0.3} cy={cy - capH * 0.2} rx={capR * 0.4} ry={capH * 0.35} fill="white" opacity={0.3} />
          <circle cx={cx} cy={cy - capH * 0.9} r={capR * 0.12} fill="#fbbf24" />
        </g>
      );
    case "tamogitake":
      // 波打つ黄金
      return (
        <g>
          <path
            d={`M ${cx - capR} ${cy + capH * 0.3}
                Q ${cx - capR * 0.7} ${cy - capH * 0.1}, ${cx - capR * 0.4} ${cy + capH * 0.1}
                T ${cx + capR * 0.2} ${cy - capH * 0.1}
                T ${cx + capR} ${cy + capH * 0.3}
                L ${cx + capR} ${cy + capH * 0.5}
                L ${cx - capR} ${cy + capH * 0.5} Z`}
            fill={capColor}
            stroke={capDark}
            strokeWidth={1.5}
          />
          <ellipse cx={cx} cy={cy} rx={capR * 0.35} ry={capH * 0.2} fill="white" opacity={0.4} />
        </g>
      );
    case "maitake":
      // 花びら多段
      return (
        <g>
          {[1.0, 0.85, 0.7].map((scale, i) => (
            <ellipse
              key={i}
              cx={cx}
              cy={cy + capH * (0.3 - i * 0.25)}
              rx={capR * scale}
              ry={capH * 0.4 * scale}
              fill={capColor}
              stroke={capDark}
              strokeWidth={1.2}
              opacity={0.95 - i * 0.05}
            />
          ))}
        </g>
      );
    case "mushroom":
    default:
      // 標準丸傘
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={capR} ry={capH} fill={capColor} stroke={capDark} strokeWidth={1.5} />
          <ellipse cx={cx - capR * 0.3} cy={cy - capH * 0.2} rx={capR * 0.45} ry={capH * 0.35} fill="white" opacity={0.25} />
        </g>
      );
  }
}

// 子分用の簡易版（全11種対応）
function SpeciesHatMini({
  speciesId, cx, cy, capR, capH, capColor, capDark,
}: {
  speciesId: MushroomSpeciesId;
  cx: number; cy: number; capR: number; capH: number;
  capColor: string; capDark: string;
}) {
  switch (speciesId) {
    case "yamabushi":
      // 珊瑚状（簡易版：中央丸＋放射線）
      return (
        <g>
          <circle cx={cx} cy={cy} r={capR * 0.7} fill={capColor} />
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={cx + Math.cos(rad) * capR * 0.6}
                y1={cy + Math.sin(rad) * capR * 0.5}
                x2={cx + Math.cos(rad) * capR * 0.95}
                y2={cy + Math.sin(rad) * capR * 0.8}
                stroke={capDark} strokeWidth={1.5} strokeLinecap="round"
              />
            );
          })}
        </g>
      );
    case "enoki":
      // 細長い卵型
      return <ellipse cx={cx} cy={cy} rx={capR * 0.6} ry={capH * 1.1} fill={capColor} stroke={capDark} strokeWidth={0.8} />;
    case "shiitake":
      // 平たい茶傘＋斑点
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={capR * 1.1} ry={capH * 0.65} fill={capColor} stroke={capDark} strokeWidth={0.8} />
          <circle cx={cx - capR * 0.3} cy={cy} r={capR * 0.08} fill={capDark} opacity={0.5} />
          <circle cx={cx + capR * 0.25} cy={cy - capH * 0.2} r={capR * 0.06} fill={capDark} opacity={0.5} />
        </g>
      );
    case "bunashimeji":
      // 小ぶり丸
      return <ellipse cx={cx} cy={cy} rx={capR * 0.75} ry={capH * 0.9} fill={capColor} stroke={capDark} strokeWidth={0.8} />;
    case "eringi":
      // 縦長こん棒
      return <ellipse cx={cx} cy={cy} rx={capR * 0.55} ry={capH * 1.2} fill={capColor} stroke={capDark} strokeWidth={0.8} />;
    case "nameko":
      // ぬめり光沢（白ハイライト強め）
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={capR * 0.95} ry={capH * 0.95} fill={capColor} stroke={capDark} strokeWidth={0.8} />
          <ellipse cx={cx - capR * 0.2} cy={cy - capH * 0.3} rx={capR * 0.45} ry={capH * 0.35} fill="white" opacity={0.5} />
        </g>
      );
    case "hiratake":
      // 広いベレー帽
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={capR * 1.2} ry={capH * 0.55} fill={capColor} stroke={capDark} strokeWidth={0.8} />
          <circle cx={cx} cy={cy - capH * 0.1} r={capR * 0.1} fill={capDark} />
        </g>
      );
    case "king_mushroom":
      // 王冠型（丸傘＋金帯）
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={capR * 1.05} ry={capH * 1.05} fill={capColor} stroke={capDark} strokeWidth={0.8} />
          <rect x={cx - capR * 0.85} y={cy + capH * 0.4} width={capR * 1.7} height={capH * 0.2} fill="#fbbf24" opacity={0.85} />
        </g>
      );
    case "tamogitake":
      // 波打つ黄金（簡易版）
      return (
        <g>
          <path
            d={`M ${cx - capR * 0.9} ${cy + capH * 0.25} Q ${cx - capR * 0.4} ${cy - capH * 0.1} ${cx} ${cy + capH * 0.1} T ${cx + capR * 0.9} ${cy + capH * 0.25} L ${cx + capR * 0.9} ${cy + capH * 0.45} L ${cx - capR * 0.9} ${cy + capH * 0.45} Z`}
            fill={capColor} stroke={capDark} strokeWidth={0.8}
          />
        </g>
      );
    case "maitake":
      // 二段花びら
      return (
        <g>
          <ellipse cx={cx} cy={cy + capH * 0.15} rx={capR * 0.95} ry={capH * 0.4} fill={capColor} stroke={capDark} strokeWidth={0.8} />
          <ellipse cx={cx} cy={cy - capH * 0.08} rx={capR * 0.75} ry={capH * 0.35} fill={capColor} stroke={capDark} strokeWidth={0.8} opacity={0.95} />
        </g>
      );
    case "mushroom":
    default:
      // 標準丸傘
      return <ellipse cx={cx} cy={cy} rx={capR} ry={capH} fill={capColor} stroke={capDark} strokeWidth={0.8} />;
  }
}

// ============================================
// カテゴリ別の小物
// ============================================
function CategoryAccessory({ category, cx, cy, size }: { category: string; cx: number; cy: number; size: number }) {
  // 絵文字で表現（SVGの中で text として描画）
  const emojiMap: Record<string, string> = {
    IPA: "📄",
    AWS: "☁️",
    Linux: "🐧",
    Network: "🌐",
    Database: "🗄️",
    Programming: "💻",
    AI: "🤖",
    PersonalDev: "🛠️",
  };
  const emoji = emojiMap[category];
  if (!emoji) return null;
  return (
    <g>
      <animateTransform
        attributeName="transform"
        type="translate"
        values="0 0;0 -2;0 0"
        dur="2.8s"
        repeatCount="indefinite"
      />
      <text
        x={cx}
        y={cy}
        fontSize={size}
        textAnchor="middle"
        dominantBaseline="middle"
        opacity={0.95}
      >
        {emoji}
      </text>
    </g>
  );
}

// ============================================
// 目（瞬き付き + 化け物フェーズ目光り）
// ============================================
function Eye({ cx, cy, r, state, monsterLevel = 0 }: {
  cx: number; cy: number; r: number;
  state: "open" | "half" | "closed";
  monsterLevel?: number;
}) {
  // 化け物フェーズ：目の周りに光るリング
  const eyeGlow = monsterLevel >= 1 ? (
    <circle cx={cx} cy={cy} r={r * (monsterLevel >= 3 ? 1.7 : monsterLevel >= 2 ? 1.45 : 1.25)}
      fill="none"
      stroke={monsterLevel >= 3 ? "#dc2626" : monsterLevel >= 2 ? "#f97316" : "#fbbf24"}
      strokeWidth={monsterLevel >= 3 ? 2.2 : 1.5}
      opacity={0.85}
    >
      <animate attributeName="opacity" values="0.85;0.3;0.85" dur={`${1.2 + monsterLevel * 0.2}s`} repeatCount="indefinite" />
      <animate attributeName="r"
        values={`${r * 1.25};${r * (monsterLevel >= 3 ? 2.0 : 1.55)};${r * 1.25}`}
        dur={`${1.2 + monsterLevel * 0.2}s`}
        repeatCount="indefinite"
      />
    </circle>
  ) : null;

  if (state === "closed") {
    return (
      <g>
        {eyeGlow}
        <path
          d={`M ${cx - r} ${cy} Q ${cx} ${cy + r * 0.4} ${cx + r} ${cy}`}
          stroke="#1a1a1a"
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
        />
      </g>
    );
  }
  if (state === "half") {
    return (
      <g>
        {eyeGlow}
        <ellipse cx={cx} cy={cy} rx={r * 0.8} ry={r * 0.4} fill="white" />
        <circle cx={cx} cy={cy} r={r * 0.35} fill={monsterLevel >= 2 ? "#dc2626" : "#1a1a1a"} />
      </g>
    );
  }
  // 化け物フェーズ：瞳が赤く光る
  const pupilColor = monsterLevel >= 3 ? "#dc2626" : monsterLevel >= 2 ? "#f97316" : monsterLevel >= 1 ? "#f59e0b" : "#1a1a1a";
  return (
    <g>
      {eyeGlow}
      <ellipse cx={cx} cy={cy} rx={r * 0.9} ry={r} fill="white">
        <animate
          attributeName="ry"
          values={`${r};${r * 0.1};${r};${r};${r}`}
          keyTimes="0;0.03;0.06;0.5;1"
          dur="4s"
          repeatCount="indefinite"
        />
      </ellipse>
      <circle cx={cx} cy={cy + r * 0.1} r={r * 0.55} fill={pupilColor}>
        <animate
          attributeName="r"
          values={`${r * 0.55};0;${r * 0.55};${r * 0.55};${r * 0.55}`}
          keyTimes="0;0.03;0.06;0.5;1"
          dur="4s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx={cx - r * 0.2} cy={cy - r * 0.15} r={r * 0.2} fill="white" />
    </g>
  );
}

// ============================================
// 口
// ============================================
function Mouth({ cx, cy, w, tirednessLevel, phase }: {
  cx: number; cy: number; w: number;
  tirednessLevel: "fresh" | "normal" | "tired" | "exhausted";
  phase: GrowthPhase;
}) {
  if (tirednessLevel === "exhausted") {
    return (
      <path
        d={`M ${cx - w} ${cy + w * 0.5} Q ${cx} ${cy} ${cx + w} ${cy + w * 0.5}`}
        stroke="#1a1a1a" strokeWidth={1.5} fill="none" strokeLinecap="round"
      />
    );
  }
  if (tirednessLevel === "tired") {
    return (
      <line x1={cx - w * 0.6} y1={cy + w * 0.2} x2={cx + w * 0.6} y2={cy + w * 0.2} stroke="#1a1a1a" strokeWidth={1.5} strokeLinecap="round" />
    );
  }
  if (phase >= 5) {
    return (
      <path
        d={`M ${cx - w} ${cy} Q ${cx} ${cy + w * 0.8} ${cx + w} ${cy}`}
        stroke="#1a1a1a" strokeWidth={1.8} fill="#d97757" strokeLinecap="round"
      />
    );
  }
  return (
    <ellipse cx={cx} cy={cy + w * 0.2} rx={w * 0.35} ry={w * 0.25} fill="#d97757" stroke="#1a1a1a" strokeWidth={1.2} />
  );
}

// ============================================
// ヤマブシタケ（珊瑚頭）
// ============================================
function CoralHat({ cx, cy, r, color, accent }: { cx: number; cy: number; r: number; color: string; accent: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      {Array.from({ length: 14 }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / 14 + 0.3;
        const r1 = r * 0.8;
        const r2 = r * (1.0 + (i % 3) * 0.1);
        const x1 = cx + Math.cos(angle) * r1;
        const y1 = cy + Math.sin(angle) * r1 * 0.8;
        const x2 = cx + Math.cos(angle) * r2;
        const y2 = cy + Math.sin(angle) * r2 * 0.8;
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={accent}
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

// ============================================
// ドメインバッジ（既存知識の反映）
// ============================================
const DOMAIN_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  CS:  { bg: "#8b5cf6", text: "#fff" },
  NW:  { bg: "#3b82f6", text: "#fff" },
  DB:  { bg: "#06b6d4", text: "#fff" },
  SEC: { bg: "#ef4444", text: "#fff" },
  OS:  { bg: "#22c55e", text: "#fff" },
  CLD: { bg: "#0ea5e9", text: "#fff" },
  PG:  { bg: "#84cc16", text: "#1a1a1a" },
  AI:  { bg: "#eab308", text: "#1a1a1a" },
  ARC: { bg: "#f97316", text: "#fff" },
  DEV: { bg: "#14b8a6", text: "#fff" },
};

function DomainBadges({ cx, cy, domains }: { cx: number; cy: number; domains: string[] }) {
  const shown = domains.slice(0, 3);
  const total = shown.length;
  if (total === 0) return null;
  return (
    <g>
      {shown.map((domain, i) => {
        const xOffset = (i - (total - 1) / 2) * 22;
        const palette = DOMAIN_BADGE_COLORS[domain] ?? { bg: "#6b7280", text: "#fff" };
        const bx = cx + xOffset;
        const by = cy;
        const animDur = `${2.2 + i * 0.45}s`;
        return (
          <g key={domain}>
            {/* バッジ背景（浮遊アニメ付き） */}
            <circle cx={bx} cy={by} r={9} fill={palette.bg} opacity={0.92}>
              <animate
                attributeName="cy"
                values={`${by};${by - 3.5};${by}`}
                dur={animDur}
                repeatCount="indefinite"
              />
            </circle>
            {/* ドメイン名テキスト */}
            <text
              x={bx}
              y={by + 1}
              fontSize={domain.length <= 2 ? 5.5 : 4.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={palette.text}
              fontFamily="monospace"
              fontWeight="bold"
            >
              <animate
                attributeName="y"
                values={`${by + 1};${by - 2.5};${by + 1}`}
                dur={animDur}
                repeatCount="indefinite"
              />
              {domain}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ============================================
// きらめき（色指定対応）
// ============================================
function Sparkle({ cx, cy, color = "#fde68a" }: { cx: number; cy: number; color?: string }) {
  return (
    <g>
      <path
        d={`M ${cx} ${cy - 4} L ${cx + 1.5} ${cy} L ${cx + 4} ${cy + 1.5} L ${cx + 1.5} ${cy + 3} L ${cx} ${cy + 7} L ${cx - 1.5} ${cy + 3} L ${cx - 4} ${cy + 1.5} L ${cx - 1.5} ${cy} Z`}
        fill={color}
        opacity={0.9}
      >
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          values={`0 ${cx} ${cy + 2};360 ${cx} ${cy + 2}`}
          dur="4s"
          repeatCount="indefinite"
        />
      </path>
    </g>
  );
}

// ============================================
// 化け物フェーズ — 角（Phase 8-9）
// ============================================
function MonsterHorns({ cx, cy, capR, level }: { cx: number; cy: number; capR: number; level: number }) {
  const hornH = capR * (level >= 3 ? 0.55 : 0.35);
  const hornW = capR * (level >= 3 ? 0.18 : 0.12);
  const spread = capR * (level >= 3 ? 0.45 : 0.3);
  const hornColor = level >= 3 ? "#7f1d1d" : "#9a3412";
  const tipColor = level >= 3 ? "#dc2626" : "#f97316";
  return (
    <g>
      {/* 左角 */}
      <path
        d={`M ${cx - spread} ${cy} L ${cx - spread - hornW} ${cy - hornH} L ${cx - spread + hornW * 0.3} ${cy - hornH * 0.8} Z`}
        fill={hornColor}
        stroke={tipColor}
        strokeWidth={0.8}
      />
      {/* 右角 */}
      <path
        d={`M ${cx + spread} ${cy} L ${cx + spread + hornW} ${cy - hornH} L ${cx + spread - hornW * 0.3} ${cy - hornH * 0.8} Z`}
        fill={hornColor}
        stroke={tipColor}
        strokeWidth={0.8}
      />
      {/* Phase 9: 小さい追加角 */}
      {level >= 3 && (
        <>
          <path
            d={`M ${cx - spread * 0.4} ${cy + hornH * 0.1} L ${cx - spread * 0.4 - hornW * 0.5} ${cy - hornH * 0.45} L ${cx - spread * 0.4 + hornW * 0.15} ${cy - hornH * 0.35} Z`}
            fill={hornColor} stroke={tipColor} strokeWidth={0.6} opacity={0.85}
          />
          <path
            d={`M ${cx + spread * 0.4} ${cy + hornH * 0.1} L ${cx + spread * 0.4 + hornW * 0.5} ${cy - hornH * 0.45} L ${cx + spread * 0.4 - hornW * 0.15} ${cy - hornH * 0.35} Z`}
            fill={hornColor} stroke={tipColor} strokeWidth={0.6} opacity={0.85}
          />
        </>
      )}
    </g>
  );
}

// ============================================
// 化け物フェーズ — 禍々しいオーラ靄（Phase 7-9）
// ============================================
function MonsterAura({ cx, cy, bodyH, level }: { cx: number; cy: number; bodyH: number; level: number }) {
  const auraColor = level >= 3 ? "#7f1d1d" : level >= 2 ? "#9a3412" : "#92400e";
  const opacity = level >= 3 ? 0.55 : level >= 2 ? 0.4 : 0.28;
  const r = bodyH * (level >= 3 ? 0.65 : level >= 2 ? 0.5 : 0.38);
  return (
    <g>
      {/* 足元の靄 */}
      <ellipse cx={cx} cy={cy + bodyH * 0.5} rx={r * 1.2} ry={r * 0.25} fill={auraColor} opacity={opacity * 0.7}>
        <animate attributeName="rx" values={`${r * 1.2};${r * 1.5};${r * 1.2}`} dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values={`${opacity * 0.7};${opacity * 0.35};${opacity * 0.7}`} dur="2.5s" repeatCount="indefinite" />
      </ellipse>
      {/* 全体のオーラ輪郭 */}
      {[0, 120, 240].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const px = cx + Math.cos(rad) * r * 0.8;
        const py = cy + Math.sin(rad) * r * 0.5;
        return (
          <circle key={i} cx={px} cy={py} r={level >= 3 ? 5 : 3.5} fill={auraColor} opacity={opacity}>
            <animate
              attributeName="opacity"
              values={`${opacity};${opacity * 0.2};${opacity}`}
              dur={`${1.8 + i * 0.3}s`}
              repeatCount="indefinite"
            />
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`0 ${cx} ${cy};${level >= 3 ? -360 : 360} ${cx} ${cy}`}
              dur={`${5 + i}s`}
              repeatCount="indefinite"
            />
          </circle>
        );
      })}
    </g>
  );
}

// ============================================
// 化け物フェーズ — 稲妻エフェクト（Phase 9）
// ============================================
function MonsterLightning({ cx, cy, capR, bodyH }: { cx: number; cy: number; capR: number; bodyH: number }) {
  const bolts = [
    { x1: cx - capR * 0.9, y1: cy - bodyH * 0.7, x2: cx - capR * 0.6, y2: cy - bodyH * 0.4, delay: "0s" },
    { x1: cx + capR * 0.85, y1: cy - bodyH * 0.75, x2: cx + capR * 0.55, y2: cy - bodyH * 0.45, delay: "0.7s" },
    { x1: cx, y1: cy - bodyH * 1.0, x2: cx + capR * 0.2, y2: cy - bodyH * 0.65, delay: "1.3s" },
  ];
  return (
    <g>
      {bolts.map((b, i) => (
        <path
          key={i}
          d={`M ${b.x1} ${b.y1} L ${(b.x1 + b.x2) / 2 + 4} ${(b.y1 + b.y2) / 2} L ${b.x2} ${b.y2}`}
          stroke="#fbbf24"
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
          opacity={0.9}
        >
          <animate
            attributeName="opacity"
            values="0;0.9;0.9;0"
            keyTimes="0;0.05;0.15;0.3"
            dur="1.5s"
            begin={b.delay}
            repeatCount="indefinite"
          />
        </path>
      ))}
    </g>
  );
}
