import React from 'react';

interface BadgeProps {
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    size?: 'sm' | 'md';
    icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
    label,
    variant = 'default',
    size = 'md',
    icon
}) => {
    const variantStyles = {
        default: 'bg-gray-100 text-gray-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-yellow-100 text-yellow-700',
        error: 'bg-red-100 text-red-700',
        info: 'bg-blue-100 text-blue-700',
    };

    const sizeStyles = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
    };

    return (
        <span className={`inline-flex items-center gap-1 rounded-full font-medium ${variantStyles[variant]} ${sizeStyles[size]}`}>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {label}
        </span>
    );
};
