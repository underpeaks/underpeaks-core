// packages/nxf-ui/widgets/nxf_builders/nxf_sliver_list.tsx
import React from 'react';

interface NxfSliverListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export const NxfSliverList = <T,>({ items, renderItem, className = '' }: NxfSliverListProps<T>) => (
  <div className={`space-y-4 ${className}`}>
    {items.map((item, index) => renderItem(item, index))}
  </div>
);
