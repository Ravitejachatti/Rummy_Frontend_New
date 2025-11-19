// components/game/PlayingCard.jsx
import React from "react";

const suitGlyph = (suit) => {
  switch (suit) {
    case "Hearts":   return "♥";
    case "Diamonds": return "♦";
    case "Clubs":    return "♣";
    case "Spades":   return "♠";
    default:         return "";
  }
};

const suitColorClass = (suit) => {
  return suit === "Hearts" || suit === "Diamonds" ? "text-red-600" : "text-black";
};

export default function PlayingCard({
  card,
  size = "lg",        // sm | md | lg (lg = hand size)
  selected = false,
  onClick = () => {},
  isMobile = false,
  isLandscape = false,
}) {
  if (!card) return null;

  const sizeClasses = {
    sm: "w-12 h-18 text-base suit-xl",   // for opponents or small areas
    md: "w-16 h-24 text-xl suit-4xl",
    lg: isMobile && isLandscape
      ? "w-20 h-28 text-2xl suit-6xl"    // mobile landscape hand
      : "w-24 h-36 text-3xl suit-8xl",  // normal hand size
  }[size];

  const [w, h, textSize, suitSize] = sizeClasses.split(" ");

  return (
    <div
      onClick={onClick}
      className={`
        relative ${w} ${h} bg-white rounded-xl shadow-2xl border-2 cursor-pointer
        transition-all duration-200 select-none touch-none
        ${selected 
          ? "ring-4 ring-amber-400 ring-offset-4 ring-offset-transparent scale-110 z-20 shadow-amber-400/80" 
          : "border-gray-300 hover:border-amber-400 hover:-translate-y-2 hover:shadow-2xl"
        }
        flex flex-col justify-between p-2 overflow-hidden
      `}
    >
      {/* Top left corner */}
      <div className={`flex flex-col items-start ${textSize} font-bold ${suitColorClass(card.suit)}`}>
        <span className="leading-none">{card.rank}</span>
        <span className={`${suitSize} leading-none -mt-1`}>{suitGlyph(card.suit)}</span>
      </div>

      {/* Center big suit (only on large cards) */}
      {size === "lg" && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${suitColorClass(card.suit)}`}>
          <span className="text-8xl md:text-9xl lg:text-[10rem] opacity-10">
            {suitGlyph(card.suit)}
          </span>
        </div>
      )}

      {/* Bottom right corner (mirrored) */}
      <div className={`flex flex-col items-end rotate-180 ${textSize} font-bold ${suitColorClass(card.suit)}`}>
        <span className="leading-none">{card.rank}</span>
        <span className={`${suitSize} leading-none -mt-1`}>{suitGlyph(card.suit)}</span>
      </div>

      {/* Subtle shine overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent rounded-xl pointer-events-none" />
      
      {/* Golden glow when selected */}
      {selected && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-400/20 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}