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
} from "./types";
import {
  createInitialCultivation,
  updateCultivationWithLog,
  createHarvestedMushroom,
  calculatePoints,
  evaluateAchievements,
} from "./cultivation";

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

// ============================================
// Cultivations（栽培中のキノコ）
// ============================================

/** 新しい栽培を開始 */
export async function startCultivation(
  userId: string,
  certificationId: string,
  matingPartner: HarvestedMushroom | null
): Promise<string> {
  const data = createInitialCultivation(certificationId, userId, matingPartner);
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
}): Promise<{
  logId: string;
  phaseBefore: number;
  phaseAfter: number;
  newlyUnlockedAchievements: string[];
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

  if (cultivation) {
    phaseBefore = cultivation.phase;
    const updates = updateCultivationWithLog(cultivation, newLog, allLogs);
    phaseAfter = (updates.phase as number) || cultivation.phase;
    await updateCultivation(data.cultivationId, updates);

    await updateDoc(doc(db(), "users", data.userId), {
      totalStudyMinutes: increment(data.minutes),
      updatedAt: serverTimestamp(),
    });
  }

  // 実績チェック
  const newlyUnlockedAchievements = await checkAndUnlockAchievements(data.userId);

  return {
    logId: docRef.id,
    phaseBefore,
    phaseAfter,
    newlyUnlockedAchievements,
  };
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
  const [user, cultivations, harvested, existingAchievements, allLogs] = await Promise.all([
    getUser(userId),
    // アクティブのみではなく全件取得（完了後の判定に必要）
    getDocs(query(collection(db(), "cultivations"), where("userId", "==", userId))).then(snap =>
      snap.docs.map(d => ({ id: d.id, ...d.data() }) as Cultivation)
    ),
    getUserHarvestedMushrooms(userId),
    getUserAchievements(userId),
    getUserStudyLogs(userId, 10000),
  ]);

  const totalStudyMinutes = user?.totalStudyMinutes || 0;
  const candidates = evaluateAchievements({ cultivations, harvested, allLogs, totalStudyMinutes });
  const alreadyUnlocked = new Set(existingAchievements.map(a => a.achievementId));
  const newlyUnlocked = candidates.filter(id => !alreadyUnlocked.has(id));

  await Promise.all(newlyUnlocked.map(id => unlockAchievement(userId, id)));
  return newlyUnlocked;
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
