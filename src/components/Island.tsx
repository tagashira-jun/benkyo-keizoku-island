"use client";

import { useRef, useEffect, useCallback } from "react";
import { Category, Log, PlayerState, EnergyLevel } from "@/lib/types";
import {
  calculateStage,
  getCategoryXP,
  getBuildingLevel,
  getAllAchievements,
} from "@/lib/gameLogic";

interface IslandProps {
  playerState: PlayerState;
  categories: Category[];
  logs: Log[];
  energyLevel: EnergyLevel;
}

const PX = 4; // each logical pixel = 4 screen pixels
const W = 200; // logical canvas width
const H = 150; // logical canvas height

// ── Colour palette ──────────────────────────────────────────
const COL = {
  // Sky
  skyTop: "#3a7ec8",
  skyMid: "#68aee0",
  skyBot: "#a8d4f0",
  // Water
  waterDeep: "#1565a0",
  waterMid: "#1e7aba",
  waterLight: "#2a90d0",
  waterFoam: "#80c8e8",
  waterShine: "#a5ddf5",
  // Land
  sand: "#d4c080",
  sandDark: "#b8a660",
  sandLight: "#e8dca0",
  grass: "#3e8830",
  grassLight: "#56a646",
  grassDark: "#2e6e22",
  dirt: "#7a6040",
  dirtDark: "#5a4830",
  rock: "#707070",
  rockDark: "#505050",
  rockLight: "#909090",
  // Nature
  palmTrunk: "#6b4226",
  palmLeaf: "#2e8a1e",
  palmLeafLight: "#48b030",
  flower: "#e84060",
  flowerYellow: "#f0d030",
  // Buildings
  woodWall: "#8b6a3a",
  woodDark: "#6b4a2a",
  roofRed: "#b03030",
  roofDark: "#882020",
  stoneWall: "#a8a8a8",
  stoneDark: "#787878",
  // Figures
  skin: "#e8b888",
  hair: "#4a3020",
  shirt1: "#3060c0",
  shirt2: "#c03040",
  shirt3: "#30a050",
  pants: "#404050",
  // Effects
  white: "#ffffff",
  gold: "#ffd700",
  black: "#000000",
  bubbleGray: "#b0b0b0",
};

// ── Helpers ─────────────────────────────────────────────────
function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PX, y * PX, PX, PX);
}

function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
}

// ── Island profile ──────────────────────────────────────────
// Returns the surface height (y coord of the top of the island) at a given x,
// or null if x is outside the island.
function islandSurface(
  x: number,
  stage: number
): { surfaceY: number; beachY: number } | null {
  const cx = W / 2;
  const rx = 18 + stage * 6; // horizontal radius grows with stage
  const dx = x - cx;
  if (Math.abs(dx) > rx) return null;

  // Smooth dome shape using cosine
  const t = dx / rx; // -1..1
  const peakH = 14 + stage * 3; // how tall the island is at its peak
  const h = peakH * Math.cos((t * Math.PI) / 2);

  // Base of the island (where it meets the water)
  const waterLine = 100;
  const surfaceY = waterLine - h;
  const beachY = waterLine;

  return { surfaceY: Math.round(surfaceY), beachY };
}

// ── Main component ──────────────────────────────────────────
export default function Island({
  playerState,
  categories,
  logs,
  energyLevel,
}: IslandProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  const draw = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const stage = calculateStage(playerState.totalXP);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawSky(ctx, time, stage);
      drawOcean(ctx, time);
      drawIsland(ctx, time, stage);
      drawTrees(ctx, stage);
      drawBuildings(ctx, stage, categories, logs);
      drawDecorations(ctx, stage, playerState.achievements);
      drawFigures(ctx, stage, playerState.population, energyLevel, time);

      if (stage >= 10) drawSparkles(ctx, time);

      frameRef.current = requestAnimationFrame(draw);
    },
    [playerState, categories, logs, energyLevel]
  );

  useEffect(() => {
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={W * PX}
      height={H * PX}
      className="w-full max-w-[800px] mx-auto block"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

// ── Sky ─────────────────────────────────────────────────────
function drawSky(
  ctx: CanvasRenderingContext2D,
  time: number,
  stage: number
) {
  // Gradient sky
  for (let y = 0; y < 100; y++) {
    const t = y / 100;
    const r = lerp(58, 168, t);
    const g = lerp(126, 212, t);
    const b = lerp(200, 240, t);
    rect(ctx, 0, y, W, 1, `rgb(${r},${g},${b})`);
  }

  // Sun
  const sunX = 160;
  const sunY = 18;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx + dy * dy <= 10) {
        px(ctx, sunX + dx, sunY + dy, "#fff8d0");
      }
    }
  }
  // Sun glow
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const d = dx * dx + dy * dy;
      if (d > 10 && d <= 28) {
        px(ctx, sunX + dx, sunY + dy, "rgba(255,248,200,0.25)");
      }
    }
  }

  // Clouds
  if (stage >= 2) {
    const cx1 = ((time / 60) % (W + 60)) - 30;
    drawCloud(ctx, cx1, 10);
    drawCloud(ctx, ((cx1 + 100) % (W + 60)) - 30, 22);
    if (stage >= 5)
      drawCloud(ctx, ((cx1 + 55) % (W + 60)) - 30, 6);
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const c = "rgba(255,255,255,0.7)";
  rect(ctx, x + 2, y, 8, 1, c);
  rect(ctx, x + 1, y + 1, 10, 2, c);
  rect(ctx, x + 2, y + 3, 8, 1, c);
}

// ── Ocean ───────────────────────────────────────────────────
function drawOcean(ctx: CanvasRenderingContext2D, time: number) {
  for (let y = 100; y < H; y++) {
    const depth = (y - 100) / (H - 100); // 0..1
    for (let x = 0; x < W; x++) {
      const wave = Math.sin((x * 0.12) + (time / 400) + (y * 0.2)) * 0.5
                 + Math.sin((x * 0.07) - (time / 600)) * 0.3;

      let color: string;
      if (depth < 0.08) {
        // Surface shimmer
        color = wave > 0.3 ? COL.waterShine : COL.waterLight;
      } else if (depth < 0.4) {
        color = wave > 0.2 ? COL.waterLight : COL.waterMid;
      } else {
        color = wave > 0.1 ? COL.waterMid : COL.waterDeep;
      }
      px(ctx, x, y, color);
    }
  }
}

// ── Island terrain ──────────────────────────────────────────
function drawIsland(
  ctx: CanvasRenderingContext2D,
  time: number,
  stage: number
) {
  const waterLine = 100;

  for (let x = 0; x < W; x++) {
    const info = islandSurface(x, stage);
    if (!info) continue;
    const { surfaceY } = info;

    for (let y = surfaceY; y <= waterLine + 3; y++) {
      const depthFromSurface = y - surfaceY;
      const totalH = waterLine - surfaceY + 3;

      let color: string;
      if (y >= waterLine) {
        // Below water line — sand beach
        color = (x + y) % 2 === 0 ? COL.sand : COL.sandDark;
      } else if (depthFromSurface <= 1) {
        // Top grass layer
        if (stage >= 2) {
          color = (x + y) % 3 === 0 ? COL.grassLight : COL.grass;
        } else {
          color = COL.rockLight; // Stage 1 is rocky
        }
      } else if (depthFromSurface <= 3 && stage >= 2) {
        // Grass/dirt transition
        color = depthFromSurface === 2 ? COL.grassDark : COL.dirt;
      } else if (depthFromSurface < totalH * 0.6) {
        // Dirt layer
        color = (x + y) % 3 === 0 ? COL.dirt : COL.dirtDark;
      } else {
        // Rock base
        color = (x + y) % 2 === 0 ? COL.rock : COL.rockDark;
      }

      px(ctx, x, y, color);
    }
  }

  // Foam / wave crash around the island edges
  const cx = W / 2;
  const rx = 18 + stage * 6;
  for (let dx = -rx - 2; dx <= rx + 2; dx++) {
    const x = cx + dx;
    if (x < 0 || x >= W) continue;
    const inner = islandSurface(x, stage);
    const outer = islandSurface(x - (dx > 0 ? -1 : 1), stage);
    if (!inner && outer) {
      // Edge foam
      const wave = Math.sin(x * 0.3 + time / 300) > 0;
      if (wave) {
        px(ctx, x, 100, COL.waterFoam);
        px(ctx, x, 101, COL.waterFoam);
      }
    }
  }
}

// ── Trees ───────────────────────────────────────────────────
function drawTrees(ctx: CanvasRenderingContext2D, stage: number) {
  if (stage < 3) return;

  const cx = W / 2;

  // Palm trees — positions relative to island centre
  const treePositions = [
    { dx: -15, size: 1 },
    { dx: 18, size: 1 },
  ];
  if (stage >= 4) {
    treePositions.push({ dx: -25, size: 0.8 });
    treePositions.push({ dx: 28, size: 0.8 });
  }
  if (stage >= 6) {
    treePositions.push({ dx: -8, size: 0.7 });
    treePositions.push({ dx: 35, size: 0.9 });
  }

  for (const tp of treePositions) {
    const x = cx + tp.dx;
    const info = islandSurface(x, stage);
    if (!info) continue;
    drawPalmTree(ctx, x, info.surfaceY, tp.size);
  }
}

function drawPalmTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  scale: number
) {
  const h = Math.round(10 * scale);
  // Trunk
  for (let i = 0; i < h; i++) {
    px(ctx, x, groundY - i - 1, COL.palmTrunk);
  }
  // Leaf clusters (4 directions)
  const top = groundY - h - 1;
  // Centre
  px(ctx, x, top, COL.palmLeafLight);
  // Left frond
  px(ctx, x - 1, top, COL.palmLeaf);
  px(ctx, x - 2, top + 1, COL.palmLeaf);
  px(ctx, x - 3, top + 2, COL.palmLeafLight);
  // Right frond
  px(ctx, x + 1, top, COL.palmLeaf);
  px(ctx, x + 2, top + 1, COL.palmLeaf);
  px(ctx, x + 3, top + 2, COL.palmLeafLight);
  // Top frond
  px(ctx, x, top - 1, COL.palmLeaf);
  px(ctx, x - 1, top - 1, COL.palmLeafLight);
  px(ctx, x + 1, top - 1, COL.palmLeafLight);
  // Droop fronds
  px(ctx, x - 2, top, COL.palmLeafLight);
  px(ctx, x + 2, top, COL.palmLeafLight);
}

// ── Buildings ───────────────────────────────────────────────
function drawBuildings(
  ctx: CanvasRenderingContext2D,
  stage: number,
  categories: Category[],
  logs: Log[]
) {
  if (stage < 3) return;

  const cx = W / 2;
  const maxSlots = stage >= 6 ? 6 : stage >= 4 ? 4 : 2;

  // Building slots — dx from centre
  const slots = [-6, 6, -18, 18, -30, 30];

  for (let i = 0; i < Math.min(categories.length, maxSlots); i++) {
    const cat = categories[i];
    const xp = getCategoryXP(logs, cat.id);
    const bLvl = getBuildingLevel(xp);
    if (bLvl === 0) continue;

    const bx = cx + slots[i];
    const info = islandSurface(bx, stage);
    if (!info) continue;

    drawBuilding(ctx, bx, info.surfaceY, cat.buildingType, bLvl);
  }
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  type: string,
  level: number
) {
  const h = 5 + level * 2;
  const w = 4 + (level >= 3 ? 2 : 0);
  const bx = x - Math.floor(w / 2);
  const by = groundY - h;

  switch (type) {
    case "server-tower": {
      // Blue/gray tech tower
      rect(ctx, bx, by, w, h, "#4a6fa5");
      rect(ctx, bx + 1, by, w - 2, 1, "#3a5f8a"); // top edge
      // Windows / LEDs
      for (let i = 1; i < h - 2; i += 2) {
        px(ctx, bx + 1, by + i + 1, i % 4 === 1 ? "#40e070" : "#e04040");
        if (w > 4) px(ctx, bx + w - 2, by + i + 1, "#40e070");
      }
      // Antenna
      if (level >= 2) {
        px(ctx, x, by - 1, COL.rockLight);
        px(ctx, x, by - 2, COL.rockLight);
      }
      break;
    }
    case "library": {
      // Warm brown building with red roof
      rect(ctx, bx, by + 2, w, h - 2, COL.woodWall);
      // Triangular roof
      for (let r = 0; r < 3; r++) {
        rect(ctx, bx - 1 + r, by + r, w + 2 - r * 2, 1, r === 0 ? COL.roofDark : COL.roofRed);
      }
      // Door
      px(ctx, x, groundY - 1, COL.woodDark);
      px(ctx, x, groundY - 2, COL.woodDark);
      // Windows
      if (level >= 2) {
        px(ctx, bx + 1, by + 4, COL.skyBot);
        px(ctx, bx + w - 2, by + 4, COL.skyBot);
      }
      break;
    }
    case "magic-tower": {
      // Purple pointed tower
      rect(ctx, bx + 1, by + 2, w - 2, h - 2, "#7b2fbe");
      px(ctx, x, by + 1, "#6a1fae");
      px(ctx, x, by, "#7b2fbe");
      // Star on top
      if (level >= 2) px(ctx, x, by - 1, COL.gold);
      // Window
      px(ctx, x, by + Math.floor(h / 2), COL.skyBot);
      break;
    }
    default: {
      // Generic stone building
      rect(ctx, bx, by + 1, w, h - 1, COL.stoneWall);
      rect(ctx, bx - 1, by, w + 2, 1, COL.roofRed);
      px(ctx, x, groundY - 1, COL.woodDark);
      break;
    }
  }
}

// ── Decorations (from achievements) ─────────────────────────
function drawDecorations(
  ctx: CanvasRenderingContext2D,
  stage: number,
  unlockedIds: string[]
) {
  if (stage < 2 || unlockedIds.length === 0) return;

  const cx = W / 2;
  const positions = [
    { dx: -35 }, { dx: 36 }, { dx: -10 }, { dx: 12 },
    { dx: -22 }, { dx: 25 },
  ];

  const all = getAllAchievements();
  let idx = 0;
  for (const a of all) {
    if (!unlockedIds.includes(a.id)) continue;
    if (idx >= positions.length) break;
    const bx = cx + positions[idx].dx;
    const info = islandSurface(bx, stage);
    if (!info) { idx++; continue; }
    drawDecorationItem(ctx, bx, info.surfaceY, a.id);
    idx++;
  }
}

function drawDecorationItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  id: string
) {
  const y = groundY;
  switch (id) {
    case "first-step":
      // Flag
      px(ctx, x, y - 4, COL.palmTrunk);
      px(ctx, x, y - 3, COL.palmTrunk);
      px(ctx, x, y - 2, COL.palmTrunk);
      px(ctx, x, y - 1, COL.palmTrunk);
      px(ctx, x + 1, y - 4, COL.flower);
      px(ctx, x + 1, y - 3, COL.flower);
      break;
    case "3-days":
      // Flower bed
      px(ctx, x - 1, y - 1, COL.flower);
      px(ctx, x, y - 1, COL.flowerYellow);
      px(ctx, x + 1, y - 1, COL.flower);
      break;
    case "7-days":
      // Fountain
      px(ctx, x, y - 3, COL.waterLight);
      px(ctx, x - 1, y - 2, COL.waterFoam);
      px(ctx, x + 1, y - 2, COL.waterFoam);
      px(ctx, x, y - 2, COL.waterLight);
      rect(ctx, x - 1, y - 1, 3, 1, COL.rockLight);
      break;
    default:
      px(ctx, x, y - 2, COL.gold);
      px(ctx, x - 1, y - 1, COL.gold);
      px(ctx, x + 1, y - 1, COL.gold);
      break;
  }
}

// ── Stick Figures (larger, more visible) ────────────────────
const SHIRT_COLORS = [COL.shirt1, COL.shirt2, COL.shirt3, "#c08030", "#8040c0"];

function drawFigures(
  ctx: CanvasRenderingContext2D,
  stage: number,
  population: number,
  energy: EnergyLevel,
  time: number
) {
  const cx = W / 2;
  const rx = 18 + stage * 6;
  const safeRx = rx - 5; // keep figures within island

  for (let i = 0; i < population; i++) {
    const spacing = (safeRx * 2) / (population + 1);
    const homeX = cx - safeRx + spacing * (i + 1);

    const info = islandSurface(Math.round(homeX), stage);
    if (!info) continue;

    let figX: number;
    const figY = info.surfaceY;
    let pose: "run" | "walk" | "stand" | "sit" | "jump" | "wave";

    if (energy >= 5) {
      const offset = Math.sin(time / 250 + i * 2.3) * 10;
      figX = homeX + offset;
      const cycle = Math.floor((time / 400 + i * 0.7) % 4);
      pose = (["run", "jump", "wave", "run"] as const)[cycle];
    } else if (energy >= 4) {
      const offset = Math.sin(time / 500 + i * 1.9) * 7;
      figX = homeX + offset;
      pose = "walk";
    } else if (energy >= 3) {
      const offset = Math.sin(time / 900 + i * 1.5) * 3;
      figX = homeX + offset;
      pose = Math.floor((time / 2000 + i) % 2) === 0 ? "walk" : "stand";
    } else if (energy >= 2) {
      figX = homeX;
      pose = "stand";
    } else {
      figX = homeX;
      pose = "sit";
    }

    const shirtColor = SHIRT_COLORS[i % SHIRT_COLORS.length];
    drawPerson(ctx, Math.round(figX), figY, pose, time, i, shirtColor);
  }
}

function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  pose: "run" | "walk" | "stand" | "sit" | "jump" | "wave",
  time: number,
  idx: number,
  shirtColor: string
) {
  let y = groundY;

  switch (pose) {
    case "run": {
      const legPhase = Math.sin(time / 120 + idx) > 0;
      // Head
      px(ctx, x, y - 7, COL.skin);
      px(ctx, x + 1, y - 7, COL.skin);
      px(ctx, x, y - 8, COL.hair);
      px(ctx, x + 1, y - 8, COL.hair);
      // Body
      px(ctx, x, y - 6, shirtColor);
      px(ctx, x + 1, y - 6, shirtColor);
      px(ctx, x, y - 5, shirtColor);
      px(ctx, x + 1, y - 5, shirtColor);
      // Arms (pumping)
      if (legPhase) {
        px(ctx, x - 1, y - 6, shirtColor);
        px(ctx, x + 2, y - 5, shirtColor);
      } else {
        px(ctx, x + 2, y - 6, shirtColor);
        px(ctx, x - 1, y - 5, shirtColor);
      }
      // Legs
      px(ctx, x, y - 4, COL.pants);
      px(ctx, x + 1, y - 4, COL.pants);
      if (legPhase) {
        px(ctx, x - 1, y - 3, COL.pants);
        px(ctx, x + 2, y - 2, COL.pants);
        px(ctx, x - 1, y - 2, COL.pants);
        px(ctx, x + 2, y - 1, COL.pants);
      } else {
        px(ctx, x + 2, y - 3, COL.pants);
        px(ctx, x - 1, y - 2, COL.pants);
        px(ctx, x + 2, y - 2, COL.pants);
        px(ctx, x - 1, y - 1, COL.pants);
      }
      break;
    }
    case "walk": {
      const legPhase = Math.sin(time / 250 + idx * 1.3) > 0;
      px(ctx, x, y - 7, COL.skin);
      px(ctx, x + 1, y - 7, COL.skin);
      px(ctx, x, y - 8, COL.hair);
      px(ctx, x + 1, y - 8, COL.hair);
      px(ctx, x, y - 6, shirtColor);
      px(ctx, x + 1, y - 6, shirtColor);
      px(ctx, x, y - 5, shirtColor);
      px(ctx, x + 1, y - 5, shirtColor);
      // Arms hanging
      px(ctx, x - 1, y - 5, shirtColor);
      px(ctx, x + 2, y - 5, shirtColor);
      // Legs
      px(ctx, x, y - 4, COL.pants);
      px(ctx, x + 1, y - 4, COL.pants);
      if (legPhase) {
        px(ctx, x, y - 3, COL.pants);
        px(ctx, x + 1, y - 2, COL.pants);
        px(ctx, x, y - 2, COL.pants);
        px(ctx, x + 1, y - 1, COL.pants);
      } else {
        px(ctx, x + 1, y - 3, COL.pants);
        px(ctx, x, y - 2, COL.pants);
        px(ctx, x + 1, y - 2, COL.pants);
        px(ctx, x, y - 1, COL.pants);
      }
      break;
    }
    case "stand":
      px(ctx, x, y - 7, COL.skin);
      px(ctx, x + 1, y - 7, COL.skin);
      px(ctx, x, y - 8, COL.hair);
      px(ctx, x + 1, y - 8, COL.hair);
      px(ctx, x, y - 6, shirtColor);
      px(ctx, x + 1, y - 6, shirtColor);
      px(ctx, x, y - 5, shirtColor);
      px(ctx, x + 1, y - 5, shirtColor);
      px(ctx, x - 1, y - 5, shirtColor);
      px(ctx, x + 2, y - 5, shirtColor);
      px(ctx, x, y - 4, COL.pants);
      px(ctx, x + 1, y - 4, COL.pants);
      px(ctx, x, y - 3, COL.pants);
      px(ctx, x + 1, y - 3, COL.pants);
      px(ctx, x, y - 2, COL.pants);
      px(ctx, x + 1, y - 2, COL.pants);
      px(ctx, x, y - 1, COL.pants);
      px(ctx, x + 1, y - 1, COL.pants);
      break;
    case "sit":
      // Sitting on ground, shorter
      y = groundY + 1;
      px(ctx, x, y - 5, COL.skin);
      px(ctx, x + 1, y - 5, COL.skin);
      px(ctx, x, y - 6, COL.hair);
      px(ctx, x + 1, y - 6, COL.hair);
      px(ctx, x, y - 4, shirtColor);
      px(ctx, x + 1, y - 4, shirtColor);
      px(ctx, x - 1, y - 3, shirtColor);
      px(ctx, x + 2, y - 3, shirtColor);
      // Legs stretched out
      px(ctx, x - 1, y - 2, COL.pants);
      px(ctx, x, y - 2, COL.pants);
      px(ctx, x + 1, y - 2, COL.pants);
      px(ctx, x + 2, y - 2, COL.pants);
      // "..." speech bubble
      if (Math.floor(time / 800) % 2 === 0) {
        px(ctx, x - 1, y - 8, COL.bubbleGray);
        px(ctx, x, y - 8, COL.bubbleGray);
        px(ctx, x + 1, y - 8, COL.bubbleGray);
      }
      break;
    case "jump": {
      const jOff = Math.abs(Math.sin(time / 200 + idx * 1.5)) * 4;
      const jy = y - Math.round(jOff);
      px(ctx, x, jy - 8, COL.hair);
      px(ctx, x + 1, jy - 8, COL.hair);
      px(ctx, x, jy - 7, COL.skin);
      px(ctx, x + 1, jy - 7, COL.skin);
      px(ctx, x, jy - 6, shirtColor);
      px(ctx, x + 1, jy - 6, shirtColor);
      px(ctx, x, jy - 5, shirtColor);
      px(ctx, x + 1, jy - 5, shirtColor);
      // Arms up!
      px(ctx, x - 1, jy - 7, shirtColor);
      px(ctx, x + 2, jy - 7, shirtColor);
      // Legs tucked
      px(ctx, x, jy - 4, COL.pants);
      px(ctx, x + 1, jy - 4, COL.pants);
      px(ctx, x - 1, jy - 3, COL.pants);
      px(ctx, x + 2, jy - 3, COL.pants);
      break;
    }
    case "wave": {
      const waveUp = Math.sin(time / 200 + idx) > 0;
      px(ctx, x, y - 8, COL.hair);
      px(ctx, x + 1, y - 8, COL.hair);
      px(ctx, x, y - 7, COL.skin);
      px(ctx, x + 1, y - 7, COL.skin);
      px(ctx, x, y - 6, shirtColor);
      px(ctx, x + 1, y - 6, shirtColor);
      px(ctx, x, y - 5, shirtColor);
      px(ctx, x + 1, y - 5, shirtColor);
      // Left arm down
      px(ctx, x - 1, y - 5, shirtColor);
      // Right arm waving
      if (waveUp) {
        px(ctx, x + 2, y - 7, shirtColor);
        px(ctx, x + 2, y - 8, COL.skin); // hand
      } else {
        px(ctx, x + 2, y - 6, shirtColor);
        px(ctx, x + 3, y - 6, COL.skin);
      }
      // Legs
      px(ctx, x, y - 4, COL.pants);
      px(ctx, x + 1, y - 4, COL.pants);
      px(ctx, x, y - 3, COL.pants);
      px(ctx, x + 1, y - 3, COL.pants);
      px(ctx, x, y - 2, COL.pants);
      px(ctx, x + 1, y - 2, COL.pants);
      px(ctx, x, y - 1, COL.pants);
      px(ctx, x + 1, y - 1, COL.pants);
      break;
    }
  }
}

// ── Sparkles (stage 10) ─────────────────────────────────────
function drawSparkles(ctx: CanvasRenderingContext2D, time: number) {
  for (let i = 0; i < 8; i++) {
    const sx = Math.floor((time / 80 + i * 53) % W);
    const sy = Math.floor((time / 120 + i * 37) % 60);
    if (Math.sin(time / 200 + i * 1.7) > 0.6) {
      px(ctx, sx, sy, COL.gold);
    }
  }
}

// ── Utility ─────────────────────────────────────────────────
function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}
