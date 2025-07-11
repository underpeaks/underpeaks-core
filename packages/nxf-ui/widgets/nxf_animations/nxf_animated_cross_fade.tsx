// packages/nxf-ui/widgets/nxf_animations/nxf_animated_cross_fade.tsx
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

interface NxfAnimatedCrossFadeProps {
  showFirst: boolean;
  first: React.ReactNode;
  second: React.ReactNode;
  duration?: number;
  className?: string;
}

export const NxfAnimatedCrossFade: React.FC<NxfAnimatedCrossFadeProps> = ({
  showFirst,
  first,
  second,
  duration = 0.3,
  className = '',
}) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={showFirst ? 'first' : 'second'}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration }}
    >
      {showFirst ? first : second}
    </motion.div>
  </AnimatePresence>
);
