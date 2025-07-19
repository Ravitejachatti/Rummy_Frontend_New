import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import socketService from '../../config/socket';
import {
  setGameState,
  setPlayers,
  setCurrentTurn,
  addCardToHand,
  removeCardFromHand,
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
  const [sets, setSets] = useState([]);

  useEffect(() => {
    if (tableId && user) {
      // Join table
      joinTable(tableId, user.id);
      
      // Get initial game state
      dispatch(getGameState(tableId));

      // Set up socket listeners
      const socket = socketService.getSocket();
      if (socket) {
        socket.on('rummy/player_joined', (data) => {
          dispatch(addNotification({
            type: 'info',
            message: `Player joined the table`,
          }));
        });

        socket.on('rummy/game_started', (data) => {
          dispatch(setGameState(data));
          dispatch(setGameStatus('playing'));
          dispatch(addNotification({
            type: 'success',
            message: 'Game started! Good luck!',
          }));
        });

        socket.on('rummy/card_drawn', (data) => {
          if (data.playerId === user.id) {
            dispatch(addCardToHand(data.card));
          }
          dispatch(addNotification({
            type: 'info',
            message: `Player drew a card`,
          }));
        });

        socket.on('rummy/card_discarded', (data) => {
          if (data.playerId === user.id) {
            dispatch(removeCardFromHand(data.card));
          }
          dispatch(addToDiscardPile(data.card));
        });

        socket.on('rummy/next_turn', (data) => {
          dispatch(setCurrentTurn(data.nextPlayerId));
        });

        socket.on('rummy/player_dropped', (data) => {
          dispatch(addNotification({
            type: 'warning',
            message: `Player dropped from the game`,
          }));
        });

        socket.on('rummy/auto_win', (data) => {
          dispatch(setGameStatus('ended'));
          dispatch(addNotification({
            type: 'success',
            message: data.winner === user.id ? 'You won by auto-win!' : 'Game ended - auto win',
          }));
        });

        socket.on('rummy/win_declared', (data) => {
          dispatch(setGameStatus('ended'));
          dispatch(addNotification({
            type: data.winner === user.id ? 'success' : 'info',
            message: data.winner === user.id ? 'Congratulations! You won!' : 'Game ended',
          }));
        });

        socket.on('rummy/invalid_declaration', (data) => {
          dispatch(addNotification({
            type: 'error',
            message: 'Invalid declaration! Please check your sets.',
          }));
        });

        socket.on('rummy/error', (message) => {
          dispatch(addNotification({
            type: 'error',
            message,
          }));
        });
      }

      return () => {
        if (socket) {
          socket.off('rummy/player_joined');
          socket.off('rummy/game_started');
          socket.off('rummy/card_drawn');
          socket.off('rummy/card_discarded');
          socket.off('rummy/next_turn');
          socket.off('rummy/player_dropped');
          socket.off('rummy/auto_win');
          socket.off('rummy/win_declared');
          socket.off('rummy/invalid_declaration');
          socket.off('rummy/error');
        }
      };
    }
  }, [tableId, user, dispatch]);

  const handleDrawCard = (source) => {
    if (!isMyTurn || !currentGame) return;
    drawCard(currentGame.gameId, user.id, source);
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
    if (!currentGame || sets.length === 0) return;
    declareWinSocket(currentGame.gameId, user.id, sets);
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
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Game Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rummy Game</h1>
              <p className="text-gray-600">
                Status: <span className="font-medium capitalize">{gameStatus}</span>
                {currentTurn && (
                  <>
                    {' | '}
                    Current Turn: <span className="font-medium">
                      {currentTurn === user.id ? 'Your turn' : 'Waiting...'}
                    </span>
                  </>
                )}
              </p>
            </div>
            
            <div className="flex space-x-2">
              {gameStatus === 'playing' && (
                <>
                  <button
                    onClick={handleDrop}
                    className="btn-danger"
                  >
                    Drop
                  </button>
                  <button
                    onClick={() => setShowDeclareModal(true)}
                    disabled={!isMyTurn}
                    className="btn-success disabled:opacity-50"
                  >
                    Declare
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Game Table */}
        <div className="game-table relative">
          {/* Draw and Discard Piles */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex space-x-8">
            {/* Draw Pile */}
            <div className="text-center">
              <div
                onClick={() => handleDrawCard('drawPile')}
                className={`playing-card bg-blue-600 text-white ${
                  isMyTurn ? 'cursor-pointer hover:bg-blue-700' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div className="text-xs">DRAW</div>
              </div>
              <p className="text-white text-sm mt-2">Draw Pile</p>
            </div>

            {/* Discard Pile */}
            <div className="text-center">
              <div
                onClick={() => handleDrawCard('discardPile')}
                className={`playing-card ${
                  isMyTurn ? 'cursor-pointer hover:shadow-lg' : 'cursor-not-allowed opacity-50'
                }`}
              >
                {discardPile.length > 0 ? (
                  <PlayingCard card={discardPile[discardPile.length - 1]} />
                ) : (
                  <div className="text-xs text-gray-400">EMPTY</div>
                )}
              </div>
              <p className="text-white text-sm mt-2">Discard Pile</p>
            </div>
          </div>

          {/* Players */}
          {players.map((player, index) => {
            const isCurrentPlayer = player.playerId === user.id;
            const angle = (index * 360) / players.length;
            const radius = 200;
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
                <div className={`bg-white rounded-lg p-3 shadow-lg ${
                  currentTurn === player.playerId ? 'ring-2 ring-yellow-400' : ''
                }`}>
                  <div className="text-center">
                    <p className="font-medium text-gray-900">
                      {isCurrentPlayer ? 'You' : `Player ${index + 1}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      Cards: {isCurrentPlayer ? myCards.length : player.hand?.length || 0}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {player.status}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Player's Hand */}
        {myCards.length > 0 && (
          <div className="mt-8">
            <PlayerHand
              cards={myCards}
              selectedCards={selectedCards}
              onCardSelect={(card) => dispatch(toggleCardSelection(card))}
              isMyTurn={isMyTurn}
            />
            
            {selectedCards.length === 1 && isMyTurn && (
              <div className="text-center mt-4">
                <button
                  onClick={handleDiscardCard}
                  className="btn-primary"
                >
                  Discard Selected Card
                </button>
              </div>
            )}
          </div>
        )}

        {/* Declare Modal */}
        {showDeclareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold mb-4">Declare Win</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to declare? Make sure you have valid sets and sequences.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleDeclareWin}
                  className="btn-success flex-1"
                >
                  Declare Win
                </button>
                <button
                  onClick={() => setShowDeclareModal(false)}
                  className="btn-secondary flex-1"
                >
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