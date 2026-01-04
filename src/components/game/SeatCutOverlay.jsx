// 📁 client/src/components/game/SeatCutOverlay.jsx
import React, { useEffect, useState } from "react";
import { getCardImage } from "../utils/cardimages";

const SeatCutOverlay = ({ results, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (results) {
            setVisible(true);
            // Auto-close after 5s or let parent handle?
            // Usually "Game Started" follows soon, but good to have a timer.
            const timer = setTimeout(() => {
                setVisible(false);
                onClose?.();
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [results, onClose]);

    if (!visible || !results) return null;

    // Find winner (first one in results is usually winner due to server sort, but let's trust server order)
    const winner = results[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-emerald-500/30 rounded-2xl p-6 max-w-2xl w-full shadow-2xl text-center">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
                    Seat Cut Phase
                </h2>
                <p className="text-gray-400 mb-6 text-sm">
                    Highest card gets the first seat choice.
                </p>

                <div className="flex flex-wrap justify-center gap-4">
                    {results.map((p, idx) => {
                        const isWinner = idx === 0;
                        return (
                            <div
                                key={p.playerId}
                                className={`relative flex flex-col items-center p-3 rounded-xl transition-all duration-500 ${isWinner
                                        ? "bg-emerald-900/40 border-2 border-emerald-500 scale-110 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                        : "bg-white/5 border border-white/10 opacity-80"
                                    }`}
                            >
                                <div className="w-16 h-24 mb-3 rounded-lg overflow-hidden shadow-lg bg-gray-800">
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
                                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                        👑
                                    </div>
                                )}
                                <div className="text-[10px] text-gray-400 mt-1">
                                    Seat {idx + 1}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8">
                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden max-w-xs mx-auto">
                        <div className="h-full bg-emerald-500 animate-[progress_6s_linear_forwards]" />
                    </div>
                    <p className="text-[10px] text-emerald-500/70 mt-2">Starting game...</p>
                </div>
            </div>
        </div>
    );
};

export default SeatCutOverlay;
