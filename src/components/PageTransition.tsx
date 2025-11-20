import React from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'slide-left' | 'slide-right' | 'slide-up' | 'fade';
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = "",
  direction = 'fade'
}) => {
  const getAnimationClass = () => {
    switch (direction) {
      case 'slide-left': return 'animate-slide-in-left duration-300';
      case 'slide-right': return 'animate-slide-in-right duration-300';
      case 'slide-up': return 'animate-slide-up duration-400';
      case 'fade':
      default: return 'animate-fade-in duration-500';
    }
  };

  return (
    <div className={cn(
      "min-h-screen w-full transform-gpu will-change-transform",
      getAnimationClass(),
      className
    )}>
      {children}
    </div>
  );
};