/**
 * Firestore データアクセス層（キノコ栽培ゲーミフィケーション版）
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  increment,
  serverTimestamp,
  Timestamp,
  limit,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import {
  UserProfile,
  StudyLog,
  Cultivation,
  HarvestedMushroom,
  Room,
  UserAchievement,
  DomainValues,
  StudyRoadmap,
  RoadmapChapter,
  RoadmapTask,
  TASK_XP_POMODORO,
  TASK_XP_CHECKBOX,
  CHAPTER_CLEAR_BONUS_XP,
} from "./types";
import { countTasks, isChapterComplete } from "./roadmap";
import {
  createInitialCultivation,
  updateCultivationWithLog,
  createHarvestedMushroom,
  calculatePoints,
  evaluateAchievements,
  computeGapDatesToFreeze,
} from "./cultivation";
import { UserPreferences } from "./types";

function db() {
  return getFirebaseDb();
}

// ============================================
// Users
// ============================================

export async function getUser(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db(), "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as UserProfile;
}

export async function createUser(
  uid: string,
  data: { displayName: string; email: string; photoURL: string }
): Promise<void> {
  await setDoc(doc(db(), "users", uid), {
    displayName: data.displayName,
    email: data.email,
    photoURL: data.photoURL,
    totalStudyMinutes: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserName(uid: string, displayName: string): Promise<void> {
  await updateDoc(doc(db(), "users", uid), {
    displayName,
    updatedAt: serverTimestamp(),
  });
}

/**
 * ユーザー設定を更新する（静かな栽培モード等）。
 * undefined のフィールドは上書きしない（個別トグル用）。
 */
export async function updateUserPreferences(
  uid: string,
  patch: Partial<UserPreferences>,
): Promise<void> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) clean[`preferences.${k}`] = v;
  }
  if (Object.keys(clean).length === 0) return;
  clean.updatedAt = serverTimestamp();
  await updateDoc(doc(db(), "users", uid), clean);
}

/**
 * 菌糸休眠チケット（フリーズ）を配布する。
 * 既に配布済み数（freezeTokensGranted）と比較し、差分があれば付与する。
 * ストリーク実績解除のたびに呼ばれる想定。
 */
export async function grantFreezeTokensIfNeeded(
  uid: string,
  targetGranted: number,
): Promise<number> {
  const user = await getUser(uid);
  const alreadyGranted = user?.freezeTokensGranted ?? 0;
  const diff = targetGranted - alreadyGranted;
  if (diff <= 0) return 0;
  await updateDoc(doc(db(), "users", uid), {
    freezeTokens: increment(diff),
    freezeTokensGranted: increment(diff),
    updatedAt: serverTimestamp(),
  });
  return diff;
}

/**
 * ギャップを菌糸休眠チケットで埋められる場合は消費する。
 * 消費した日付を返す（ない場合は空配列）。
 */
async function consumeFreezeTokensForGap(
  uid: string,
  cultivationId: string,
  lastRecordDate: string | null,
  newDate: string,
  existingFrozenDates: string[],
): Promise<string[]> {
  const gaps = computeGapDatesToFreeze(lastRecordDate, newDate)
    .filter(d => !existingFrozenDates.includes(d));
  if (gaps.length === 0) return [];

  const user = await getUser(uid);
  const tokens = user?.freezeTokens ?? 0;
  const canCover = Math.min(tokens, gaps.length);
  if (canCover <= 0) return [];

  // 連続記録維持のため、最新ギャップ日から消費（手前の欠けは諦める）
  const toFreeze = gaps.slice(-canCover);
  await updateDoc(doc(db(), "users", uid), {
    freezeTokens: increment(-canCover),
    updatedAt: serverTimestamp(),
  });
  return toFreeze;
}

// ============================================
// Cultivations（栽培中のキノコ）
// ============================================

/** 新しい栽培を開始 */
export async function startCultivation(
  userId: string,
  certificationId: string,
  matingPartner: HarvestedMushroom | null,
  goalStatement: string = "",
  customCert?: import("./types").CustomCertificationMeta,
): Promise<string> {
  const data = createInitialCultivation(
    certificationId,
    userId,
    matingPartner,
    goalStatement,
    customCert,
  );
  const docRef = await addDoc(collection(db(), "cultivations"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** ユーザーの栽培中キノコ一覧を取得 */
export async function getUserCultivations(userId: string): Promise<Cultivation[]> {
  const q = query(
    collection(db(), "cultivations"),
    where("userId", "==", userId),
    where("isCompleted", "==", false)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Cultivation);
}

/** 栽培を1件取得 */
export async function getCultivation(id: string): Promise<Cultivation | null> {
  const snap = await getDoc(doc(db(), "cultivations", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Cultivation;
}

/** 栽培状態を更新 */
export async function updateCultivation(id: string, data: Partial<Cultivation>): Promise<void> {
  const { id: _id, createdAt: _ca, ...updateData } = data as any;
  await updateDoc(doc(db(), "cultivations", id), {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
}

/** 栽培をリアルタイム監視 */
export function onCultivationChange(
  cultivationId: string,
  callback: (cultivation: Cultivation | null) => void
): Unsubscribe {
  return onSnapshot(doc(db(), "cultivations", cultivationId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ id: snap.id, ...snap.data() } as Cultivation);
  });
}

// ============================================
// Study Logs（学習記録）
// ============================================

/**
 * 学習記録を追加し、栽培状態を更新
 * 戻り値: { logId, phaseBefore, phaseAfter, newlyUnlockedAchievements }
 */
export async function addStudyLog(data: {
  userId: string;
  cultivationId: string;
  type: "input" | "output";
  subType: string;
  minutes: number;
  memo: string;
  date: string;
  condition?: number;
  fulfillment?: number;
  isPomodoro?: boolean;
}): Promise<{
  logId: string;
  phaseBefore: number;
  phaseAfter: number;
  newlyUnlockedAchievements: string[];
  /** 今回の記録でフリーズチケットを消費して連続記録を守った日付 */
  frozenDatesConsumed: string[];
  /** 実績解除の結果、今回新たに付与された菌糸休眠チケット枚数 */
  freezeTokensAwarded: number;
}> {
  // 記録を保存
  const docRef = await addDoc(collection(db(), "studyLogs"), {
    ...data,
    createdAt: serverTimestamp(),
  });

  const newLog: StudyLog = {
    id: docRef.id,
    ...data,
    createdAt: Timestamp.now(),
  };

  const allLogs = await getStudyLogsByCultivation(data.cultivationId);
  const cultivation = await getCultivation(data.cultivationId);
  let phaseBefore = 1;
  let phaseAfter = 1;
  let frozenDatesConsumed: string[] = [];

  if (cultivation) {
    phaseBefore = cultivation.phase;

    // 菌糸休眠チケットでギャップを埋められるか判定し、消費する
    frozenDatesConsumed = await consumeFreezeTokensForGap(
      data.userId,
      data.cultivationId,
      cultivation.lastRecordDate,
      data.date,
      cultivation.frozenDates ?? [],
    );
    const nextFrozenDates = [
      ...(cultivation.frozenDates ?? []),
      ...frozenDatesConsumed,
    ];

    // フリーズ込みで栽培状態を更新
    const cultivationForCalc: Cultivation = {
      ...cultivation,
      frozenDates: nextFrozenDates,
    };
    const updates = updateCultivationWithLog(cultivationForCalc, newLog, allLogs);
    phaseAfter = (updates.phase as number) || cultivation.phase;
    await updateCultivation(data.cultivationId, {
      ...updates,
      frozenDates: nextFrozenDates,
    });

    await updateDoc(doc(db(), "users", data.userId), {
      totalStudyMinutes: increment(data.minutes),
      updatedAt: serverTimestamp(),
    });
  }

  // 実績チェック
  const newlyUnlockedAchievements = await checkAndUnlockAchievements(data.userId);

  // 菌糸休眠チケットの配布（ストリーク実績の段階に応じて累計配布数を調整）
  // streak_7=+1, streak_30=+2(累計3), streak_100=+3(累計6) になるよう設計
  const freezeTokensAwarded = await maybeGrantStreakFreezeTokens(data.userId);

  return {
    logId: docRef.id,
    phaseBefore,
    phaseAfter,
    newlyUnlockedAchievements,
    frozenDatesConsumed,
    freezeTokensAwarded,
  };
}

/**
 * ストリーク実績の解除状況に応じて菌糸休眠チケットを配布する。
 * 重複配布を避けるため freezeTokensGranted と比較し、差分のみ付与。
 *
 * 配布設計（情報的報酬として、絶望を防ぐ「安全網」の意味づけ）：
 *  - streak_7 達成   → 累計 1 枚
 *  - streak_30 達成  → 累計 3 枚
 *  - streak_100 達成 → 累計 6 枚
 */
async function maybeGrantStreakFreezeTokens(uid: string): Promise<number> {
  const achievements = await getUserAchievements(uid);
  const ids = new Set(achievements.map(a => a.achievementId));
  let target = 0;
  if (ids.has("streak_7")) target = 1;
  if (ids.has("streak_30")) target = 3;
  if (ids.has("streak_100")) target = 6;
  if (target === 0) return 0;
  return grantFreezeTokensIfNeeded(uid, target);
}

/** 栽培に紐づく全記録を取得 */
export async function getStudyLogsByCultivation(cultivationId: string): Promise<StudyLog[]> {
  const q = query(
    collection(db(), "studyLogs"),
    where("cultivationId", "==", cultivationId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as StudyLog)
    .sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
}

/** ユーザーの最近の学習記録を取得 */
export async function getUserStudyLogs(userId: string, limitCount: number = 20): Promise<StudyLog[]> {
  const q = query(
    collection(db(), "studyLogs"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as StudyLog)
    .sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    })
    .slice(0, limitCount);
}

/** 学習記録を削除 */
export async function deleteStudyLog(logId: string): Promise<void> {
  const logSnap = await getDoc(doc(db(), "studyLogs", logId));
  if (!logSnap.exists()) return;

  const log = logSnap.data();
  const cultivationId = log.cultivationId as string;

  await deleteDoc(doc(db(), "studyLogs", logId));

  // 栽培状態を再計算
  const cultivation = await getCultivation(cultivationId);
  if (cultivation) {
    const allLogs = await getStudyLogsByCultivation(cultivationId);
    const dummyLog = { id: "", ...log } as StudyLog;
    const updates = updateCultivationWithLog(cultivation, dummyLog, allLogs);
    await updateCultivation(cultivationId, updates);
  }
}

/** 学習記録をリアルタイム監視 */
export function onStudyLogsChange(
  cultivationId: string,
  callback: (logs: StudyLog[]) => void
): Unsubscribe {
  const q = query(
    collection(db(), "studyLogs"),
    where("cultivationId", "==", cultivationId)
  );
  return onSnapshot(q, (snap) => {
    const logs = snap.docs
      .map(d => ({ id: d.id, ...d.data() }) as StudyLog)
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
    callback(logs);
  });
}

// ============================================
// Harvested Mushrooms（収穫済みキノコ）
// ============================================

/** キノコを収穫（栽培完了） */
export async function harvestMushroom(cultivationId: string): Promise<string> {
  const cultivation = await getCultivation(cultivationId);
  if (!cultivation) throw new Error("Cultivation not found");

  const harvestData = createHarvestedMushroom(cultivation);
  const docRef = await addDoc(collection(db(), "harvestedMushrooms"), {
    ...harvestData,
    createdAt: serverTimestamp(),
  });

  await updateCultivation(cultivationId, {
    isCompleted: true,
    completedDate: new Date().toISOString().split("T")[0],
    phase: 6,
  });

  // 収穫時も実績チェック
  await checkAndUnlockAchievements(cultivation.userId);

  return docRef.id;
}

/** ユーザーの収穫済みキノコ一覧 */
export async function getUserHarvestedMushrooms(userId: string): Promise<HarvestedMushroom[]> {
  const q = query(
    collection(db(), "harvestedMushrooms"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }) as HarvestedMushroom)
    .sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
}

/** 収穫済みキノコを1件取得 */
export async function getHarvestedMushroom(id: string): Promise<HarvestedMushroom | null> {
  const snap = await getDoc(doc(db(), "harvestedMushrooms", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as HarvestedMushroom;
}

// ============================================
// Room（部屋）
// ============================================

/** ユーザーの部屋を取得（なければ初期化） */
export async function getUserRoom(userId: string): Promise<Room> {
  const snap = await getDoc(doc(db(), "rooms", userId));
  if (snap.exists()) {
    return { userId, ...snap.data() } as Room;
  }

  // 初期部屋を作成
  const initialRoom: Omit<Room, "updatedAt"> & { updatedAt: any } = {
    userId,
    displayedMushroomIds: [],
    unlockedItemIds: [],
    wallpaperId: "default",
    roomLevel: 1,
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db(), "rooms", userId), initialRoom);
  return { ...initialRoom, updatedAt: Timestamp.now() } as Room;
}

/** 部屋を更新 */
export async function updateRoom(userId: string, data: Partial<Room>): Promise<void> {
  await updateDoc(doc(db(), "rooms", userId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// Achievements（実績）
// ============================================

/** ユーザーの解除済み実績を取得 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const q = query(
    collection(db(), "userAchievements"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as UserAchievement);
}

/** 実績を解除 */
export async function unlockAchievement(userId: string, achievementId: string): Promise<void> {
  const id = `${userId}_${achievementId}`;
  const existing = await getDoc(doc(db(), "userAchievements", id));
  if (existing.exists()) return;

  await setDoc(doc(db(), "userAchievements", id), {
    userId,
    achievementId,
    unlockedAt: serverTimestamp(),
  });
}

/**
 * ユーザーの現在の状態を評価し、新たに解除可能な実績を全てアンロック
 * 新規解除されたIDのリストを返す
 */
export async function checkAndUnlockAchievements(userId: string): Promise<string[]> {
  const [user, cultivations, harvested, existingAchievements, allLogs, roadmaps] = await Promise.all([
    getUser(userId),
    // アクティブのみではなく全件取得（完了後の判定に必要）
    getDocs(query(collection(db(), "cultivations"), where("userId", "==", userId))).then(snap =>
      snap.docs.map(d => ({ id: d.id, ...d.data() }) as Cultivation)
    ),
    getUserHarvestedMushrooms(userId),
    getUserAchievements(userId),
    getUserStudyLogs(userId, 10000),
    getUserRoadmaps(userId),
  ]);

  const totalStudyMinutes = user?.totalStudyMinutes || 0;
  const candidates = evaluateAchievements({ cultivations, harvested, allLogs, totalStudyMinutes, roadmaps });
  const alreadyUnlocked = new Set(existingAchievements.map(a => a.achievementId));
  const newlyUnlocked = candidates.filter(id => !alreadyUnlocked.has(id));

  await Promise.all(newlyUnlocked.map(id => unlockAchievement(userId, id)));
  return newlyUnlocked;
}

// ============================================
// Roadmap（学習ロードマップ）
// ============================================

/** 栽培に紐づくロードマップを1件取得（なければ null） */
export async function getRoadmapByCultivation(
  cultivationId: string,
): Promise<StudyRoadmap | null> {
  const q = query(
    collection(db(), "roadmaps"),
    where("cultivationId", "==", cultivationId),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as StudyRoadmap;
}

/** ユーザーの全ロードマップを取得 */
export async function getUserRoadmaps(userId: string): Promise<StudyRoadmap[]> {
  const q = query(collection(db(), "roadmaps"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StudyRoadmap);
}

/** ロードマップを作成（既にあれば上書き置換する） */
export async function saveRoadmap(params: {
  userId: string;
  cultivationId: string;
  goalText: string;
  rawContent: string;
  chapters: RoadmapChapter[];
}): Promise<string> {
  const existing = await getRoadmapByCultivation(params.cultivationId);
  const { total, completed } = countTasks(params.chapters);

  if (existing) {
    await updateDoc(doc(db(), "roadmaps", existing.id), {
      goalText: params.goalText,
      rawContent: params.rawContent,
      chapters: params.chapters,
      totalTaskCount: total,
      completedTaskCount: completed,
      updatedAt: serverTimestamp(),
    });
    return existing.id;
  }

  const ref = await addDoc(collection(db(), "roadmaps"), {
    userId: params.userId,
    cultivationId: params.cultivationId,
    goalText: params.goalText,
    rawContent: params.rawContent,
    chapters: params.chapters,
    totalTaskCount: total,
    completedTaskCount: completed,
    totalXp: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * タスクの完了フラグを切り替える。
 * 戻り値に「獲得XP」「章クリアボーナス適用有無」を返し、呼び出し側で演出に使う。
 */
export async function toggleRoadmapTask(params: {
  roadmapId: string;
  chapterId: string;
  taskId: string;
  nextCompleted: boolean;
}): Promise<{
  totalXpGained: number;
  chapterCleared: boolean;
  updatedChapters: RoadmapChapter[];
}> {
  const snap = await getDoc(doc(db(), "roadmaps", params.roadmapId));
  if (!snap.exists()) throw new Error("Roadmap not found");
  const roadmap = { id: snap.id, ...snap.data() } as StudyRoadmap;

  let xpGained = 0;
  let chapterCleared = false;
  const updatedChapters: RoadmapChapter[] = roadmap.chapters.map((c) => {
    if (c.id !== params.chapterId) return c;
    const prevComplete = isChapterComplete(c);
    const nextTasks = c.tasks.map((t) => {
      if (t.id !== params.taskId) return t;
      // XP差分
      if (!t.isCompleted && params.nextCompleted) {
        xpGained += t.type === "pomodoro" ? TASK_XP_POMODORO : TASK_XP_CHECKBOX;
      } else if (t.isCompleted && !params.nextCompleted) {
        xpGained -= t.type === "pomodoro" ? TASK_XP_POMODORO : TASK_XP_CHECKBOX;
      }
      const next: RoadmapTask = {
        ...t,
        isCompleted: params.nextCompleted,
        completedAt: params.nextCompleted ? new Date().toISOString() : undefined,
      };
      // Firestoreは undefined を許容しないのでキーを除去
      if (next.completedAt === undefined) delete (next as Partial<RoadmapTask>).completedAt;
      return next;
    });
    const nextChapter: RoadmapChapter = { ...c, tasks: nextTasks };
    const nowComplete = isChapterComplete(nextChapter);
    if (!prevComplete && nowComplete) {
      chapterCleared = true;
      xpGained += CHAPTER_CLEAR_BONUS_XP;
    } else if (prevComplete && !nowComplete) {
      xpGained -= CHAPTER_CLEAR_BONUS_XP;
    }
    return nextChapter;
  });

  const { total, completed } = countTasks(updatedChapters);
  await updateDoc(doc(db(), "roadmaps", params.roadmapId), {
    chapters: updatedChapters,
    totalTaskCount: total,
    completedTaskCount: completed,
    totalXp: increment(xpGained),
    updatedAt: serverTimestamp(),
  });

  return { totalXpGained: xpGained, chapterCleared, updatedChapters };
}

/** ロードマップの章配列を任意に置き換える（編集用）。進捗数値も再計算する。 */
export async function updateRoadmapChapters(params: {
  roadmapId: string;
  chapters: RoadmapChapter[];
}): Promise<void> {
  const { total, completed } = countTasks(params.chapters);
  await updateDoc(doc(db(), "roadmaps", params.roadmapId), {
    chapters: params.chapters,
    totalTaskCount: total,
    completedTaskCount: completed,
    updatedAt: serverTimestamp(),
  });
}

/** ポモドーロ完了時にタスクの pomodoroCount を+1する（表示用） */
export async function incrementTaskPomodoro(params: {
  roadmapId: string;
  chapterId: string;
  taskId: string;
}): Promise<void> {
  const snap = await getDoc(doc(db(), "roadmaps", params.roadmapId));
  if (!snap.exists()) return;
  const roadmap = { id: snap.id, ...snap.data() } as StudyRoadmap;
  const updatedChapters = roadmap.chapters.map((c) => {
    if (c.id !== params.chapterId) return c;
    return {
      ...c,
      tasks: c.tasks.map((t) =>
        t.id === params.taskId
          ? { ...t, pomodoroCount: (t.pomodoroCount ?? 0) + 1 }
          : t,
      ),
    };
  });
  await updateDoc(doc(db(), "roadmaps", params.roadmapId), {
    chapters: updatedChapters,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// ソーシャル（他人の部屋）
// ============================================

/** 全ユーザー一覧（部屋訪問用） */
export async function getAllUsers(limitCount: number = 50): Promise<UserProfile[]> {
  const q = query(collection(db(), "users"));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ uid: d.id, ...d.data() }) as UserProfile)
    .slice(0, limitCount);
}
