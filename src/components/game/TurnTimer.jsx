// 📁 src/components/game/TurnTimer.jsx
// Circular SVG countdown timer for turn management
import React, { useState, useEffect, useRef } from "react";

const TOTAL_SECONDS = 30;

export default function TurnTimer({
  isActive = false,
  duration = TOTAL_SECONDS,
  onTimeout,
}) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      setTimeLeft(duration);
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            onTimeout?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      setTimeLeft(duration);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, duration]);

  if (!isActive) return null;

  const percent = (timeLeft / duration) * 100;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent / 100);

  const color =
    percent > 50 ? "#fbbf24" :
    percent > 20 ? "#f59e0b" :
    "#ef4444";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative w-10 h-10">
        <svg className="w-full h-full" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="22" cy="22" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-mono font-bold text-xs"
            style={{
              color,
              animation: percent <= 20 ? "timer-pulse 0.5s ease-in-out infinite" : "none",
            }}
          >
            {timeLeft}
          </span>
        </div>
      </div>
    </div>
  );
}
