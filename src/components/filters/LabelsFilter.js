import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const LabelsFilter = ({ workspaceId, selectedLabels = [], onChange }) => {
  const { data: labelsData } = useQuery({
    queryKey: ['labels', workspaceId],
    queryFn: async () => {
      const response = await api.get('/labels', { params: { workspaceId } });
      return response.data;
    },
    enabled: !!workspaceId
  });

  const labels = labelsData?.data?.labels || [];

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
      {labels.map((label) => (
        <label key={label._id} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedLabels.includes(label._id)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...selectedLabels, label._id]);
              } else {
                onChange(selectedLabels.filter(id => id !== label._id));
              }
            }}
            className="w-4 h-4 rounded"
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: label.color }}
          />
          <span className="text-sm">{label.name}</span>
        </label>
      ))}
      {labels.length === 0 && (
        <p className="text-xs text-neutral-500 py-2">No labels created yet</p>
      )}
    </div>
  );
};

export default LabelsFilter;
