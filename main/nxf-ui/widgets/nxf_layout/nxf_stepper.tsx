// packages/nxf-ui/widgets/nxf_layouts/nxf_stepper.tsx
import React from 'react';

interface Step {
  label: string;
  content: React.ReactNode;
}

interface NxfStepperProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  className?: string;
}

export const NxfStepper: React.FC<NxfStepperProps> = ({
  steps,
  currentStep,
  onStepChange,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex space-x-4">
        {steps.map((step, index) => (
          <button
            key={index}
            onClick={() => onStepChange(index)}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentStep === index
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {step.label}
          </button>
        ))}
      </div>
      <div>{steps[currentStep].content}</div>
    </div>
  );
};
