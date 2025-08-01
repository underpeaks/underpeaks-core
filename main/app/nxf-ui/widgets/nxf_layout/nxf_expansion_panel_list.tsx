// packages/nxf-ui/widgets/nxf_layouts/nxf_expansion_panel_list.tsx
import React, { useState } from 'react';

interface Panel {
  title: string;
  content: React.ReactNode;
}

interface NxfExpansionPanelListProps {
  panels: Panel[];
  className?: string;
}

export const NxfExpansionPanelList: React.FC<NxfExpansionPanelListProps> = ({
  panels,
  className = '',
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={`space-y-2 ${className}`}>
      {panels.map((panel, index) => (
        <div key={index} className="border rounded shadow-sm">
          <button
            className="w-full px-4 py-2 text-left font-semibold bg-gray-100 hover:bg-gray-200"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            {panel.title}
          </button>
          {openIndex === index && <div className="px-4 py-2">{panel.content}</div>}
        </div>
      ))}
    </div>
  );
};
