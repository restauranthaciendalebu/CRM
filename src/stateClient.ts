import { RestaurantState } from "./types";

const STATE_POLL_MS = 2500;

export function subscribeToState(callback: (state: RestaurantState) => void) {
  if (import.meta.env.VITE_USE_FIRESTORE_DIRECT_API === "true") {
    let unsubscribe: (() => void) | undefined;
    let isActive = true;
    void import("./dbClient").then((client) => {
      if (!isActive) return;
      unsubscribe = client.subscribeToState(callback);
    });

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }

  let isActive = true;
  let timeoutId: number | undefined;

  const loadState = async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const state = (await res.json()) as RestaurantState;
        if (isActive) {
          callback(state);
        }
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
