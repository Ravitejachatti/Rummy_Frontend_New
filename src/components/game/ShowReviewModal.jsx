// 📁 client/src/components/game/ShowReviewModal.jsx
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getCardImage } from "../utils/cardimages";

const ShowReviewModal = ({ reviewData, votes, onVote, currentUserId }) => {
    const [timeLeft, setTimeLeft] = useState(30);
    const [myVote, setMyVote] = useState(null);

    useEffect(() => {
        if (reviewData?.timeLeft) {
            // Crude countdown sync
            setTimeLeft(Math.floor(reviewData.timeLeft / 1000));
        }
    }, [reviewData]);

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
            return () => clearInterval(timer);
        }
    }, [timeLeft]);

    // Auto vote if myVote is set from outside (reconnect)? 
    // For now just local state.

    if (!reviewData) return null;

    const { groups = [], ungrouped = [], playerId: declarerId } = reviewData;
    // const declarerName = "Player"; // Ideally fetch from players list

    const handleVote = (vote) => {
        setMyVote(vote);
        onVote(vote);
    };

    const isMe = String(declarerId) === String(currentUserId);
    const hasVoted = myVote !== null || votes?.[currentUserId] !== undefined;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-2">
            <div className="bg-neutral-900 border border-emerald-500/30 rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-neutral-800 p-4 flex items-center justify-between border-b border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {isMe ? "You Declared!" : "Show Review"}
                        </h2>
                        <p className="text-xs text-gray-400">
                            {isMe ? "Waiting for others to confirm..." : "Please verify the cards below."}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono font-bold text-yellow-400">{timeLeft}s</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">Time Left</div>
                    </div>
                </div>

                {/* Content: The Hand */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#0c1a14]">
                    <div className="space-y-6">
                        {/* Groups */}
                        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">Declared Groups</h3>
                        <div className="flex flex-wrap gap-4">
                            {groups.map((grp, idx) => (
                                <div key={idx} className="bg-black/40 p-2 rounded-lg border border-white/5">
                                    <div className="flex -space-x-4 hover:space-x-1 transition-all">
                                        {grp.map((card, cIdx) => (
                                            <div key={cIdx} className="w-12 h-16 rounded shadow-md relative group-hover:z-10 transition-transform">
                                                <img src={getCardImage(card)} className="w-full h-full object-cover rounded" draggable="false" />
                                            </div>
                                        ))}
                                    </div>
                                    {/* Label logic could go here (Pure/Seq) */}
                                </div>
                            ))}
                        </div>

                        {/* Ungrouped */}
                        {ungrouped.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">Ungrouped / Invalid</h3>
                                <div className="flex gap-2">
                                    {ungrouped.map((card, cIdx) => (
                                        <div key={cIdx} className="w-12 h-16 rounded shadow-md opacity-80 border border-red-500/50">
                                            <img src={getCardImage(card)} className="w-full h-full object-cover rounded grayscale" draggable="false" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer: Actions */}
                <div className="bg-neutral-900 p-4 border-t border-white/10 flex items-center justify-between">
                    <div className="flex gap-2">
                        {/* Vote Tally Bubbles */}
                        {Object.entries(votes || {}).map(([pid, val]) => (
                            <div key={pid} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${val ? 'bg-green-600' : 'bg-red-600'}`} title={pid}>
                                {val ? '✓' : '✗'}
                            </div>
                        ))}
                    </div>

                    {!isMe && !hasVoted ? (
                        <div className="flex gap-3">
                            <button onClick={() => handleVote(false)} className="px-6 py-2 rounded-lg font-bold bg-red-900/50 text-red-200 border border-red-500/50 hover:bg-red-900 transition-colors">
                                Reject (Invalid)
                            </button>
                            <button onClick={() => handleVote(true)} className="px-8 py-2 rounded-lg font-bold bg-emerald-600 text-white shadow-lg hover:bg-emerald-500 active:scale-95 transition-all">
                                Confirm (Valid)
                            </button>
                        </div>
                    ) : (
                        <div className="text-gray-400 font-medium italic animate-pulse">
                            {hasVoted ? "Vote Submitted. Waiting..." : "Waiting..."}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShowReviewModal;
