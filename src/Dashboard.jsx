import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2, Clock, Plus } from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState({
    tasks: [],
    subscriptions: [],
    flaggedEmails: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // NEW: State for the task creation form
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'personal',
    priority: 'medium',
    due_date: '',
    description: '',
  });
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // NEW: State for handling task completion
  const [completingTaskId, setCompletingTaskId] = useState(null);

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
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  // NEW: MARK TASK COMPLETE
  const handleCompleteTask = async (task) => {
    setCompletingTaskId(task.task_id);
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete_task',
          task_id: task.task_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete task');
      }

      const result = await response.json();
      if (result.success) {
        setData((prevData) => ({
          ...prevData,
          tasks: prevData.tasks.filter((t) => t.task_id !== task.task_id),
        }));
        setTimeout(() => fetchData(), 500);
      }
    } catch (err) {
      console.error('Error completing task:', err);
      alert('Failed to complete task. Please try again.');
    } finally {
      setCompletingTaskId(null);
    }
  };

  // NEW: CREATE NEW TASK
  const handleCreateTask = async (e) => {
    e.preventDefault();

    if (!newTask.title.trim()) {
      alert('Please enter a task title');
      return;
    }

    setIsCreatingTask(true);
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_task',
          title: newTask.title,
          category: newTask.category,
          priority: newTask.priority,
          due_date: newTask.due_date,
          description: newTask.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const result = await response.json();
      if (result.success) {
        setNewTask({
          title: '',
          category: 'personal',
          priority: 'medium',
          due_date: '',
          description: '',
        });
        setShowNewTaskForm(false);
        await fetchData();
        alert('Task created successfully!');
      }
    } catch (err) {
      console.error('Error creating task:', err);
      alert('Failed to create task. Please try again.');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const isOverdue = (task) => {
    if (task.status === 'done') return false;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const getTodayDate = () => {
    const today = new Date();
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    return today.toLocaleDateString('en-US', options);
  };

  const isRenewalSoon = (subscription) => {
    const renewalDate = new Date(subscription.renewal_date);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return renewalDate > today && renewalDate <= thirtyDaysFromNow;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <AlertCircle className="w-5 h-5 text-red-500 inline mr-2" />
            <p className="text-red-700">Error loading dashboard: {error}</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Life Admin</h1>
            <p className="text-sm text-gray-500">{getTodayDate()}</p>
          </div>
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
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* NEW: Add Task Button and Form */}
        <div className="mb-6">
          {!showNewTaskForm ? (
            <button
              onClick={() => setShowNewTaskForm(true)}
              className="w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add New Task
            </button>
          ) : (
            <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm mb-4">
              <form onSubmit={handleCreateTask}>
                <h3 className="font-bold text-gray-900 mb-4">Create New Task</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Call dentist"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    placeholder="Add any details..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newTask.category}
                      onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="personal">Personal</option>
                      <option value="finance">Finance</option>
                      <option value="health">Health</option>
                      <option value="property">Property</option>
                      <option value="work">Work</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isCreatingTask}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors font-medium"
                  >
                    {isCreatingTask ? 'Creating...' : 'Create Task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewTaskForm(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <section className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Tasks</h2>

          {data.tasks && data.tasks.length > 0 ? (
            <div className="space-y-2">
              {data.tasks.map((task) => (
                <div
                  key={task.task_id}
                  className={`p-4 rounded-lg border-l-4 transition-colors ${
                    isOverdue(task)
                      ? 'bg-red-50 border-red-400'
                      : 'bg-white border-blue-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleCompleteTask(task)}
                      disabled={completingTaskId === task.task_id}
                      className="mt-1 flex-shrink-0 hover:opacity-70 transition-opacity"
                      title="Mark task complete"
                    >
                      <div className="w-5 h-5 rounded border-2 border-blue-400 hover:bg-blue-50 flex items-center justify-center transition-colors">
                        {completingTaskId === task.task_id && (
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                        )}
                      </div>
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium ${
                          isOverdue(task) ? 'text-red-900' : 'text-gray-900'
                        }`}>
                          {task.title}
                        </h3>
                        {isOverdue(task) && (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">{task.category}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Due: {formatDate(task.due_date)}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded flex-shrink-0 ${
                      task.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : task.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-600">No tasks for today! 🎉</p>
            </div>
          )}
        </section>

        {data.subscriptions_renewing && data.subscriptions_renewing.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming Renewals</h2>
            <div className="space-y-2">
              {data.subscriptions_renewing.map((sub) => (
                <div key={sub.subscription_id} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{sub.name}</h3>
                      <p className="text-sm text-gray-500">${sub.cost}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        isRenewalSoon(sub) ? 'text-orange-600' : 'text-gray-600'
                      }`}>
                        {formatDate(sub.renewal_date)}
                      </p>
                      {isRenewalSoon(sub) && (
                        <Clock className="w-4 h-4 text-orange-500 ml-auto mt-1" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.summary && data.summary.unread_flagged_emails > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Flagged Emails</h2>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-blue-900">
                You have <span className="font-bold">{data.summary.unread_flagged_emails}</span> flagged emails
              </p>
              <p className="text-sm text-blue-700 mt-2">Review them in Gmail to keep on top of important messages</p>
            </div>
          </section>
        )}

        {lastUpdated && (
          <div className="text-center mt-8 mb-4">
            <p className="text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;