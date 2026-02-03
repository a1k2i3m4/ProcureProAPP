import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        variant = 'primary',
        size = 'md',
        isLoading = false,
        icon,
        fullWidth = false,
        children,
        disabled,
        ...props
    }, ref) => {
        const variantStyles = {
            primary: 'bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-400',
            secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50',
            danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400',
            ghost: 'text-gray-700 hover:bg-gray-100 disabled:text-gray-400',
        };

        const sizeStyles = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-base',
            lg: 'px-6 py-3 text-lg',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`
                    inline-flex items-center justify-center gap-2
                    rounded-lg font-medium transition-colors
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
                    disabled:cursor-not-allowed
                    ${variantStyles[variant]}
                    ${sizeStyles[size]}
                    ${fullWidth ? 'w-full' : ''}
                `}
                {...props}
            >
                {isLoading ? (
                    <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        <span>Загрузка...</span>
                    </>
                ) : (
                    <>
                        {icon && <span className="flex-shrink-0">{icon}</span>}
                        {children}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';
