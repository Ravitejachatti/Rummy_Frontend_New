import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchTables, createTable } from '../../store/slices/tableSlice';
import { getBalance } from '../../store/slices/walletSlice';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { PlusIcon, PlayIcon, UsersIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const TableList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tables, loading, error, createLoading } = useSelector((state) => state.table);
  const { user } = useSelector((state) => state.auth);
  const { balance } = useSelector((state) => state.wallet);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTable, setNewTable] = useState({
    name: '',
    bankRange: 100,
    minPlayers: 2,
    maxPlayers: 6,
    chipValue: 10,
  });

  useEffect(() => {
    dispatch(fetchTables());
    dispatch(getBalance());
  }, [dispatch]);

  const handleCreateTable = (e) => {
    e.preventDefault();
    dispatch(createTable(newTable)).then((result) => {
      if (createTable.fulfilled.match(result)) {
        setShowCreateModal(false);
        setNewTable({
          name: '',
          bankRange: 100,
          minPlayers: 2,
          maxPlayers: 6,
          chipValue: 10,
        });
        dispatch(fetchTables());
      }
    });
  };

  const handleJoinTable = (tableId) => {
    navigate(`/game/${tableId}`);
  };

  const canJoinTable = (table) => {
    return balance >= table.chipValue;
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
          <h1 className="text-2xl font-bold text-gray-900">Game Tables</h1>
          <p className="text-gray-600">Choose a table to start playing</p>
        </div>
        
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Table
          </button>
        )}
      </div>

      <ErrorMessage message={error} onRetry={() => dispatch(fetchTables())} />

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((table) => (
          <div key={table._id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{table.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                table.isActive ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {table.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                <span>Entry: {table.chipValue} chips</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <UsersIcon className="h-4 w-4 mr-2" />
                <span>{table.minPlayers}-{table.maxPlayers} players</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                <span>Bank Range: {table.bankRange}</span>
              </div>
            </div>
            
            <button
              onClick={() => handleJoinTable(table._id)}
              disabled={!table.isActive || !canJoinTable(table)}
              className={`w-full btn ${
                table.isActive && canJoinTable(table)
                  ? 'btn-primary'
                  : 'btn-secondary opacity-50 cursor-not-allowed'
              }`}
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              {!canJoinTable(table) ? 'Insufficient Chips' : 'Join Table'}
            </button>
          </div>
        ))}
      </div>

      {tables.length === 0 && !loading && (
        <div className="text-center py-12">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tables available</h3>
          <p className="mt-1 text-sm text-gray-500">
            {user?.role === 'admin' ? 'Create the first table to get started.' : 'Check back later for available tables.'}
          </p>
        </div>
      )}

      {/* Create Table Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Create New Table</h3>
            
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Name
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={newTable.name}
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                  placeholder="Enter table name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Players
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="6"
                    required
                    className="input"
                    value={newTable.minPlayers}
                    onChange={(e) => setNewTable({ ...newTable, minPlayers: parseInt(e.target.value) })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Players
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="6"
                    required
                    className="input"
                    value={newTable.maxPlayers}
                    onChange={(e) => setNewTable({ ...newTable, maxPlayers: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entry Fee (Chips)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="input"
                  value={newTable.chipValue}
                  onChange={(e) => setNewTable({ ...newTable, chipValue: parseInt(e.target.value) })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Range
                </label>
                <input
                  type="number"
                  min="10"
                  required
                  className="input"
                  value={newTable.bankRange}
                  onChange={(e) => setNewTable({ ...newTable, bankRange: parseInt(e.target.value) })}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="btn-primary flex-1"
                >
                  {createLoading ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating...
                    </div>
                  ) : (
                    'Create Table'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableList;