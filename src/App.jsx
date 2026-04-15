import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Dashboard from './Dashboard';
import Subscriptions from './Subscriptions';
import SendersTab from './SendersTab';
import BottomNav from './BottomNav';
import Login from './Login';
import { RefreshCw, AlertCircle, LogOut } from 'lucide-react';
import './App.css';

function App() {
  const { user, loading, handleLogout } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');

  // Data fetching (shared across all views)
  const [data, setData] = useState({
    tasks: [],
    subscriptions: [],
    flaggedEmails: [],
  });
  const [appLoading, setAppLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbyQ5tZz5So4exAfPrUS_OjZ9Q7nBQOdMh7gAazqOtIW1lcq2OmzKRwWDGUeEOnYWSj1IQ/exec';

  const fetchData = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}?action=dashboard`);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const jsonData = await response.json();
      setData(jsonData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setAppLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // While checking if user is logged in, show a loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, show Login
  if (!user) {
    return <Login />;
  }

  // If there's an error, show error screen
  if (error && appLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <AlertCircle className="w-5 h-5 text-red-500 inline mr-2" />
            <p className="text-red-700">Error loading data: {error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // If loading initial data, show loading screen
  if (appLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Main app content with tabs
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-24">
      {/* Header (shared across all views) */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Life Admin</h1>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw
                className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === 'tasks' && (
          <Dashboard
            data={data}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            lastUpdated={lastUpdated}
          />
        )}

        {activeTab === 'subscriptions' && (
          <Subscriptions
            data={data}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            lastUpdated={lastUpdated}
          />
        )}

        {activeTab === 'senders' && <SendersTab />}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
