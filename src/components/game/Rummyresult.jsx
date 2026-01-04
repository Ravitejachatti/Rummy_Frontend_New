// client/src/pages/RummyResult.jsx
import React from "react";
import { useLocation, useParams, Link, useNavigate } from "react-router-dom";

const RummyResult = () => {
  const { state } = useLocation();
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [countdown, setCountdown] = React.useState(7);

  const winner = state?.winner;
  const isYou = !!state?.isYou;
  const losers = state?.losers || [];

  // Extract tableId safely. Assuming format GM-{tableId}-{uuid} or passed in state
  const tableIdFromGame = state?.tableId || (gameId?.startsWith("GM-") ? gameId.split("-")[1] : null);

  React.useEffect(() => {
    if (!tableIdFromGame) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          console.log("[DEBUG] RummyResult: timer ended. state:", state);
          const dest = state?.dropped ? "/dashboard" : `/game/${tableIdFromGame}`;
          console.log("[DEBUG] RummyResult: tableIdFromGame:", tableIdFromGame);
          console.log("[DEBUG] RummyResult: Navigating to:", dest);
          navigate(dest);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tableIdFromGame, navigate]);

  const handleLeave = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-950 to-black text-white p-6">
      <div className="w-full max-w-lg bg-black/40 border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-2xl font-semibold mb-2">Game Result</h1>
        <p className="text-white/80 text-sm mb-6">
          Game ID: <span className="font-mono">{gameId}</span>
        </p>

        {winner ? (
          <>
            <div className="mb-6">
              <div className="text-lg">
                Winner:&nbsp;
                <span className="font-bold">
                  {String(winner)}
                </span>
              </div>
              <div className="mt-2 text-emerald-300">
                {isYou ? "🎉 You won! Great job." : "Game over."}
              </div>
            </div>

            {losers.length > 0 && (
              <div className="mb-6">
                <div className="text-sm text-white/70 mb-2">Other players</div>
                <ul className="space-y-2">
                  {losers.map((l) => (
                    <li
                      key={l.playerId}
                      className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                    >
                      <span className="font-mono">{l.playerId}</span>
                      {"points" in l && (
                        <span className="text-white/70 text-xs">
                          {l.points} pts
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="mb-6 text-white/80">Game ended.</div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <div className="text-center text-sm text-emerald-400 font-medium animate-pulse mb-1">
            Starting next game in {countdown}s...
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(state?.dropped ? "/dashboard" : `/game/${tableIdFromGame || ""}`)}
              className="flex-1 py-3 rounded-xl bg-emerald-500 text-black font-bold shadow-lg hover:bg-emerald-400 active:scale-95 transition-all text-sm uppercase tracking-wide"
            >
              {state?.dropped ? "Return to Lobby" : "Continue Now"}
            </button>
            <button
              onClick={handleLeave}
              className="px-6 py-3 rounded-xl bg-red-900/40 border border-red-500/30 text-red-200 font-semibold hover:bg-red-900/60 active:scale-95 transition-all text-sm"
              title="Leave the table logic"
            >
              Leave & Quit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RummyResult;