import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
  animated?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = "",
  animated = true
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center py-16 px-6",
      "animate-fade-in-up relative",
      className
    )}>
      <div className={cn(
        "w-24 h-24 mb-6 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full flex items-center justify-center",
        animated && "animate-bounce-gentle"
      )}>
        <Icon className="w-12 h-12 text-white/70 drop-shadow-lg" />
      </div>
      
      <h3 className="text-xl font-bold text-white mb-4 drop-shadow-lg">
        {title}
      </h3>
      
      <p className="text-white/90 text-center mb-8 max-w-sm leading-relaxed drop-shadow-md">
        {description}
      </p>
      
      {actionText && onAction && (
        <Button
          onClick={onAction}
          className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold px-8 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl hover:shadow-2xl"
          type="button"
        >
          {actionText}
        </Button>
      )}
      
      {/* Decorative elements */}
      <div className="absolute top-8 left-8 w-2 h-2 bg-white/20 rounded-full animate-pulse"></div>
      <div className="absolute top-16 right-12 w-1 h-1 bg-white/30 rounded-full animate-pulse delay-500"></div>
      <div className="absolute bottom-12 left-16 w-1.5 h-1.5 bg-white/25 rounded-full animate-pulse delay-1000"></div>
      
      {/* Floating hearts animation */}
      <div className="absolute top-4 right-8 animate-float delay-300">
        <span className="text-pink-300 text-lg opacity-60">💖</span>
      </div>
      <div className="absolute bottom-8 left-12 animate-float delay-700">
        <span className="text-purple-300 text-sm opacity-50">✨</span>
      </div>
    </div>
  );
};