import { useState } from 'react';
import { TrendingUp, Users, Award } from 'lucide-react';

interface Supplier {
    id: string;
    name: string;
    status: 'regular' | 'new';
    rating: number;
    ordersCount: number;
    reliability: number;
    categories: string[];
    priceLevel: 'low' | 'medium' | 'high';
    avgResponseTime: string;
}

const mockSuppliers: Supplier[] = [
    {
        id: '1',
        name: 'ТОО "Казхимторг"',
        status: 'regular',
        rating: 4.8,
        ordersCount: 156,
        reliability: 98,
        categories: ['Моющие средства', 'Чистящие средства'],
        priceLevel: 'medium',
        avgResponseTime: '5 мин',
    },
    {
        id: '2',
        name: 'ИП "Чистота+"',
        status: 'regular',
        rating: 4.5,
        ordersCount: 89,
        reliability: 95,
        categories: ['Моющие средства'],
        priceLevel: 'low',
        avgResponseTime: '12 мин',
    },
    {
        id: '3',
        name: 'ТОО "МегаОпт"',
        status: 'new',
        rating: 4.2,
        ordersCount: 12,
        reliability: 92,
        categories: ['Чистящие средства'],
        priceLevel: 'high',
        avgResponseTime: '8 мин',
    },
];

type FilterStatus = 'all' | 'regular' | 'new';

export function Suppliers() {
    const [selectedStatus, setSelectedStatus] = useState<FilterStatus>('all');

    const statusButtons: { value: FilterStatus; label: string }[] = [
        { value: 'all', label: 'Все' },
        { value: 'regular', label: 'Постоянные' },
        { value: 'new', label: 'Новые' },
    ];

    const filteredSuppliers = mockSuppliers.filter((supplier) =>
        selectedStatus === 'all' || supplier.status === selectedStatus
    );

    const regularCount = mockSuppliers.filter(s => s.status === 'regular').length;
    const newCount = mockSuppliers.filter(s => s.status === 'new').length;
    const avgRating = (mockSuppliers.reduce((sum, s) => sum + s.rating, 0) / mockSuppliers.length).toFixed(1);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-blue-600 text-white py-12 shadow-lg">
                <div className="container mx-auto px-6">
                    {/* Title */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                <Users className="w-6 h-6" />
                            </div>
                            <h1 className="text-4xl font-bold">Управление поставщиками</h1>
                        </div>
                        <p className="text-purple-100 text-lg ml-15">Найдите лучших партнёров для вашего бизнеса</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Total Suppliers */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">Всего поставщиков</p>
                                    <p className="text-3xl font-bold mt-1">{mockSuppliers.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <Users className="w-6 h-6" />
                                </div>
                            </div>
                        </div>

                        {/* Average Rating */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">Средний рейтинг</p>
                                    <p className="text-3xl font-bold mt-1">{avgRating} ⭑</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <Award className="w-6 h-6" />
                                </div>
                            </div>
                        </div>

                        {/* Total Orders */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">Всего заказов</p>
                                    <p className="text-3xl font-bold mt-1">{mockSuppliers.reduce((sum, s) => sum + s.ordersCount, 0)}</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-12">
                {/* Filters Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-1 h-8 bg-gradient-to-b from-purple-600 to-blue-600 rounded-full"></span>
                            Фильтры поставщиков
                        </h2>
                        <p className="text-gray-500 mt-2">Выберите категорию для фильтрации</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {statusButtons.map((button) => (
                            <button
                                key={button.value}
                                onClick={() => setSelectedStatus(button.value)}
                                className={`
                                    px-6 py-3 rounded-xl font-semibold transition-all duration-300
                                    flex items-center gap-2
                                    ${selectedStatus === button.value
                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                                    }
                                `}
                            >
                                <span>
                                    {button.value === 'all' && '🔍'}
                                    {button.value === 'regular' && '⭐'}
                                    {button.value === 'new' && '✨'}
                                </span>
                                {button.label}
                                {button.value !== 'all' && (
                                    <span className={`
                                        ml-2 px-3 py-1 rounded-full text-sm font-bold
                                        ${selectedStatus === button.value
                                            ? 'bg-white/20'
                                            : 'bg-gray-300'
                                        }
                                    `}>
                                        {button.value === 'regular' ? regularCount : newCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Suppliers Grid */}
                {filteredSuppliers.length > 0 ? (
                    <div>
                        {/* Results Info */}
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <p className="text-gray-600">
                                    Показано <span className="font-bold text-gray-900">{filteredSuppliers.length}</span> поставщиков
                                </p>
                            </div>
                            <div className="text-sm text-gray-500">
                                Сортировка по рейтингу
                            </div>
                        </div>

                        {/* Cards Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {filteredSuppliers.map((supplier) => (
                                <div key={supplier.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                                    <div className="font-bold text-gray-900 truncate" title={supplier.name}>{supplier.name}</div>
                                    <div className="text-sm text-gray-600 mt-1">Рейтинг: {supplier.rating} · Надёжность: {supplier.reliability}%</div>
                                    <div className="text-sm text-gray-600 mt-1">Категории: {supplier.categories.join(', ')}</div>
                                    <div className="text-sm text-gray-600 mt-1">Срок ответа: {supplier.avgResponseTime}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-5xl">🔍</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Поставщиков не найдено</h3>
                        <p className="text-gray-500 text-center max-w-md">Попробуйте выбрать другой фильтр</p>
                        <button
                            onClick={() => setSelectedStatus('all')}
                            className="mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                        >
                            Сбросить фильтры
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

