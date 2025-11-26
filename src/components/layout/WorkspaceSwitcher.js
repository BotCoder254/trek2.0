import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Check, Building2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

const WorkspaceSwitcher = () => {
  const navigate = useNavigate();
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectWorkspace = (workspace) => {
    switchWorkspace(workspace);
    setIsOpen(false);
    navigate(`/workspace/${workspace.id}/projects`);
  };

  const handleCreateWorkspace = () => {
    setIsOpen(false);
    navigate('/create-workspace');
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        {currentWorkspace ? (
          <>
            {currentWorkspace.logo ? (
              <img 
                src={currentWorkspace.logo} 
                alt={currentWorkspace.name}
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold"
                style={{ backgroundColor: currentWorkspace.color }}
              >
                {currentWorkspace.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 text-left overflow-hidden">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {currentWorkspace.name}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {currentWorkspace.role}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Select Workspace
              </p>
            </div>
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 z-20"
            >
              <div className="card p-2 max-h-80 overflow-y-auto custom-scrollbar">
                {/* Workspace List */}
                <div className="space-y-1">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      onClick={() => handleSelectWorkspace(workspace)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left"
                    >
                      {workspace.logo ? (
                        <img 
                          src={workspace.logo} 
                          alt={workspace.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                          style={{ backgroundColor: workspace.color }}
                        >
                          {workspace.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {workspace.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {workspace.role}
                        </p>
                      </div>
                      {currentWorkspace?.id === workspace.id && (
                        <Check className="w-4 h-4 text-primary-light dark:text-primary-dark flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Create Workspace Button */}
                {workspaces.length > 0 && (
                  <div className="border-t border-border-light dark:border-border-dark my-2" />
                )}
                
                <button
                  onClick={handleCreateWorkspace}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-primary-light dark:text-primary-dark font-medium"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-light/10 dark:bg-primary-dark/10 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-sm">Create Workspace</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkspaceSwitcher;

