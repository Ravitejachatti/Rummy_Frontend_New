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
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const Layout = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { balance } = useSelector((state) => state.wallet);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

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

  const handleNavigation = (href) => {
    navigate(href);
    setSidebarOpen(false);
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <h1 className="text-lg sm:text-xl font-bold text-primary-600">Rummy Pro</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute right-4 lg:hidden"
          >
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
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
                      onClick={() => handleNavigation(item.href)}
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
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                Welcome back, {user?.username}!
              </h2>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Balance display */}
              <div className="hidden sm:flex items-center space-x-2 bg-primary-50 px-3 py-1 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-primary-700">
                  {balance?.toLocaleString() || 0} chips
                </span>
              </div>
              
              {/* Mobile balance display */}
              <div className="sm:hidden bg-primary-50 px-2 py-1 rounded-lg">
                <span className="text-xs font-medium text-primary-700">
                  {balance?.toLocaleString() || 0}
                </span>
              </div>
              
              {/* User menu */}
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
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
                  className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition-colors p-2 sm:p-1"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;