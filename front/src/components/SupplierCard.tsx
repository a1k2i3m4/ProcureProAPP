import React from 'react';
import { Star, TrendingUp, Clock, Award, Zap } from 'lucide-react';

export type SupplierStatus = 'regular' | 'new';
export type PriceLevel = 'low' | 'medium' | 'high';

export interface SupplierCardProps {
    name: string;
    status: SupplierStatus;
    rating: number;
    ordersCount: number;
    reliability: number;
    categories: string[];
    priceLevel: PriceLevel;
    avgResponseTime: string;
    onSelect?: () => void;
}

const getPriceLevelLabel = (level: PriceLevel): string => {
    const labels: Record<PriceLevel, string> = {
        low: 'Низкий',
        medium: 'Средний',
        high: 'Высокий',
    };
    return labels[level];
};

const getPriceLevelColor = (level: PriceLevel): string => {
    const colors: Record<PriceLevel, string> = {
        low: 'text-green-600',
        medium: 'text-orange-600',
        high: 'text-red-600',
    };
    return colors[level];
};

const getPriceLevelBg = (level: PriceLevel): string => {
    const colors: Record<PriceLevel, string> = {
        low: 'bg-green-50',
        medium: 'bg-orange-50',
        high: 'bg-red-50',
    };
    return colors[level];
};

export const SupplierCard: React.FC<SupplierCardProps> = ({
    name,
    status,
    rating,
    ordersCount,
    reliability,
    categories,
    priceLevel,
    avgResponseTime,
    onSelect,
}) => {
    const getReliabilityColor = (rel: number) => {
        if (rel >= 95) return 'text-green-600 bg-green-50';
        if (rel >= 90) return 'text-blue-600 bg-blue-50';
        return 'text-orange-600 bg-orange-50';
    };

    return (
        <div
            onClick={onSelect}
            className="group bg-white rounded-2xl shadow-md border border-gray-200 p-6 hover:shadow-2xl hover:border-purple-300 transition-all duration-300 cursor-pointer overflow-hidden relative"
        >
            {/* Background gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-transparent to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                    <div className="flex-1 pr-3">
                        {/* Name and Status */}
                        <div className="flex items-start gap-3 mb-3">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                                    {name}
                                </h3>
                            </div>
                            {/* Status Badge */}
                            <div className={`
                                flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap
                                transition-all duration-300
                                ${status === 'regular'
                                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700'
                                    : 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700'
                                }
                            `}>
                                <span>{status === 'regular' ? '⭐' : '✨'}</span>
                                <span>{status === 'regular' ? 'Постоянный' : 'Новый'}</span>
                            </div>
                        </div>

                        {/* Rating and Key Metrics */}
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                            {/* Rating */}
                            <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-lg">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-bold text-gray-900">{rating}</span>
                            </div>

                            {/* Orders Count */}
                            <div className="flex items-center gap-1.5 text-gray-600">
                                <Zap className="w-4 h-4 text-blue-500" />
                                <span className="font-semibold">{ordersCount}</span>
                                <span className="text-gray-500">заказов</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    {/* Reliability */}
                    <div className={`rounded-xl p-3.5 border border-gray-200 ${getPriceLevelBg(priceLevel)}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Award className="w-4 h-4 text-gray-600" />
                            <span className="text-xs font-semibold text-gray-600">Надежность</span>
                        </div>
                        <div className={`text-2xl font-bold ${getReliabilityColor(reliability)}`}>
                            {reliability}%
                        </div>
                    </div>

                    {/* Response Time */}
                    <div className="bg-blue-50 rounded-xl p-3.5 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-semibold text-gray-600">Ответ</span>
                        </div>
                        <div className="text-lg font-bold text-blue-600">
                            {avgResponseTime}
                        </div>
                    </div>
                </div>

                {/* Price Level Bar */}
                <div className="mb-5 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className={`w-4 h-4 ${getPriceLevelColor(priceLevel)}`} />
                            <span className="text-xs font-semibold text-gray-600">Ценовой уровень</span>
                        </div>
                        <span className={`text-sm font-bold ${getPriceLevelColor(priceLevel)}`}>
                            {getPriceLevelLabel(priceLevel)}
                        </span>
                    </div>
                    {/* Price Level Indicator */}
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${
                                priceLevel === 'low'
                                    ? 'w-1/3 bg-gradient-to-r from-green-400 to-green-600'
                                    : priceLevel === 'medium'
                                    ? 'w-2/3 bg-gradient-to-r from-orange-400 to-orange-600'
                                    : 'w-full bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                        />
                    </div>
                </div>

                {/* Categories */}
                <div>
                    <p className="text-xs font-bold text-gray-600 mb-2.5 uppercase tracking-wide">
                        Категории товаров
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((category, index) => (
                            <span
                                key={index}
                                className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 text-xs rounded-lg font-semibold hover:shadow-md transition-all"
                            >
                                {category}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Bottom CTA - Optional */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect?.();
                    }}
                    className="mt-5 w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all opacity-0 group-hover:opacity-100 duration-300"
                >
                    Узнать больше →
                </button>
            </div>
        </div>
    );
};

