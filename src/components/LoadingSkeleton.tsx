import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div className={cn(
      "animate-pulse bg-white/20 rounded-lg",
      className
    )} />
  );
};

interface LoadingSkeletonProps {
  type: 'profile-card' | 'message-list' | 'match-grid' | 'mail-thread' | 'chat-message';
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type, count = 3 }) => {
  const renderProfileCardSkeleton = () => (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden">
      <Skeleton className="w-full h-96 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="flex items-center space-x-3">
          <Skeleton className="w-8 h-8 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32 animate-pulse delay-100" />
            <Skeleton className="h-3 w-24 animate-pulse delay-200" />
          </div>
        </div>
        <Skeleton className="h-3 w-full animate-pulse delay-300" />
        <Skeleton className="h-3 w-3/4 animate-pulse delay-400" />
        <div className="flex space-x-2">
          <Skeleton className="h-6 w-16 rounded-full animate-pulse delay-500" />
          <Skeleton className="h-6 w-20 rounded-full animate-pulse delay-600" />
          <Skeleton className="h-6 w-14 rounded-full animate-pulse delay-700" />
        </div>
      </div>
    </div>
  );

  const renderMessageListSkeleton = () => (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4">
      <div className="flex items-center space-x-3">
        <Skeleton className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 bg-gray-200 animate-pulse delay-100" />
            <Skeleton className="h-3 w-12 bg-gray-200 animate-pulse delay-200" />
          </div>
          <Skeleton className="h-3 w-40 bg-gray-200 animate-pulse delay-300" />
        </div>
      </div>
    </div>
  );

  const renderMatchGridSkeleton = () => (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
          <Skeleton className="w-full h-48 bg-gray-200" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-20 bg-gray-200" />
            <Skeleton className="h-8 w-full rounded-lg bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderMailThreadSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 animate-pulse">
          <div className="flex items-start space-x-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderChatMessageSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`max-w-xs ${i % 2 === 0 ? 'order-1' : 'order-2'}`}>
            <div className="flex items-end space-x-2">
              <Skeleton className="w-8 h-8 rounded-full bg-gray-200" />
              <div className={`rounded-2xl p-3 animate-pulse ${
                i % 2 === 0 ? 'bg-gray-200' : 'bg-blue-200'
              }`}>
                <Skeleton className="h-4 w-32 bg-gray-300" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          {type === 'profile-card' && renderProfileCardSkeleton()}
          {type === 'message-list' && renderMessageListSkeleton()}
          {type === 'match-grid' && renderMatchGridSkeleton()}
          {type === 'mail-thread' && renderMailThreadSkeleton()}
          {type === 'chat-message' && renderChatMessageSkeleton()}
        </div>
      ))}
    </div>
  );
};