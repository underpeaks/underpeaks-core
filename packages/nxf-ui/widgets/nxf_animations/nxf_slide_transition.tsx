// packages/nxf-ui/widgets/nxf_animations/nxf_slide_transition.tsx
import { motion } from 'framer-motion';
import React from 'react';

interface NxfSlideTransitionProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  distance?: number;
  duration?: number;
  className?: string;
}

export const NxfSlideTransition: React.FC<NxfSlideTransitionProps> = ({
  children,
  direction = 'bottom',
  distance = 50,
  duration = 0.3,
  className = '',
}) => {
  const getInitial = () => {
    switch (direction) {
      case 'left': return { x: -distance, opacity: 0 };
      case 'right': return { x: distance, opacity: 0 };
      case 'top': return { y: -distance, opacity: 0 };
      default: return { y: distance, opacity: 0 };
    }
  };

  return (
    <motion.div
      className={className}
      initial={getInitial()}
      animate={{ x: 0, y: 0, opacity: 1 }}
      exit={getInitial()}
      transition={{ duration }}
    >
      {children}
    </motion.div>
  );
};
