"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const { userProfile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-gray-900 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🏯</span>
          <span className="font-bold text-white text-sm md:text-base">
            勉強陣取り
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-gray-300 hover:text-white text-sm transition-colors"
          >
            地図
          </Link>
          <Link
            href="/record"
            className="text-gray-300 hover:text-white text-sm transition-colors"
          >
            記録
          </Link>
          <Link
            href="/goals"
            className="text-gray-300 hover:text-white text-sm transition-colors"
          >
            目標
          </Link>
          <Link
            href="/ranking"
            className="text-gray-300 hover:text-white text-sm transition-colors"
          >
            ランキング
          </Link>
          <Link
            href="/mypage"
            className="text-gray-300 hover:text-white text-sm transition-colors"
          >
            マイページ
          </Link>
        </nav>

        {/* User */}
        <div className="flex items-center gap-3">
          {userProfile && (
            <div className="hidden md:flex items-center gap-2">
              {userProfile.photoURL && (
                <img
                  src={userProfile.photoURL}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-gray-300 text-sm">
                {userProfile.displayName}
              </span>
              <button
                onClick={signOut}
                className="text-gray-500 hover:text-gray-300 text-xs ml-2"
              >
                ログアウト
              </button>
            </div>
          )}

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-gray-300 p-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700">
          <nav className="flex flex-col p-4 gap-3">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="text-gray-300 hover:text-white text-sm py-2"
            >
              🗾 地図
            </Link>
            <Link
              href="/record"
              onClick={() => setMenuOpen(false)}
              className="text-gray-300 hover:text-white text-sm py-2"
            >
              📝 記録
            </Link>
            <Link
              href="/goals"
              onClick={() => setMenuOpen(false)}
              className="text-gray-300 hover:text-white text-sm py-2"
            >
              🎯 目標
            </Link>
            <Link
              href="/ranking"
              onClick={() => setMenuOpen(false)}
              className="text-gray-300 hover:text-white text-sm py-2"
            >
              🏆 ランキング
            </Link>
            <Link
              href="/mypage"
              onClick={() => setMenuOpen(false)}
              className="text-gray-300 hover:text-white text-sm py-2"
            >
              👤 マイページ
            </Link>
            {userProfile && (
              <div className="border-t border-gray-700 pt-3 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  {userProfile.photoURL && (
                    <img
                      src={userProfile.photoURL}
                      alt=""
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="text-gray-400 text-sm">
                    {userProfile.displayName}
                  </span>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setMenuOpen(false);
                  }}
                  className="text-red-400 text-sm"
                >
                  ログアウト
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
