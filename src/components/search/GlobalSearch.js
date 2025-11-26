import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, CheckSquare, FolderKanban, User, Loader } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';

const GlobalSearch = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Fetch search results
  const { data: searchData, isLoading } = useQuery({
    queryKey: ['search', currentWorkspace?.id, debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return null;
      const response = await api.get('/search', {
        params: {
          q: debouncedQuery,
          workspaceId: currentWorkspace?.id
        }
      });
      return response.data;
    },
    enabled: !!currentWorkspace?.id && debouncedQuery.length >= 2
  });

  const results = searchData?.data || {};
  const hasResults = results.tasks?.length > 0 || results.projects?.length > 0 || results.members?.length > 0;

  const handleTaskClick = (task) => {
    navigate(`/workspace/${currentWorkspace.id}/projects/${task.projectId._id}`);
    onClose();
    setSearchQuery('');
  };

  const handleProjectClick = (project) => {
    navigate(`/workspace/${currentWorkspace.id}/projects/${project._id}`);
    onClose();
    setSearchQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
      setSearchQuery('');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />

        {/* Search Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl"
        >
          <div className="card overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b border-border-light dark:border-border-dark">
              <Search className="w-5 h-5 text-neutral-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search tasks, projects, members..."
                className="flex-1 bg-transparent border-none focus:outline-none text-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
              />
              {isLoading && (
                <Loader className="w-5 h-5 text-primary-light dark:text-primary-dark animate-spin" />
              )}
              <button
                onClick={() => {
                  onClose();
                  setSearchQuery('');
                }}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {searchQuery.length < 2 ? (
                <div className="p-8 text-center text-neutral-500">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Type at least 2 characters to search</p>
                </div>
              ) : isLoading ? (
                <div className="p-8 text-center">
                  <Loader className="w-8 h-8 mx-auto animate-spin text-primary-light dark:text-primary-dark" />
                </div>
              ) : !hasResults ? (
                <div className="p-8 text-center text-neutral-500">
                  <p>No results found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="p-2">
                  {/* Tasks */}
                  {results.tasks && results.tasks.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase">
                        Tasks ({results.tasks.length})
                      </div>
                      {results.tasks.map((task) => (
                        <motion.button
                          key={task._id}
                          whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                          onClick={() => handleTaskClick(task)}
                          className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors dark:hover:bg-neutral-800"
                        >
                          <CheckSquare className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {task.projectId && (
                                <span className="text-xs text-neutral-600 dark:text-neutral-400">
                                  {task.projectId.name}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                task.status === 'done' 
                                  ? 'bg-success-light/20 text-success-light'
                                  : 'bg-neutral-200 dark:bg-neutral-700'
                              }`}>
                                {task.status}
                              </span>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* Projects */}
                  {results.projects && results.projects.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase">
                        Projects ({results.projects.length})
                      </div>
                      {results.projects.map((project) => (
                        <motion.button
                          key={project._id}
                          whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                          onClick={() => handleProjectClick(project)}
                          className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors dark:hover:bg-neutral-800"
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: project.color }}
                          >
                            <FolderKanban className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                              {project.name}
                            </p>
                            {project.description && (
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate mt-1">
                                {project.description}
                              </p>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* Members */}
                  {results.members && results.members.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase">
                        Members ({results.members.length})
                      </div>
                      {results.members.map((member) => (
                        <div
                          key={member._id}
                          className="flex items-center gap-3 p-3 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary-light dark:bg-primary-dark text-white flex items-center justify-center font-semibold flex-shrink-0">
                            {member.firstName[0]}{member.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                              {member.email} • {member.role}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Hint */}
            <div className="px-4 py-3 border-t border-border-light dark:border-border-dark bg-neutral-50 dark:bg-neutral-900">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Press ESC to close</span>
                <span>↵ to select</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GlobalSearch;

