import React, { useState, useEffect } from "react";
import { RestaurantState } from "./types";

const OFFLINE_CACHE_KEY = "hacienda_public_state_cache_v2";
const LEGACY_CACHE_KEY = "hacienda_offline_state_cache";

export function saveOfflineStateCache(state: RestaurantState) {
  if (typeof window === "undefined" || !state) return;
  try {
    try {
      localStorage.removeItem(LEGACY_CACHE_KEY);
    } catch {}

    const sanitizedProducts = (state.products || []).map((p) => {
      if (p.imageUrl && p.imageUrl.startsWith("data:image/")) {
        return {
          ...p,
          imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60",
        };
      }
      return p;
    });

    const publicState: RestaurantState = {
      ...state,
      users: (state.users || []).map(({ id, name, username, role }) => ({ id, name, username, role })),
      products: sanitizedProducts,
      ingredients: [],
      orders: [],
      customers: [],
      loyaltyTxs: [],
      promotions: [],
      payments: [],
      reservations: [],
      shifts: [],
      notifications: [],
      auditLogs: [],
      inventoryTransactions: [],
    };
    const payload = JSON.stringify(publicState);
    localStorage.setItem(OFFLINE_CACHE_KEY, payload);
  } catch {
    try {
      localStorage.removeItem(OFFLINE_CACHE_KEY);
    } catch {}
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
