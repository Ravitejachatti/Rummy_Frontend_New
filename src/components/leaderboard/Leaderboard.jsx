import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchLeaderboard } from '../../store/slices/leaderboardSlice';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { TrophyIcon, UserIcon, FireIcon } from '@heroicons/react/24/outline';

const Leaderboard = () => {
  const dispatch = useDispatch();
  const { players, loading, error, lastUpdated } = useSelector((state) => state.leaderboard);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchLeaderboard());
  }, [dispatch]);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <TrophyIcon className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <TrophyIcon className="h-6 w-6 text-gray-400" />;
      case 3:
        return <TrophyIcon className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-gray-600">Top players ranked by total points</p>
        </div>
        
        <div className="text-right">
          <button
            onClick={() => dispatch(fetchLeaderboard())}
            className="btn-secondary"
          >
            Refresh
          </button>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <ErrorMessage message={error} onRetry={() => dispatch(fetchLeaderboard())} />

      {/* Top 3 Podium */}
      {players.length >= 3 && (
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 mb-6">
          <div className="flex items-end justify-center space-x-8">
            {/* 2nd Place */}
            <div className="text-center">
              <div className="bg-gray-300 rounded-lg p-4 mb-3 h-24 flex items-end justify-center">
                <div className="text-center">
                  <TrophyIcon className="h-8 w-8 text-gray-600 mx-auto mb-1" />
                  <p className="text-sm font-bold text-gray-700">2nd</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="font-semibold text-gray-900">{players[1]?.username}</p>
                <p className="text-sm text-gray-600">{players[1]?.totalPoints?.toLocaleString()} pts</p>
                <p className="text-xs text-gray-500">{players[1]?.totalWins} wins</p>
              </div>
            </div>

            {/* 1st Place */}
            <div className="text-center">
              <div className="bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-lg p-4 mb-3 h-32 flex items-end justify-center">
                <div className="text-center">
                  <TrophyIcon className="h-10 w-10 text-white mx-auto mb-1" />
                  <p className="text-sm font-bold text-white">1st</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border-2 border-yellow-400">
                <p className="font-bold text-gray-900">{players[0]?.username}</p>
                <p className="text-sm text-gray-600">{players[0]?.totalPoints?.toLocaleString()} pts</p>
                <p className="text-xs text-gray-500">{players[0]?.totalWins} wins</p>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="text-center">
              <div className="bg-amber-500 rounded-lg p-4 mb-3 h-20 flex items-end justify-center">
                <div className="text-center">
                  <TrophyIcon className="h-7 w-7 text-white mx-auto mb-1" />
                  <p className="text-sm font-bold text-white">3rd</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="font-semibold text-gray-900">{players[2]?.username}</p>
                <p className="text-sm text-gray-600">{players[2]?.totalPoints?.toLocaleString()} pts</p>
                <p className="text-xs text-gray-500">{players[2]?.totalWins} wins</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="card">
        <div className="space-y-3">
          {players.map((player, index) => {
            const rank = index + 1;
            const isCurrentUser = player.userId === user?.id;
            
            return (
              <div
                key={player.userId}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                  isCurrentUser 
                    ? 'bg-primary-50 border-2 border-primary-200' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getRankBadge(rank)}`}>
                    {getRankIcon(rank)}
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold text-gray-900">{player.username}</p>
                      {isCurrentUser && (
                        <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs font-medium">
                          You
                        </span>
                      )}
                      {rank <= 3 && (
                        <FireIcon className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {player.totalWins} wins • Last win: {
                        player.lastWinDate 
                          ? new Date(player.lastWinDate).toLocaleDateString()
                          : 'Never'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {player.totalPoints?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-gray-500">points</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {players.length === 0 && !loading && (
        <div className="text-center py-12">
          <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No rankings yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Play some games to appear on the leaderboard!
          </p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;