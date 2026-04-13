import React from 'react';
import { CheckSquare, CreditCard } from 'lucide-react';

const BottomNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-2xl mx-auto">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-3 px-4 transition-colors border-t-2 ${
                  isActive
                    ? 'border-t-blue-500 text-blue-600 bg-blue-50'
                    : 'border-t-transparent text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
