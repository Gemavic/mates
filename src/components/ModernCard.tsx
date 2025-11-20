import React from 'react';
import { cn } from '@/lib/utils';

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  background?: 'white' | 'glass' | 'gradient';
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  className = "",
  hover = true,
  padding = 'md',
  rounded = 'xl',
  shadow = 'md',
  background = 'white'
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl'
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  const backgroundClasses = {
    white: 'bg-white',
    glass: 'bg-white/10 backdrop-blur-sm border border-white/20',
    gradient: 'bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm border border-white/20'
  };

  return (
    <div className={cn(
      backgroundClasses[background],
      paddingClasses[padding],
      roundedClasses[rounded],
      shadowClasses[shadow],
      hover && "transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
      "overflow-hidden",
      className
    )}>
      {children}
    </div>
  );
};