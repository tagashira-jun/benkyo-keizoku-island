"use client";

import { useState, useEffect, useCallback } from "react";
import { Log, Category, PlayerState } from "@/lib/types";
import {
  loadLogs,
  saveLogs,
  loadCategories,
  saveCategories,
  loadPlayerState,
  savePlayerState,
  getTodayString,
} from "@/lib/storage";
import { EnergyLevel } from "@/lib/types";
import {
  calculateLevel,
  calculateStreak,
  calculateEnergyLevel,
  calculatePopulation,
  checkNewAchievements,
} from "@/lib/gameLogic";

export function useGameState() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loadedLogs = loadLogs();
    const loadedCats = loadCategories();
    const loadedState = loadPlayerState();

    // Recalculate streak on load
    const today = getTodayString();
    const streak = calculateStreak(loadedLogs, today);
    const level = calculateLevel(loadedState.totalXP);
    const energy = calculateEnergyLevel(loadedState.lastActiveDate, level);
    const population = calculatePopulation(
      level,
      energy,
      loadedState.population
    );

    const updatedState: PlayerState = {
      ...loadedState,
      level,
      currentStreak: streak,
      population,
    };

    setLogs(loadedLogs);
    setCategories(loadedCats);
    setPlayerState(updatedState);
    savePlayerState(updatedState);
    setLoaded(true);
  }, []);

  const addRecord = useCallback(
    (categoryId: string, content: string, minutes: number) => {
      if (!playerState) return;

      const today = getTodayString();
      const newLog: Log = {
        id: crypto.randomUUID(),
        categoryId,
        content,
        minutes,
        date: today,
        createdAt: new Date().toISOString(),
      };

      const updatedLogs = [...logs, newLog];
      saveLogs(updatedLogs);
      setLogs(updatedLogs);

      // Update content history
      if (content) {
        const updatedCats = categories.map((c) => {
          if (c.id === categoryId && !c.contentHistory.includes(content)) {
            return { ...c, contentHistory: [...c.contentHistory, content] };
          }
          return c;
        });
        saveCategories(updatedCats);
        setCategories(updatedCats);
      }

      // Update player state
      const newTotalXP = playerState.totalXP + minutes;
      const newLevel = calculateLevel(newTotalXP);
      const newStreak = calculateStreak(updatedLogs, today);
      const newMaxStreak = Math.max(playerState.maxStreak, newStreak);
      const energy = calculateEnergyLevel(today, newLevel);
      const newPop = calculatePopulation(
        newLevel,
        energy,
        playerState.population
      );

      const updatedState: PlayerState = {
        ...playerState,
        totalXP: newTotalXP,
        level: newLevel,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        lastActiveDate: today,
        population: newPop,
      };

      // Check achievements
      const newlyUnlocked = checkNewAchievements(
        updatedLogs,
        updatedState,
        categories
      );
      if (newlyUnlocked.length > 0) {
        updatedState.achievements = [
          ...updatedState.achievements,
          ...newlyUnlocked,
        ];
        setNewAchievementIds(newlyUnlocked);
        setTimeout(() => setNewAchievementIds([]), 3000);
      }

      savePlayerState(updatedState);
      setPlayerState(updatedState);
    },
    [logs, categories, playerState]
  );

  const addCategory = useCallback(
    (label: string, icon: string, buildingType: string) => {
      const newCat: Category = {
        id: crypto.randomUUID(),
        label,
        icon,
        buildingType,
        contentHistory: [],
      };
      const updated = [...categories, newCat];
      saveCategories(updated);
      setCategories(updated);
    },
    [categories]
  );

  const updateCategory = useCallback(
    (id: string, label: string, icon: string) => {
      const updated = categories.map((c) =>
        c.id === id ? { ...c, label, icon } : c
      );
      saveCategories(updated);
      setCategories(updated);
    },
    [categories]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      const updated = categories.filter((c) => c.id !== id);
      saveCategories(updated);
      setCategories(updated);
    },
    [categories]
  );

  const clearAchievementNotification = useCallback(() => {
    setNewAchievementIds([]);
  }, []);

  const energyLevel: EnergyLevel = playerState
    ? calculateEnergyLevel(playerState.lastActiveDate, playerState.level)
    : 3;

  const todayMinutes = logs
    .filter((l) => l.date === getTodayString())
    .reduce((sum, l) => sum + l.minutes, 0);

  return {
    logs,
    categories,
    playerState,
    energyLevel,
    todayMinutes,
    newAchievementIds,
    loaded,
    addRecord,
    addCategory,
    updateCategory,
    deleteCategory,
    clearAchievementNotification,
  };
}
