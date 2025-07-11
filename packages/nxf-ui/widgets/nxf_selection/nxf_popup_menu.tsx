// packages/nxf-ui/widgets/nxf_selection/nxf_popup_menu.tsx
import React, { useState, useRef, useEffect } from 'react';

interface NxfPopupMenuProps {
  label: string;
  items: string[];
  onSelect: (item: string) => void;
  className?: string;
}

export const NxfPopupMenu: React.FC<NxfPopupMenuProps> = ({
  label,
  items,
  onSelect,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block ${className}`} ref={ref}>
      <button onClick={() => setOpen(!open)} className="px-3 py-2 border rounded">
        {label}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-50">
          {items.map((item) => (
            <div
              key={item}
              onClick={() => {
                onSelect(item);
                setOpen(false);
              }}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
