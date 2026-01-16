import { useState } from "react";
import { Package, MessageCircle } from "lucide-react";

type OrderStatus =
    | "all"
    | "waiting"
    | "reviewing"
    | "completed";

interface Order {
    id: string;
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
}

const mockOrders: Order[] = [
    {
        id: "1",
        orderNumber: "ORD-2024-001",
        date: "2024-12-25",
        time: "09:15",
        client: "СU Алматы - ТЦ Dostyk Plaza",
        category: "Хозяйственные товары",
        itemsCount: 12,
        responsesCount: 3,
        totalResponses: 5,
        amount: 145000,
        status: "waiting",
        responsePercentage: 60,
    },
    {
        id: "2",
        orderNumber: "ORD-2024-002",
        date: "2024-12-25",
        time: "10:30",
        client: "СU Нур-Султан - ул. Кабанбай батыра",
        category: "Продукты питания",
        itemsCount: 25,
        responsesCount: 7,
        totalResponses: 8,
        amount: 520000,
        status: "reviewing",
        responsePercentage: 88,
    },
    {
        id: "3",
        orderNumber: "ORD-2024-003",
        date: "2024-12-24",
        time: "15:45",
        client: "СU Шымкент - пр. Тауке хана",
        category: "Бытовая химия",
        itemsCount: 18,
        responsesCount: 5,
        totalResponses: 5,
        amount: 280000,
        status: "completed",
        responsePercentage: 100,
    },
];

export function Orders() {
    const [selectedStatus, setSelectedStatus] =
        useState<OrderStatus>("all");

    const statusButtons: { value: OrderStatus; label: string }[] =
        [
            { value: "all", label: "Все" },
            { value: "waiting", label: "Ожидание" },
            { value: "reviewing", label: "На рассмотрении" },
            { value: "completed", label: "Завершенные" },
        ];

    const getStatusBadge = (order: Order) => {
        if (order.status === "completed") {
            return null;
        }
        if (order.status === "waiting") {
            return (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
          Ожидание ответов
        </span>
            );
        }
        if (order.status === "reviewing") {
            return (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
          На рассмотрении
        </span>
            );
        }
        return null;
    };

    const filteredOrders =
        selectedStatus === "all"
            ? mockOrders
            : mockOrders.filter(
                (order) => order.status === selectedStatus,
            );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl text-gray-900 mb-4">
                    Заказы из 1С
                </h2>

                {/* Filters */}
                <div className="flex gap-2">
                    {statusButtons.map((button) => (
                        <button
                            key={button.value}
                            onClick={() => setSelectedStatus(button.value)}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                                selectedStatus === button.value
                                    ? "bg-purple-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            {button.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            <div className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                    <div
                        key={order.id}
                        className="p-6 hover:bg-gray-50 transition-colors"
                    >
                        {/* Order Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Package className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-gray-900">
                                            {order.orderNumber}
                                        </h3>
                                        <span className="text-xs text-gray-500">
                      {order.date} {order.time}
                    </span>
                                    </div>
                                    <p className="text-gray-900 mb-1">
                                        {order.client}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {order.category}
                                    </p>
                                </div>
                            </div>
                            {getStatusBadge(order)}
                        </div>

                        {/* Order Details */}
                        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                            <div>
                                <span className="text-gray-600">Товаров:</span>
                                <div className="text-gray-900 mt-1">
                                    {order.itemsCount}
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-600">Ответы:</span>
                                <div className="text-gray-900 mt-1">
                                    {order.responsesCount}/{order.totalResponses}
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-600">Сумма:</span>
                                <div className="text-gray-900 mt-1">
                                    {order.amount.toLocaleString("ru-RU")} ₸
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-600 rounded-full transition-all"
                                    style={{
                                        width: `${order.responsePercentage}%`,
                                    }}
                                />
                            </div>
                            <p className="text-xs text-gray-600 mt-1 text-center">
                                {order.responsePercentage}% поставщиков ответили
                            </p>
                        </div>

                        {/* Action Button */}
                        {order.status === "waiting" && (
                            <button className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                <MessageCircle className="w-4 h-4" />
                                <span>Открыть WhatsApp чаты</span>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {filteredOrders.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                    Нет заказов с выбранным статусом
                </div>
            )}
        </div>
    );
}