import React from 'react';
import { TrendingUp, Clock, Package, Award, CheckCircle2 } from 'lucide-react';
import { OptimalCombination as OptimalCombinationType } from '../api/ordersApi';

interface OptimalCombinationProps {
    data: OptimalCombinationType;
}

export const OptimalCombination: React.FC<OptimalCombinationProps> = ({ data }) => {
    if (!data.suppliers || data.suppliers.length === 0) {
        return (
            <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">{data.message || 'Нет данных для оптимальной комбинации'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-purple-600 mb-2">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-sm font-medium">Общая сумма</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                        {data.grand_total.toLocaleString('ru-RU')} ₸
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <Clock className="w-5 h-5" />
                        <span className="text-sm font-medium">Макс. срок</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                        {data.max_delivery_days} дней
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium">Покрытие</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                        {data.coverage}%
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-orange-600 mb-2">
                        <Award className="w-5 h-5" />
                        <span className="text-sm font-medium">Поставщиков</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-900">
                        {data.suppliers.length}
                    </div>
                </div>
            </div>

            {/* Coverage info */}
            {data.coverage < 100 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                        ⚠️ Внимание: Покрыто {data.items_covered} из {data.items_required} позиций.
                        Некоторые товары могут быть недоступны у выбранных поставщиков.
                    </p>
                </div>
            )}

            {/* Suppliers breakdown */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    Распределение по поставщикам
                </h3>

                {data.suppliers.map((supplier, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        {/* Supplier header */}
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900">{supplier.supplier_name}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-sm text-gray-600 flex items-center gap-1">
                                                ⭐ {supplier.rating.toFixed(1)}
                                            </span>
                                            {supplier.can_urgent && (
                                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
                                                    ⚡ Срочно
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-sm text-gray-600 mb-1">Сумма</div>
                                    <div className="text-xl font-bold text-purple-600">
                                        {supplier.total.toLocaleString('ru-RU')} ₸
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Товар</th>
                                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Количество</th>
                                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Цена за ед.</th>
                                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Сумма</th>
                                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Срок</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {supplier.items.map((item, itemIdx) => (
                                        <tr key={itemIdx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">{item.item_name}</td>
                                            <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                                                {item.quantity} шт
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right text-gray-600">
                                                {item.price_per_unit.toLocaleString('ru-RU')} ₸
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                                                {item.total.toLocaleString('ru-RU')} ₸
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right text-gray-600">
                                                {item.delivery_days} дн
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Supplier footer */}
                        <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span>Срок поставки: <strong>{supplier.max_delivery_days} дней</strong></span>
                            </div>
                            <div className="text-sm text-gray-600">
                                Позиций: <strong>{supplier.items.length}</strong>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

