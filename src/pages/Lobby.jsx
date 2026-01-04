// client/src/pages/Lobby.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, Link } from "react-router-dom";
import socketService from "../config/socket";
import { fetchTables } from "../store/slices/tableSlice";
import {
  joinTable,
  setPlayers,
  setCurrentTurn,
  addNotification,
  setGameStatus,
} from "../store/slices/gameSlice";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

export default function Lobby() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((s) => s.auth);
  const {
    tables = [],
    loading: tablesLoading,
    error: tablesError,
  } = useSelector((s) => s.table);
  const { players = [], currentTurn, gameStatus } = useSelector((s) => s.game);

  // ✅ unified id
  const meId = user?._id || user?.id || user?.userId;

  const [joining, setJoining] = useState(true);
  const [cutInfo, setCutInfo] = useState(null);
  const [isChooser, setIsChooser] = useState(false);
  const [choosingSeat, setChoosingSeat] = useState(false);
  const [gameId, setGameId] = useState(null);

  // SEAT_CHOICE → AWAIT_SHUFFLE → AWAIT_CUT → PLAYING
  const [flowPhase, setFlowPhase] = useState(null);

  const orderedPlayers = useMemo(() => {
    if (!Array.isArray(players)) return [];
    return [...players].sort((a, b) => {
      const sa = typeof a.seatIndex === "number" ? a.seatIndex : 999;
      const sb = typeof b.seatIndex === "number" ? b.seatIndex : 999;
      if (sa !== sb) return sa - sb;
      return String(a.playerId).localeCompare(String(b.playerId));
    });
  }, [players]);

  const me = useMemo(
    () => orderedPlayers.find((p) => String(p.playerId) === String(meId)),
    [orderedPlayers, meId]
  );

  useEffect(() => {
    if (!tables || tables.length === 0) {
      dispatch(fetchTables());
    }
  }, [dispatch, tables?.length]);

  const table = useMemo(
    () => tables.find((t) => String(t._id) === String(tableId)) || null,
    [tables, tableId]
  );

  useEffect(() => {
    if (!tableId || !user) return;

    let cancelled = false;

    // ✅ connect once, attach listeners first, join on connect (prevents missing rummy/state)
    const token = localStorage.getItem("accessToken") || "";
    const socket = socketService.connect(token);

    const doJoin = () => joinTable(tableId);

    const onPlayerConnected = () => {
      dispatch(addNotification({ type: "info", message: "A player connected" }));
    };

    const onPlayerDisconnected = () => {
      dispatch(addNotification({ type: "warning", message: "A player disconnected" }));
    };

    const onState = (s) => {
      if (s?.gameId) setGameId(s.gameId);

      // ✅ backend sends `phase` not `flowPhase` (keep your local flowPhase state for UI)
      if (s?.phase) setFlowPhase(s.phase);

      if (Array.isArray(s?.players)) dispatch(setPlayers(s.players));
      if (typeof s?.currentTurn !== "undefined") dispatch(setCurrentTurn(s.currentTurn));
      if (s?.status) dispatch(setGameStatus(s.status));

      // ✅ don’t send spectators to game screen
      if (s?.status === "playing" && s?.role !== "spectator") {
        navigate(`/game/${tableId}`, { replace: true });
      }
    };

    const onGameStarted = (payload) => {
      if (payload?.gameId) setGameId(payload.gameId);
      if (Array.isArray(payload?.players)) dispatch(setPlayers(payload.players));
      if (typeof payload?.currentTurn !== "undefined") dispatch(setCurrentTurn(payload.currentTurn));

      dispatch(setGameStatus("playing"));
      setFlowPhase("PLAYING");
      navigate(`/game/${tableId}`, { replace: true });
    };

    const onCutResults = (payload) => {
      if (payload?.gameId) setGameId(payload.gameId);

      setCutInfo(payload);
      setFlowPhase(payload.flowPhase || "SEAT_CHOICE");

      const chooser = payload.chooserId;
      const iamChooser = meId && String(meId) === String(chooser);

      setIsChooser(iamChooser);
      setChoosingSeat(iamChooser);

      if (iamChooser) {
        dispatch(addNotification({ type: "info", message: "You got the highest cut! Choose your seat." }));
      } else {
        dispatch(
          addNotification({
            type: "info",
            message: "Cut complete. Waiting for highest-cut player to choose a seat…",
          })
        );
      }
    };

    const onSeatingFinalized = (payload) => {
      if (payload?.gameId) setGameId(payload.gameId);

      setCutInfo(null);
      setIsChooser(false);
      setChoosingSeat(false);

      if (payload?.flowPhase) setFlowPhase(payload.flowPhase);

      if (Array.isArray(payload?.players)) {
        dispatch(setPlayers(payload.players));
      }
    };

    const onShuffleApplied = (payload) => {
      if (payload?.gameId) setGameId(payload.gameId);
      if (payload?.nextPhase) setFlowPhase(payload.nextPhase);

      dispatch(
        addNotification({
          type: "info",
          message: "Shuffler has shuffled the deck. Waiting for cutter…",
        })
      );
    };

    const onCutApplied = (payload) => {
      if (payload?.gameId) setGameId(payload.gameId);
      if (payload?.nextPhase) setFlowPhase(payload.nextPhase);

      dispatch(
        addNotification({
          type: "info",
          message: "Cutter has cut the deck. Dealing cards…",
        })
      );
    };

    const onSpectatorJoined = (payload) => {
      dispatch(addNotification({ type: "info", message: payload?.message || "You joined as spectator." }));
    };

    const onInfo = (m) => {
      dispatch(addNotification({ type: "info", message: String(m || "") }));
    };

    const onError = (m) => {
      dispatch(addNotification({ type: "error", message: String(m || "Socket error") }));
    };

    // attach
    socket.on("connect", doJoin);
    socket.on("rummy/player_connected", onPlayerConnected);
    socket.on("rummy/player_disconnected", onPlayerDisconnected);
    socket.on("rummy/state", onState);
    socket.on("rummy/game_started", onGameStarted);
    socket.on("rummy/cut_results", onCutResults);
    socket.on("rummy/seating_finalized", onSeatingFinalized);
    socket.on("rummy/shuffle_applied", onShuffleApplied);
    socket.on("rummy/cut_applied", onCutApplied);

    // ✅ new/optional server messages
    socket.on("rummy/spectator_joined", onSpectatorJoined);
    socket.on("rummy/info", onInfo);
    socket.on("rummy/error", onError);

    // join immediately if already connected
    if (socket.connected) doJoin();

    (async () => {
      try {
        if (socketService.waitUntilConnected) await socketService.waitUntilConnected();
      } catch (err) {
        console.error("[Lobby] socket connect error:", err);
        dispatch(addNotification({ type: "error", message: "Failed to join lobby. Please try again." }));
      } finally {
        if (!cancelled) setJoining(false);
      }
    })();

    return () => {
      cancelled = true;
      socket.off("connect", doJoin);
      socket.off("rummy/player_connected", onPlayerConnected);
      socket.off("rummy/player_disconnected", onPlayerDisconnected);
      socket.off("rummy/state", onState);
      socket.off("rummy/game_started", onGameStarted);
      socket.off("rummy/cut_results", onCutResults);
      socket.off("rummy/seating_finalized", onSeatingFinalized);
      socket.off("rummy/shuffle_applied", onShuffleApplied);
      socket.off("rummy/cut_applied", onCutApplied);
      socket.off("rummy/spectator_joined", onSpectatorJoined);
      socket.off("rummy/info", onInfo);
      socket.off("rummy/error", onError);
    };
  }, [dispatch, navigate, tableId, user, meId]);

  const handleChooseSeat = (seatIndex) => {
    if (!cutInfo) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    setChoosingSeat(false);

    socket.emit("rummy/choose_seat", {
      gameId: cutInfo.gameId,
      chosenSeat: seatIndex,
    });

    dispatch(addNotification({ type: "info", message: `Seat ${seatIndex + 1} selected.` }));
  };

  const handleShuffleChoice = (pattern) => {
    if (!gameId) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit("rummy/shuffle_choice", { gameId, pattern });

    dispatch(addNotification({ type: "info", message: `Shuffle pattern "${pattern}" chosen.` }));
  };

  const handleCutChoice = (cutType) => {
    if (!gameId) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.emit("rummy/cut_choice", { gameId, cutType });

    dispatch(addNotification({ type: "info", message: `Cut choice "${cutType.toUpperCase()}" chosen.` }));
  };

  const isLoading = tablesLoading || joining;
  const minPlayers = table?.minPlayers ?? 2;
  const maxPlayers = table?.maxPlayers ?? 6;

  const phaseLabel = (() => {
    if (flowPhase === "SEAT_CHOICE") return "Step 1/3: Highest-cut player is choosing seat.";
    if (flowPhase === "AWAIT_SHUFFLE") return "Step 2/3: Shuffler is choosing shuffle pattern.";
    if (flowPhase === "AWAIT_CUT") return "Step 3/3: Cutter is choosing cut position.";
    if (flowPhase === "PLAYING") return "Game in progress.";
    return "Waiting for enough players to start.";
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (tablesError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-4">
        <div className="max-w-md w-full">
          <ErrorMessage message={tablesError} onRetry={() => dispatch(fetchTables())} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lobby</h1>
              <p className="text-gray-600 mt-1 text-sm">
                {table ? (
                  <>
                    Waiting for players to join <span className="font-medium">{table.name}</span>. Need at least{" "}
                    <span className="font-medium">{minPlayers}</span> players to start.
                  </>
                ) : (
                  <>This table might have been closed or is not available anymore.</>
                )}
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Back to Dashboard
            </Link>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Players in Lobby</h2>
              <span className="text-xs text-gray-500">
                {orderedPlayers.length}/{maxPlayers} joined
              </span>
            </div>

            {orderedPlayers.length > 0 ? (
              <ul className="space-y-2">
                {orderedPlayers.map((p, idx) => (
                  <li
                    key={String(p.playerId)}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {String(p.playerId) === String(meId) ? "You" : p.username || `Player ${idx + 1}`}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {p.status || "active"}
                          {typeof p.seatIndex === "number" && (
                            <span className="ml-1 text-[11px] text-gray-600">• seat {p.seatIndex + 1}</span>
                          )}
                          {String(currentTurn) === String(p.playerId) && (
                            <span className="ml-1 text-[11px] text-emerald-600 font-semibold">• current turn</span>
                          )}
                          {p.isShuffler && (
                            <span className="ml-1 text-[11px] text-amber-600 font-semibold">• shuffler</span>
                          )}
                          {p.isCutter && (
                            <span className="ml-1 text-[11px] text-indigo-600 font-semibold">• cutter</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs font-medium ${p.connected ? "text-emerald-600" : "text-gray-400"}`}>
                      {p.connected ? "online" : "offline"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 text-sm">No other players yet. You’re the first — great choice! 🎉</p>
            )}
          </div>

          {cutInfo && flowPhase === "SEAT_CHOICE" && (
            <div className="mt-6 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              {isChooser ? (
                <>
                  <p className="text-sm font-medium text-indigo-900 mb-2">
                    You got the highest cut! Choose your seat at the table.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Array.from({ length: cutInfo.maxSeats || maxPlayers }).map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleChooseSeat(idx)}
                        disabled={!choosingSeat}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition
                          ${
                            choosingSeat
                              ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 active:scale-95"
                              : "bg-indigo-100 text-indigo-400 border-indigo-100 cursor-not-allowed"
                          }`}
                      >
                        Seat {idx + 1}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-indigo-900">
                  Cut completed. Waiting for the highest-cut player to choose a seat…
                </p>
              )}

              <div className="mt-3 text-xs text-indigo-700">
                <p className="font-semibold mb-1">Cut cards:</p>
                <ul className="flex flex-wrap gap-2">
                  {cutInfo.players?.map((p) => (
                    <li
                      key={p.userId}
                      className="px-2 py-1 rounded-full bg-white border border-indigo-100 shadow-sm"
                    >
                      <span className="font-medium">
                        {orderedPlayers.find((pl) => String(pl.playerId) === String(p.userId))?.username ||
                          p.userId.slice(0, 6)}
                      </span>
                      {": "}
                      <span className="font-mono">
                        {p.cutCard?.rank} of {p.cutCard?.suit}
                        {p.isShuffler && " • Shuffler"}
                        {p.isCutter && " • Cutter"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {gameId && me && (
            <div className="mt-6 space-y-3">
              {me.isShuffler && flowPhase === "AWAIT_SHUFFLE" && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-900 mb-1">
                    You are the shuffler – choose a shuffle pattern:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["default", "riffle", "pile"].map((pattern) => (
                      <button
                        key={pattern}
                        type="button"
                        onClick={() => handleShuffleChoice(pattern)}
                        className="px-3 py-1.5 text-xs rounded-full border border-amber-200 bg-white hover:bg-amber-100 transition"
                      >
                        {pattern}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {me.isCutter && flowPhase === "AWAIT_CUT" && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-900 mb-1">
                    You are the cutter – choose how to cut:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["low", "mid", "high"].map((cutType) => (
                      <button
                        key={cutType}
                        type="button"
                        onClick={() => handleCutChoice(cutType)}
                        className="px-3 py-1.5 text-xs rounded-full border border-emerald-200 bg-white hover:bg-emerald-100 transition"
                      >
                        {cutType.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              Status: <span className="font-medium">{gameStatus || "waiting"}</span>
              {table && (
                <>
                  {" • "} Min players: <span className="font-medium">{minPlayers}</span>
                  {" • "} Max players: <span className="font-medium">{maxPlayers}</span>
                </>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">{phaseLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}