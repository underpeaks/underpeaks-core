// packages/nxf-ui/widgets/nxf_builders/nxf_grid_view.tsx
import React from 'react';

interface NxfGridViewProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columns?: number;
  className?: string;
}

export const NxfGridView = <T,>({
  items,
  renderItem,
  columns = 3,
  className = '',
}: NxfGridViewProps<T>) => (
  <div
    className={`grid gap-4 ${className}`}
    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
  >
    {items.map((item, index) => renderItem(item, index))}
  </div>
);
