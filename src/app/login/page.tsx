"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateUserName } from "@/lib/firestore";
import { getUser } from "@/lib/firestore";

export default function LoginPage() {
  const { firebaseUser, userProfile, loading, signInWithGoogle, setUserProfile } = useAuth();
  const router = useRouter();
  const [showNameInput, setShowNameInput] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && userProfile && userProfile.displayName) {
      router.push("/");
    }
  }, [loading, userProfile, router]);

  useEffect(() => {
    if (firebaseUser && userProfile && !userProfile.displayName) {
      setShowNameInput(true);
      setName(firebaseUser.displayName || "");
    }
  }, [firebaseUser, userProfile]);

  const handleSetName = async () => {
    if (!name.trim() || !firebaseUser) return;
    setSaving(true);
    try {
      await updateUserName(firebaseUser.uid, name.trim());
      const updated = await getUser(firebaseUser.uid);
      setUserProfile(updated);
      router.push("/");
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍄</div>
          <h1 className="text-3xl font-bold text-white mb-2">Kinoko Lab</h1>
          <p className="text-gray-400 text-sm">
            ITの学習をキノコ栽培で可視化しよう
          </p>
        </div>

        {!showNameInput ? (
          /* Google ログインボタン */
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 rounded-lg px-6 py-3 font-medium hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Googleでログイン
            </button>
            <p className="text-gray-500 text-xs text-center mt-4">
              Googleアカウントで簡単にログインできます
            </p>
          </div>
        ) : (
          /* ユーザー名入力 */
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-white font-bold mb-4 text-center">
              ユーザー名を設定
            </h2>
            <p className="text-gray-400 text-sm mb-4 text-center">
              他のユーザーに表示される名前です
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ユーザー名を入力"
              maxLength={20}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 mb-4 border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleSetName}
              disabled={!name.trim() || saving}
              className="w-full bg-blue-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "設定中..." : "はじめる"}
            </button>
          </div>
        )}

        {/* Feature Cards */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="bg-gray-900 rounded-lg p-3 text-center border border-gray-800">
            <div className="text-2xl mb-1">🍄</div>
            <p className="text-gray-400 text-xs">キノコ栽培</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 text-center border border-gray-800">
            <div className="text-2xl mb-1">🧬</div>
            <p className="text-gray-400 text-xs">菌株配合</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 text-center border border-gray-800">
            <div className="text-2xl mb-1">🏠</div>
            <p className="text-gray-400 text-xs">部屋づくり</p>
          </div>
        </div>
      </div>
    </div>
  );
}
