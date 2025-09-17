// client/src/pages/Lobby.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, Link } from 'react-router-dom';
import socketService from '../config/socket';
import { fetchTables } from '../store/slices/tableSlice';
import { getGameState, joinTable, setPlayers, setCurrentTurn, addNotification, setGameStatus } from '../store/slices/gameSlice';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

export default function Lobby() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((s) => s.auth);
  const { tables, loading: tablesLoading, error: tablesError } = useSelector((s) => s.table);
  const { players, currentTurn, gameStatus } = useSelector((s) => s.game);

  const [joining, setJoining] = useState(true);

  // Pull current table info (minPlayers, name, etc.)
  useEffect(() => {
    if (!tables || tables.length === 0) {
      dispatch(fetchTables());
    }
  }, [dispatch, tables?.length]);

  const table = useMemo(() => tables.find((t) => String(t._id) === String(tableId)), [tables, tableId]);

  useEffect(() => {
    if (!tableId || !user) return;

    // Join table room now; server will put us in the room and start game when minPlayers are met.
   // Ensure socket is connected (or queued emits will still be flushed, but this avoids warnings)
   (async () => {
     const token = localStorage.getItem('token');
     // connect() is idempotent; safe to call
     socketService.connect(token);
     await socketService.waitUntilConnected();
     joinTable(tableId);
  })();

    // Pull masked state to show current players already in the room (if any)
    dispatch(getGameState(tableId)).finally(() => setJoining(false));

    const socket = socketService.getSocket();
    if (!socket) return;

    // Presence
    const onPlayerConnected = (payload) => {
      dispatch(addNotification({ type: 'info', message: 'A player connected' }));
      // We’ll re-query state via state event below
    };
    const onPlayerDisconnected = () => {
      dispatch(addNotification({ type: 'warning', message: 'A player disconnected' }));
    };

    // Masked state updates before the game starts
    const onState = (s) => {
      if (Array.isArray(s?.players)) dispatch(setPlayers(s.players));
      if (typeof s?.currentTurn !== 'undefined') dispatch(setCurrentTurn(s.currentTurn));
      if (s?.status) dispatch(setGameStatus(s.status)); // ✅ sync lobby status
      if (s?.status === 'playing') {
        navigate(`/game/${tableId}`, { replace: true });
      }
    };

    // When the server starts the game, move to the game page
    const onGameStarted = () => {
      navigate(`/game/${tableId}`, { replace: true });
    };

    socket.on('rummy/player_connected', onPlayerConnected);
    socket.on('rummy/player_disconnected', onPlayerDisconnected);
    socket.on('rummy/state', onState);
    socket.on('rummy/game_started', onGameStarted);

    return () => {
      socket.off('rummy/player_connected', onPlayerConnected);
      socket.off('rummy/player_disconnected', onPlayerDisconnected);
      socket.off('rummy/state', onState);
      socket.off('rummy/game_started', onGameStarted);
    };
  }, [dispatch, navigate, tableId, user]);

  if (tablesLoading || joining) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (tablesError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message={tablesError} onRetry={() => dispatch(fetchTables())} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lobby</h1>
              <p className="text-gray-600 mt-1">
                {table ? (
                  <>
                    Waiting for players to join <span className="font-medium">{table.name}</span>.
                    {` `}
                    Need at least <span className="font-medium">{table.minPlayers}</span> players to start.
                  </>
                ) : (
                  <>Waiting for players…</>
                )}
              </p>
            </div>
            <Link to="/tables" className="btn-secondary text-sm">
              Back to Tables
            </Link>
          </div>

          {/* Players list */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Players in Lobby</h2>
            {players?.length ? (
              <ul className="space-y-2">
                {players.map((p, idx) => (
                  <li key={String(p.playerId)} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {String(p.playerId) === String(user?.id) ? 'You' : p.username || `Player ${idx + 1}`}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{p.status || 'active'}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {p.connected ? 'online' : 'offline'}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No players yet. You’re the first — great choice! 🎉</p>
            )}
          </div>

          {/* Footer / status */}
          <div className="mt-6 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">
              Status: <span className="font-medium">{gameStatus || 'waiting'}</span>
              {table && (
                <>
                  {' • '} Min players: <span className="font-medium">{table.minPlayers}</span>
                  {' • '} Max players: <span className="font-medium">{table.maxPlayers}</span>
                </>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              The game will start automatically once enough players have joined.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}