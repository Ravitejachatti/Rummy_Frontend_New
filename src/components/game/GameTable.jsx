// 📁 src/components/game/GameTable.jsx
// ═══════════════════════════════════════════════════
// Indian Rummy – Production Game Table
// Oval table + Player avatars + 4-slot hand dock
// ═══════════════════════════════════════════════════
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
  confirmShowSocket,
  setSecurityError,
  joinTable,
  leaveTable,
} from "../../store/slices/gameSlice";

import PlayerHand from "./PlayerHand";
import PlayerAvatar from "./PlayerAvatar";
import TableCenter from "./TableCenter";
import GameHUD from "./GameHUD";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorMessage from "../common/ErrorMessage";
import { preloadAllCards } from "../utils/cardimages";
import SeatCutOverlay from "./SeatCutOverlay";
import ShowReviewModal from "./ShowReviewModal";
import SecurityOverlay from "./SecurityOverlay";
import NotificationCenter from "../common/Notificaton";
import { normalizeErrorMessage } from "../../utils/normalizeError";
import { normalizeGameStatePayload, normalizeDiscardHistory } from "../../utils/normalizeGameSocketPayload";
import { unlockAction } from "../../utils/actionLock";
import useSound from "../../hooks/useSound";


// ── Position map for opponents around the oval ──
const POSITION_MAP = {
  2: ["top"],
  3: ["top-left", "top-right"],
  4: ["top-left", "top", "top-right"],
  5: ["left", "top-left", "top-right", "right"],
  6: ["left", "top-left", "top", "top-right", "right"],
};

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
    votes,
    allowedActions,
    stateVersion,
    settlementStatus,
    securityError
  } = useSelector((state) => state.game);

  const isMyTurn = React.useMemo(() => {
    if (!meId || !currentTurn) return false;
    return String(currentTurn) === String(meId);
  }, [meId, currentTurn]);

  const actionSet = useMemo(() => new Set(Array.isArray(allowedActions) ? allowedActions : []), [allowedActions]);
  const canDrawFromDeck = actionSet.has("DRAW_FROM_DECK");
  const canDrawFromDiscard = actionSet.has("DRAW_FROM_DISCARD");
  const canDiscard = actionSet.has("DISCARD");
  const canDrop = actionSet.has("DROP");
  const canDeclare = actionSet.has("DECLARE");
  const canShowConfirmYes = actionSet.has("SHOW_CONFIRM_YES");
  const canShowConfirmNo = actionSet.has("SHOW_CONFIRM_NO");

  const [handGroups, setHandGroups] = useState({ groups: [], ungrouped: [] });
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showDropModal, setShowDropModal] = useState(false);
  const didUserDrop = useRef(false);
  const [showDiscardHistory, setShowDiscardHistory] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [rotateHint, setRotateHint] = useState("");

  const { play, toggleMute, isMuted } = useSound();


  // Preload all card images into browser cache on mount
  useEffect(() => {
    preloadAllCards();
  }, []);

  // ── Orientation lock ──
  const requestLandscape = async () => {
    try {
      setRotateHint("");
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen().catch(() => {});
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
    if (window.screen?.orientation?.lock) {
      window.screen.orientation.lock("landscape").catch(() => {});
    }
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  // ── Derived data ──
  const gameIdForNav = useCallback(() => currentGame?.gameId || null, [currentGame?.gameId]);

  // Separate "me" from opponents
  const { opponents, mePlayer } = useMemo(() => {
    const allPlayers = Array.isArray(players) ? players : [];
    const me = allPlayers.find((p) => String(p.playerId) === String(meId));
    const others = allPlayers.filter((p) => String(p.playerId) !== String(meId));
    return { opponents: others, mePlayer: me };
  }, [players, meId]);

  // Assign positions to opponents
  const opponentPositions = useMemo(() => {
    const count = opponents.length;
    const positions = POSITION_MAP[count + 1] || POSITION_MAP[2] || ["top"];
    return opponents.map((p, idx) => ({
      player: p,
      position: positions[idx] || "top",
    }));
  }, [opponents]);

  // ═══════════════════════════════════════════════
  // SOCKET EFFECTS (unchanged from original)
  // ═══════════════════════════════════════════════
  useEffect(() => {
    if (!tableId || !user) return;

    let socket = socketService.getSocket();
    if (!socket) {
      const token = localStorage.getItem("accessToken");
      socket = socketService.connect(token);
    }
    
    // Patch: Ensure the socket joins the table/game room on mount/refresh
    // to keep real-time communication alive.
    dispatch(getGameState(tableId)).then((res) => {
      if (res.payload && !res.error) {
        joinTable(tableId);
      }
    });

    const onPlayerConnected = () => {
      dispatch(addNotification({ type: "info", message: "Player connected" }));
      dispatch(getGameState(tableId));
    };
    const onPlayerDisconnected = () => dispatch(addNotification({ type: "warning", message: "Player disconnected" }));
    const onConnect = () => {
      dispatch(addNotification({ type: "info", message: "Reconnected. Syncing game state…" }));
      dispatch(getGameState(tableId));
    };
    const applyPublicState = (payload = {}) => {
      const s = normalizeGameStatePayload(payload);
      dispatch(setGameState(s));
      if (s?.phase === "SHOW_CONFIRM" && s.declaration) {
        dispatch(setReviewData(s.declaration));
        dispatch(setVotes(s.declaration.votes || {}));
      }
    };
    const onState = applyPublicState;
    const onGameStarted = (data) => {
      applyPublicState(data);
      dispatch(setGameStatus("PLAYING"));
      dispatch(addNotification({ type: "success", message: "Game started!" }));
      dispatch(setSeatCutResults(null));
    };
    const onYourHand = ({ hand, myHand }) => dispatch(setMyCards(myHand || hand || []));
    const onCardDrawn = (data) => {
      unlockAction(`draw:${data?.gameId || currentGame?.gameId || ""}`);
      play("cardDraw", 0.4);
      const history = normalizeDiscardHistory(data);
      if (history.length) dispatch(setDiscardHistory(history));
      if ("discardTop" in (data || {})) dispatch(setDiscardTop(data.discardTop ?? null));
      if (Number.isFinite(data?.drawPileCount)) dispatch(setDrawPileCount(data.drawPileCount));
    };

    const onCardDiscarded = (data) => {
      unlockAction(`discard:${data?.gameId || currentGame?.gameId || ""}:${data?.card?.cardId || "card"}`);
      play("cardPlace", 0.4);
      if ("discardTop" in (data || {})) dispatch(setDiscardTop(data.discardTop ?? null));
      else if (data?.card) dispatch(setDiscardTop(data.card));
      const history = normalizeDiscardHistory(data);
      if (history.length) dispatch(setDiscardHistory(history));
      if ("discardTop" in (data || {})) dispatch(setDiscardTop(data.discardTop ?? null));
      if (Number.isFinite(data?.drawPileCount)) dispatch(setDrawPileCount(data.drawPileCount));
    };

    const onNextTurn = (data) => {
      dispatch(setCurrentTurn(data.nextPlayerId));
      if (String(data.nextPlayerId) === String(meId)) {
        play("turnNotify", 0.5);
      }
    };
    const onPlayerDropped = () => {
      dispatch(addNotification({ type: "warning", message: "Player dropped" }));
      play("cardPlace", 0.3);
    };

    const onTimedOut = (payload = {}) => {
      const playerId = payload.playerId || payload.userId || payload.id || "unknown";
      dispatch(addNotification({ type: "warning", message: `Player timed out (${playerId})` }));
    };

    const onSeatCutResult = (data) => dispatch(setSeatCutResults(data.results));
    const onShowReview = (data) => dispatch(setReviewData(data));
    const onShowVoteUpdate = (data = {}) => {
      if (data.votes) dispatch(setVotes(data.votes));
      else if (data.voterId) dispatch(setVotes({ voterId: data.voterId, decision: data.decision }));
    };

    const onWinDeclared = (data) => {
      unlockAction(`declare:${data?.gameId || currentGame?.gameId || ""}`);
      if (String(data.winner) === String(meId)) play("winFanfare", 0.6);
      dispatch(setGameStatus("ended"));
      dispatch(setReviewData(null));
      const gid = gameIdForNav() || data.gameId || currentGame?.gameId;
      navigate(`/rummy/result/${gid}`, { state: { winner: data.winner, isYou: String(data.winner) === String(meId), losers: data.losers || [], tableId }, replace: true });
    };
    const onAutoWin = (data) => {
      if (String(data.winner) === String(meId)) play("winFanfare", 0.6);
      dispatch(setGameStatus("ended"));
      dispatch(setReviewData(null));

      const gid = gameIdForNav() || data.gameId || currentGame?.gameId;
      if (!gid) {
        dispatch(addNotification({ type: "error", message: "Error: Could not find Game ID to show results." }));
        return;
      }
      const wasDrop = didUserDrop.current;
      navigate(`/rummy/result/${gid}`, { state: { winner: data.winner, isYou: String(data.winner) === String(meId), losers: [], tableId, dropped: wasDrop }, replace: true });
    };
    const onInvalidDeclaration = (data) => {
      unlockAction(`declare:${data?.gameId || currentGame?.gameId || ""}`);
      play("error", 0.5);
      dispatch(addNotification({ type: "error", message: data?.message || "Invalid declaration" }));
      setShowDeclareModal(false);
    };
    const onError = (msg) => {
      if (msg?.gameId) {
        unlockAction(`draw:${msg.gameId}`);
        unlockAction(`discard:${msg.gameId}:card`);
        unlockAction(`drop:${msg.gameId}`);
        unlockAction(`declare:${msg.gameId}`);
      }
      play("error", 0.4);
      if (msg?.code === "ERR_WALLET_FROZEN") dispatch(setSecurityError(msg));
      dispatch(addNotification({ type: "error", message: normalizeErrorMessage(msg, "Socket error") }));
    };


    const events = [
      ["connect", onConnect],
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
      ["rummy/player_timedout", onTimedOut],
      ["rummy/player_timed_out", onTimedOut],
      ["rummy/win_declared", onWinDeclared],
      ["rummy/auto_win", onAutoWin],
      ["rummy/invalid_declaration", onInvalidDeclaration],
      ["rummy/error", onError],
      ["rummy/seat_cut_result", onSeatCutResult],
      ["rummy/cut_results", onSeatCutResult],
      ["rummy/show_review", onShowReview],
      ["rummy/show_vote_update", onShowVoteUpdate],
      ["rummy/show_confirm_update", onShowVoteUpdate],
      ["rummy/win_confirmed", onWinDeclared],
    ];

    events.forEach(([evt, fn]) => socketService.off(evt, fn));
    events.forEach(([evt, fn]) => socketService.on(evt, fn));

    return () => { events.forEach(([evt, fn]) => socketService.off(evt, fn)); };
  }, [tableId, user, dispatch, navigate, gameIdForNav, meId]);

  // ═══════════════════════════════════════════════
  // ACTION HANDLERS (unchanged)
  // ═══════════════════════════════════════════════
  const handleDrawCard = (source) => {
    if (!currentGame || !source) return;
    const normalized = String(source).toLowerCase() === "discard" ? "discard" : "draw";
    if (normalized === "discard" && !canDrawFromDiscard) return;
    if (normalized === "draw" && !canDrawFromDeck) return;
    drawCard(currentGame.gameId, meId, normalized, stateVersion);
  };

  const handleDiscardCard = (card) => {
    if (!currentGame || !card || !canDiscard) return;
    discardCard(currentGame.gameId, meId, card, stateVersion);
  };

  const handleDrop = () => { if (canDrop) setShowDropModal(true); };

  const confirmDrop = () => {
    if (currentGame) {
      didUserDrop.current = true;
      dropGame(currentGame.gameId, stateVersion);
    }
    setShowDropModal(false);
  };

  const handleDeclareWin = () => {
    const gameId = currentGame?.gameId;
    if (!gameId || !meId) {
      dispatch(addNotification({ type: "error", message: "Unable to declare right now. Game not ready." }));
      return;
    }
    if (!canDeclare) {
      dispatch(addNotification({ type: "error", message: "Declaration is not allowed right now." }));
      return;
    }
    declareWinSocket({
      gameId,
      playerId: meId,
      groups: handGroups.groups,
      ungrouped: handGroups.ungrouped,
      stateVersion,
    });
    setShowDeclareModal(false);
  };

  const handleGroupsChange = useCallback((data) => setHandGroups(data), []);

  const handleVoteSocket = (vote) => {
    const gid = currentGame?.gameId;
    if (!gid) return;
    if (vote && !canShowConfirmYes) return;
    if (!vote && !canShowConfirmNo) return;
    confirmShowSocket(gid, vote ? "YES" : "NO", stateVersion);
  };

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <ErrorMessage message={error} onRetry={() => dispatch(getGameState(tableId))} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full text-white select-none overflow-hidden relative"
      style={{ background: "var(--felt-vignette)" }}
    >
      {/* ── Portrait lock overlay ── */}
      {isPortrait && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-center px-6">
          <div className="text-4xl mb-3">📱↔️</div>
          <div className="text-white text-lg font-semibold mb-2">Rotate Your Device</div>
          <div className="text-gray-400 text-xs max-w-xs mb-4">
            This Rummy table is optimized for landscape mode.
          </div>
          <button
            onClick={requestLandscape}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-transform"
            style={{ background: "var(--gold)", color: "#1a1a1a" }}
          >
            Switch to Landscape
          </button>
          {rotateHint && (
            <div className="mt-3 text-[11px] text-white/50 max-w-xs">{rotateHint}</div>
          )}
        </div>
      )}

      {/* ── Main Layout: Indian Rummy inspired play board ── */}
      <div className="rummy-pro-screen">
        <GameHUD
          gameStatus={gameStatus}
          isMyTurn={isMyTurn}
          allowedActions={allowedActions}
          drawPileCount={drawPileCount}
          onDrop={handleDrop}
          onDeclare={() => canDeclare && setShowDeclareModal(true)}
          canDeclare={canDeclare}
          onBack={() => {
            leaveTable(tableId);
            navigate("/dashboard");
          }}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />


        <div className="rummy-play-frame">
          <main className="rummy-purple-table-wrap">
            <section className="rummy-purple-table">
              <div className="table-pattern" />
              <div className="table-glow" />

              {opponentPositions.map(({ player, position }) => (
                <div key={player.playerId} className={`rummy-seat rummy-seat-${position}`}>
                  <div className={`seat-avatar ${String(currentTurn) === String(player.playerId) ? "active" : ""}`}>
                    <span>{(player.username || "P").slice(0, 1).toUpperCase()}</span>
                    <small>{player.hand?.length || player.handCount || 13}</small>
                  </div>
                  <div className="seat-name">{player.username || "Player"}</div>
                </div>
              ))}

              <TableCenter
                drawPileCount={drawPileCount}
                discardTop={discardTop}
                discardHistory={discardHistory}
                isMyTurn={isMyTurn}
                canDrawFromDeck={canDrawFromDeck}
                canDrawFromDiscard={canDrawFromDiscard}
                canDiscard={canDiscard}
                showDiscardHistory={showDiscardHistory}
                onDrawFromDeck={() => handleDrawCard("draw")}
                onDrawFromDiscard={() => handleDrawCard("discard")}
                onToggleHistory={() => setShowDiscardHistory((v) => !v)}
                onDiscardDrop={(card) => handleDiscardCard(card)}
              />
            </section>
          </main>

          <section className="rummy-hand-dock-pro">
            <PlayerHand
              cards={myCards}
              isMyTurn={isMyTurn}
              canDiscard={canDiscard}
              onReorder={(newOrder) => {
                dispatch(reorderMyCards(newOrder));
                reorderCards(currentGame?.gameId, meId, newOrder, stateVersion);
              }}
              onDiscard={(card) => handleDiscardCard(card)}
              onGroupsChange={handleGroupsChange}
            />
          </section>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          MODALS & OVERLAYS
          ═══════════════════════════════════════ */}

      {/* Waiting for players */}
      {gameStatus === "waiting" && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 backdrop-blur-sm">
          <div className="border border-emerald-500/20 p-8 rounded-2xl flex flex-col items-center shadow-2xl animate-fade-in"
            style={{ background: "linear-gradient(135deg, #111 0%, #0a1f12 100%)" }}
          >
            <div className="w-14 h-14 mb-4 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
            <h2 className="text-xl font-bold text-white mb-2">Waiting for Players…</h2>
            <p className="text-emerald-300/60 text-sm">Game starts when an opponent joins.</p>
            <div className="mt-5 flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-white/80 font-medium">1 Player Seated</span>
            </div>
          </div>
        </div>
      )}

      {/* Declare confirmation */}
      {showDeclareModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 backdrop-blur-sm">
          <div className="rounded-xl p-5 max-w-sm w-full shadow-2xl animate-bounce-in"
            style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #0a1f12 100%)", border: "1px solid rgba(212,168,67,0.3)" }}
          >
            <h3 className="text-lg font-bold mb-2 text-white">Declare Win</h3>
            <p className="text-gray-400 mb-4 text-xs">Are you sure? Your sequences will be validated by all players.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDeclareWin}
                className="btn-declare flex-1 py-2.5 text-sm"
              >
                Declare
              </button>
              <button
                onClick={() => setShowDeclareModal(false)}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 active:scale-95 text-sm font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drop confirmation */}
      {showDropModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 backdrop-blur-sm">
          <div className="rounded-xl p-5 max-w-sm w-full shadow-2xl animate-bounce-in"
            style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #1a0a0a 100%)", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <h3 className="text-lg font-bold mb-2 text-red-400">Confirm Drop</h3>
            <p className="text-gray-400 mb-4 text-xs">
              You will lose 20 points (First Drop) or 40 points (Middle Drop). Are you sure?
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmDrop}
                className="flex-1 px-3 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 active:scale-95 text-sm transition-all"
              >
                Yes, Drop
              </button>
              <button
                onClick={() => setShowDropModal(false)}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 active:scale-95 text-sm font-medium transition-all"
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

      <SecurityOverlay
        error={securityError}
        settlementStatus={settlementStatus}
        onClose={() => dispatch(setSecurityError(null))}
      />

      <NotificationCenter
        notifications={notifications}
        onClose={(id) => dispatch(removeNotification(id))}
        position="top-right"
      />
    </div>
  );
};

export default GameTable;