// packages/nxf-ui/widgets/nxf_selection/nxf_popup_menu.tsx
import React, { useState, useRef, useEffect } from 'react';

interface NxfPopupMenuProps {
  label: React.ReactNode;  // accept JSX or string for label
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
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 rounded hover:bg-gray-100 flex items-center gap-2"
        aria-haspopup="true"
        aria-expanded={open}
      >
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
              role="menuitem"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelect(item);
                  setOpen(false);
                }
              }}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
