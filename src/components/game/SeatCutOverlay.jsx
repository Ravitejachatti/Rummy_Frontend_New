// 📁 src/components/game/SeatCutOverlay.jsx
import React, { useEffect, useState } from "react";
import { getCardImage } from "../utils/cardimages";

const SeatCutOverlay = ({ results, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (results) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [results, onClose]);

  if (!visible || !results) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "var(--overlay-bg)" }}
    >
      <div className="rounded-2xl p-6 max-w-2xl w-full shadow-2xl text-center animate-bounce-in"
        style={{
          background: "linear-gradient(135deg, #111 0%, #0a1f12 100%)",
          border: "1px solid rgba(212,168,67,0.2)",
        }}
      >
        <h2 className="text-2xl font-bold mb-1"
          style={{ color: "var(--gold-bright)" }}
        >
          Seat Cut
        </h2>
        <p className="text-white/40 mb-6 text-sm">Highest card picks the first seat.</p>

        <div className="flex flex-wrap justify-center gap-4">
          {results.map((p, idx) => {
            const isWinner = idx === 0;
            return (
              <div
                key={p.playerId}
                className="relative flex flex-col items-center p-3 rounded-xl transition-all duration-500"
                style={{
                  background: isWinner ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.03)",
                  border: isWinner ? "2px solid var(--gold)" : "1px solid rgba(255,255,255,0.08)",
                  transform: isWinner ? "scale(1.1)" : "scale(1)",
                  boxShadow: isWinner ? "0 0 24px rgba(251,191,36,0.2)" : "none",
                }}
              >
                <div className="w-14 h-20 mb-2 rounded-lg overflow-hidden shadow-lg bg-gray-800">
                  <img
                    src={getCardImage(p.card)}
                    alt={`${p.card.rank}${p.card.suit}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs font-semibold text-white max-w-[80px] truncate">
                  {p.username || "Player"}
                </div>
                {isWinner && (
                  <div className="absolute -top-2 -right-2 text-lg animate-bounce">👑</div>
                )}
                <div className="text-[9px] text-white/30 mt-0.5">Seat {idx + 1}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <div className="h-1 w-full max-w-xs mx-auto rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <div className="h-full rounded-full" style={{ background: "var(--gold)", animation: "progress 6s linear forwards" }} />
          </div>
          <p className="text-[10px] mt-2" style={{ color: "var(--gold-dim)" }}>Starting game…</p>
        </div>
      </div>
    </div>
  );
};

export default SeatCutOverlay;
