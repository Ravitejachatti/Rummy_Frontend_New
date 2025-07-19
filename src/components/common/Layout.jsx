import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { logoutUser } from '../../store/slices/authSlice';
import { 
  HomeIcon, 
  TrophyIcon, 
  CurrencyDollarIcon, 
  UserIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const Layout = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { balance } = useSelector((state) => state.wallet);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Tables', href: '/tables', icon: HomeIcon },
    { name: 'Leaderboard', href: '/leaderboard', icon: TrophyIcon },
    { name: 'Wallet', href: '/wallet', icon: CurrencyDollarIcon },
  ];

  const adminNavigation = [
    { name: 'Admin Panel', href: '/admin', icon: Cog6ToothIcon },
  ];

  const isActive = (href) => location.pathname === href;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-600">Rummy Pro</h1>
        </div>
        
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </button>
              );
            })}
            
            {user?.role === 'admin' && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                {adminNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => navigate(item.href)}
                      className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Welcome back, {user?.username}!
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Balance display */}
              <div className="flex items-center space-x-2 bg-primary-50 px-3 py-1 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-primary-700">
                  {balance?.toLocaleString() || 0} chips
                </span>
              </div>
              
              {/* User menu */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <UserIcon className="h-5 w-5" />
                  <span>{user?.username}</span>
                  {user?.role === 'admin' && (
                    <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs font-medium">
                      Admin
                    </span>
                  )}
                </div>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;