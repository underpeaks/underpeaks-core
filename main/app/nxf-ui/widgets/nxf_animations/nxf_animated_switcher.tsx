// packages/nxf-ui/widgets/nxf_animations/nxf_animated_switcher.tsx
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

interface NxfAnimatedSwitcherProps {
  children: React.ReactNode;
  keyProp: string | number;
  duration?: number;
  className?: string;
}

export const NxfAnimatedSwitcher: React.FC<NxfAnimatedSwitcherProps> = ({
  children,
  keyProp,
  duration = 0.3,
  className = '',
}) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={keyProp}
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);
