import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getBalance } from '../store/slices/walletSlice';
import { fetchTables } from '../store/slices/tableSlice';
import { fetchLeaderboard } from '../store/slices/leaderboardSlice';
import { 
  PlayIcon, 
  TrophyIcon, 
  CurrencyDollarIcon, 
  UsersIcon,
  ChartBarIcon,
  FireIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { balance } = useSelector((state) => state.wallet);
  const { tables } = useSelector((state) => state.table);
  const { players } = useSelector((state) => state.leaderboard);

  useEffect(() => {
    dispatch(getBalance());
    dispatch(fetchTables());
    dispatch(fetchLeaderboard());
  }, [dispatch]);

  const activeTables = tables.filter(table => table.isActive);
  const userRank = players.findIndex(player => player.userId === user?.id) + 1;

  const stats = [
    {
      name: 'Chip Balance',
      value: balance?.toLocaleString() || '0',
      icon: CurrencyDollarIcon,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
      action: () => navigate('/wallet'),
    },
    {
      name: 'Active Tables',
      value: activeTables.length,
      icon: PlayIcon,
      color: 'text-success-600',
      bgColor: 'bg-success-100',
      action: () => navigate('/tables'),
    },
    {
      name: 'Your Rank',
      value: userRank > 0 ? `#${userRank}` : 'Unranked',
      icon: TrophyIcon,
      color: 'text-warning-600',
      bgColor: 'bg-warning-100',
      action: () => navigate('/leaderboard'),
    },
    {
      name: 'Total Players',
      value: players.length,
      icon: UsersIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      action: () => navigate('/leaderboard'),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2">
              Welcome back, {user?.username}! 🎯
            </h1>
            <p className="text-primary-100 text-sm sm:text-base">
              Ready to play some Rummy? Check out the available tables below.
            </p>
          </div>
          <div className="text-left sm:text-right">
            {user?.role === 'admin' && (
              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              onClick={stat.action}
              className="card hover:shadow-lg transition-shadow cursor-pointer p-3 sm:p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0">
                <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor} self-start`}>
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                </div>
                <div className="sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Quick Play */}
        <div className="card">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Quick Play</h3>
            <PlayIcon className="h-5 w-5 text-primary-600" />
          </div>
          
          <div className="space-y-3">
            {activeTables.slice(0, 3).map((table) => (
              <div
                key={table._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer space-y-2 sm:space-y-0"
                 onClick={() => navigate(`/lobby/${table._id}`)}
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">{table.name}</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {table.minPlayers}-{table.maxPlayers} players • {table.chipValue} chips
                  </p>
                </div>
                <button className="btn-primary btn text-xs px-3 py-1 w-full sm:w-auto">
                  Join
                </button>
              </div>
            ))}
            
            {activeTables.length === 0 && (
              <div className="text-center py-6">
                <p className="text-gray-500">No active tables available</p>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => navigate('/tables')}
                    className="btn-primary mt-3 w-full sm:w-auto"
                  >
                    Create Table
                  </button>
                )}
              </div>
            )}
            
            {activeTables.length > 3 && (
              <button
                onClick={() => navigate('/tables')}
                className="w-full btn-secondary text-sm"
              >
                View All Tables
              </button>
            )}
          </div>
        </div>

        {/* Top Players */}
        <div className="card">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Top Players</h3>
            <TrophyIcon className="h-5 w-5 text-warning-600" />
          </div>
          
          <div className="space-y-3">
            {players.slice(0, 5).map((player, index) => (
              <div key={player.userId} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm sm:text-base">
                      {player.username}
                      {player.userId === user?.id && (
                        <span className="ml-1 sm:ml-2 text-xs text-primary-600">(You)</span>
                      )}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">{player.totalWins} wins</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">
                    {player.totalPoints?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">points</p>
                </div>
              </div>
            ))}
            
            {players.length === 0 && (
              <div className="text-center py-6">
                <p className="text-gray-500">No rankings yet</p>
              </div>
            )}
            
            <button
              onClick={() => navigate('/leaderboard')}
              className="w-full btn-secondary text-sm"
            >
              View Full Leaderboard
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Activity</h3>
          <ChartBarIcon className="h-5 w-5 text-gray-600" />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="bg-success-100 p-2 rounded-full">
              <FireIcon className="h-4 w-4 text-success-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm sm:text-base">Welcome to Rummy Pro!</p>
              <p className="text-xs sm:text-sm text-gray-600">Start playing to see your activity here</p>
            </div>
          </div>
          
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">
              Your game history and achievements will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;