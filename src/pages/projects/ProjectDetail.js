import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, ChevronDown, ChevronRight, Loader, Settings,
  CheckCircle, Circle, Clock, Flag, MoreVertical, List, LayoutGrid
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../services/projectService';
import KanbanBoard from '../../components/kanban/KanbanBoard';
import TaskDetail from '../../components/tasks/TaskDetail';
import TaskFilters from '../../components/filters/TaskFilters';

const ProjectDetail = () => {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedEpic, setSelectedEpic] = useState(null);
  const [expandedEpics, setExpandedEpics] = useState({});
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium' });
  const [filters, setFilters] = useState({});

  // Fetch project
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId)
  });

  // Fetch epics
  const { data: epicsData } = useQuery({
    queryKey: ['epics', projectId],
    queryFn: () => projectService.getProjectEpics(projectId),
    enabled: !!projectId
  });

  // Fetch tasks
  const { data: tasksData } = useQuery({
    queryKey: ['tasks', projectId, selectedEpic, filters],
    queryFn: () => {
      if (!projectId || typeof projectId !== 'string' || projectId.length !== 24) {
        throw new Error('Invalid project ID');
      }
      return projectService.getProjectTasks(projectId, { 
        ...(selectedEpic ? { epicId: selectedEpic } : {}),
        ...filters
      });
    },
    enabled: !!projectId
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data) => projectService.createTask({ ...data, projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', projectId]);
      queryClient.invalidateQueries(['epics', projectId]);
      queryClient.invalidateQueries(['project', projectId]);
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', priority: 'medium' });
    }
  });

  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }) => projectService.updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', projectId]);
      queryClient.invalidateQueries(['epics', projectId]);
      queryClient.invalidateQueries(['project', projectId]);
    }
  });

  const project = projectData?.data?.project;
  const epics = epicsData?.data?.epics || [];
  const tasks = tasksData?.data?.tasks || [];

  const toggleEpic = (epicId) => {
    setExpandedEpics(prev => ({ ...prev, [epicId]: !prev[epicId] }));
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    createTaskMutation.mutate({
      ...taskForm,
      epicId: selectedEpic
    });
  };

  const handleStatusChange = (taskId, status) => {
    updateStatusMutation.mutate({ taskId, status });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done': return <CheckCircle className="w-5 h-5 text-success-light" />;
      case 'in-progress': return <Circle className="w-5 h-5 text-info-light" />;
      case 'in-review': return <Clock className="w-5 h-5 text-warning-light" />;
      default: return <Circle className="w-5 h-5 text-neutral-400" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-secondary-light';
      case 'high': return 'text-warning-light';
      case 'medium': return 'text-info-light';
      default: return 'text-neutral-400';
    }
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-light dark:text-primary-dark" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/projects`)}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: project?.color }}
            >
              {project?.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {project?.name}
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                {project?.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-surface-light dark:bg-neutral-700 text-primary-light dark:text-primary-dark'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'kanban'
                      ? 'bg-surface-light dark:bg-neutral-700 text-primary-light dark:text-primary-dark'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                  title="Kanban view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => navigate(`/workspace/${workspaceId}/projects/${projectId}/settings`)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Settings className="w-5 h-5" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-neutral-600 dark:text-neutral-400">Overall Progress</span>
              <span className="font-semibold">{project?.progress}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-light dark:bg-primary-dark transition-all duration-500"
                style={{ width: `${project?.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Filters */}
        <TaskFilters 
          filters={filters}
          onFiltersChange={setFilters}
          projectId={projectId}
          canSaveWorkspaceWide={true}
        />

        {viewMode === 'kanban' ? (
          /* Kanban View */
          <div className="mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Board View
              </h2>
              <button
                onClick={() => setShowTaskModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Task</span>
              </button>
            </div>
            <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
              <KanbanBoard 
                tasks={tasks} 
                projectId={projectId}
                onTaskClick={(task) => setSelectedTaskId(task._id)}
              />
            </div>
          </div>
        ) : (
          /* List View */
          <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Epics */}
          <div className="lg:w-80 space-y-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Epics
              </h2>
              <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* All Tasks Option */}
            <button
              onClick={() => setSelectedEpic(null)}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                selectedEpic === null
                  ? 'bg-primary-light/10 dark:bg-primary-dark/10 text-primary-light dark:text-primary-dark'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <span className="font-medium">All Tasks</span>
              <span className="badge bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100">
                {tasks.length}
              </span>
            </button>

            {/* Epic List */}
            {epics.map((epic) => (
              <div key={epic._id} className="card p-0 overflow-hidden">
                <button
                  onClick={() => {
                    toggleEpic(epic._id);
                    setSelectedEpic(epic._id);
                  }}
                  className={`w-full flex items-center justify-between p-3 transition-colors ${
                    selectedEpic === epic._id
                      ? 'bg-primary-light/10 dark:bg-primary-dark/10'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {expandedEpics[epic._id] ? (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    )}
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: epic.color }}
                    />
                    <span className="font-medium text-left truncate">{epic.title}</span>
                  </div>
                  <span className="text-xs font-medium ml-2">{epic.progress}%</span>
                </button>
                
                <AnimatePresence>
                  {expandedEpics[epic._id] && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 border-t border-border-light dark:border-border-dark bg-neutral-50 dark:bg-neutral-800">
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                          {epic.description || 'No description'}
                        </p>
                        <div className="text-xs text-neutral-500 dark:text-neutral-500">
                          {epic.taskCount} tasks • {epic.completedTasks} completed
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Right: Tasks */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Tasks {selectedEpic && `• ${epics.find(e => e._id === selectedEpic)?.title}`}
              </h2>
              <button
                onClick={() => setShowTaskModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Task</span>
              </button>
            </div>

            {/* Task List */}
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <motion.div
                  key={task._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedTaskId(task._id)}
                  className="card p-4 hover:shadow-elevated transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => {
                        const nextStatus = task.status === 'done' ? 'todo' : 
                                         task.status === 'todo' ? 'in-progress' :
                                         task.status === 'in-progress' ? 'in-review' : 'done';
                        handleStatusChange(task._id, nextStatus);
                      }}
                      className="mt-1"
                    >
                      {getStatusIcon(task.status)}
                    </button>
                    
                    <div className="flex-1">
                      <h3 className={`font-medium mb-1 ${
                        task.status === 'done' 
                          ? 'line-through text-neutral-500' 
                          : 'text-neutral-900 dark:text-neutral-100'
                      }`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                          {task.description}
                        </p>
                      )}
                      
                      {/* Labels */}
                      {task.labels && task.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {task.labels.slice(0, 4).map((label) => (
                            <span
                              key={label._id}
                              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: label.color }}
                            >
                              {label.name}
                            </span>
                          ))}
                          {task.labels.length > 4 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                              +{task.labels.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                          <Flag className="w-3 h-3" />
                          {task.priority}
                        </span>
                        {task.epicId && (
                          <span className="flex items-center gap-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: task.epicId.color }}
                            />
                            {task.epicId.title}
                          </span>
                        )}
                        {task.assignees?.length > 0 && (
                          <div className="flex -space-x-1">
                            {task.assignees.slice(0, 3).map((assignee, i) => (
                              <div
                                key={i}
                                className="w-5 h-5 rounded-full bg-primary-light text-white text-xs flex items-center justify-center ring-2 ring-surface-light dark:ring-surface-dark"
                              >
                                {assignee.firstName?.[0]}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {tasks.length === 0 && (
                <div className="card p-12 text-center">
                  <p className="text-neutral-600 dark:text-neutral-400">
                    No tasks yet. Create your first task to get started.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-semibold mb-4">Create Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="label">Task Title</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="input"
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input resize-none"
                  rows="3"
                  placeholder="Task details..."
                />
              </div>
              <div>
                <label className="label">Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                  className="input"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="flex-1 btn btn-primary"
                >
                  {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Task Detail Slideout */}
      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          projectId={projectId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
};

export default ProjectDetail;

