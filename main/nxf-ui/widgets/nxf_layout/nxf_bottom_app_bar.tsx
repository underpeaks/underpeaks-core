// packages/nxf-ui/widgets/nxf_layouts/nxf_bottom_app_bar.tsx

import React, { ReactNode } from 'react';

interface NxfBottomAppBarProps {
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /**
   * If true, leaves a notch for a floating action button
   */
  hasNotch?: boolean;
}

/**
 * BottomAppBar component for Next.js
 * Similar to Flutter's BottomAppBar
 */
export const NxfBottomAppBar: React.FC<NxfBottomAppBarProps> = ({
  children,
  className = '',
  style = {},
  hasNotch = false,
}) => {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 flex items-center justify-between bg-white border-t border-gray-200 shadow-md px-4 h-16 ${
        hasNotch ? 'pb-6' : ''
      } ${className}`}
      style={style}
    >
      {children}
      {hasNotch && (
        <div
          style={{
            position: 'absolute',
            top: '-28px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: 'white',
            boxShadow:
              '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 10,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};
