import React, { useState } from 'react';

interface NxfAccordionProps {
  title: string;
  children: React.ReactNode;
}

export const NxfAccordion: React.FC<NxfAccordionProps> = ({ title, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-md mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-2 bg-gray-100 font-medium"
      >
        {title}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
};
