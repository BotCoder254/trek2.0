import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Tag, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import LabelChip from './LabelChip';

const PRESET_COLORS = [
  '#F97316', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6',
  '#F59E0B', '#EC4899', '#14B8A6', '#6366F1', '#84CC16'
];

const LabelManager = ({ workspaceId, selectedLabels = [], onLabelToggle, canEdit = true }) => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState({ name: '', color: PRESET_COLORS[0] });

  const { data: labelsData } = useQuery({
    queryKey: ['labels', workspaceId],
    queryFn: async () => {
      const response = await api.get('/labels', { params: { workspaceId } });
      return response.data;
    },
    enabled: !!workspaceId
  });

  const { data: membershipData } = useQuery({
    queryKey: ['workspace-membership', workspaceId],
    queryFn: async () => {
      const response = await api.get(`/workspaces/${workspaceId}/members`);
      return response.data;
    },
    enabled: !!workspaceId
  });

  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  
  const userRole = React.useMemo(() => {
    return membershipData?.data?.members?.find(m => m.userId?._id === currentUser?._id)?.role;
  }, [membershipData, currentUser]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/labels', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['labels', workspaceId]);
      setNewLabel({ name: '', color: PRESET_COLORS[0] });
      setShowCreate(false);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create label';
      toast.error(message);
    }
  });

  const labels = labelsData?.data?.labels || [];

  const handleCreate = () => {
    if (!newLabel.name.trim()) return;
    createMutation.mutate({ ...newLabel, workspaceId });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Labels
        </label>
        {canEdit && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="text-sm text-primary-light dark:text-primary-dark hover:underline flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            New Label
          </button>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3 space-y-3"
          >
            <input
              type="text"
              value={newLabel.name}
              onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Label name..."
              className="input"
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewLabel({ ...newLabel, color })}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    newLabel.color === color ? 'ring-2 ring-offset-2 ring-neutral-900 dark:ring-neutral-100 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCreate} 
                disabled={createMutation.isPending}
                className="btn btn-primary btn-sm flex-1"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {labels.map((label) => {
            const isSelected = selectedLabels.some(l => l._id === label._id || l === label._id);
            return (
              <LabelChip
                key={label._id}
                label={label}
                onClick={() => onLabelToggle && onLabelToggle(label)}
                showRemove={isSelected}
                onRemove={() => onLabelToggle && onLabelToggle(label)}
                size="md"
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LabelManager;
