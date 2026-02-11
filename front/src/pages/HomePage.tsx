import { useEffect, useState } from "react";
import { Clock, ShoppingCart, TrendingUp, Users, Package, RefreshCw } from "lucide-react";
import { Orders } from "../components/Orders.tsx";
import { ordersApi, Stats } from "../api/ordersApi";
import axios from "axios";

const HomePage = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [suppliersCount, setSuppliersCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const [ordersStats, debugCounts] = await Promise.all([
                ordersApi.getStats(),
                // Quick fetch for suppliers count (reusing debug endpoint or create proper api)
                axios.get<{ suppliers: number }>((import.meta.env.VITE_API_URL ?? 'http://localhost:5001') + '/api/debug/counts')
            ]);
            setStats(ordersStats);
            setSuppliersCount(debugCounts.data.suppliers || 0);
        } catch (e) {
            console.error("Failed to load stats", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const dashboardStats = [
        {
            icon: ShoppingCart,
            value: stats?.total_orders.toString() || '-',
            label: 'Заказы из 1С',
            color: 'bg-purple-100 text-purple-600',
        },
        {
            icon: Users,
            value: suppliersCount.toString(),
            label: 'Поставщики',
            color: 'bg-blue-100 text-blue-600',
        },
        {
            icon: Package,
            value: stats?.total_items.toString() || '-',
            label: 'Всего товаров',
            color: 'bg-orange-100 text-orange-600',
        },
        {
            icon: Clock,
            value: 'Авто',
            label: 'Синхронизация',
            color: 'bg-green-100 text-green-600',
        },
    ];

    return (
        <div className="container mx-auto px-6 py-8">
            {/* Title */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Панель управления</h1>
                    <p className="text-gray-600">Обзор заказов и поставок</p>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Обновить</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {dashboardStats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                                <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                            </div>
                            <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Orders Section */}
            <Orders />
        </div>
    )
}

export default HomePage