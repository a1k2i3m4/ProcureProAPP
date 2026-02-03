import { useState } from "react";
import { OrderCard, type OrderStatus } from "./OrderCard";

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

type FilterStatus = "all" | OrderStatus;

export function Orders() {
    const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("all");

    const statusButtons: { value: FilterStatus; label: string }[] = [
        { value: "all", label: "Все" },
        { value: "waiting", label: "Ожидание" },
        { value: "reviewing", label: "На рассмотрении" },
        { value: "completed", label: "Завершенные" },
    ];

    const filteredOrders =
        selectedStatus === "all"
            ? mockOrders
            : mockOrders.filter((order) => order.status === selectedStatus);

    const handleOpenChat = (orderNumber: string) => {
        console.log(`Opening WhatsApp chat for order: ${orderNumber}`);
        // Здесь можно добавить логику для открытия WhatsApp
    };

    const handleViewDetails = (orderNumber: string) => {
        console.log(`Viewing details for order: ${orderNumber}`);
        // Здесь можно добавить навигацию на страницу деталей заказа
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    📦 Заказы из 1С
                </h2>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    {statusButtons.map((button) => (
                        <button
                            key={button.value}
                            onClick={() => setSelectedStatus(button.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                selectedStatus === button.value
                                    ? "bg-purple-600 text-white shadow-md"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            {button.label}
                            {button.value !== "all" && (
                                <span className="ml-2 text-xs">
                                    ({mockOrders.filter(o => o.status === button.value).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Grid */}
            <div className="p-6">
                {filteredOrders.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredOrders.map((order) => (
                            <OrderCard
                                key={order.id}
                                {...order}
                                onOpenChat={() => handleOpenChat(order.orderNumber)}
                                onViewDetails={() => handleViewDetails(order.orderNumber)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <p className="text-gray-500 text-lg mb-2">
                            Нет заказов с выбранным статусом
                        </p>
                        <p className="text-gray-400 text-sm">
                            Попробуйте выбрать другой фильтр
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
