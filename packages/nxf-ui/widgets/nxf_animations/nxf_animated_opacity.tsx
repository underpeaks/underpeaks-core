// packages/nxf-ui/widgets/nxf_animations/nxf_animated_opacity.tsx
import { motion } from 'framer-motion';
import React from 'react';

interface NxfAnimatedOpacityProps {
  visible: boolean;
  duration?: number;
  children: React.ReactNode;
  className?: string;
}

export const NxfAnimatedOpacity: React.FC<NxfAnimatedOpacityProps> = ({
  visible,
  duration = 0.3,
  children,
  className = '',
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0 }}
    animate={{ opacity: visible ? 1 : 0 }}
    transition={{ duration }}
  >
    {children}
  </motion.div>
);
