import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderKanban, Plus, Users, CheckCircle, Clock, MoreVertical, Loader } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../services/projectService';
import { hasPermission, PERMISSIONS } from '../../utils/roleUtils';
import { useWorkspace } from '../../context/WorkspaceContext';

const ProjectList = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#8B5CF6'
  });

  // Fetch projects
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => projectService.getWorkspaceProjects(workspaceId),
    enabled: !!workspaceId
  });

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: (data) => projectService.createProject({ ...data, workspaceId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects', workspaceId]);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', color: '#8B5CF6' });
    }
  });

  const projects = projectsData?.data?.projects || [];
  const canCreate = hasPermission(currentWorkspace?.role, PERMISSIONS.PROJECTS_CREATE);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-light dark:text-primary-dark" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                Projects
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Manage and track your team's projects
              </p>
            </div>
            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">New Project</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-12 text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-light/10 dark:bg-primary-dark/10 mb-6">
              <FolderKanban className="w-10 h-10 text-primary-light dark:text-primary-dark" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              No projects yet
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
              Create your first project to start organizing tasks and collaborating with your team.
            </p>
            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Project
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <motion.div
                key={project._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/workspace/${workspaceId}/projects/${project._id}`)}
                className="card-hover p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: project.color }}
                  >
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle menu
                    }}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2 truncate">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-neutral-600 dark:text-neutral-400">Progress</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {project.progress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${project.progress}%` }}
                      transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                      className="h-full bg-primary-light dark:bg-primary-dark"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>{project.completedTasks}/{project.taskCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
                      <Users className="w-4 h-4" />
                      <span>{project.members?.length || 0}</span>
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    {project.members?.slice(0, 3).map((member) => {
                      const user = member?.userId;
                      if (!user) return null;
                      return (
                        <div
                          key={user._id}
                          className="w-6 h-6 rounded-full bg-primary-light dark:bg-primary-dark text-white text-xs flex items-center justify-center ring-2 ring-surface-light dark:ring-surface-dark"
                          title={`${user.firstName} ${user.lastName}`}
                        >
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                      );
                    })}
                    {project.members?.length > 3 && (
                      <div
                        className="w-6 h-6 rounded-full bg-neutral-400 dark:bg-neutral-600 text-white text-xs flex items-center justify-center ring-2 ring-surface-light dark:ring-surface-dark"
                        title={`+${project.members.length - 3} more`}
                      >
                        +{project.members.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Create Project
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Project Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input resize-none"
                  rows="3"
                  placeholder="What's this project about?"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 btn btn-primary"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;

