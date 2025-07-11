import { motion } from 'framer-motion';
import React, { CSSProperties } from 'react';

interface NxfAnimatedContainerProps {
  style?: CSSProperties;
  className?: string;
  children: React.ReactNode;
  duration?: number;
}

export const NxfAnimatedContainer: React.FC<NxfAnimatedContainerProps> = ({
  style = {},
  className = '',
  children,
  duration = 0.3,
}) => (
  <motion.div
    style={style}
    className={className}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration }}
  >
    {children}
  </motion.div>
);
