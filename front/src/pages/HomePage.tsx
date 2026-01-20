import {Clock, ShoppingCart, TrendingUp, Users} from "lucide-react";
import {Orders} from "../components/Orders.tsx";

const HomePage = () => {
    const stats = [
        {
            icon: ShoppingCart,
            value: '3',
            label: 'Активные заказы',
            color: 'bg-purple-100 text-purple-600',
        },
        {
            icon: Users,
            value: '24',
            label: 'Поставщики',
            color: 'bg-blue-100 text-blue-600',
        },
        {
            icon: TrendingUp,
            value: '12%',
            label: 'Средняя экономия',
            color: 'bg-orange-100 text-orange-600',
        },
        {
            icon: Clock,
            value: '45мин',
            label: 'Время обработки',
            color: 'bg-red-100 text-red-600',
        },
    ];

    return (
        <div className="container mx-auto px-6 py-8">
            {/* Title */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl text-gray-900 mb-2">Панель управления</h1>
                    <p className="text-gray-600 font-">Добро пожаловать, manager</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                    <span>История</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-3xl text-gray-bold mb-1 ">{stat.value}</div>
                                <div className="text-sm text-gray-600">{stat.label}</div>
                            </div>
                            <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
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