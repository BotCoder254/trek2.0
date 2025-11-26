import React from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

const BlockedBadge = ({ isBlocked, size = 'sm' }) => {
  if (!isBlocked) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-full bg-secondary-light text-white font-semibold ${sizeClasses[size]}`}
      title="This task is blocked by incomplete dependencies"
    >
      <Lock className={iconSizes[size]} />
      Blocked
    </motion.div>
  );
};

export default BlockedBadge;

