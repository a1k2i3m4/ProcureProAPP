import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    icon: LucideIcon;
    value: string | number;
    label: string;
    color: string;
    trend?: {
        value: number;
        direction: 'up' | 'down';
    };
    onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
    icon: Icon,
    value,
    label,
    color,
    trend,
    onClick
}) => {
    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer hover:border-gray-200"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className={`text-sm font-semibold ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
                    </div>
                )}
            </div>

            <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                    {value}
                </div>
                <p className="text-sm text-gray-600">
                    {label}
                </p>
            </div>
        </div>
    );
};
