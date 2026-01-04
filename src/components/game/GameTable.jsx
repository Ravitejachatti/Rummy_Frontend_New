// client/src/components/game/GameTable.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import socketService from "../../config/socket";
import {
  setGameState,
  setPlayers,
  setCurrentTurn,
  setMyCards,
  setDiscardTop,
  setDiscardHistory,
  setDrawPileCount,
  setGameStatus,
  addNotification,
  getGameState,
  joinTable,
  drawCard,
  discardCard,
  dropGame,
  declareWinSocket,
  reorderMyCards,
  reorderCards,
  removeNotification,
  setSeatCutResults,
  setReviewData,
  setVotes,
} from "../../store/slices/gameSlice";

import PlayerHand from "./PlayerHand";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorMessage from "../common/ErrorMessage";
import { getCardImage } from "../utils/cardimages";
import cardBack from "../../assets/cards/back_card.jpeg";
import SeatCutOverlay from "./SeatCutOverlay";
import ShowReviewModal from "./ShowReviewModal";
import NotificationCenter from "../common/Notificaton";

const GameTable = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tableId } = useParams();
  const { user } = useSelector((state) => state.auth);

  // ✅ unified id
  const meId = user?._id || user?.id || user?.userId;

  const {
    currentGame,
    players,
    currentTurn,
    myCards,
    discardTop,
    discardHistory,
    drawPileCount,
    gameStatus,
    loading,
    error,
    notifications,
    seatCutResults,
    reviewData,
    votes
  } = useSelector((state) => state.game);

  const isMyTurn = React.useMemo(() => {
    if (!meId || !currentTurn) return false;
    return String(currentTurn) === String(meId);
  }, [meId, currentTurn]);

  const [handGroups, setHandGroups] = useState({ groups: [], ungrouped: [] });
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const didUserDrop = useRef(false);
  const [showDiscardHistory, setShowDiscardHistory] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [rotateHint, setRotateHint] = useState("");
  const [cardImagesLoaded, setCardImagesLoaded] = useState(false);

  const handleCardImageLoad = useCallback(() => {
    setCardImagesLoaded(true);
  }, []);

  const requestLandscape = async () => {
    try {
      setRotateHint("");
      // Request Fullscreen first (required by some browsers to lock orientation)
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => { });
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen().catch(() => { }); // iOS/Safari
      }

      if (window?.screen?.orientation?.lock) {
        await window.screen.orientation.lock("landscape");
        return;
      }
      setRotateHint("Your browser doesn't support auto-rotate. Please rotate your device manually.");
    } catch (e) {
      setRotateHint("Auto-rotate is blocked. Please rotate your device manually.");
    }
  };

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === "undefined") return;
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
      window.screen.orientation.lock("landscape").catch(() => { });
    }
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  const discardHistoryTop10 = useMemo(
    () => (Array.isArray(discardHistory) ? discardHistory.slice(-10) : []),
    [discardHistory]
  );

  const topDiscard = useMemo(() => {
    if (discardTop) return discardTop;
    return discardHistoryTop10.length ? discardHistoryTop10[discardHistoryTop10.length - 1] : null;
  }, [discardTop, discardHistoryTop10]);

  const cardsToShow = useMemo(() => {
    if (showDiscardHistory) return discardHistoryTop10;
    return topDiscard ? [topDiscard] : [];
  }, [discardHistoryTop10, showDiscardHistory, topDiscard]);

  // ✅ NO invalid fallback; backend uses GM-table-uuid now
  const gameIdForNav = useCallback(() => currentGame?.gameId || null, [currentGame?.gameId]);

  // Socket Effects
  useEffect(() => {
    if (!tableId || !user) return;

    // ... existing socket setup ...
    let socket = socketService.getSocket();
    if (!socket) {
      const token = localStorage.getItem("accessToken");
      socket = socketService.connect(token);
    }
    dispatch(getGameState(tableId));
    const doJoin = () => joinTable(tableId);

    // Existing event handlers...
    const onPlayerConnected = () => dispatch(addNotification({ type: "info", message: "Player connected" }));
    const onPlayerDisconnected = () => dispatch(addNotification({ type: "warning", message: "Player disconnected" }));
    const onState = (s) => {
      if (s?.players) dispatch(setPlayers(s.players));
      if (typeof s?.currentTurn !== "undefined") dispatch(setCurrentTurn(s.currentTurn));
      if ("discardTop" in (s || {})) dispatch(setDiscardTop(s.discardTop ?? null));
      if (Array.isArray(s?.discardHistory)) dispatch(setDiscardHistory(s.discardHistory));
      if (Number.isFinite(s?.drawPileCount)) dispatch(setDrawPileCount(s.drawPileCount));
      if (s?.status) dispatch(setGameStatus(s.status));

      // Sync review data if reconnecting
      if (s?.phase === "SHOW_CONFIRM" && s.declaration) {
        dispatch(setReviewData(s.declaration));
        dispatch(setVotes(s.declaration.votes));
      }
    };
    const onGameStarted = (data) => {
      dispatch(setGameState(data));
      dispatch(setGameStatus("playing"));
      dispatch(addNotification({ type: "success", message: "Game started!" }));
      // Clear cut results after game starts
      dispatch(setSeatCutResults(null));
    };
    // ... (other handlers like onYourHand, onCardDrawn...)
    const onYourHand = ({ hand }) => dispatch(setMyCards(hand || []));
    const onCardDrawn = (data) => {
      if (Array.isArray(data?.discardHistory)) dispatch(setDiscardHistory(data.discardHistory));
      if (Number.isFinite(data?.drawPileCount)) dispatch(setDrawPileCount(data.drawPileCount));
    };
    const onCardDiscarded = (data) => {
      if ("discardTop" in (data || {})) dispatch(setDiscardTop(data.discardTop ?? null));
      else if (data?.card) dispatch(setDiscardTop(data.card));

      if (Array.isArray(data?.discardHistory)) dispatch(setDiscardHistory(data.discardHistory));
      if (Number.isFinite(data?.drawPileCount)) dispatch(setDrawPileCount(data.drawPileCount));
    };
    const onNextTurn = (data) => dispatch(setCurrentTurn(data.nextPlayerId));
    const onPlayerDropped = () => dispatch(addNotification({ type: "warning", message: "Player dropped" }));
    const onTimedOut = ({ playerId }) => dispatch(addNotification({ type: "warning", message: `Player timed out (${playerId})` }));

    // NEW HANDLERS
    const onSeatCutResult = (data) => {
      dispatch(setSeatCutResults(data.results));
    };
    const onShowReview = (data) => {
      dispatch(setReviewData(data));
      // Reset local vote state if managed
    };
    const onShowVoteUpdate = (data) => {
      dispatch(setVotes(data.votes));
    };

    // ... (win handlers)
    const onWinDeclared = (data) => {
      dispatch(setGameStatus("ended"));
      dispatch(setReviewData(null)); // Clear review
      // ... nav logic
      const gid = gameIdForNav() || data.gameId || currentGame?.gameId; // Fallback
      navigate(`/rummy/result/${gid}`, { state: { winner: data.winner, isYou: String(data.winner) === String(meId), losers: data.losers || [], tableId }, replace: true });
    };
    const onAutoWin = (data) => {
      console.log("[DEBUG] onAutoWin received:", data);
      dispatch(setGameStatus("ended"));
      dispatch(setReviewData(null));

      const fallback = gameIdForNav();
      console.log("[DEBUG] local fallback:", fallback);
      console.log("[DEBUG] currentGame in scope:", currentGame);

      const gid = fallback || data.gameId || currentGame?.gameId;
      console.log("[DEBUG] Navigating to result:", gid);

      if (!gid) {
        console.error("[DEBUG] CRITICAL: No Game ID found for navigation!");
        dispatch(addNotification({ type: "error", message: "Error: Could not find Game ID to show results." }));
        return;
      }

      const wasDrop = didUserDrop.current;
      navigate(`/rummy/result/${gid}`, { state: { winner: data.winner, isYou: String(data.winner) === String(meId), losers: [], tableId, dropped: wasDrop }, replace: true });
    };
    const onInvalidDeclaration = (data) => {
      dispatch(addNotification({ type: "error", message: data?.message || "Invalid declaration" }));
      setShowDeclareModal(false);
      // If we were reviewing, maybe clear? Usually invalid means it bounces back to playing.
    };
    const onError = (msg) => dispatch(addNotification({ type: "error", message: String(msg) }));

    const events = [
      ["connect", doJoin],
      ["rummy/player_connected", onPlayerConnected],
      ["rummy/player_disconnected", onPlayerDisconnected],
      ["rummy/state", onState],
      ["rummy/game_started", onGameStarted],
      ["rummy/your_hand", onYourHand],
      ["rummy/card_drawn", onCardDrawn],
      ["rummy/card_discarded", onCardDiscarded],
      ["rummy/next_turn", onNextTurn],
      ["rummy/player_dropped", onPlayerDropped],
      ["rummy/player_timeout", onTimedOut],
      ["rummy/win_declared", onWinDeclared],
      ["rummy/auto_win", onAutoWin],
      ["rummy/invalid_declaration", onInvalidDeclaration],
      ["rummy/error", onError],
      // New
      ["rummy/seat_cut_result", onSeatCutResult],
      ["rummy/show_review", onShowReview],
      ["rummy/show_vote_update", onShowVoteUpdate],
    ];

    events.forEach(([evt, fn]) => socketService.off(evt, fn));
    if (socket.connected) doJoin();
    events.forEach(([evt, fn]) => socketService.on(evt, fn));

    return () => { events.forEach(([evt, fn]) => socketService.off(evt, fn)); };
  }, [tableId, user, dispatch, navigate, gameIdForNav, meId]);

  const handleDrawCard = (source) => {
    if (!isMyTurn || !currentGame) return;
    if (!source) return;

    const normalized = source === "discard" ? "discard" : "draw";
    drawCard(currentGame.gameId, meId, normalized);
  };

  const handleDiscardCard = (card) => {
    if (!isMyTurn || !currentGame) return;
    if (!card) return;
    discardCard(currentGame.gameId, meId, card);
  };

  const handleDrop = () => {
    if (currentGame) {
      didUserDrop.current = true;
      dropGame(currentGame.gameId);
    }
  };

  const handleDeclareWin = () => {
    const gameId = currentGame?.gameId;
    console.log("[DEBUG] Declare - currentGame:", currentGame);
    console.log("[DEBUG] Declare - Sending gameId:", gameId);

    if (!gameId || !meId) {
      dispatch(addNotification({ type: "error", message: "Unable to declare right now. Game not ready." }));
      return;
    }

    // ✅ fixed payload (NO wrapper)
    declareWinSocket({
      gameId,
      playerId: meId,
      groups: handGroups.groups,
      ungrouped: handGroups.ungrouped,
    });

    setShowDeclareModal(false);
  };

  const handleGroupsChange = useCallback((data) => setHandGroups(data), []);

  const handleVoteSocket = (vote) => {
    const gid = currentGame?.gameId;
    if (!gid) return;
    socketService.emit("rummy/vote_show", { gameId: gid, vote });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorMessage message={error} onRetry={() => dispatch(getGameState(tableId))} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900 via-green-950 to-black text-white select-none overflow-hidden relative">
      {isPortrait && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-center px-6">
          <div className="text-white text-lg font-semibold mb-2">Please rotate your device</div>

          <div className="text-gray-300 text-xs max-w-xs mb-4">
            This Rummy table is best experienced in landscape mode.
          </div>

          <button
            onClick={requestLandscape}
            className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold text-sm active:scale-95"
          >
            Rotate to Landscape
          </button>

          {rotateHint ? (
            <div className="mt-3 text-[11px] text-white/70 max-w-xs">{rotateHint}</div>
          ) : null}
        </div>
      )}

      <div className="h-screen w-full flex flex-col">
        <div className="px-2 py-1 bg-neutral-950/70 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold">Rummy</h1>
            <div className="text-[10px] text-white/60">
              <span className="capitalize">{gameStatus}</span>
              {currentTurn && (
                <>
                  {" • "}
                  <span className={isMyTurn ? "text-green-400 font-medium" : ""}>
                    {String(currentTurn) === String(meId) ? "Your Turn" : "Wait"}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {gameStatus === "playing" && (
              <>
                <button
                  onClick={handleDrop}
                  className="px-2 py-0.5 rounded bg-red-500 hover:bg-red-400 active:scale-95 text-white text-[10px] font-medium"
                >
                  Drop
                </button>
                <button
                  onClick={() => setShowDeclareModal(true)}
                  disabled={!isMyTurn}
                  className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 text-black text-[10px] font-semibold"
                >
                  Declare
                </button>
                {/* DEV CHEAT */}

              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 relative bg-[url('https://images.unsplash.com/photo-1521207418485-99c705420785?q=80&w=1600&auto=format&fit=crop')] bg-center bg-cover">
            <div className="absolute inset-0 bg-emerald-900/75 backdrop-blur-[1px]" />

            <div className="relative z-10 h-full flex items-center justify-center">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div
                    onClick={() => handleDrawCard("drawPile")}
                    className={`w-11 h-16 rounded-lg border-2 border-gray-200 bg-emerald-950 shadow-lg flex items-center justify-center ${isMyTurn
                      ? "cursor-pointer hover:scale-105 active:scale-110 transition-transform"
                      : "opacity-50 cursor-not-allowed"
                      }`}
                    title={isMyTurn ? "Draw from deck" : "Wait"}
                  >
                    <div className="w-[90%] h-[90%] rounded-md overflow-hidden shadow-md border border-emerald-700 bg-emerald-900">
                      <img src={cardBack} alt="Draw pile" className="w-full h-full object-cover" draggable={false} />
                    </div>
                  </div>
                  <p className="mt-1 text-[9px] text-emerald-200/80 font-medium">
                    Draw Pile{Number.isFinite(drawPileCount) ? ` (${drawPileCount})` : ""}
                  </p>
                </div>

                <div className="text-center px-3">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300/70 mb-1">
                    {isMyTurn ? "Your Turn" : "Wait"}
                  </div>
                  <div className={`w-2 h-2 rounded-full mx-auto ${isMyTurn ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
                </div>

                <div className="text-center">
                  <div
                    onClick={() => handleDrawCard("discard")}
                    className={`relative w-24 h-20 rounded-lg border-2 border-emerald-700 bg-emerald-900/80 shadow-lg flex items-center justify-center overflow-hidden ${isMyTurn
                      ? "cursor-pointer hover:scale-105 active:scale-110 transition-transform"
                      : "opacity-50 cursor-not-allowed"
                      }`}
                    title={isMyTurn ? "Pick from discard" : "Wait"}
                  >
                    {cardsToShow.length ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <div className={`flex ${showDiscardHistory ? "-space-x-5" : "justify-center"}`}>
                          {cardsToShow.map((card, idx) => {
                            const imgSrc = getCardImage(card);
                            const key = `${card.rank}-${card.suit}-${idx}`;
                            return (
                              <div
                                key={key}
                                className="w-8 h-12 rounded-md border border-emerald-700 bg-emerald-800 shadow-md overflow-hidden"
                              >
                                {imgSrc ? (
                                  <img
                                    src={imgSrc}
                                    alt={`${card.rank} of ${card.suit}`}
                                    className="w-full h-full object-cover"
                                    draggable={false}
                                    onLoad={handleCardImageLoad}
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-xs text-emerald-100">
                                    <span className="font-bold">{card.rank}</span>
                                    <span>{suitGlyph(card.suit)}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {!cardImagesLoaded && (
                          <div className="absolute inset-0 bg-emerald-900/80 flex items-center justify-center">
                            <span className="text-[9px] text-emerald-100 font-medium">Loading cards...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] text-emerald-100 font-medium">No cards</span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-center gap-1">
                    <p className="text-[9px] text-emerald-200/80 font-medium">
                      Discard Pile{showDiscardHistory ? " (Top 10)" : ""}
                    </p>
                    {discardHistoryTop10.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDiscardHistory((v) => !v);
                        }}
                        className="w-5 h-5 rounded-full border border-emerald-400 bg-emerald-900/70 flex items-center justify-center text-[9px] hover:bg-emerald-800"
                        title={showDiscardHistory ? "Hide discard history" : "Show last 10 discards"}
                      >
                        {showDiscardHistory ? "🙈" : "👁️"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.4)_100%)]" />
          </div>

          <div className="h-[140px] bg-gradient-to-t from-black/40 to-transparent backdrop-blur-sm border-t border-white/10 flex-shrink-0">
            <PlayerHand
              cards={myCards}
              isMyTurn={isMyTurn}
              onReorder={(newOrder) => {
                dispatch(reorderMyCards(newOrder));
                reorderCards(currentGame?.gameId, meId, newOrder);
              }}
              onDiscard={(card) => handleDiscardCard(card)}
              onGroupsChange={handleGroupsChange}
            />
          </div>
        </div>
      </div>

      {gameStatus === "waiting" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-emerald-500/30 p-8 rounded-2xl flex flex-col items-center shadow-2xl">
            <div className="w-16 h-16 mb-4 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            <h2 className="text-xl font-bold text-white mb-2">Waiting for Players...</h2>
            <p className="text-emerald-200/70 text-sm">The game will start automatically when an opponent joins.</p>
            <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-white/90 font-medium">1 Player Seated</span>
            </div>
          </div>
        </div>
      )}

      {showDeclareModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-xl p-4 max-w-sm w-full">
            <h3 className="text-base font-bold mb-2 text-gray-900">Declare Win</h3>
            <p className="text-gray-600 mb-3 text-xs">Are you sure you want to declare? We will validate your sequences.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDeclareWin}
                className="flex-1 px-3 py-2 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 active:scale-95 text-sm"
              >
                Declare
              </button>
              <button
                onClick={() => setShowDeclareModal(false)}
                className="flex-1 px-3 py-2 rounded-lg bg-neutral-200 text-neutral-900 hover:bg-neutral-300 active:scale-95 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Points Rummy Overlays */}
      <SeatCutOverlay
        results={seatCutResults}
        onClose={() => dispatch(setSeatCutResults(null))}
      />

      <ShowReviewModal
        reviewData={reviewData}
        votes={votes}
        currentUserId={meId}
        onVote={handleVoteSocket}
      />

      <NotificationCenter
        notifications={notifications}
        onClose={(id) => dispatch(removeNotification(id))}
        position="top-right"
      />
    </div>
  );
};

function suitGlyph(suit) {
  const map = { Hearts: "♥", Diamonds: "♦", Clubs: "♣", Spades: "♠" };
  return map[suit] || "";
}

export default GameTable;