import React from 'react';

interface LoadingSkeletonProps {
    count?: number;
    variant?: 'card' | 'table' | 'text';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
    count = 3,
    variant = 'card'
}) => {
    if (variant === 'text') {
        return (
            <div className="space-y-3">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                ))}
            </div>
        );
    }

    if (variant === 'table') {
        return (
            <div className="space-y-3">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    // Default card variant
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="p-6 bg-white border border-gray-100 rounded-lg">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="flex-1 space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                            <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
