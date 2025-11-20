// client/src/pages/Lobby.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams, Link } from "react-router-dom";
import socketService from "../config/socket";
import { fetchTables } from "../store/slices/tableSlice";
import {
  getGameState,
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

  const [joining, setJoining] = useState(true);

  // Ensure we have tables to show table details
  useEffect(() => {
    if (!tables || tables.length === 0) {
      dispatch(fetchTables());
    }
  }, [dispatch, tables?.length]);

  const table = useMemo(
    () =>
      tables.find((t) => String(t._id) === String(tableId)) || null,
    [tables, tableId]
  );

  useEffect(() => {
    if (!tableId || !user) return;

    let cancelled = false;

    (async () => {
      try {
        const token = localStorage.getItem("token") || "";
        socketService.connect(token);
        if (socketService.waitUntilConnected) {
          await socketService.waitUntilConnected();
        }
        if (cancelled) return;

        joinTable(tableId);
        await dispatch(getGameState(tableId));
      } catch (err) {
        console.error("[Lobby] socket/join error:", err);
        dispatch(
          addNotification({
            type: "error",
            message: "Failed to join lobby. Please try again.",
          })
        );
      } finally {
        if (!cancelled) setJoining(false);
      }
    })();

    const socket = socketService.getSocket();
    if (!socket) {
      setJoining(false);
      return;
    }

    const onPlayerConnected = () => {
      dispatch(
        addNotification({ type: "info", message: "A player connected" })
      );
    };

    const onPlayerDisconnected = () => {
      dispatch(
        addNotification({
          type: "warning",
          message: "A player disconnected",
        })
      );
    };

    const onState = (s) => {
      if (Array.isArray(s?.players)) dispatch(setPlayers(s.players));
      if (typeof s?.currentTurn !== "undefined")
        dispatch(setCurrentTurn(s.currentTurn));
      if (s?.status) dispatch(setGameStatus(s.status));

      if (s?.status === "playing") {
        navigate(`/game/${tableId}`, { replace: true });
      }
    };

    const onGameStarted = () => {
      navigate(`/game/${tableId}`, { replace: true });
    };

    socket.on("rummy/player_connected", onPlayerConnected);
    socket.on("rummy/player_disconnected", onPlayerDisconnected);
    socket.on("rummy/state", onState);
    socket.on("rummy/game_started", onGameStarted);

    return () => {
      cancelled = true;
      if (!socket) return;
      socket.off("rummy/player_connected", onPlayerConnected);
      socket.off("rummy/player_disconnected", onPlayerDisconnected);
      socket.off("rummy/state", onState);
      socket.off("rummy/game_started", onGameStarted);
    };
  }, [dispatch, navigate, tableId, user]);

  const isLoading = tablesLoading || joining;

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
          <ErrorMessage
            message={tablesError}
            onRetry={() => dispatch(fetchTables())}
          />
        </div>
      </div>
    );
  }

  const minPlayers = table?.minPlayers ?? 2;
  const maxPlayers = table?.maxPlayers ?? 6;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lobby</h1>
              <p className="text-gray-600 mt-1 text-sm">
                {table ? (
                  <>
                    Waiting for players to join{" "}
                    <span className="font-medium">{table.name}</span>. Need at
                    least{" "}
                    <span className="font-medium">{minPlayers}</span> players to
                    start.
                  </>
                ) : (
                  <>
                    This table might have been closed or is not available
                    anymore.
                  </>
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

          {/* Players list */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Players in Lobby
              </h2>
              <span className="text-xs text-gray-500">
                {players.length}/{maxPlayers} joined
              </span>
            </div>

            {players.length > 0 ? (
              <ul className="space-y-2">
                {players.map((p, idx) => (
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
                          {String(p.playerId) === String(user?.id)
                            ? "You"
                            : p.username || `Player ${idx + 1}`}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {p.status || "active"}
                          {String(currentTurn) === String(p.playerId) && (
                            <span className="ml-1 text-[11px] text-emerald-600 font-semibold">
                              • current turn
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        p.connected ? "text-emerald-600" : "text-gray-400"
                      }`}
                    >
                      {p.connected ? "online" : "offline"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 text-sm">
                No other players yet. You’re the first — great choice! 🎉
              </p>
            )}
          </div>

          {/* Footer / status */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              Status:{" "}
              <span className="font-medium">
                {gameStatus || "waiting"}
              </span>
              {table && (
                <>
                  {" • "} Min players:{" "}
                  <span className="font-medium">{minPlayers}</span>
                  {" • "} Max players:{" "}
                  <span className="font-medium">{maxPlayers}</span>
                </>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              The game will start automatically once enough players have joined.
              Stay on this screen to be moved into the table as soon as it
              starts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}