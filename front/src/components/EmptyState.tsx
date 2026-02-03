import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    action,
}) => {
    return (
        <div className="py-12 px-6 text-center">
            {Icon && (
                <div className="flex justify-center mb-4">
                    <Icon className="w-16 h-16 text-gray-300" />
                </div>
            )}

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {title}
            </h3>

            {description && (
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    {description}
                </p>
            )}

            {action && (
                <button
                    onClick={action.onClick}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};
