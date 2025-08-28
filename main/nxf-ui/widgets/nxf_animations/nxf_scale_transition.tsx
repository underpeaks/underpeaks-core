// packages/nxf-ui/widgets/nxf_animations/nxf_scale_transition.tsx
import { motion } from 'framer-motion';
import React from 'react';

interface NxfScaleTransitionProps {
  children: React.ReactNode;
  duration?: number;
  className?: string;
}

export const NxfScaleTransition: React.FC<NxfScaleTransitionProps> = ({
  children,
  duration = 0.3,
  className = '',
}) => (
  <motion.div
    className={className}
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.95, opacity: 0 }}
    transition={{ duration }}
  >
    {children}
  </motion.div>
);
