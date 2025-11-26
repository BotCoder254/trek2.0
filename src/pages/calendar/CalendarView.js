import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Filter,
  Plus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import TaskDetail from '../../components/tasks/TaskDetail';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CalendarView = () => {
  const { workspaceId } = useParams();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [view, setView] = useState('month'); // month, week, day

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate date range for API query
  const getDateRange = () => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  };

  // Fetch calendar tasks
  const { data: tasksData } = useQuery({
    queryKey: ['calendar-tasks', workspaceId, year, month],
    queryFn: async () => {
      const { start, end } = getDateRange();
      const response = await api.get(`/tasks/calendar`, {
        params: { workspaceId, start, end }
      });
      return response.data;
    },
    enabled: !!workspaceId
  });

  // Update task due date mutation
  const updateDueDateMutation = useMutation({
    mutationFn: async ({ taskId, dueDate }) => {
      const response = await api.patch(`/tasks/${taskId}`, { dueDate });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-tasks', workspaceId]);
    }
  });

  const tasks = tasksData?.data?.tasks || [];

  // Group tasks by date
  const tasksByDate = tasks.reduce((acc, task) => {
    if (task.dueDate) {
      const date = new Date(task.dueDate).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(task);
    }
    return acc;
  }, {});

  // Tasks without due dates
  const unscheduledTasks = tasks.filter(task => !task.dueDate);

  // Generate calendar days
  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Previous month days
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const days = getDaysInMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, date) => {
    e.preventDefault();
    if (draggedTask && date) {
      const newDueDate = date.toISOString();
      updateDueDateMutation.mutate({
        taskId: draggedTask._id,
        dueDate: newDueDate
      });
    }
    setDraggedTask(null);
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-secondary-light';
      case 'high': return 'border-l-4 border-warning-light';
      case 'medium': return 'border-l-4 border-info-light';
      default: return 'border-l-4 border-neutral-300';
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              Calendar
            </h1>
            <button
              onClick={handleToday}
              className="btn btn-secondary text-sm"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 min-w-[200px] text-center">
              {MONTHS[month]} {year}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn btn-secondary flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="card p-6">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {DAYS.map(day => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((date, index) => {
              const dateKey = date?.toDateString();
              const dayTasks = dateKey ? tasksByDate[dateKey] || [] : [];
              const isCurrentDay = isToday(date);

              return (
                <div
                  key={index}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, date)}
                  className={`min-h-[120px] border border-border-light dark:border-border-dark rounded-lg p-2 ${
                    !date ? 'bg-neutral-50 dark:bg-neutral-900' : 'bg-surface-light dark:bg-neutral-800'
                  } ${isCurrentDay ? 'ring-2 ring-primary-light dark:ring-primary-dark' : ''}`}
                >
                  {date && (
                    <>
                      <div className={`text-sm font-semibold mb-2 ${
                        isCurrentDay 
                          ? 'text-primary-light dark:text-primary-dark' 
                          : 'text-neutral-900 dark:text-neutral-100'
                      }`}>
                        {date.getDate()}
                      </div>

                      {/* Tasks */}
                      <div className="space-y-1">
                        {dayTasks.slice(0, 3).map((task) => (
                          <motion.div
                            key={task._id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            onClick={() => setSelectedTaskId(task._id)}
                            whileHover={{ scale: 1.02 }}
                            className={`text-xs p-1.5 rounded cursor-pointer bg-neutral-100 dark:bg-neutral-700 hover:shadow-md transition-all ${getPriorityColor(task.priority)}`}
                          >
                            <div className="font-medium truncate text-neutral-900 dark:text-neutral-100">
                              {task.title}
                            </div>
                            {task.projectId && (
                              <div className="text-neutral-600 dark:text-neutral-400 truncate text-xs mt-0.5">
                                {task.projectId.name}
                              </div>
                            )}
                          </motion.div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 pl-1">
                            +{dayTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Unscheduled Tasks */}
        {unscheduledTasks.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              No Due Date ({unscheduledTasks.length})
            </h3>
            <div className="card p-4">
              <div className="space-y-2">
                {unscheduledTasks.map((task) => (
                  <motion.div
                    key={task._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onClick={() => setSelectedTaskId(task._id)}
                    whileHover={{ scale: 1.01 }}
                    className={`p-3 rounded-lg cursor-pointer bg-neutral-100 dark:bg-neutral-800 hover:shadow-md transition-all ${getPriorityColor(task.priority)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {task.title}
                        </div>
                        {task.projectId && (
                          <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            {task.projectId.name}
                          </div>
                        )}
                      </div>
                      <CalendarIcon className="w-4 h-4 text-neutral-400" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Detail */}
      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
};

export default CalendarView;

