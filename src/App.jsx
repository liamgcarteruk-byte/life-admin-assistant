import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Dashboard from './Dashboard';
import Subscriptions from './Subscriptions';
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
  