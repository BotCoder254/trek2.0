import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, Trash2, Flag, Calendar, Clock, Users, Paperclip,
  MessageSquare, CheckSquare, Plus, MoreVertical, Send, Smile,
  ThumbsUp, Heart, Laugh, Frown, AlertCircle, Image as ImageIcon,
  Link2, History
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../services/projectService';
import FileUploader from '../attachments/FileUploader';
import ImageGallery from '../attachments/ImageGallery';
import TaskDependencies from './TaskDependencies';
import TaskHistory from './TaskHistory';
import BlockedBadge from './BlockedBadge';
import LabelManager from '../labels/LabelManager';
import LabelChip from '../labels/LabelChip';

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-neutral-400' },
  { value: 'medium', label: 'Medium', color: 'text-info-light' },
  { value: 'high', label: 'High', color: 'text-warning-light' },
  { value: 'urgent', label: 'Urgent', color: 'text-secondary-light' }
];

const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'in-review', label: 'In Review' },
  { value: 'done', label: 'Done' }
];

const TaskDetail = ({ taskId, projectId, onClose, canEdit = true }) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [newComment, setNewComment] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [showReactions, setShowReactions] = useState(null);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // details, dependencies, history
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const REACTIONS = [
    { icon: ThumbsUp, label: 'like', color: 'text-info-light' },
    { icon: Heart, label: 'love', color: 'text-secondary-light' },
    { icon: Laugh, label: 'haha', color: 'text-warning-light' },
    { icon: Frown, label: 'sad', color: 'text-neutral-500' },
    { icon: AlertCircle, label: 'wow', color: 'text-primary-light' }
  ];

  // Fetch task details
  const { data: taskData, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => projectService.getTask(taskId),
    enabled: !!taskId
  });

  // Fetch project to get workspaceId
  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled: !!projectId
  });

  // Fetch workspace members
  const { data: membersData } = useQuery({
    queryKey: ['workspace-members', projectData?.data?.project?.workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${projectData?.data?.project?.workspaceId}/members`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.json();
    },
    enabled: !!projectData?.data?.project?.workspaceId
  });

  // Update formData when task data changes
  React.useEffect(() => {
    if (taskData?.data?.task) {
      setFormData(taskData.data.task);
    }
  }, [taskData]);

  // Fetch comments
  const { data: commentsData } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.json();
    },
    enabled: !!taskId
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ commentId, type }) => {
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ type })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['task-comments', taskId]);
    }
  });

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: (data) => projectService.updateTask(taskId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['task', taskId]);
      queryClient.invalidateQueries(['tasks', projectId]);
      if (response?.data?.task) {
        setFormData(response.data.task);
      }
      setIsEditing(false);
    }
  });

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: () => projectService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', projectId]);
      onClose();
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['task-comments', taskId]);
      setNewComment('');
    }
  });

  const task = taskData?.data?.task || formData;
  const comments = commentsData?.data?.comments || [];

  const handleSave = (field, value) => {
    const updateData = { [field]: value };
    updateMutation.mutate(updateData);
  };

  const handleChecklistItemToggle = (index) => {
    const updatedChecklist = [...(task.checklist || [])];
    updatedChecklist[index].done = !updatedChecklist[index].done;
    setFormData({ ...task, checklist: updatedChecklist });
    updateMutation.mutate({ checklist: updatedChecklist });
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const updatedChecklist = [...(task.checklist || []), {
      text: newChecklistItem,
      done: false,
      order: task.checklist?.length || 0
    }];
    setFormData({ ...task, checklist: updatedChecklist });
    updateMutation.mutate({ checklist: updatedChecklist });
    setNewChecklistItem('');
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  if (isLoading || !task) {
    return (
      <div className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2 bg-surface-light dark:bg-surface-dark shadow-2xl z-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-light dark:border-primary-dark border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2 bg-surface-light dark:bg-surface-dark shadow-2xl z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3 flex-1">
            <select
              value={task.status}
              onChange={(e) => {
                setFormData({ ...task, status: e.target.value });
                updateMutation.mutate({ status: e.target.value });
              }}
              className="px-3 py-1.5 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-neutral-800 text-sm font-medium"
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <select
              value={task.priority}
              onChange={(e) => {
                setFormData({ ...task, priority: e.target.value });
                updateMutation.mutate({ priority: e.target.value });
              }}
              className="px-3 py-1.5 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-neutral-800 text-sm font-medium"
            >
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {task.isBlocked && <BlockedBadge isBlocked={true} size="sm" />}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-border-light dark:border-border-dark z-50"
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-secondary-light dark:text-secondary-dark hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Task
                  </button>
                </motion.div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-light dark:border-border-dark">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'details'
                ? 'text-primary-light dark:text-primary-dark'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Details
            {activeTab === 'details' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-light dark:bg-primary-dark"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('dependencies')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative flex items-center gap-2 ${
              activeTab === 'dependencies'
                ? 'text-primary-light dark:text-primary-dark'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Dependencies
            {activeTab === 'dependencies' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-light dark:bg-primary-dark"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative flex items-center gap-2 ${
              activeTab === 'history'
                ? 'text-primary-light dark:text-primary-dark'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <History className="w-4 h-4" />
            History
            {activeTab === 'history' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-light dark:bg-primary-dark"
              />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <>
              {/* Title */}
              <div>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  onBlur={() => handleSave('title', formData.title)}
                  className="text-2xl font-bold w-full bg-transparent border-none focus:outline-none text-neutral-900 dark:text-neutral-100"
                  placeholder="Task title..."
                />
              </div>

          {/* Meta Row */}
          <div className="flex flex-wrap gap-4">
            {/* Assignees */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-500" />
              <div className="flex -space-x-2">
                {task.assignees?.map((assignee) => (
                  <div
                    key={assignee._id}
                    className="w-8 h-8 rounded-full bg-primary-light dark:bg-primary-dark text-white text-sm flex items-center justify-center ring-2 ring-surface-light dark:ring-surface-dark cursor-pointer hover:ring-4 transition-all"
                    title={`${assignee.firstName} ${assignee.lastName}`}
                    onClick={() => {
                      const newAssignees = task.assignees.filter(a => a._id !== assignee._id).map(a => a._id);
                      setFormData({ ...task, assignees: newAssignees });
                      updateMutation.mutate({ assignees: newAssignees });
                    }}
                  >
                    {assignee.firstName?.[0]}{assignee.lastName?.[0]}
                  </div>
                ))}
                <button 
                  onClick={() => setShowAssigneeModal(true)}
                  className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-500" />
              <input
                type="date"
                value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  setFormData({ ...task, dueDate: e.target.value });
                  updateMutation.mutate({ dueDate: e.target.value });
                }}
                className="px-3 py-1 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-neutral-800 text-sm"
              />
            </div>

            {/* Estimate */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-500" />
              <input
                type="number"
                value={formData.estimate || ''}
                onChange={(e) => setFormData({ ...formData, estimate: parseFloat(e.target.value) })}
                onBlur={() => handleSave('estimate', formData.estimate)}
                placeholder="Est. hours"
                className="w-24 px-3 py-1 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-neutral-800 text-sm"
              />
            </div>
          </div>

          {/* Labels */}
          <LabelManager
            workspaceId={projectData?.data?.project?.workspaceId}
            selectedLabels={task.labels || []}
            onLabelToggle={(label) => {
              const labelIds = task.labels?.map(l => l._id || l) || [];
              const isSelected = labelIds.includes(label._id);
              const newLabels = isSelected
                ? labelIds.filter(id => id !== label._id)
                : [...labelIds, label._id];
              setFormData({ ...task, labels: newLabels });
              updateMutation.mutate({ labels: newLabels });
            }}
            canEdit={canEdit}
          />

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              onBlur={() => handleSave('description', formData.description)}
              rows="4"
              className="input resize-none"
              placeholder="Add a description..."
            />
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Checklist</label>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {task.checklist?.filter(item => item.done).length || 0} / {task.checklist?.length || 0}
              </span>
            </div>
            <div className="space-y-2 mb-3">
              {task.checklist?.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => handleChecklistItemToggle(index)}
                    className="w-4 h-4 rounded border-neutral-300"
                  />
                  <span className={`flex-1 text-sm ${item.done ? 'line-through text-neutral-500' : ''}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                placeholder="Add checklist item..."
                className="flex-1 input"
              />
              <button
                onClick={handleAddChecklistItem}
                className="btn btn-secondary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label">Attachments</label>
              <button
                onClick={() => setShowFileUploader(!showFileUploader)}
                className="btn btn-secondary btn-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Files
              </button>
            </div>

            {showFileUploader && (
              <div className="mb-4">
                <FileUploader 
                  taskId={taskId} 
                  onUploadComplete={() => setShowFileUploader(false)} 
                />
              </div>
            )}

            {task.attachments && task.attachments.length > 0 && (
              <div className="space-y-3">
                {/* Image Grid */}
                {task.attachments.filter(f => f.type?.startsWith('image')).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase mb-2">Images</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {task.attachments
                        .filter(f => f.type?.startsWith('image'))
                        .map((file, i) => (
                          <motion.div
                            key={file._id || i}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => {
                              const images = task.attachments.filter(f => f.type?.startsWith('image'));
                              setGalleryImages(images);
                              setGalleryIndex(i);
                              setShowGallery(true);
                            }}
                            className="aspect-square rounded-lg overflow-hidden cursor-pointer group relative"
                          >
                            <img 
                              src={file.url} 
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Other Files */}
                {task.attachments.filter(f => !f.type?.startsWith('image')).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase mb-2">Files</p>
                    <div className="space-y-2">
                      {task.attachments
                        .filter(f => !f.type?.startsWith('image'))
                        .map((file, i) => (
                          <div 
                            key={file._id || i} 
                            className="flex items-center gap-3 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:shadow-md transition-shadow"
                          >
                            <Paperclip className="w-5 h-5 text-neutral-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-neutral-900 dark:text-neutral-100">
                                {file.name}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <a
                              href={file.url}
                              download={file.name}
                              className="text-primary-light dark:text-primary-dark hover:underline text-sm"
                            >
                              Download
                            </a>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comments & Activity */}
          <div>
            <label className="label flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments & Activity
            </label>
            <div className="space-y-4 mb-4">
              {comments.map((comment) => (
                <div key={comment._id} className="group">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-light text-white text-sm flex items-center justify-center flex-shrink-0">
                      {comment.userId.firstName?.[0]}{comment.userId.lastName?.[0]}
                    </div>
                    <div className="flex-1">
                      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {comment.userId.firstName} {comment.userId.lastName}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                          {comment.edited && (
                            <span className="text-xs text-neutral-400 italic">
                              (edited)
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>

                      {/* Reactions */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowReactions(showReactions === comment._id ? null : comment._id);
                            }}
                            className="text-xs font-medium text-neutral-500 hover:text-primary-light dark:hover:text-primary-dark flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all"
                          >
                            <Smile className="w-3.5 h-3.5" />
                            React
                          </button>

                          {/* Reaction Picker */}
                          <AnimatePresence>
                            {showReactions === comment._id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-0 top-full mt-2 bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-3 flex gap-2 z-[100]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {REACTIONS.map(({ icon: Icon, label, color }) => (
                                  <motion.button
                                    key={label}
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addReactionMutation.mutate({ commentId: comment._id, type: label });
                                      setShowReactions(null);
                                    }}
                                    className={`p-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-all`}
                                    title={label.charAt(0).toUpperCase() + label.slice(1)}
                                  >
                                    <Icon className={`w-5 h-5 ${color}`} />
                                  </motion.button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Display Reactions */}
                        {comment.reactions && comment.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(
                              comment.reactions.reduce((acc, r) => {
                                acc[r.type] = (acc[r.type] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([type, count]) => {
                              const reaction = REACTIONS.find(r => r.label === type);
                              if (!reaction) return null;
                              const Icon = reaction.icon;
                              return (
                                <div
                                  key={type}
                                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-700 text-xs"
                                >
                                  <Icon className={`w-3.5 h-3.5 ${reaction.color}`} />
                                  <span>{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  rows="3"
                  placeholder="Write a comment... (Press Enter to send, Shift+Enter for new line)"
                  className="input resize-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark transition-all"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddComment}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="btn btn-primary px-5 py-3 flex items-center gap-2 h-fit disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
              >
                {addCommentMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send
                  </>
                )}
              </motion.button>
            </div>
          </div>
            </>
          )}

          {/* Dependencies Tab */}
          {activeTab === 'dependencies' && (
            <TaskDependencies 
              taskId={taskId} 
              projectId={projectId}
              canEdit={canEdit}
            />
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <TaskHistory taskId={taskId} />
          )}
        </div>
      </motion.div>

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40"
      />

      {/* Image Gallery */}
      {showGallery && (
        <ImageGallery
          images={galleryImages}
          initialIndex={galleryIndex}
          onClose={() => setShowGallery(false)}
          onDelete={(image) => {
            // Handle delete if needed
            setShowGallery(false);
          }}
        />
      )}

      {/* Assignee Modal */}
      {showAssigneeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setShowAssigneeModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="card p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Assign Members
            </h3>
            <div className="space-y-2">
              {membersData?.data?.members?.map((member) => {
                const user = member.userId || member.user;
                const isAssigned = task.assignees?.some(a => a._id === user._id);
                return (
                  <button
                    key={user._id}
                    onClick={() => {
                      const currentAssignees = task.assignees || [];
                      const assigneeIds = currentAssignees.map(a => a._id || a);
                      const newAssignees = isAssigned
                        ? assigneeIds.filter(id => id !== user._id)
                        : [...assigneeIds, user._id];
                      updateMutation.mutate({ assignees: newAssignees });
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isAssigned
                        ? 'bg-primary-light/10 dark:bg-primary-dark/10 border-2 border-primary-light dark:border-primary-dark'
                        : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-light dark:bg-primary-dark text-white flex items-center justify-center">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {user.email}
                      </p>
                    </div>
                    {isAssigned && (
                      <div className="w-5 h-5 rounded-full bg-primary-light dark:bg-primary-dark text-white flex items-center justify-center">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowAssigneeModal(false)}
              className="w-full btn btn-secondary mt-4"
            >
              Done
            </button>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onClick={() => setShowDeleteModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="card p-6 w-full max-w-md"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-secondary-light/10 dark:bg-secondary-dark/10 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-secondary-light dark:text-secondary-dark" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Delete Task
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 mb-6">
              Are you sure you want to delete <strong>{task.title}</strong>? All comments, attachments, and history will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 btn bg-secondary-light dark:bg-secondary-dark text-white hover:opacity-90"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TaskDetail;

