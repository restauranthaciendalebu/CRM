import { RestaurantState } from "./types";
import { saveOfflineStateCache, loadOfflineStateCache } from "./offlineSync";
import { DEMO_STATE } from "./demoState";

const STATE_POLL_MS = 2500;

export function subscribeToState(callback: (state: RestaurantState) => void) {
  let unsubscribe: (() => void) | undefined;
  let isActive = true;

  // 1. Deliver local cache or default demo state immediately so loading screen disappears in 0ms
  const cachedState = loadOfflineStateCache();
  callback(cachedState || DEMO_STATE);

  // 2. Subscribe to Firestore Web SDK directly for real-time cloud data
  void import("./dbClient").then((client) => {
    if (!isActive) return;
    try {
      unsubscribe = client.subscribeToState((newState) => {
        saveOfflineStateCache(newState);
        callback(newState);
      });
    } catch (e) {
      console.warn("Firestore real-time subscription warning:", e);
    }
  }).catch((err) => {
    console.warn("Could not load dbClient dynamically:", err);
  });

  // 3. Parallel API polling for Node server backend environments
  let timeoutId: number | undefined;
  const loadStateFromApi = async () => {
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
      // Ignore API fetch errors on static hosting
    } finally {
      if (isActive) {
        timeoutId = window.setTimeout(loadStateFromApi, STATE_POLL_MS);
      }
    }
  };

  loadStateFromApi();

  return () => {
    isActive = false;
    unsubscribe?.();
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  };
}
