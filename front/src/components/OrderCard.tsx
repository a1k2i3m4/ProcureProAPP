import React from 'react';
import { Package, MessageCircle, CheckCircle, Clock } from 'lucide-react';

export type OrderStatus = 'waiting' | 'reviewing' | 'completed';

export interface OrderCardProps {
    orderNumber: string;
    date: string;
    time: string;
    client: string;
    category: string;
    itemsCount: number;
    responsesCount: number;
    totalResponses: number;
    amount: number;
    status: OrderStatus;
    responsePercentage: number;
    onOpenChat?: () => void;
    onViewDetails?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
    orderNumber,
    date,
    time,
    client,
    category,
    itemsCount,
    responsesCount,
    totalResponses,
    amount,
    status,
    responsePercentage,
    onOpenChat,
    onViewDetails,
}) => {
    const getStatusBadge = () => {
        switch (status) {
            case 'waiting':
                return (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Ожидание ответов
                    </span>
                );
            case 'reviewing':
                return (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        На рассмотрении
                    </span>
                );
            case 'completed':
                return (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Завершено
                    </span>
                );
            default:
                return null;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'waiting':
                return 'hover:bg-yellow-50 border-yellow-100';
            case 'reviewing':
                return 'hover:bg-blue-50 border-blue-100';
            case 'completed':
                return 'hover:bg-green-50 border-green-100';
            default:
                return 'hover:bg-gray-50';
        }
    };

    return (
        <div
            className={`p-6 border border-gray-200 rounded-lg transition-all cursor-pointer ${getStatusColor()}`}
            onClick={onViewDetails}
        >
            {/* Order Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-gray-900">
                                {orderNumber}
                            </h3>
                            <span className="text-xs text-gray-500">
                                {date} {time}
                            </span>
                        </div>
                        <p className="text-sm text-gray-900 font-medium mb-1">
                            {client}
                        </p>
                        <p className="text-xs text-gray-600">
                            {category}
                        </p>
                    </div>
                </div>
                <div>
                    {getStatusBadge()}
                </div>
            </div>

            {/* Order Details Grid */}
            <div className="grid grid-cols-3 gap-4 mb-4 py-3 border-y border-gray-200">
                <div>
                    <span className="text-xs text-gray-600 block mb-1">Товаров:</span>
                    <div className="text-sm font-semibold text-gray-900">
                        {itemsCount} шт.
                    </div>
                </div>
                <div>
                    <span className="text-xs text-gray-600 block mb-1">Ответы:</span>
                    <div className="text-sm font-semibold text-gray-900">
                        {responsesCount}/{totalResponses}
                    </div>
                </div>
                <div>
                    <span className="text-xs text-gray-600 block mb-1">Сумма:</span>
                    <div className="text-sm font-semibold text-purple-600">
                        {amount.toLocaleString('ru-RU')} ₸
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600">
                        Ответили поставщики
                    </span>
                    <span className="text-xs font-semibold text-gray-900">
                        {responsePercentage}%
                    </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${
                            responsePercentage === 100
                                ? 'bg-green-500'
                                : responsePercentage >= 75
                                ? 'bg-blue-500'
                                : 'bg-purple-600'
                        }`}
                        style={{ width: `${responsePercentage}%` }}
                    />
                </div>
            </div>

            {/* Action Button */}
            {status === 'waiting' && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenChat?.();
                    }}
                    className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp чаты</span>
                </button>
            )}

            {status === 'completed' && (
                <div className="w-full py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg text-center flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Заказ выполнен</span>
                </div>
            )}
        </div>
    );
};
