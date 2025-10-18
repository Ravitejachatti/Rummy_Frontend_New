// client/src/components/game/GameTable.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import socketService from "../../config/socket";
import {
  setGameState,
  setPlayers,
  setCurrentTurn,
  setMyCards,
  addToDiscardPile,
  setGameStatus,
  addNotification,
  getGameState,
  joinTable,
  drawCard,
  discardCard,
  dropGame,
  declareWinSocket,
  reorderCards,
  reorderMyCards,
} from "../../store/slices/gameSlice";
import PlayerHand from "./PlayerHand";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorMessage from "../common/ErrorMessage";

const GameTable = () => {
  const dispatch = useDispatch();
  const { tableId } = useParams();
  const { user } = useSelector((state) => state.auth);
  const {
    currentGame,
    players,
    currentTurn,
    myCards,
    discardPile,
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

  // ---------------- SOCKET SETUP ----------------
  useEffect(() => {
    if (!tableId || !user) return;
    dispatch(getGameState(tableId));

    const socket = socketService.getSocket();
    if (!socket) return;
    socket.removeAllListeners();

    socket.on("connect", () => joinTable(tableId));
    socket.on("rummy/player_connected", () =>
      dispatch(addNotification({ type: "info", message: "Player connected" }))
    );
    socket.on("rummy/player_disconnected", () =>
      dispatch(addNotification({ type: "warning", message: "Player disconnected" }))
    );
    socket.on("rummy/state", (s) => {
      if (s?.players) dispatch(setPlayers(s.players));
      if (typeof s?.currentTurn !== "undefined") dispatch(setCurrentTurn(s.currentTurn));
      if (s?.discardTop) dispatch(addToDiscardPile(s.discardTop));
      if (s?.status) dispatch(setGameStatus(s.status));
    });
    socket.on("rummy/game_started", (data) => {
      dispatch(setGameState(data));
      dispatch(setGameStatus("playing"));
      dispatch(addNotification({ type: "success", message: "Game started! Good luck!" }));
    });
    socket.on("rummy/your_hand", ({ hand }) => dispatch(setMyCards(hand || [])));
    socket.on("rummy/card_discarded", (data) => dispatch(addToDiscardPile(data.card)));
    socket.on("rummy/next_turn", (data) => dispatch(setCurrentTurn(data.nextPlayerId)));
    socket.on("rummy/player_dropped", () =>
      dispatch(addNotification({ type: "warning", message: "Player dropped" }))
    );
    socket.on("rummy/win_declared", (data) => {
      dispatch(setGameStatus("ended"));
      dispatch(
        addNotification({
          type: data.winner.toString() === user.id ? "success" : "info",
          message:
            data.winner.toString() === user.id
              ? "Congratulations! You won!"
              : "Game ended",
        })
      );
    });
    socket.on("rummy/error", (message) =>
      dispatch(addNotification({ type: "error", message }))
    );

    if (!socket.connected) {
      const token = localStorage.getItem("token");
      socketService.connect(token);
    }

    return () => socket.removeAllListeners();
  }, [tableId, user, dispatch]);

  // ---------------- HANDLERS ----------------
  const handleDrawCard = (source) => {
    if (!isMyTurn || !currentGame) return;
    drawCard(currentGame.gameId, user.id, source === "discardPile" ? "discard" : source);
  };

  const handleDiscardCard = (card) => {
    if (!isMyTurn || !currentGame) return;
    if (!card) return;
    discardCard(currentGame.gameId, user.id, card);
  };

  const handleDrop = () => currentGame && dropGame(currentGame.gameId, user.id);
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
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900 via-green-950 to-black text-white select-none">
      <div className="mx-auto flex items-center justify-center p-2 sm:p-4 md:p-6 h-screen">
        <div className="relative w-full aspect-[9/16] sm:aspect-[10/16] md:aspect-[16/9] md:max-w-[900px] rounded-3xl shadow-[0_0_60px_-10px_rgba(0,0,0,0.6)] overflow-hidden border border-white/10">

          {/* ---------- HEADER ---------- */}
          <div className="px-3 py-2 bg-neutral-950/60 border-b border-white/10 flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold">Rummy Table</h1>
              <p className="text-xs sm:text-sm text-white/70">
                Status: <span className="capitalize">{gameStatus}</span>
                {currentTurn && (
                  <>
                    {" "}
                    • Turn:{" "}
                    <span className="font-medium">
                      {String(currentTurn) === String(user.id) ? "You" : "Opponent"}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {gameStatus === "playing" && (
                <>
                  <button
                    onClick={handleDrop}
                    className="px-3 py-1.5 rounded bg-red-500 hover:bg-red-400 text-white text-sm"
                  >
                    Drop
                  </button>
                  <button
                    onClick={() => setShowDeclareModal(true)}
                    disabled={!isMyTurn}
                    className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-sm"
                  >
                    Declare
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ---------- TABLE AREA ---------- */}
          <div className="relative h-[65%] sm:h-[64%] md:h-[68%] bg-[url('https://images.unsplash.com/photo-1521207418485-99c705420785?q=80&w=1600&auto=format&fit=crop')] bg-center bg-cover select-none">
            <div className="absolute inset-0 bg-emerald-900/70 backdrop-blur-[1px]" />
            <div className="relative z-10 h-full flex flex-col items-center justify-center gap-6">
              <div className="text-sm uppercase tracking-[0.2em] text-emerald-200/80">
                Play Area
              </div>

              {/* DRAW / DISCARD PILES */}
              <div className="flex items-end gap-10">
                {/* Draw Pile */}
                <div className="text-center">
                  <div
                    onClick={() => handleDrawCard("drawPile")}
                    className={`w-14 h-20 md:w-16 md:h-24 rounded-xl border border-emerald-700 bg-emerald-800 shadow-xl ${
                      isMyTurn
                        ? "cursor-pointer hover:scale-105 transition-transform"
                        : "opacity-60 cursor-not-allowed"
                    }`}
                    title={isMyTurn ? "Draw from closed pile" : "Wait for your turn"}
                  />
                  <p className="mt-2 text-xs text-emerald-200/80">Closed Pile</p>
                </div>

                {/* Discard Pile */}
                <div className="text-center">
                  <div
                    onClick={() => handleDrawCard("discard")}
                    className={`w-14 h-20 md:w-16 md:h-24 rounded-xl border border-gray-200 bg-white shadow-xl flex items-center justify-center ${
                      isMyTurn
                        ? "cursor-pointer hover:scale-105 transition-transform"
                        : "opacity-60 cursor-not-allowed"
                    }`}
                    title={isMyTurn ? "Pick from discard" : "Wait for your turn"}
                  >
                    {discardTop ? (
                      <div className="w-full h-full flex items-center justify-center text-gray-900 text-xl">
                        {discardTop.rank}
                        {suitGlyph(discardTop.suit)}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">EMPTY</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-emerald-200/80">Discard</p>
                </div>
              </div>

              <div className="text-xs text-emerald-200/80">
                {isMyTurn ? "Your turn — draw then discard" : "Waiting for opponent…"}
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
          </div>

          {/* ---------- PLAYER HAND ---------- */}
          <div className="absolute bottom-0 left-0 right-0 z-20 h-[35%] sm:h-[34%] md:h-[32%] bg-black/20 backdrop-blur-sm border-t border-white/10">
            <PlayerHand
              cards={myCards}
              isMyTurn={isMyTurn}
              // onReorder={(newOrder) => {
              //   dispatch(reorderMyCards(newOrder));
              //   reorderCards(currentGame?.gameId, user.id, newOrder);
              // }}
              onDiscard={(card) => handleDiscardCard(card)}
              onGroupsChange={handleGroupsChange}
            />
          </div>
        </div>
      </div>

      {/* ---------- DECLARE MODAL ---------- */}
      {showDeclareModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">Declare Win</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Are you sure you want to declare? We will validate your sequences.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleDeclareWin}
                className="flex-1 px-3 py-2 rounded bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
              >
                Declare
              </button>
              <button
                onClick={() => setShowDeclareModal(false)}
                className="flex-1 px-3 py-2 rounded bg-neutral-200 text-neutral-900 hover:bg-neutral-300"
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