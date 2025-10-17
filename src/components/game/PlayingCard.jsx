// client/src/components/game/PlayingCard.jsx
import React from "react";

const glyph = (s) =>
  s === "Hearts" ? "♥" : s === "Diamonds" ? "♦" : s === "Clubs" ? "♣" : "♠";

const suitColor = (s) =>
  s === "Hearts" || s === "Diamonds" ? "text-red-600" : "text-gray-900";

const SIZE_MAP = {
  sm: { w: "w-14", h: "h-20", font: "text-lg" },   // grouped
  md: { w: "w-16", h: "h-24", font: "text-xl" },   // for hand
  lg: { w: "w-20", h: "h-28", font: "text-2xl" },  // if you want even larger later
};

export default function PlayingCard({
  card,
  size = "md",
  selected = false,
  disabled = false,
}) {
  if (!card) return null;
  const color = suitColor(card.suit);
  const sz = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className={`relative bg-white rounded-xl shadow-md border transition-all duration-150 select-none
      ${sz.w} ${sz.h} ${color}
      ${selected ? "ring-2 ring-amber-400 border-amber-400 scale-105" : "border-gray-200"}
      ${disabled ? "opacity-70" : "hover:-translate-y-1"}
      flex items-start justify-start`}
    >
      <div className="p-1">
        <div className={`flex flex-col items-start justify-start leading-tight ${sz.font} font-bold`}>
          <span>{card.rank}</span>
          <span className="-mt-1">{glyph(card.suit)}</span>
        </div>
      </div>
    </div>
  );
}