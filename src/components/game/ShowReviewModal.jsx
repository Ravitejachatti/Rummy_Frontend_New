// 📁 src/components/game/ShowReviewModal.jsx
import React, { useState, useEffect } from "react";
import { getCardImage } from "../utils/cardimages";
import { classifyGroup } from "../utils/rummyRules";

const ShowReviewModal = ({ reviewData, votes, onVote, currentUserId }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [myVote, setMyVote] = useState(null);

  useEffect(() => {
    if (reviewData?.timeLeft) {
      setTimeLeft(Math.floor(reviewData.timeLeft / 1000));
    }
  }, [reviewData]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  if (!reviewData) return null;

  const { groups = [], ungrouped = [], playerId: declarerId } = reviewData;
  const isMe = String(declarerId) === String(currentUserId);
  const hasVoted = myVote !== null || votes?.[currentUserId] !== undefined;

  const handleVote = (vote) => {
    setMyVote(vote);
    onVote(vote);
  };

  const timerColor = timeLeft > 15 ? "var(--gold-bright)" : timeLeft > 5 ? "#f59e0b" : "#ef4444";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 backdrop-blur-md"
      style={{ background: "rgba(0,0,0,0.92)" }}
    >
      <div className="w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] rounded-xl animate-slide-in-up"
        style={{
          background: "linear-gradient(135deg, #111 0%, #0a1f12 100%)",
          border: "1px solid rgba(212,168,67,0.2)",
        }}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <h2 className="text-xl font-bold text-white">
              {isMe ? "You Declared!" : "Show Review"}
            </h2>
            <p className="text-xs text-white/40">
              {isMe ? "Waiting for opponents to verify…" : "Verify the declared hand below."}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold" style={{ color: timerColor }}>{timeLeft}s</div>
            <div className="text-[9px] text-white/30 uppercase tracking-widest">Time Left</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5" style={{ background: "rgba(0,0,0,0.3)" }}>
          <div className="space-y-5">
            {/* Declared Groups */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--pure-seq)" }}
              >
                Declared Groups
              </h3>
              <div className="flex flex-wrap gap-3">
                {groups.map((grp, idx) => {
                  const label = classifyGroup(grp);
                  const badgeCls =
                    label === "Pure Sequence" ? "group-badge-pure" :
                    label === "Impure Sequence" ? "group-badge-impure" :
                    label === "Triplet" ? "group-badge-set" :
                    "group-badge-invalid";

                  return (
                    <div key={idx} className="rounded-lg p-2"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div className="flex -space-x-3 hover:space-x-0.5 transition-all">
                        {grp.map((card, cIdx) => (
                          <div key={cIdx} className="w-11 h-16 rounded shadow-md overflow-hidden border border-white/10 bg-white transition-transform hover:scale-105 hover:z-10">
                            <img src={getCardImage(card)} className="w-full h-full object-cover" draggable={false} />
                          </div>
                        ))}
                      </div>
                      <div className="mt-1.5 text-center">
                        <span className={`group-badge ${badgeCls}`}>
                          {label === "Pure Sequence" ? "Pure" :
                           label === "Impure Sequence" ? "Impure" :
                           label === "Triplet" ? "Set" : "Invalid"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ungrouped */}
            {ungrouped.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--invalid-color)" }}
                >
                  Ungrouped / Invalid
                </h3>
                <div className="flex gap-2">
                  {ungrouped.map((card, cIdx) => (
                    <div key={cIdx} className="w-11 h-16 rounded shadow-md opacity-70 overflow-hidden"
                      style={{ border: "1px solid rgba(239,68,68,0.3)" }}
                    >
                      <img src={getCardImage(card)} className="w-full h-full object-cover grayscale-[30%]" draggable={false} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Vote tally */}
          <div className="flex gap-1.5">
            {Object.entries(votes || {}).map(([pid, val]) => (
              <div
                key={pid}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: val ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                  border: `1px solid ${val ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
                  color: val ? "var(--pure-seq)" : "var(--invalid-color)",
                }}
                title={pid}
              >
                {val ? "✓" : "✗"}
              </div>
            ))}
          </div>

          {/* Vote buttons */}
          {!isMe && !hasVoted ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleVote(false)}
                className="px-5 py-2 rounded-lg font-bold text-sm transition-all active:scale-95"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "rgba(239,68,68,0.8)",
                }}
              >
                Reject
              </button>
              <button
                onClick={() => handleVote(true)}
                className="btn-declare px-6 py-2 text-sm active:scale-95"
              >
                Confirm Valid
              </button>
            </div>
          ) : (
            <div className="text-white/30 text-sm font-medium italic animate-pulse">
              {hasVoted ? "Vote submitted. Waiting…" : "Waiting…"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShowReviewModal;
