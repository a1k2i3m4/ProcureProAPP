import {Clock, ShoppingCart, TrendingUp, Users} from "lucide-react";
import {Orders, StatCard} from "../components";
import {useAuth} from "../context/AuthContext.tsx";

const HomePage = () => {
    const { user } = useAuth();

    const stats = [
        {
            icon: ShoppingCart,
            value: '3',
            label: 'Активные заказы',
            color: 'bg-purple-100 text-purple-600',
            trend: { value: 12, direction: 'up' as const },
        },
        {
            icon: Users,
            value: '24',
            label: 'Поставщики',
            color: 'bg-blue-100 text-blue-600',
            trend: { value: 5, direction: 'up' as const },
        },
        {
            icon: TrendingUp,
            value: '12%',
            label: 'Средняя экономия',
            color: 'bg-orange-100 text-orange-600',
            trend: { value: 3, direction: 'down' as const },
        },
        {
            icon: Clock,
            value: '45мин',
            label: 'Время обработки',
            color: 'bg-red-100 text-red-600',
            trend: { value: 8, direction: 'down' as const },
        },
    ];

    const handleStatClick = (statLabel: string) => {
        console.log(`Clicked on: ${statLabel}`);
        // Можно добавить навигацию или модальное окно с деталями
    };

    return (
        <div className="container mx-auto px-6 py-8">
            {/* Title */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Панель управления</h1>
                    <p className="text-gray-600">
                        Добро пожаловать, <span className="font-semibold text-gray-900">{user?.username || 'пользователь'}</span>
                    </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200">
                    <span>📊 История</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <StatCard
                        key={index}
                        icon={stat.icon}
                        value={stat.value}
                        label={stat.label}
                        color={stat.color}
                        trend={stat.trend}
                        onClick={() => handleStatClick(stat.label)}
                    />
                ))}
            </div>

            {/* Orders Section */}
            <Orders />
        </div>
    )
}

export default HomePage