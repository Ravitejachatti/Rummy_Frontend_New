// client/src/pages/RummyResult.jsx
import React from "react";
import { useLocation, useParams, Link, useNavigate } from "react-router-dom";

const RummyResult = () => {
  const { state } = useLocation();
  const { gameId } = useParams();
  const navigate = useNavigate();

  const winner = state?.winner;
  const isYou = !!state?.isYou;
  const losers = state?.losers || [];
  const tableIdFromGame = gameId?.startsWith("GM-") ? gameId.slice(3) : state?.tableId;

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

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate(`/tables/${tableIdFromGame || ""}`)}
            className="flex-1 px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
          >
            Back to Table
          </button>
          <Link
            to="/"
            className="flex-1 text-center px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RummyResult;