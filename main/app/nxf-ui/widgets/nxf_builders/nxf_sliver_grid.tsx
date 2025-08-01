// packages/nxf-ui/widgets/nxf_builders/nxf_sliver_grid.tsx
import React from 'react';

interface NxfSliverGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columns?: number;
  className?: string;
}

export const NxfSliverGrid = <T,>({
  items,
  renderItem,
  columns = 2,
  className = '',
}: NxfSliverGridProps<T>) => (
  <div
    className={`grid gap-4 ${className}`}
    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
  >
    {items.map((item, index) => renderItem(item, index))}
  </div>
);
