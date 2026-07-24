import React, { useState, useEffect } from "react";
import { RestaurantState } from "./types";

const OFFLINE_CACHE_KEY = "hacienda_offline_state_cache";

export function saveOfflineStateCache(state: RestaurantState) {
  if (typeof window === "undefined" || !state) return;
  try {
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(state));
  } catch (e) {
    // Ignore quota errors if storage full
  }
}

export function loadOfflineStateCache(): RestaurantState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
    if (raw && raw.trim()) {
      return JSON.parse(raw) as RestaurantState;
    }
  } catch (e) {
    console.error("Could not parse offline state cache:", e);
  }
  return null;
}

export function useOnlineStatus() {
  if (typeof window === "undefined") return true;

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
