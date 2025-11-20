import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeartAnimationProps {
  trigger: boolean;
  onComplete?: () => void;
  className?: string;
}

export const HeartAnimation: React.FC<HeartAnimationProps> = ({ 
  trigger, 
  onComplete,
  className = "" 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hearts, setHearts] = useState<Array<{
    id: number;
    x: number;
    y: number;
    delay: number;
    size: string;
  }>>([]);

  useEffect(() => {
    if (trigger) {
      setIsVisible(true);
      
      // Generate random floating hearts
      const newHearts = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5,
        size: ['text-sm', 'text-base', 'text-lg', 'text-xl'][Math.floor(Math.random() * 4)]
      }));
      
      setHearts(newHearts);
      
      // Hide animation after completion
      const timer = setTimeout(() => {
        setIsVisible(false);
        setHearts([]);
        onComplete?.();
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 pointer-events-none z-50 overflow-hidden",
      className
    )}>
      {/* Main heart burst */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <Heart 
          className="w-16 h-16 text-pink-500 animate-ping" 
          fill="currentColor" 
        />
      </div>
      
      {/* Floating hearts */}
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute animate-bounce"
          style={{
            left: `${heart.x}%`,
            top: `${heart.y}%`,
            animationDelay: `${heart.delay}s`,
            animationDuration: '1.5s'
          }}
        >
          <span 
            className={cn(
              "text-pink-400 opacity-80 animate-fade-out",
              heart.size
            )}
          >
            💖
          </span>
        </div>
      ))}
      
      {/* Sparkles effect */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="animate-spin">
          <div className="w-32 h-32 relative">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
                style={{
                  transform: `rotate(${i * 60}deg) translateY(-60px)`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};