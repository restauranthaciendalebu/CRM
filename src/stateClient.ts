import { RestaurantState } from "./types";

const STATE_POLL_MS = 2500;

export function subscribeToState(callback: (state: RestaurantState) => void) {
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
