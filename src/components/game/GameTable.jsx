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
  addToDiscardPile,
  setDiscardPile,
  setDrawPile,
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
} from "../../store/slices/gameSlice";
import PlayerHand from "./PlayerHand";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorMessage from "../common/ErrorMessage";
import { getCardImage } from "../utils/cardimages";

const GameTable = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tableId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const {
    currentGame,
    players,
    currentTurn,
    myCards,
    discardPile,
    drawPile,
    gameStatus,
    isMyTurn,
    loading,
    error,
  } = useSelector((state) => state.game);

  const [handGroups, setHandGroups] = useState({ groups: [], ungrouped: [] });
  const [showDeclareModal, setShowDeclareModal] = useState(false);

  const discardTop = useMemo(
    () => (discardPile?.length ? discardPile[discardPile.length - 1] : null),
    [discardPile]
  );
  const discardTopRef = useRef(null);
  useEffect(() => {
    discardTopRef.current = discardTop;
  }, [discardTop]);

  // 👇 Top 10 draw cards (already coming sliced from backend, but slice for safety)
  const visibleDrawPile = useMemo(
    () => (Array.isArray(drawPile) ? drawPile.slice(-10) : []),
    [drawPile]
  );

  const gameIdForNav = useCallback(
    () => currentGame?.gameId || `GM-${String(tableId)}`,
    [currentGame?.gameId, tableId]
  );

  // ---------------- SOCKET SETUP ----------------
  useEffect(() => {
    if (!tableId || !user) return;

    let socket = socketService.getSocket();
    if (!socket) {
      const token = localStorage.getItem("token");
      socket = socketService.connect(token);
    }

    dispatch(getGameState(tableId));

    const doJoin = () => joinTable(tableId);

    const onPlayerConnected = () =>
      dispatch(addNotification({ type: "info", message: "Player connected" }));

    const onPlayerDisconnected = () =>
      dispatch(addNotification({ type: "warning", message: "Player disconnected" }));

    const onState = (s) => {
      // Initial / sync state from server
      if (s?.players) dispatch(setPlayers(s.players));
      if (typeof s?.currentTurn !== "undefined") dispatch(setCurrentTurn(s.currentTurn));

      if (s?.discardTop) {
        dispatch(setDiscardPile([s.discardTop]));
      }

      if (Array.isArray(s.drawPileTop)) {
        console.log("[SOCKET] rummy/state drawPileTop:", s.drawPileTop);
        dispatch(setDrawPile(s.drawPileTop));
      }

      if (s?.status) dispatch(setGameStatus(s.status));
    };

    const onGameStarted = (data) => {
      dispatch(setGameState(data));
      dispatch(setGameStatus("playing"));
      dispatch(addNotification({ type: "success", message: "Game started! Good luck!" }));
    };

    const onYourHand = ({ hand }) => dispatch(setMyCards(hand || []));

    const onCardDrawn = (data) => {
      // When anyone draws, server sends updated drawPileTop
      if (Array.isArray(data.drawPileTop)) {
        console.log("[SOCKET] rummy/card_drawn drawPileTop:", data.drawPileTop);
        dispatch(setDrawPile(data.drawPileTop));
      }
    };

    const onCardDiscarded = (data) => {
      if (data.discardTop) {
        dispatch(setDiscardPile([data.discardTop]));
      } else if (data.card) {
        dispatch(addToDiscardPile(data.card));
      }
    };

    const onNextTurn = (data) => dispatch(setCurrentTurn(data.nextPlayerId));
    const onPlayerDropped = () =>
      dispatch(addNotification({ type: "warning", message: "Player dropped" }));

    const onTimedOut = ({ playerId }) =>
      dispatch(addNotification({ type: "warning", message: `Player timed out (${playerId})` }));

    const onWinDeclared = (data) => {
      dispatch(setGameStatus("ended"));
      dispatch(
        addNotification({
          type: data.winner?.toString() === user.id?.toString() ? "success" : "info",
          message:
            data.winner?.toString() === user.id?.toString()
              ? "Congratulations! You won!"
              : "Game ended",
        })
      );
      navigate(`/rummy/result/${gameIdForNav()}`, {
        state: {
          winner: data.winner,
          isYou: String(data.winner) === String(user.id),
          losers: data.losers || [],
          tableId,
        },
        replace: true,
      });
    };

    const onAutoWin = (data) => {
      dispatch(setGameStatus("ended"));
      dispatch(
        addNotification({
          type: data.winner?.toString() === user.id?.toString() ? "success" : "info",
          message:
            data.winner?.toString() === user.id?.toString()
              ? "Auto-win! 🎉"
              : "Game ended (auto-win)",
        })
      );
      navigate(`/rummy/result/${gameIdForNav()}`, {
        state: {
          winner: data.winner,
          isYou: String(data.winner) === String(user.id),
          losers: [],
          tableId,
        },
        replace: true,
      });
    };

    const onError = (message) => dispatch(addNotification({ type: "error", message }));

    const events = [
      ["connect", doJoin],
      ["rummy/player_connected", onPlayerConnected],
      ["rummy/player_disconnected", onPlayerDisconnected],
      ["rummy/state", onState],
      ["rummy/game_started", onGameStarted],
      ["rummy/your_hand", onYourHand],
      ["rummy/card_drawn", onCardDrawn],       // 👈 NEW
      ["rummy/card_discarded", onCardDiscarded],
      ["rummy/next_turn", onNextTurn],
      ["rummy/player_dropped", onPlayerDropped],
      ["rummy/player_timedout", onTimedOut],
      ["rummy/win_declared", onWinDeclared],
      ["rummy/auto_win", onAutoWin],
      ["rummy/error", onError],
    ];

    events.forEach(([evt, fn]) => socketService.off(evt, fn));
    if (socket.connected) doJoin();
    events.forEach(([evt, fn]) => socketService.on(evt, fn));

    return () => {
      events.forEach(([evt, fn]) => socketService.off(evt, fn));
    };
  }, [tableId, user, dispatch, navigate, gameIdForNav]);

  // ---------------- HANDLERS ----------------
  const handleDrawCard = (source) => {
    if (!isMyTurn || !currentGame) return;
    if (!source) return;
    drawCard(currentGame.gameId, user.id, source === "discardPile" ? "discard" : source);
  };

  const handleDiscardCard = (card) => {
    if (!isMyTurn || !currentGame) return;
    if (!card) return;
    discardCard(currentGame.gameId, user.id, card);
  };

  const handleDrop = () => currentGame && dropGame(currentGame.gameId);

  const handleDeclareWin = () => {
    if (!currentGame) return;
    const payload = {
      gameId: currentGame.gameId,
      playerId: user.id,
      groups: handGroups.groups,
      ungrouped: handGroups.ungrouped,
    };
    declareWinSocket(payload);
    setShowDeclareModal(false);
  };

  const handleGroupsChange = useCallback((data) => setHandGroups(data), []);

  // ---------------- RENDER ----------------
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" />
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorMessage message={error} onRetry={() => dispatch(getGameState(tableId))} />
      </div>
    );

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900 via-green-950 to-black text-white select-none overflow-hidden">
      <div className="h-screen w-full flex flex-col">
        {/* HEADER */}
        <div className="px-2 py-1 bg-neutral-950/70 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold">Rummy</h1>
            <div className="text-[10px] text-white/60">
              <span className="capitalize">{gameStatus}</span>
              {currentTurn && (
                <>
                  {" • "}
                  <span className={isMyTurn ? "text-green-400 font-medium" : ""}>
                    {String(currentTurn) === String(user.id) ? "Your Turn" : "Wait"}
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
              </>
            )}
          </div>
        </div>

        {/* MAIN AREA */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 relative bg-[url('https://images.unsplash.com/photo-1521207418485-99c705420785?q=80&w=1600&auto=format&fit=crop')] bg-center bg-cover">
            <div className="absolute inset-0 bg-emerald-900/75 backdrop-blur-[1px]" />

            <div className="relative z-10 h-full flex items-center justify-center">
              <div className="flex items-center gap-6">
                {/* DRAW PILE with TOP 10 visible */}
                <div className="text-center">
                  <div
                    onClick={() => handleDrawCard("drawPile")}
                    className={`relative w-24 h-20 rounded-lg border-2 border-emerald-700 bg-emerald-900/80 shadow-lg flex items-center justify-center overflow-hidden ${
                      isMyTurn
                        ? "cursor-pointer hover:scale-105 active:scale-110 transition-transform"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                    title={isMyTurn ? "Draw" : "Wait"}
                  >
                    {visibleDrawPile.length ? (
                      <div className="flex -space-x-5">
                        {visibleDrawPile.map((card, idx) => {
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
                    ) : (
                      <span className="text-[9px] text-emerald-100 font-medium">
                        No cards
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[9px] text-emerald-200/80 font-medium">Draw Pile</p>
                </div>

                {/* STATUS DOT */}
                <div className="text-center px-3">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300/70 mb-1">
                    {isMyTurn ? "Your Turn" : "Wait"}
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full mx-auto ${
                      isMyTurn ? "bg-green-400 animate-pulse" : "bg-gray-500"
                    }`}
                  />
                </div>

                {/* DISCARD PILE (only top card) */}
                <div className="text-center">
                  <div
                    onClick={() => handleDrawCard("discard")}
                    className={`w-11 h-16 rounded-lg border-2 border-gray-200 bg-white shadow-lg flex items-center justify-center ${
                      isMyTurn
                        ? "cursor-pointer hover:scale-105 active:scale-110 transition-transform"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                    title={isMyTurn ? "Pick discard" : "Wait"}
                  >
                    {discardTop ? (
                      (() => {
                        const imgSrc = getCardImage(discardTop);
                        return imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={`${discardTop.rank} of ${discardTop.suit}`}
                            className="w-full h-full object-contain rounded-md"
                            draggable={false}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-900">
                            <span className="text-base font-bold leading-none">
                              {discardTop.rank}
                            </span>
                            <span
                              className={`text-lg leading-none ${
                                discardTop.suit === "Hearts" || discardTop.suit === "Diamonds"
                                  ? "text-red-600"
                                  : "text-gray-900"
                              }`}
                            >
                              {suitGlyph(discardTop.suit)}
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-[9px] text-gray-400 font-medium">Empty</span>
                    )}
                  </div>
                  <p className="mt-1 text-[9px] text-emerald-200/80 font-medium">Discard</p>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.4)_100%)]" />
          </div>

          {/* PLAYER HAND */}
          <div className="h-[140px] bg-gradient-to-t from-black/40 to-transparent backdrop-blur-sm border-t border-white/10 flex-shrink-0">
            <PlayerHand
              cards={myCards}
              isMyTurn={isMyTurn}
              onReorder={(newOrder) => {
                dispatch(reorderMyCards(newOrder));
                reorderCards(currentGame?.gameId, user.id, newOrder);
              }}
              onDiscard={(card) => handleDiscardCard(card)}
              onGroupsChange={handleGroupsChange}
            />
          </div>
        </div>
      </div>

      {/* DECLARE MODAL */}
      {showDeclareModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-xl p-4 max-w-sm w-full">
            <h3 className="text-base font-bold mb-2 text-gray-900">Declare Win</h3>
            <p className="text-gray-600 mb-3 text-xs">
              Are you sure you want to declare? We will validate your sequences.
            </p>
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
    </div>
  );
};

function suitGlyph(suit) {
  const map = { Hearts: "♥", Diamonds: "♦", Clubs: "♣", Spades: "♠" };
  return map[suit] || "";
}

export default GameTable;