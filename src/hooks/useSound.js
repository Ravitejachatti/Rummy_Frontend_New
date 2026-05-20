// 📁 src/hooks/useSound.js
// Mobile-safe sound feedback for rummy actions.
// Uses bundled /public sounds when present, with Web Audio synthesized fallback.

import { useCallback, useMemo, useState } from "react";

const SOUND_PREF_KEY = "rummy_sound_muted";

const SOUNDS = {
  cardDraw: "/sounds/card_draw.mp3",
  cardPlace: "/sounds/card_place.mp3",
  turnNotify: "/sounds/turn_notify.mp3",
  timerWarning: "/sounds/timer_warning.mp3",
  winFanfare: "/sounds/win_fanfare.mp3",
  error: "/sounds/error.mp3",
};

const SYNTH_PRESETS = {
  cardDraw: { frequency: 520, duration: 0.055, type: "triangle", volume: 0.055 },
  cardPlace: { frequency: 260, duration: 0.065, type: "square", volume: 0.04 },
  turnNotify: { frequency: 760, duration: 0.11, type: "sine", volume: 0.06 },
  timerWarning: { frequency: 430, duration: 0.16, type: "sawtooth", volume: 0.045 },
  winFanfare: { frequency: 880, duration: 0.18, type: "triangle", volume: 0.07 },
  error: { frequency: 180, duration: 0.12, type: "sawtooth", volume: 0.045 },
};

let audioContext = null;
const bufferCache = {};

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) audioContext = new AudioCtx();
  return audioContext;
}

async function ensureAudioReady() {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch (_) {
      return ctx;
    }
  }
  return ctx;
}

async function loadSound(url) {
  if (bufferCache[url]) return bufferCache[url];
  try {
    const ctx = await ensureAudioReady();
    if (!ctx) return null;
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    bufferCache[url] = audioBuffer;
    return audioBuffer;
  } catch (_) {
    return null;
  }
}

function playBuffer(buffer, volume = 0.5) {
  if (!buffer) return false;
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);
    return true;
  } catch (_) {
    return false;
  }
}

async function playSynth(soundKey, overrideVolume) {
  const preset = SYNTH_PRESETS[soundKey] || SYNTH_PRESETS.cardPlace;
  const ctx = await ensureAudioReady();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = preset.type;
    osc.frequency.value = preset.frequency;
    const volume = Number.isFinite(overrideVolume) ? overrideVolume : preset.volume;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0001), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + preset.duration + 0.02);
  } catch (_) {
    // Sound feedback is optional.
  }
}

function getInitialMuted() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SOUND_PREF_KEY) === "true";
}

export function useSound() {
  const [muted, setMutedState] = useState(getInitialMuted);

  const setMuted = useCallback((value) => {
    const next = Boolean(value);
    localStorage.setItem(SOUND_PREF_KEY, next ? "true" : "false");
    setMutedState(next);
  }, []);

  const play = useCallback(
    async (soundKey, volume = 0.5) => {
      if (muted) return;
      await ensureAudioReady();
      const url = SOUNDS[soundKey];
      if (url) {
        const buffer = await loadSound(url);
        if (playBuffer(buffer, volume)) return;
      }
      await playSynth(soundKey, volume);
    },
    [muted]
  );

  const unlock = useCallback(async () => {
    await ensureAudioReady();
  }, []);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    return next;
  }, [muted, setMuted]);

  return useMemo(
    () => ({ play, unlock, isMuted: muted, setMuted, toggleMute }),
    [muted, play, setMuted, toggleMute, unlock]
  );
}

export default useSound;
