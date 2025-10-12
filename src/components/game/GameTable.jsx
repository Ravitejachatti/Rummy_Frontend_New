// client/src/components/game/GameTable.jsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import socketService from '../../config/socket';
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
  toggleCardSelection,
  clearSelectedCards,
  reorderCards,
  reorderMyCards
} from '../../store/slices/gameSlice';
import PlayingCard from './PlayingCard';
import PlayerHand from './PlayerHand';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

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
    selectedCards,
    gameStatus,
    isMyTurn,
    loading,
    error,
  } = useSelector((state) => state.game);

  const [showDeclareModal, setShowDeclareModal] = useState(false);
  // const [sets, setSets] = useState([]);

useEffect(() => {
  if (!tableId || !user) return;

  // Initial masked state via REST
  dispatch(getGameState(tableId));

  const socket = socketService.getSocket();
  if (!socket) return;

  // ✅ Clean slate before binding
  socket.removeAllListeners();

  // 🔗 Always rejoin on connect/reconnect
  socket.on('connect', () => {
    joinTable(tableId);
  });

  // Presence
  socket.on('rummy/player_connected', () => {
    dispatch(addNotification({ type: 'info', message: 'Player connected' }));
  });
  socket.on('rummy/player_disconnected', () => {
    dispatch(addNotification({ type: 'warning', message: 'Player disconnected' }));
  });

  // Masked state on join/rejoin
  socket.on('rummy/state', (s) => {
    if (s?.players) dispatch(setPlayers(s.players));
    if (typeof s?.currentTurn !== 'undefined') dispatch(setCurrentTurn(s.currentTurn));
    if (s?.discardTop) dispatch(addToDiscardPile(s.discardTop));
    if (s?.status) dispatch(setGameStatus(s.status));
  });

  socket.on('rummy/game_started', (data) => {
    dispatch(setGameState(data));
    dispatch(setGameStatus('playing'));
    dispatch(addNotification({ type: 'success', message: 'Game started! Good luck!' }));
  });

  // Private hand (authoritative)
  socket.on('rummy/your_hand', ({ hand }) => {
    dispatch(setMyCards(hand || []));
  });

  socket.on('rummy/card_drawn', () => {
    dispatch(addNotification({ type: 'info', message: 'Player drew a card' }));
  });

  socket.on('rummy/card_discarded', (data) => {
    dispatch(addToDiscardPile(data.card));
  });

  socket.on('rummy/next_turn', (data) => {
    dispatch(setCurrentTurn(data.nextPlayerId));
  });

  socket.on('rummy/player_dropped', () => {
    dispatch(addNotification({ type: 'warning', message: 'Player dropped from the game' }));
  });

  socket.on('rummy/auto_win', (data) => {
    dispatch(setGameStatus('ended'));
    dispatch(
      addNotification({
        type: data.winner?.toString() === user.id ? 'success' : 'info',
        message:
          data.winner?.toString() === user.id
            ? 'You won by auto-win!'
            : 'Game ended - auto win',
      })
    );
  });

  socket.on('rummy/win_declared', (data) => {
    dispatch(setGameStatus('ended'));
    dispatch(
      addNotification({
        type: data.winner.toString() === user.id ? 'success' : 'info',
        message:
          data.winner.toString() === user.id
            ? 'Congratulations! You won!'
            : 'Game ended',
      })
    );
  });

  socket.on('rummy/invalid_declaration', () => {
    dispatch(
      addNotification({ type: 'error', message: 'Invalid declaration! Please check your sets.' })
    );
  });

  socket.on('rummy/error', (message) => {
    dispatch(addNotification({ type: 'error', message }));
  });

  // If socket is not connected yet, connect manually
  if (!socket.connected) {
    const token = localStorage.getItem('token');
    socketService.connect(token);
  }

  return () => {
    socket.removeAllListeners();
  };
}, [tableId, user, dispatch]);

  const handleDrawCard = (source) => {
    if (!isMyTurn || !currentGame) return;
    // Map 'discardPile' clicks to server 'discard' source
    const mapped = source === 'discardPile' ? 'discard' : source;
    drawCard(currentGame.gameId, user.id, mapped);
  };

  const handleDiscardCard = () => {
    if (!isMyTurn || selectedCards.length !== 1 || !currentGame) return;
    discardCard(currentGame.gameId, user.id, selectedCards[0]);
    dispatch(clearSelectedCards());
  };

  const handleDrop = () => {
    if (!currentGame) return;
    dropGame(currentGame.gameId, user.id);
  };

  const handleDeclareWin = () => {
    if (!currentGame) return;
    declareWinSocket(currentGame.gameId);
    setShowDeclareModal(false);
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
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Game Header */}
        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rummy Game</h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Status: <span className="font-medium capitalize">{gameStatus}</span>
                {currentTurn && (
                  <>
                    {' | '}
                    Current Turn:{' '}
                    <span className="font-medium">
                      {String(currentTurn) === String(user.id) ? 'Your turn' : 'Waiting...'}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              {gameStatus === 'playing' && (
                <>
                  <button onClick={handleDrop} className="btn-danger text-sm px-3 py-2">
                    Drop
                  </button>
                  <button
                    onClick={() => setShowDeclareModal(true)}
                    disabled={!isMyTurn}
                    className="btn-success disabled:opacity-50 text-sm px-3 py-2"
                  >
                    Declare
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Game Table */}
        <div
          className="game-table relative mx-auto"
          style={{
            width: 'min(90vw, 600px)',
            height: 'min(60vw, 400px)',
            minHeight: '300px',
          }}
        >
          {/* Draw and Discard Piles */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex space-x-4 sm:space-x-8">
            {/* Draw Pile */}
            <div className="text-center">
              <div
                onClick={() => handleDrawCard('drawPile')}
                className={`playing-card bg-blue-600 text-white w-12 h-16 sm:w-16 sm:h-24 ${
                  isMyTurn ? 'cursor-pointer hover:bg-blue-700' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div className="text-xs sm:text-sm">DRAW</div>
              </div>
              <p className="text-white text-xs sm:text-sm mt-1 sm:mt-2">Draw Pile</p>
            </div>

            {/* Discard Pile */}
            <div className="text-center">
              <div
                onClick={() => handleDrawCard('discard')}
                className={`playing-card w-12 h-16 sm:w-16 sm:h-24 ${
                  isMyTurn ? 'cursor-pointer hover:shadow-lg' : 'cursor-not-allowed opacity-50'
                }`}
              >
                {discardPile.length > 0 ? (
                  <PlayingCard card={discardPile[discardPile.length - 1]} />
                ) : (
                  <div className="text-xs sm:text-sm text-gray-400">EMPTY</div>
                )}
              </div>
              <p className="text-white text-xs sm:text-sm mt-1 sm:mt-2">Discard Pile</p>
            </div>
          </div>

          {/* Players around the table */}
          {players.map((player, index) => {
            const isCurrentPlayer = String(player.playerId) === String(user.id);
            const angle = (index * 360) / Math.max(players.length, 1);
            const radius = Math.min(150, window.innerWidth * 0.25);
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;

            return (
              <div
                key={player.playerId}
                className="player-position"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  className={`bg-white rounded-lg p-2 sm:p-3 shadow-lg ${
                    String(currentTurn) === String(player.playerId) ? 'ring-2 ring-yellow-400' : ''
                  }`}
                >
                  <div className="text-center">
                    <p className="font-medium text-gray-900 text-xs sm:text-sm">
                      {isCurrentPlayer ? 'You' : player.username || `Player ${index + 1}`}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Cards: {isCurrentPlayer ? myCards.length : player.handCount ?? 0}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{player.status}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Player's Hand */}
        {myCards.length > 0 && (
          <div className="mt-4 sm:mt-8">
          <PlayerHand
            cards={myCards}
            selectedCards={selectedCards}
            onCardSelect={(card) => dispatch(toggleCardSelection(card))}
            isMyTurn={isMyTurn}
            gameId={currentGame?.gameId}
            userId={user.id}
            onReorder={(newOrder) => {
              dispatch(reorderMyCards(newOrder)); // optimistic local update
              reorderCards(currentGame?.gameId, user.id, newOrder); // socket emit
            }}
          />

            {selectedCards.length === 1 && isMyTurn && (
              <div className="text-center mt-3 sm:mt-4">
                <button onClick={handleDiscardCard} className="btn-primary w-full sm:w-auto">
                  Discard Selected Card
                </button>
              </div>
            )}
          </div>
        )}

        {/* Declare Modal */}
        {showDeclareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-3 sm:mb-4">Declare Win</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                 Are you sure you want to declare? We will validate your sequences.
              </p>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button onClick={handleDeclareWin} className="btn-success flex-1 text-sm">
                  Declare Win
                </button>
                <button onClick={() => setShowDeclareModal(false)} className="btn-secondary flex-1 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTable;