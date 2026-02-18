import React from 'react';
import { Star, Clock, Package, TrendingUp, CheckCircle } from 'lucide-react';

interface ResponseItem {
    item_name: string;
    price: number;
    quantity_available: number;
    delivery_days: number;
}

interface SupplierResponseCardProps {
    supplier_id: number;
    supplier_name: string;
    rating: number;
    can_urgent: boolean;
    category_name: string;
    items: ResponseItem[];
    total_price: number;
    max_delivery_days: number;
    score: number;
}

export const SupplierResponseCard: React.FC<SupplierResponseCardProps> = ({
    supplier_name,
    rating,
    can_urgent,
    category_name,
    items,
    total_price,
    max_delivery_days,
    score
}) => {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{supplier_name}</h3>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Rating */}
                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-semibold text-gray-900">{rating.toFixed(1)}</span>
                        </div>

                        {/* Category */}
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {category_name}
                        </span>

                        {/* Urgent badge */}
                        {can_urgent && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold flex items-center gap-1">
                                ⚡ Может срочно
                            </span>
                        )}
                    </div>
                </div>

                {/* Score */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg px-4 py-2 text-center">
                    <div className="text-xs text-gray-600 mb-1">Оценка</div>
                    <div className="text-2xl font-bold text-purple-600">
                        {(score * 100).toFixed(0)}
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Товары ({items.length})
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-gray-600 font-medium">Товар</th>
                                <th className="px-3 py-2 text-right text-gray-600 font-medium">Цена</th>
                                <th className="px-3 py-2 text-right text-gray-600 font-medium">Доступно</th>
                                <th className="px-3 py-2 text-right text-gray-600 font-medium">Срок</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-gray-900">{item.item_name}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                        {item.price.toLocaleString('ru-RU')} ₸
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-600">
                                        {item.quantity_available} шт
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-600">
                                        {item.delivery_days} дн
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>Макс. срок: <strong className="text-gray-900">{max_delivery_days} дней</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span>Общая сумма: <strong className="text-purple-600">{total_price.toLocaleString('ru-RU')} ₸</strong></span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Рекомендовано</span>
                </div>
            </div>
        </div>
    );
};

