import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Clock, Trash2 } from 'lucide-react';

const Subscriptions = ({ data, onRefresh, isRefreshing, lastUpdated }) => {
  // Filtering state
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('renewal'); // 'renewal', 'cost', 'name'

  // Extract unique categories from subscriptions (dynamic)
  const allCategories = React.useMemo(() => {
    if (!data.subscriptions || data.subscriptions.length === 0) return [];
    const categories = new Set(
      data.subscriptions.map((sub) => sub.category).filter(Boolean)
    );
    return Array.from(categories).sort();
  }, [data.subscriptions]);

  // Check if a subscription is renewing soon (within 30 days)
  const isRenewalSoon = (subscription) => {
    const renewalDate = new Date(subscription.renewal_date);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return renewalDate > today && renewalDate <= thirtyDaysFromNow;
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Parse cost to number (handle currency strings like "$9.99")
  const parseCost = (costString) => {
    if (!costString) return 0;
    return parseFloat(String(costString).replace(/[^0-9.]/g, '')) || 0;
  };

  // Toggle category filter
  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Filter and sort subscriptions
  const filteredSubscriptions = React.useMemo(() => {
    let filtered = data.subscriptions || [];

    // Filter by status (hide cancelled by default)
    if (!showCancelled) {
      filtered = filtered.filter((sub) => sub.status !== 'cancelled');
    }

    // Filter by selected categories (if any are selected)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((sub) => selectedCategories.includes(sub.category));
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'renewal') {
        return new Date(a.renewal_date) - new Date(b.renewal_date);
      } else if (sortBy === 'cost') {
        return parseCost(b.cost) - parseCost(a.cost); // Descending (expensive first)
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return sorted;
  }, [data.subscriptions, showCancelled, selectedCategories, sortBy]);

  // Calculate total costs for filtered subscriptions
  const calculateTotalCosts = () => {
    let monthlyCost = 0;
    let yearlyCost = 0;

    filteredSubscriptions.forEach((sub) => {
      const cost = parseCost(sub.cost);
      const billingPeriod = (sub.billing_period || 'monthly').toLowerCase();

      if (billingPeriod === 'monthly') {
        monthlyCost += cost;
        yearlyCost += cost * 12;
      } else if (billingPeriod === 'yearly') {
        yearlyCost += cost;
        monthlyCost += cost / 12;
      } else if (billingPeriod === 'quarterly') {
        yearlyCost += cost * 4;
        monthlyCost += (cost * 4) / 12;
      }
    });

    return {
      monthly: monthlyCost.toFixed(2),
      yearly: yearlyCost.toFixed(2),
    };
  };

  const costs = calculateTotalCosts();

  if (!data.subscriptions || data.subscriptions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No subscriptions yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Add some subscriptions to track your recurring payments
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Cost Summary */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-md">
        <p className="text-blue-100 text-sm mb-1">Monthly Spending</p>
        <h3 className="text-4xl font-bold mb-4">${costs.monthly}</h3>
        <p className="text-blue-100 text-sm">
          Yearly: <span className="font-semibold">${costs.yearly}</span>
        </p>
        {selectedCategories.length > 0 && (
          <p className="text-xs text-blue-100 mt-3 italic">
            ⓘ Filtered by {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Filter by Category</h3>

        {allCategories.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {allCategories.map((category) => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategories.includes(category)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4">No categories available</p>
        )}

        {/* Sorting */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="renewal">Next Renewal Date</option>
            <option value="cost">Cost (High to Low)</option>
            <option value="name">Name (A to Z)</option>
          </select>
        </div>

        {/* Show Cancelled Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showCancelled"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
            className="w-4 h-4 text-blue-500 rounded cursor-pointer"
          />
          <label htmlFor="showCancelled" className="text-sm text-gray-700 cursor-pointer">
            Show cancelled subscriptions
          </label>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="space-y-3">
        {filteredSubscriptions.length > 0 ? (
          filteredSubscriptions.map((sub) => (
            <div
              key={sub.subscription_id}
              className={`rounded-lg p-4 border transition-colors ${
                sub.status === 'cancelled'
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : isRenewalSoon(sub)
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold text-gray-900 truncate ${
                      sub.status === 'cancelled' ? 'line-through text-gray-500' : ''
                    }`}>
                      {sub.name}
                    </h3>
                    {sub.status === 'cancelled' && (
                      <Trash2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>

                  {sub.description && (
                    <p className="text-sm text-gray-600 mt-1">{sub.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {sub.category && (
                      <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                        {sub.category}
                      </span>
                    )}
                    {sub.billing_period && (
                      <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                        {sub.billing_period}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Started: {formatDate(sub.start_date)}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900">
                    ${parseCost(sub.cost).toFixed(2)}
                  </p>
                  <div className="flex items-center gap-1 mt-2 justify-end text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(sub.renewal_date)}</span>
                  </div>
                  {isRenewalSoon(sub) && (
                    <p className="text-xs text-orange-600 font-medium mt-2">⚠️ Renews soon</p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No subscriptions match your filters</p>
          </div>
        )}
      </div>

      {lastUpdated && (
        <div className="text-center pb-4">
          <p className="text-xs text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
