import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getBalance, addChips, withdrawChips } from '../../store/slices/walletSlice';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { 
  CurrencyDollarIcon, 
  PlusIcon, 
  MinusIcon,
  CreditCardIcon,
  BanknotesIcon 
} from '@heroicons/react/24/outline';

const WalletManager = () => {
  const dispatch = useDispatch();
  const { balance, loading, error } = useSelector((state) => state.wallet);
  const { user } = useSelector((state) => state.auth);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    dispatch(getBalance());
  }, [dispatch]);

  const handleAddChips = (e) => {
    e.preventDefault();
    const chipAmount = parseInt(amount);
    if (chipAmount > 0) {
      dispatch(addChips(chipAmount)).then(() => {
        setShowAddModal(false);
        setAmount('');
      });
    }
  };

  const handleWithdrawChips = (e) => {
    e.preventDefault();
    const chipAmount = parseInt(amount);
    if (chipAmount > 0 && chipAmount <= balance) {
      dispatch(withdrawChips(chipAmount)).then(() => {
        setShowWithdrawModal(false);
        setAmount('');
      });
    }
  };

  const quickAmounts = [100, 500, 1000, 2500, 5000];

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Wallet</h1>
        <p className="text-gray-600 text-sm sm:text-base">Manage your chips and transactions</p>
      </div>

      <ErrorMessage message={error} />

      {/* Balance Card */}
      <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
          <div>
            <p className="text-primary-100 text-xs sm:text-sm">Current Balance</p>
            <div className="flex items-center mt-1 sm:mt-2">
              <CurrencyDollarIcon className="h-6 w-6 sm:h-8 sm:w-8 mr-2" />
              <span className="text-2xl sm:text-3xl font-bold">
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  balance?.toLocaleString() || 0
                )}
              </span>
              <span className="text-lg sm:text-xl ml-2">chips</span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-primary-100 text-xs sm:text-sm">Player</p>
            <p className="text-base sm:text-lg font-semibold">{user?.username}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-success-300 hover:border-success-400 p-4 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center text-success-600 space-y-2 sm:space-y-0">
            <PlusIcon className="h-6 w-6 sm:h-8 sm:w-8 sm:mr-3" />
            <div className="text-left">
              <h3 className="text-base sm:text-lg font-semibold text-center sm:text-left">Add Chips</h3>
              <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">Purchase more chips to play</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowWithdrawModal(true)}
          disabled={balance === 0}
          className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-warning-300 hover:border-warning-400 disabled:opacity-50 disabled:cursor-not-allowed p-4 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center text-warning-600 space-y-2 sm:space-y-0">
            <MinusIcon className="h-6 w-6 sm:h-8 sm:w-8 sm:mr-3" />
            <div className="text-left">
              <h3 className="text-base sm:text-lg font-semibold text-center sm:text-left">Withdraw Chips</h3>
              <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">Cash out your chips</p>
            </div>
          </div>
        </button>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center">
              <div className="bg-success-100 p-2 rounded-full mr-3">
                <PlusIcon className="h-4 w-4 text-success-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm sm:text-base">Chips Added</p>
                <p className="text-xs sm:text-sm text-gray-500">Today, 2:30 PM</p>
              </div>
            </div>
            <span className="text-success-600 font-semibold text-sm sm:text-base">+1,000</span>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center">
              <div className="bg-error-100 p-2 rounded-full mr-3">
                <MinusIcon className="h-4 w-4 text-error-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm sm:text-base">Game Entry</p>
                <p className="text-xs sm:text-sm text-gray-500">Today, 1:15 PM</p>
              </div>
            </div>
            <span className="text-error-600 font-semibold text-sm sm:text-base">-50</span>
          </div>
          
          <div className="text-center py-6">
            <p className="text-xs sm:text-sm text-gray-500">More transaction history coming soon</p>
          </div>
        </div>
      </div>

      {/* Add Chips Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <CreditCardIcon className="h-6 w-6 text-success-600 mr-2" />
              <h3 className="text-base sm:text-lg font-bold">Add Chips</h3>
            </div>
            
            <form onSubmit={handleAddChips} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Amount (Chips)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="input text-sm"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">Quick amounts:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {quickAmounts.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      type="button"
                      onClick={() => setAmount(quickAmount.toString())}
                      className="btn-secondary text-xs sm:text-sm py-1"
                    >
                      {quickAmount}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600">
                  <strong>Note:</strong> This is a demo. In a real application, this would integrate with a payment processor.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading || !amount}
                  className="btn-success flex-1 text-sm"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing...
                    </div>
                  ) : (
                    'Add Chips'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAmount('');
                  }}
                  className="btn-secondary flex-1 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Chips Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <BanknotesIcon className="h-6 w-6 text-warning-600 mr-2" />
              <h3 className="text-base sm:text-lg font-bold">Withdraw Chips</h3>
            </div>
            
            <form onSubmit={handleWithdrawChips} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Amount (Chips)
                </label>
                <input
                  type="number"
                  min="1"
                  max={balance}
                  required
                  className="input text-sm"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Available balance: {balance?.toLocaleString()} chips
                </p>
              </div>
              
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-600">
                  <strong>Note:</strong> This is a demo. In a real application, this would process a withdrawal to your bank account.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading || !amount || parseInt(amount) > balance}
                  className="btn-warning flex-1 text-sm"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing...
                    </div>
                  ) : (
                    'Withdraw Chips'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setAmount('');
                  }}
                  className="btn-secondary flex-1 text-sm"
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

export default WalletManager;