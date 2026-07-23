// Web Audio API Sound Generator & Haptic Vibration Helper

let audioCtx: AudioContext | null = null;
let isUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

// Unlock Web Audio API on first user interaction to comply with browser autoplay policies
export function setupAudioUnlock() {
  if (typeof window === "undefined" || isUnlocked) return;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().then(() => {
        isUnlocked = true;
      });
    } else if (ctx) {
      isUnlocked = true;
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("click", unlock);
  };

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
  window.addEventListener("click", unlock, { once: true });
}

// Play chime sound & vibrate for Waiter Call (celular, tablet, computador)
export function playWaiterCallSound() {
  setupAudioUnlock();

  // Trigger haptic vibration on mobile devices
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate([300, 150, 300]);
    } catch (e) {
      // Ignore if vibration is restricted by browser policy
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;

  // Tone 1: E5 (659.25 Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(659.25, now);
  gain1.gain.setValueAtTime(0.35, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.5);

  // Tone 2: A5 (880 Hz) - delayed
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(880, now + 0.15);
  gain2.gain.setValueAtTime(0.45, now + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.85);
}

// Play kitchen alert chime for new orders on TV / kitchen screen
export function playKitchenNewOrderSound() {
  setupAudioUnlock();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad chime

  notes.forEach((freq, idx) => {
    const startTime = now + idx * 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle"; // Rich chime tone audible on TV speakers
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.45, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.65);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.65);
  });
}
