import React from 'react';

interface ProgressStep {
  number: string;
  active: boolean;
  completed?: boolean;
}

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  className = ""
}) => {
  const steps: ProgressStep[] = Array.from({ length: totalSteps }, (_, index) => ({
    number: (index + 1).toString(),
    active: index < currentStep,
    completed: index < currentStep - 1
  }));

  return (
    <div className={`relative w-full max-w-sm mx-auto ${className}`}>
      {/* Progress bar background */}
      <div className="absolute top-6 left-4 right-4 h-3 bg-pink-300 rounded-full" />
      
      {/* Active progress */}
      <div 
        className="absolute top-6 left-4 h-3 bg-pink-700 rounded-full transition-all duration-500"
        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
      />
      
      {/* Step indicators */}
      <div className="relative flex justify-between px-2">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className={`
              w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-lg
              transition-all duration-300 relative z-10
              ${step.active ? 'bg-pink-600 scale-110' : 'bg-pink-300'}
            `}>
              {step.number}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};