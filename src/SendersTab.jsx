import React, { useState, useEffect } from 'react';

export default function SendersTab() {
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'whitelist', 'blacklist', 'pending'

  useEffect(() => {
    fetchSenders();
  }, []);

  const fetchSenders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://script.google.com/macros/s/AKfycbyQ5tZz5So4exAfPrUS_OjZ9Q7nBQOdMh7gAazqOtIW1lcq2OmzKRwWDGUeEOnYWSj1IQ/exec?action=senders`);
      const data = await response.json();

      if (data.success) {
        // Sort: pending first, then alphabetically
        const sorted = (data.senders || []).sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return a.email.localeCompare(b.email);
        });
        setSenders(sorted);
      } else {
        setError('Failed to load senders');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetStatus = async (email, newStatus) => {
    try {
      const response = await fetch('/api/manage-sender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manage_sender',
          sender_email: email,
          status: newStatus
        })
      });

      if (response.ok) {
        // Update local state immediately
        setSenders(senders.map(s =>
          s.email === email ? { ...s, status: newStatus } : s
        ));
      } else {
        alert('Failed to update sender status');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'whitelist':
        return 'text-green-600';
      case 'blacklist':
        return 'text-red-600';
      case 'pending':
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'whitelist':
        return 'bg-green-50 hover:bg-green-100';
      case 'blacklist':
        return 'bg-red-50 hover:bg-red-100';
      case 'pending':
        return 'bg-amber-50 hover:bg-amber-100';
      default:
        return 'bg-gray-50 hover:bg-gray-100';
    }
  };

  const filteredSenders = filter === 'all'
    ? senders
    : senders.filter(s => s.status === filter);

  if (loading) return <div className="p-4 text-center text-gray-500">Loading senders...</div>;
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Email Senders</h2>
        <p className="text-sm text-gray-500">Click to cycle: Pending → Whitelisted → Blacklisted → Pending</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['all', 'pending', 'whitelist', 'blacklist'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === f
                ? `border-gray-900 text-gray-900`
                : `border-transparent text-gray-600 hover:text-gray-900`
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'all' ? ` (${senders.length})` : ` (${senders.filter(s => s.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Senders List */}
      {filteredSenders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {filter === 'all'
            ? 'No senders tracked yet'
            : `No ${filter} senders`}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredSenders.map(sender => (
            <div
              key={sender.email}
              className={`w-full flex items-center justify-between px-3 py-2 rounded transition-colors ${getStatusBg(sender.status)}`}
            >
              <span className="text-sm truncate font-mono flex-1">{sender.email}</span>
              <div className="flex gap-1 ml-2">
                {/* Pending Button */}
                <button
                  onClick={() => handleSetStatus(sender.email, 'pending')}
                  className={`w-7 h-7 rounded flex items-center justify-center text-xs transition-all ${
                    sender.status === 'pending'
                      ? 'bg-amber-100 text-amber-600 font-bold border border-amber-300'
                      : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                  }`}
                  title="Mark as Pending"
                >
                  ?
                </button>
                {/* Whitelist Button */}
                <button
                  onClick={() => handleSetStatus(sender.email, 'whitelist')}
                  className={`w-7 h-7 rounded flex items-center justify-center text-xs transition-all ${
                    sender.status === 'whitelist'
                      ? 'bg-green-100 text-green-600 font-bold border border-green-300'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                  title="Whitelist"
                >
                  ✓
                </button>
                {/* Blacklist Button */}
                <button
                  onClick={() => handleSetStatus(sender.email, 'blacklist')}
                  className={`w-7 h-7 rounded flex items-center justify-center text-xs transition-all ${
                    sender.status === 'blacklist'
                      ? 'bg-red-100 text-red-600 font-bold border border-red-300'
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                  title="Blacklist"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 text-xs text-gray-500 border-t pt-4">
        <p><strong>Whitelisted:</strong> Emails processed normally</p>
        <p><strong>Blacklisted:</strong> Emails excluded from processing</p>
        <p><strong>Pending:</strong> Not yet classified</p>
      </div>
    </div>
  );
}
