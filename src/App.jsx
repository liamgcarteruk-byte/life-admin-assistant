import { useAuth } from './AuthContext';
import Dashboard from './Dashboard';
import Login from './Login';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './App.css';

function App() {
  const { user, loading } = useAuth();

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

  // If user is logged in, show Dashboard. Otherwise show Login
  return (
    <>
      {user ? <Dashboard /> : <Login />}
      <SpeedInsights />
    </>
  );
}

export default App;