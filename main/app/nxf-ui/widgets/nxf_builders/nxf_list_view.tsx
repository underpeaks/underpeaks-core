// packages/nxf-ui/widgets/nxf_builders/nxf_list_view.tsx
import React from 'react';

interface NxfListViewProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export const NxfListView = <T,>({ items, renderItem, className = '' }: NxfListViewProps<T>) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    {items.map((item, index) => renderItem(item, index))}
  </div>
);
