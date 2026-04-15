import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2, Clock, Plus, Mic, MicOff, Send, X, ChevronDown } from 'lucide-react';
const Dashboard = ({ data = {}, onRefresh, isRefreshing = false, lastUpdated = null }) => {
  // Local state for UI interactions only (not data fetching)
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

  // State for expanded task descriptions
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const toggleExpand = (taskId) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  // NEW: State for voice input (Session 1.5)
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);

  // Use data from props (no duplicate fetch needed)
  const tasks = data?.tasks || [];
  const subscriptions = data?.subscriptions || [];
  const flaggedEmails = data?.flaggedEmails || [];
  const subscriptionsRenewing = data?.subscriptions_renewing || [];
  const summary = data?.summary || {};

  // NEW: Initialize Web Speech API (Session 1.5)
  useEffect(() => {
    // Check if the browser supports Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();

      // When speech is recognized, update the transcript
      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        // Loop through the recognized results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceTranscript(transcript);
      };

      // Handle errors
      recognitionRef.current.onerror = (event) => {
        setVoiceError(`Microphone error: ${event.error}`);
      };

      // When recognition ends, stop the listening state
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // NEW: Handle microphone button press (Session 1.5)
  const handleMicrophoneClick = () => {
    if (!recognitionRef.current) {
      setVoiceError('Web Speech API not supported in this browser');
      return;
    }

    if (isListening) {
      // Stop listening
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Start listening
      setVoiceError(null);
      setVoiceTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // NEW: Handle voice input confirmation (creates task from voice)
  const handleVoiceTaskSubmit = async () => {
    if (!voiceTranscript.trim()) {
      setVoiceError('Please speak a task description');
      return;
    }

    setIsCreatingTask(true);
    try {
      const response = await fetch('/api/add-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_task',
          title: voiceTranscript,
          category: 'personal',
          priority: 'medium',
          due_date: '',
          description: 'Created via voice input',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const result = await response.json();
      if (result.success) {
        setVoiceTranscript('');
        setVoiceError(null);
        alert('Task created from voice input!');
        onRefresh();
      }
    } catch (err) {
      console.error('Error creating voice task:', err);
      setVoiceError('Failed to create task. Please try again.');
    } finally {
      setIsCreatingTask(false);
    }
  };

  // NEW: Cancel voice input
  const handleVoiceClear = () => {
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    setVoiceTranscript('');
    setVoiceError(null);
  };

  // NEW: MARK TASK COMPLETE
  const handleCompleteTask = async (task) => {
    setCompletingTaskId(task.task_id);
    try {
      const response = await fetch('/api/complete-task', {
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
        // Task is removed from the optimistic update below
        // No need to wait 500ms or refetch - the task is already hidden
        onRefresh();
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
      const response = await fetch('/api/add-task', {
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
        alert('Task created successfully!');
        onRefresh();
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

  return (
    <>

        {/* NEW: Voice Input Section (Session 1.5) */}
        {voiceTranscript || isListening || voiceError ? (
          <div className="mb-6 bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Voice Input</h3>

            {voiceError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">{voiceError}</p>
              </div>
            )}

            <div className="mb-4 flex justify-center">
              <button
                onClick={handleMicrophoneClick}
                className={`p-4 rounded-full transition-all ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg scale-110'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
                title={isListening ? 'Stop recording' : 'Start recording'}
              >
                {isListening ? (
                  <Mic className="w-6 h-6 animate-pulse" />
                ) : (
                  <MicOff className="w-6 h-6" />
                )}
              </button>
            </div>

            {isListening && (
              <p className="text-center text-sm text-gray-500 mb-3 animate-pulse">
                Listening... Speak now
              </p>
            )}

            {voiceTranscript && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your task:
                </label>
                <textarea
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                  placeholder="Edit your transcribed task here..."
                />
                <p className="text-xs text-gray-400 mt-1">You can edit the text before confirming</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleVoiceTaskSubmit}
                disabled={isCreatingTask || !voiceTranscript.trim()}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isCreatingTask ? 'Saving...' : 'Confirm & Save'}
              </button>
              <button
                onClick={handleVoiceClear}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {/* NEW: Add Task Button and Form */}
        <div className="mb-6">
          {!showNewTaskForm ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewTaskForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-500 text-blue-600 text-sm rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
              <button
                onClick={handleMicrophoneClick}
                className="p-1.5 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                title="Create task with voice input"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
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

          {tasks && tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.task_id}
                  className={`px-4 py-3 rounded-lg border-l-4 transition-colors ${
                    isOverdue(task)
                      ? 'bg-red-50 border-red-400'
                      : 'bg-white border-blue-400'
                  }`}
                >
                  {/* Inline row */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCompleteTask(task)}
                      disabled={completingTaskId === task.task_id}
                      className="flex-shrink-0 hover:opacity-70 transition-opacity"
                      title="Mark task complete"
                    >
                      <div className="w-5 h-5 rounded border-2 border-blue-400 hover:bg-blue-50 flex items-center justify-center transition-colors">
                        {completingTaskId === task.task_id && (
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                        )}
                      </div>
                    </button>

                    <span className={`flex-1 font-medium text-sm ${
                      isOverdue(task) ? 'text-red-900' : 'text-gray-900'
                    }`}>
                      {task.title}
                    </span>

                    {isOverdue(task) && (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded flex-shrink-0">
                        OVERDUE
                      </span>
                    )}

                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatDate(task.due_date)}
                    </span>

                    <span className={`text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 ${
                      task.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : task.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {task.priority.toUpperCase()}
                    </span>

                    {task.description && (
                      <button
                        onClick={() => toggleExpand(task.task_id)}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                        title={expandedTasks.has(task.task_id) ? 'Collapse' : 'Expand'}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                          expandedTasks.has(task.task_id) ? 'rotate-180' : ''
                        }`} />
                      </button>
                    )}
                  </div>

                  {/* Expandable description */}
                  {task.description && expandedTasks.has(task.task_id) && (
                    <div className="mt-2 ml-8 text-sm text-gray-600 leading-relaxed">
                      {task.description}
                    </div>
                  )}
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

        {subscriptionsRenewing && subscriptionsRenewing.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming Renewals</h2>
            <div className="space-y-2">
              {subscriptionsRenewing.map((sub) => (
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

        {summary && summary.unread_flagged_emails > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Flagged Emails</h2>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-blue-900">
                You have <span className="font-bold">{summary.unread_flagged_emails}</span> flagged emails
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
    </>
  );
};

export default Dashboard;
