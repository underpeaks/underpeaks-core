// packages/nxf-ui/widgets/nxf_gesture/nxf_gesture_detector.tsx
import React from 'react';

interface NxfGestureDetectorProps {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
}

export const NxfGestureDetector: React.FC<NxfGestureDetectorProps> = ({
  onTap,
  onDoubleTap,
  onLongPress,
  children,
}) => {
  let timeout: NodeJS.Timeout;
  let longPressTriggered = false;

  const handleMouseDown = () => {
    timeout = setTimeout(() => {
      longPressTriggered = true;
      onLongPress?.();
    }, 600);
  };

  const handleMouseUp = () => clearTimeout(timeout);

  const handleClick = () => {
    if (!longPressTriggered) onTap?.();
    longPressTriggered = false;
  };

  const handleDoubleClick = () => onDoubleTap?.();

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    >
      {children}
    </div>
  );
};
