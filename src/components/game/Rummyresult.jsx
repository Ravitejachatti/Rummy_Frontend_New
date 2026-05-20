// 📁 src/components/game/Rummyresult.jsx
// ═══════════════════════════════════════════════════
// Indian Rummy – Enhanced Game Result Screen
// ═══════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import api from "../../config/api";
import { leaveTable } from "../../store/slices/gameSlice";

function normalizeResultPayload(payload = {}) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const winner = data.winner || data.winnerId || data.result?.winner || null;
  const losers = Array.isArray(data.losers)
    ? data.losers
    : Array.isArray(data.result?.losers)
      ? data.result.losers
      : Array.isArray(data.players)
        ? data.players.filter((p) => String(p.playerId) !== String(winner))
        : [];
  return {
    ...data,
    winner,
    losers,
    tableId: data.tableId || data.result?.tableId || null,
    settlementStatus: data.settlementStatus || data.settlement?.status || data.status || null,
  };
}

const RummyResult = () => {
  const { state } = useLocation();
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [countdown, setCountdown] = useState(7);
  const [showConfetti, setShowConfetti] = useState(false);
  const [fallbackResult, setFallbackResult] = useState(null);
  const [resultError, setResultError] = useState("");

  const result = state?.winner || state?.losers?.length ? state : fallbackResult;
  const winner = result?.winner;
  const userId = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}")._id || JSON.parse(localStorage.getItem("user") || "{}").id; } catch { return null; }
  })();
  const isYou = state?.isYou ?? (winner && userId ? String(winner) === String(userId) : false);
  const losers = result?.losers || [];
  const tableIdFromGame = result?.tableId || state?.tableId || (gameId?.startsWith("GM-") ? gameId.split("-")[1] : null);

  // Fallback fetch for direct refresh/open of result page.
  useEffect(() => {
    let alive = true;
    if (!gameId || state?.winner || state?.losers?.length) return undefined;

    const fetchResult = async () => {
      try {
        const res = await api.get(`/api/rummy/games/${gameId}/result`);
        if (alive) setFallbackResult(normalizeResultPayload(res.data));
      } catch (primaryErr) {
        try {
          const legacy = await api.get(`/api/rummy/game/result/${gameId}`);
          if (alive) setFallbackResult(normalizeResultPayload(legacy.data));
        } catch (err) {
          if (alive) setResultError(err?.response?.data?.error || err?.response?.data?.message || "Could not load game result");
        }
      }
    };

    fetchResult();
    return () => { alive = false; };
  }, [gameId, state?.winner, state?.losers?.length]);

  // Confetti for winner
  useEffect(() => {
    if (isYou) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isYou]);

  // Auto-navigate countdown
  useEffect(() => {
    if (!tableIdFromGame) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (state?.dropped) {
            leaveTable(tableIdFromGame);
            navigate("/dashboard");
          } else {
            navigate(`/game/${tableIdFromGame}`);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [tableIdFromGame, navigate, state?.dropped]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a1f12 0%, #000 50%, #0a1f12 100%)" }}
    >
      {/* Confetti particles */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 10}%`,
                background: ["#fbbf24", "#ef4444", "#10b981", "#38bdf8", "#f59e0b", "#a855f7"][i % 6],
                animation: `confetti-fall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s forwards`,
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-lg relative z-10">
        {/* Result card */}
        <div className="rounded-2xl p-6 shadow-2xl animate-slide-in-up"
          style={{
            background: "linear-gradient(135deg, rgba(30,30,30,0.9) 0%, rgba(10,31,18,0.9) 100%)",
            border: isYou ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(255,255,255,0.1)",
            boxShadow: isYou ? "0 0 40px rgba(251,191,36,0.15)" : "none",
          }}
        >
          {/* Winner banner */}
          {winner ? (
            <div className="text-center mb-6">
              <div className="text-4xl mb-2 animate-bounce-in" style={{ animationDelay: "0.2s" }}>
                {isYou ? "🏆" : "🎮"}
              </div>
              <h1 className="text-2xl font-bold mb-1">
                {isYou ? "You Won!" : "Game Over"}
              </h1>
              <p className="text-sm" style={{ color: isYou ? "var(--gold-bright)" : "rgba(255,255,255,0.5)" }}>
                {isYou ? "Congratulations! Great hand." : `Winner: ${String(winner).slice(0, 12)}…`}
              </p>
            </div>
          ) : (
            <div className="text-center mb-6">
              <div className="text-3xl mb-2">🎮</div>
              <h1 className="text-xl font-bold">Game Ended</h1>
              {resultError && <p className="text-xs text-red-300 mt-2">{resultError}</p>}
            </div>
          )}

          {/* Game ID */}
          <div className="text-center mb-4">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Game ID</span>
            <div className="font-mono text-xs text-white/50 mt-0.5 truncate">{gameId}</div>
          </div>

          {/* Losers / Other Players */}
          {losers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Scoreboard</h3>
              <div className="space-y-1.5">
                {/* Winner row */}
                <div className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🏆</span>
                    <span className="text-sm font-medium text-amber-400">
                      {isYou ? "You" : String(winner).slice(0, 12)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">0 pts</span>
                </div>

                {/* Loser rows */}
                {losers.map((l, idx) => (
                  <div
                    key={l.playerId || idx}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/30">#{idx + 2}</span>
                      <span className="text-sm font-medium text-white/70 truncate max-w-[140px]">
                        {String(l.playerId).slice(0, 12)}
                      </span>
                    </div>
                    {"points" in l && (
                      <span className="text-xs font-bold text-red-400">{l.points} pts</span>
                    )}
                  </div>
                ))}
               </div>
            </div>
          )}

          {/* Countdown + Actions */}
          <div className="mt-6">
            {/* Progress bar */}
            <div className="h-1 w-full rounded-full overflow-hidden mb-2"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${(countdown / 7) * 100}%`,
                  background: "var(--gold)",
                }}
              />
            </div>
            <p className="text-center text-[10px] mb-4" style={{ color: "var(--gold-dim)" }}>
              {state?.dropped ? "Returning to lobby" : "Next game"} in {countdown}s…
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (state?.dropped) {
                    leaveTable(tableIdFromGame);
                    navigate("/dashboard");
                  } else {
                    navigate(`/game/${tableIdFromGame || ""}`);
                  }
                }}
                className="btn-declare flex-1 py-3 text-sm"
              >
                {state?.dropped ? "Return to Lobby" : "Continue Now"}
              </button>
              <button
                onClick={() => {
                  leaveTable(tableIdFromGame);
                  navigate("/");
                }}
                className="px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "rgba(239,68,68,0.8)",
                }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RummyResult;