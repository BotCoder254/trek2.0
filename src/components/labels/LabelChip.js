import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const LabelChip = ({ label, onRemove, onClick, size = 'md', showRemove = false }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer' : ''}
        transition-all
      `}
      style={{
        backgroundColor: label.color,
        color: '#fff'
      }}
    >
      <span className="truncate max-w-[120px]">{label.name}</span>
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(label);
          }}
          className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.span>
  );
};

export default LabelChip;
