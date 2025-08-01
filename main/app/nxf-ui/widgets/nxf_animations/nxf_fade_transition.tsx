// packages/nxf-ui/widgets/nxf_animations/nxf_fade_transition.tsx
import { motion } from 'framer-motion';
import React from 'react';

interface NxfFadeTransitionProps {
  children: React.ReactNode;
  duration?: number;
  className?: string;
}

export const NxfFadeTransition: React.FC<NxfFadeTransitionProps> = ({
  children,
  duration = 0.3,
  className = '',
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration }}
  >
    {children}
  </motion.div>
);
