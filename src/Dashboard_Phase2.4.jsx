import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2, Clock, Plus, Mic, MicOff, Send, X, Trash2, Eye, Shield } from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState({
    tasks: [],
    subscriptions: [],
    flaggedEmails: [],
    ignoredEmails: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // NEW: Tab state for Phase 2.4
  const [activeTab, setActiveTab] = useState('dashboard');

  // State for the task creation form
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'personal',
    priority: 'medium',
    due_date: '',
    description: '',
  });
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // State for handling task completion
  const [completingTaskId, setCompletingTaskId] = useState(null);

  // State for voice input
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);

  // NEW: State for managing ignored emails
  const [processingEmailId, setProcessingEmailId] = useState(null);
  const [ignoredEmailFilters, setIgnoredEmailFilters] = useState({
    reason: 'all', // 'all', 'spam', 'not_relevant', 'pending_review'
  });

  const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbyQ5tZz5So4exAfPrUS_OjZ9Q7nBQOdMh7gAazqOtIW1lcq2OmzKRwWDGUeEOnYWSj1IQ/exec';

  const fetchData = async () => {
    try {
      setError(null);
      const dashboardResponse = await fetch(`${API_BASE_URL}?action=dashboard`);
      const ignoredEmailsResponse = await fetch(`${API_BASE_URL}?action=ignored-emails`);

      if (!dashboardResponse.ok || !ignoredEmailsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const dashboardData = await dashboardResponse.json();
      const ignoredEmailsData = await ignoredEmailsResponse.json();

      setData({
        ...dashboardData,
        ignoredEmails: ignoredEmailsData.emails || [],
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch data:', err);
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

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceTranscript(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        setVoiceError(`Microphone error: ${event.error}`);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleMicrophoneClick = () => {
    if (!recognitionRef.current) {
      setVoiceError('Web Speech API not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setVoiceError(null);
      setVoiceTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleVoiceTaskSubmit = async () => {
    if (!voiceTranscript.trim()) {
      setVoiceError('Please speak a task description');
      return;
    }

    setIsCreatingTask(true);
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_task',
          title: voiceTranscript,
          category: 'personal',
          priority: 'medium',
          due_date: '',
          description: 'Created via voice input',
        }),
      });

      if (!response.ok) throw new Error('Failed to create task');

      const result = await response.json();
      if (result.success) {
        setVoiceTranscript('');
        setVoiceError(null);
        await fetchData();
        alert('Task created from voice input!');
      }
    } catch (err) {
      console.error('Error:', err);
      setVoiceError('Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleVoiceClear = () => {
    if (isListening) recognitionRef.current.stop();
    setIsListening(false);
    setVoiceTranscript('');
    setVoiceError(null);
  };

  const handleCompleteTask = async (task) => {
    setCompletingTaskId(task.task_id);
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_task', task_id: task.task_id }),
      });

      if (!response.ok) throw new Error('Failed to complete task');

      const result = await response.json();
      if (result.success) {
        setData((prevData) => ({
          ...prevData,
          tasks: prevData.tasks.filter((t) => t.task_id !== task.task_id),
        }));
        setTimeout(() => fetchData(), 500);
      }
    } catch (err) {
      alert('Failed to complete task');
    } finally {
      setCompletingTaskId(null);
    }
  };

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_task',
          title: newTask.title,
          category: newTask.category,
          priority: newTask.priority,
          due_date: newTask.due_date,
          description: newTask.description,
        }),
      });

      if (!response.ok) throw new Error('Failed to create task');

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
      alert('Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  // NEW: Manage ignored email actions
  const handleIgnoredEmailAction = async (emailId, sender, action) => {
    setProcessingEmailId(emailId);
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manage_ignored_email',
          sub_action: action,
          email_id: emailId,
          sender_email: sender,
          sender_name: sender?.split('@')[0],
        }),
      });

      if (!response.ok) throw new Error('Failed to process action');

      const result = await response.json();
      if (result.success) {
        await fetchData();
        alert(result.message || `Email ${action}d successfully`);
      } else {
        alert('Error: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to process action');
    } finally {
      setProcessingEmailId(null);
    }
  };

  const getFilteredIgnoredEmails = () => {
    if (ignoredEmailFilters.reason === 'all') {
      return data.ignoredEmails;
    }
    return data.ignoredEmails.filter((email) =>
      email.ignore_reason?.toLowerCase().includes(ignoredEmailFilters.reason)
    );
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
          <p className="text-gray-600">Loading dashboard...</p>
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
            <p className="text-red-700">Error: {error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Life Admin</h1>
            <p className="text-sm text-gray-500">{getTodayDate()}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* NEW: Tab Navigation */}
        <div className="max-w-2xl mx-auto px-4 border-t border-gray-100 flex gap-4">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'ignored-emails', label: `Ignored Emails (${data.ignoredEmails?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <>
            {/* Voice Input Section */}
            {!showNewTaskForm && (
              <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">Or use voice input:</p>
                    <div className={`p-3 rounded-lg border ${isListening ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                      <p className="text-sm text-gray-700">
                        {isListening ? '🎤 Listening...' : voiceTranscript || 'Click microphone to start'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleMicrophoneClick}
                    className={`p-3 rounded-lg transition-colors ${
                      isListening
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                </div>

                {voiceError && <p className="text-red-600 text-sm mt-2">{voiceError}</p>}

                {voiceTranscript && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleVoiceTaskSubmit}
                      disabled={isCreatingTask}
                      className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                    >
                      {isCreatingTask ? 'Creating...' : 'Create Task'}
                    </button>
                    <button
                      onClick={handleVoiceClear}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tasks Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">My Tasks</h2>
                {!showNewTaskForm && (
                  <button
                    onClick={() => setShowNewTaskForm(true)}
                    className="flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600"
                  >
                    <Plus size={18} /> Add Task
                  </button>
                )}
              </div>

              {showNewTaskForm && (
                <form
                  onSubmit={handleCreateTask}
                  className="mb-6 bg-white rounded-lg border border-gray-200 p-4"
                >
                  <input
                    type="text"
                    placeholder="Task title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-lg h-20"
                  />
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <select
                      value={newTask.category}
                      onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option>personal</option>
                      <option>work</option>
                      <option>health</option>
                      <option>financial</option>
                    </select>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option>low</option>
                      <option>medium</option>
                      <option>high</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isCreatingTask}
                      className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                    >
                      {isCreatingTask ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewTaskForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {data.tasks && data.tasks.length > 0 ? (
                <div className="space-y-3">
                  {data.tasks.map((task) => (
                    <div
                      key={task.task_id}
                      className={`p-4 rounded-lg border ${isOverdue(task) ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{task.title}</h3>
                        <button
                          onClick={() => handleCompleteTask(task)}
                          disabled={completingTaskId === task.task_id}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <CheckCircle2
                            size={20}
                            className={
                              completingTaskId === task.task_id
                                ? 'text-gray-400 animate-spin'
                                : 'text-gray-400 hover:text-green-500'
                            }
                          />
                        </button>
                      </div>
                      {task.description && <p className="text-sm text-gray-600 mb-2">{task.description}</p>}
                      <div className="flex gap-3 text-xs text-gray-500">
                        {task.due_date && <span>{formatDate(task.due_date)}</span>}
                        <span className="capitalize">{task.category}</span>
                        <span className="capitalize">{task.priority} priority</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No pending tasks</p>
              )}
            </div>
          </>
        )}

        {/* NEW: IGNORED EMAILS TAB */}
        {activeTab === 'ignored-emails' && (
          <div>
            <div className="mb-4">
              <label className="text-sm text-gray-600 mb-2 block">Filter by reason:</label>
              <select
                value={ignoredEmailFilters.reason}
                onChange={(e) => setIgnoredEmailFilters({ reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All ignored emails</option>
                <option value="spam">Spam</option>
                <option value="not_relevant">Not relevant</option>
                <option value="pending">Pending approval</option>
              </select>
            </div>

            {getFilteredIgnoredEmails().length > 0 ? (
              <div className="space-y-3">
                {getFilteredIgnoredEmails().map((email) => (
                  <div
                    key={email.email_id}
                    className="bg-white rounded-lg border border-gray-200 p-4"
                  >
                    <div className="mb-3">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold text-gray-900">{email.subject}</h3>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {email.ignore_reason}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{email.from}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(email.received_at)}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleIgnoredEmailAction(email.email_id, email.from, 'approve')}
                        disabled={processingEmailId === email.email_id}
                        className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm"
                      >
                        <Eye size={14} /> Approve
                      </button>
                      <button
                        onClick={() => handleIgnoredEmailAction(email.email_id, email.from, 'whitelist_sender')}
                        disabled={processingEmailId === email.email_id}
                        className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm"
                      >
                        <Shield size={14} /> Whitelist Sender
                      </button>
                      <button
                        onClick={() => handleIgnoredEmailAction(email.email_id, email.from, 'delete')}
                        disabled={processingEmailId === email.email_id}
                        className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No ignored emails</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
