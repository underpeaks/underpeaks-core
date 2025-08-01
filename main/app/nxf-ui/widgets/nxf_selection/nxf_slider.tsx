// packages/nxf-ui/widgets/nxf_selection/nxf_slider.tsx
import React from 'react';

interface NxfSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

export const NxfSlider: React.FC<NxfSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className = '',
}) => (
  <input
    type="range"
    value={value}
    min={min}
    max={max}
    step={step}
    onChange={(e) => onChange(parseInt(e.target.value))}
    className={`w-full ${className}`}
  />
);
