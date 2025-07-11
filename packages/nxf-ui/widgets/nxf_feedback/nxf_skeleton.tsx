import React from 'react';

interface NxfSkeletonProps {
  width?: number | string;
  height?: number | string;
  rounded?: boolean;
}

export const NxfSkeleton: React.FC<NxfSkeletonProps> = ({ width = '100%', height = 20, rounded = false }) => (
  <div
    className={`bg-gray-200 animate-pulse ${rounded ? 'rounded-full' : 'rounded'}`}
    style={{ width, height }}
  />
);
