import { RestaurantState } from "./types";
import { saveOfflineStateCache, loadOfflineStateCache } from "./offlineSync";

const STATE_POLL_MS = 2500;

export function subscribeToState(callback: (state: RestaurantState) => void) {
  if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
    let unsubscribe: (() => void) | undefined;
    let isActive = true;

    // Fast initial render from local cache while connecting
    const cachedState = loadOfflineStateCache();
    if (cachedState) {
      callback(cachedState);
    }

    void import("./dbClient").then((client) => {
      if (!isActive) return;
      unsubscribe = client.subscribeToState((newState) => {
        saveOfflineStateCache(newState);
        callback(newState);
      });
    });

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }

  let isActive = true;
  let timeoutId: number | undefined;

  // Fast initial render from local cache
  const cachedState = loadOfflineStateCache();
  if (cachedState) {
    callback(cachedState);
  }

  const loadState = async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const state = (await res.json()) as RestaurantState;
        if (isActive) {
          saveOfflineStateCache(state);
          callback(state);
        }
      }
    } catch (e) {
      // Offline fallback: load state from local storage
      const fallback = loadOfflineStateCache();
      if (fallback && isActive) {
        callback(fallback);
      }
    } finally {
      if (isActive) {
        timeoutId = window.setTimeout(loadState, STATE_POLL_MS);
      }
    }
  };

  loadState();

  return () => {
    isActive = false;
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  };
}
