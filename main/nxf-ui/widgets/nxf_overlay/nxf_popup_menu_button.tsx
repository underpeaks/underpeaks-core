// packages/nxf-ui/widgets/nxf_overlay/nxf_popup_menu_button.tsx
import React, { useState } from 'react';

interface NxfPopupMenuButtonProps {
  trigger: React.ReactNode;
  items: { label: string; onClick: () => void }[];
}

export const NxfPopupMenuButton: React.FC<NxfPopupMenuButtonProps> = ({ trigger, items }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div onClick={() => setShow(!show)}>{trigger}</div>
      {show && (
        <div className="absolute right-0 mt-2 bg-white border rounded shadow z-50">
          {items.map((item, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                setShow(false);
                item.onClick();
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
