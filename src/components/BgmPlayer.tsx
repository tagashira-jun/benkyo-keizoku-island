"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export default function BgmPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const audio = new Audio("/bgm.wav");
    audio.loop = true;
    audio.volume = volume;
    audio.preload = "auto";
    audioRef.current = audio;

    audio.addEventListener("canplaythrough", () => setReady(true));

    return () => {
      audio.pause();
      audio.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [playing]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={!ready}
        className="text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-30"
        title={playing ? "BGM停止" : "BGM再生"}
      >
        {playing ? "🔊" : "🔇"}
      </button>
      {playing && (
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(volume * 100)}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          className="w-16 h-1 accent-blue-500"
        />
      )}
    </div>
  );
}
