// packages/nxf-ui/widgets/nxf_layouts/nxf_tabs.tsx
import React, { useState } from 'react';

interface Tab {
  label: string;
  content: React.ReactNode;
}

interface NxfTabsProps {
  tabs: Tab[];
  className?: string;
}

export const NxfTabs: React.FC<NxfTabsProps> = ({ tabs, className = '' }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className={className}>
      <div className="flex border-b">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            onClick={() => setActiveIndex(index)}
            className={`px-4 py-2 font-medium ${
              index === activeIndex ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{tabs[activeIndex].content}</div>
    </div>
  );
};
