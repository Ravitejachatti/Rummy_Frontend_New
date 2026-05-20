// 📁 src/components/game/PlayerAvatar.jsx
import React, { useMemo } from "react";

const AVATAR_COLORS = [
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-600",
  "from-lime-500 to-green-600",
];

export default function PlayerAvatar({
  player,
  isCurrentTurn = false,
  isMe = false,
  cardCount = 0,
  timerPercent = 100, // 0-100
  position = "top", // top, top-left, top-right, left, right, bottom-left, bottom-right
}) {
  if (!player) return null;

  const initial = (player.username || "P")[0].toUpperCase();
  const colorIdx = Math.abs(hashCode(player.playerId || "")) % AVATAR_COLORS.length;
  const gradientClass = AVATAR_COLORS[colorIdx];

  // SVG timer ring
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - timerPercent / 100);

  const timerColor =
    timerPercent > 50 ? "var(--gold-bright)" :
    timerPercent > 20 ? "#f59e0b" :
    "#ef4444";

  const timerClass =
    timerPercent > 50 ? "" :
    timerPercent > 20 ? "warning" :
    "critical";

  // Position classes for absolute positioning around the oval table
  const positionStyles = useMemo(() => {
    const base = { position: "absolute", zIndex: 20 };
    switch (position) {
      case "top":
        return { ...base, top: "-8px", left: "50%", transform: "translateX(-50%)" };
      case "top-left":
        return { ...base, top: "8%", left: "10%" };
      case "top-right":
        return { ...base, top: "8%", right: "10%" };
      case "left":
        return { ...base, top: "50%", left: "-12px", transform: "translateY(-50%)" };
      case "right":
        return { ...base, top: "50%", right: "-12px", transform: "translateY(-50%)" };
      case "bottom-left":
        return { ...base, bottom: "8%", left: "12%" };
      case "bottom-right":
        return { ...base, bottom: "8%", right: "12%" };
      default:
        return base;
    }
  }, [position]);

  return (
    <div className="player-avatar" style={positionStyles}>
      {/* Avatar Circle + Timer Ring */}
      <div className="relative">
        <div
          className={`player-avatar-ring ${isCurrentTurn ? "active-turn" : ""}`}
        >
          {/* Gradient background with initial */}
          <div
            className={`w-full h-full rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-bold text-sm`}
          >
            {initial}
          </div>

          {/* Timer ring (SVG overlay) */}
          {isCurrentTurn && (
            <svg className="turn-timer-svg" viewBox="0 0 52 52">
              <circle
                className="turn-timer-track"
                cx="26" cy="26" r={radius}
              />
              <circle
                className={`turn-timer-progress ${timerClass}`}
                cx="26" cy="26" r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ stroke: timerColor }}
              />
            </svg>
          )}

          {/* Connection indicator */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${
              player.connected !== false ? "bg-green-500" : "bg-gray-500"
            }`}
          />
        </div>

        {/* Card count badge */}
        {cardCount > 0 && (
          <div className="absolute -top-1 -right-2 bg-gray-800 border border-gray-600 text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
            {cardCount}
          </div>
        )}
      </div>

      {/* Username */}
      <div className="mt-1 max-w-[64px] truncate text-center">
        <span className={`text-[10px] font-medium ${isMe ? "text-gold-bright text-amber-400" : "text-white/80"}`}>
          {isMe ? "You" : player.username || "Player"}
        </span>
      </div>

      {/* Opponent mini card fan */}
      {!isMe && cardCount > 0 && (
        <div className="opponent-card-fan mt-0.5 justify-center">
          {Array.from({ length: Math.min(cardCount, 5) }).map((_, i) => (
            <div key={i} className="opponent-card-back" />
          ))}
          {cardCount > 5 && (
            <span className="text-[8px] text-white/50 ml-1">+{cardCount - 5}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Simple hash for consistent avatar colors
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}
