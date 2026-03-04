import { useEffect, useState } from "react";
import { Package, Clock, FileText, Loader, RefreshCw, BarChart3, Plus, Trash2, AlertCircle } from "lucide-react";
import { Order, OrderItem, ordersApi } from "../api/ordersApi";
import { Modal } from "./Modal";
import { AnalysisModal } from "./AnalysisModal";

export function Orders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'today'>('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [analysisOrderId, setAnalysisOrderId] = useState<string | null>(null);

    // --- Создание заказа вручную ---
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [newOrderId, setNewOrderId] = useState('');
    const [newOrderFast, setNewOrderFast] = useState<'no' | 'yes'>('no');
    const [newItems, setNewItems] = useState<OrderItem[]>([{ tovar: '', specific: '', qty: 1 }]);

    const openCreateModal = async () => {
        setCreateError(null);
        setNewOrderFast('no');
        setNewItems([{ tovar: '', specific: '', qty: 1 }]);
        setNewOrderId('...');
        setCreateModalOpen(true);
        try {
            const res = await ordersApi.getNextManualId();
            setNewOrderId(res.next_id);
        } catch {
            setNewOrderId('manual-001');
        }
    };

    const handleAddItem = () => setNewItems(prev => [...prev, { tovar: '', specific: '', qty: 1 }]);
    const handleRemoveItem = (idx: number) => setNewItems(prev => prev.filter((_, i) => i !== idx));
    const handleItemChange = (idx: number, field: keyof OrderItem, value: string | number) => {
        setNewItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    };

    const handleCreateOrder = async () => {
        setCreateError(null);
        if (!newOrderId.trim()) { setCreateError('Укажите номер заказа'); return; }
        const validItems = newItems.filter(it => it.tovar.trim());
        if (validItems.length === 0) { setCreateError('Добавьте хотя бы один товар'); return; }

        setCreating(true);
        try {
            await ordersApi.createOrder({ order_id: newOrderId.trim(), fast: newOrderFast, items: validItems });
            setCreateModalOpen(false);
            setNewOrderId('');
            setNewOrderFast('no');
            setNewItems([{ tovar: '', specific: '', qty: 1 }]);
            await fetchOrders();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } }; message?: string };
            setCreateError(err?.response?.data?.message || err?.message || 'Ошибка создания заказа');
        } finally {
            setCreating(false);
        }
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = filter === 'today'
                ? await ordersApi.getOrdersToday()
                : await ordersApi.getOrders();
            setOrders(data);
            setError(null);
        } catch (err) {
            setError("Не удалось загрузить заказы");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        // Poll every 30 seconds to update orders
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, [filter]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            new: "bg-blue-100 text-blue-700",
            processing: "bg-yellow-100 text-yellow-700",
            completed: "bg-green-100 text-green-700",
            error: "bg-red-100 text-red-700"
        };
        const labels: Record<string, string> = {
            new: "Новый",
            processing: "В обработке",
            completed: "Завершен",
            error: "Ошибка"
        };
        const key = status as keyof typeof styles;

        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[key] || "bg-gray-100 text-gray-600"}`}>
                {labels[status] || status}
            </span>
        );
    };

    const handleOrderClick = async (order: Order) => {
        setSelectedOrder(order); // Показываем модалку сразу
        try {
            // Загружаем полные данные заказа с товарами
            const fullOrder = await ordersApi.getOrderDetails(order.order_id);
            setSelectedOrder(fullOrder);
        } catch (e) {
            console.error("Failed to load order details", e);
        }
    };

    const handleAnalyzeClick = (orderId: string) => {
        setAnalysisOrderId(orderId);
        setAnalysisModalOpen(true);
        setSelectedOrder(null); // Close order details modal
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Заказы</h2>
                    <p className="text-sm text-gray-500 mt-1">Из 1С и ручные</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === 'all' ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                        Все заказы
                    </button>
                    <button
                        onClick={() => setFilter('today')}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === 'today' ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                        За сегодня
                    </button>
                    <button
                        onClick={() => fetchOrders()}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Обновить"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {/* Кнопка добавления заказа вручную */}
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Добавить заказ
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="divide-y divide-gray-200">
                {loading && orders.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <Loader className="w-8 h-8 animate-spin mb-3 text-purple-600" />
                        <p>Загрузка заказов...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-500">
                        <p>{error}</p>
                        <button
                            onClick={fetchOrders}
                            className="mt-4 text-purple-600 hover:underline"
                        >
                            Попробовать снова
                        </button>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Заказов пока нет</p>
                        <p className="text-xs mt-1 text-gray-400">Новые файлы появятся здесь автоматически</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.order_id} className="p-6 hover:bg-gray-50 transition-colors group">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-gray-900 font-medium flex items-center gap-2">
                                            Заказ #{order.order_id}
                                            {order.fast === 'yes' && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                                    Срочно
                                                </span>
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDate(order.imported_at)}
                                            </span>
                                            <span className="flex items-center gap-1" title="Файл">
                                                <Package className="w-3.5 h-3.5" />
                                                {order.source_file}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {getStatusBadge(order.status)}
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm">
                                    <span className="text-gray-500">Позиций:</span>
                                    <span className="ml-2 font-medium text-gray-900">{order.items_count}</span>
                                </div>
                                <button
                                    onClick={() => handleOrderClick(order)}
                                    className="text-purple-600 text-sm font-medium hover:text-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Подробнее →
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Order Details Modal */}
            <Modal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                title={selectedOrder ? `Заказ #${selectedOrder.order_id}` : ''}
            >
                {selectedOrder && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="text-gray-500 block mb-1">Статус</span>
                                <div>{getStatusBadge(selectedOrder.status)}</div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="text-gray-500 block mb-1">Дата загрузки</span>
                                <div className="font-medium text-gray-900">{formatDate(selectedOrder.imported_at)}</div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="text-gray-500 block mb-1">Файл</span>
                                <div className="font-medium text-gray-900 truncate" title={selectedOrder.source_file}>{selectedOrder.source_file}</div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <span className="text-gray-500 block mb-1">Срочность</span>
                                <div className={`font-medium ${selectedOrder.fast === 'yes' ? 'text-red-600' : 'text-gray-900'}`}>
                                    {selectedOrder.fast === 'yes' ? 'Срочный' : 'Обычный'}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4 text-purple-600" />
                                Список товаров ({selectedOrder.items_count})
                            </h4>
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium">
                                        <tr>
                                            <th className="px-4 py-3">Наименование</th>
                                            <th className="px-4 py-3">Категория</th>
                                            <th className="px-4 py-3 text-right">Кол-во</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {!selectedOrder.items || selectedOrder.items.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                                    Нет данных о товарах
                                                </td>
                                            </tr>
                                        ) : (
                                            selectedOrder.items.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium text-gray-900">{item.tovar}</td>
                                                    <td className="px-4 py-3 text-gray-600">{item.specific}</td>
                                                    <td className="px-4 py-3 text-right text-gray-900">{item.qty}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Analyze Button */}
                        <div className="pt-4 border-t border-gray-200">
                            <button
                                onClick={() => handleAnalyzeClick(selectedOrder.order_id)}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <BarChart3 className="w-5 h-5" />
                                🔍 Анализировать заказ
                            </button>
                            <p className="text-xs text-gray-500 text-center mt-2">
                                Найти лучших поставщиков и получить предложения через WhatsApp
                            </p>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Analysis Modal */}
            {analysisOrderId && (
                <AnalysisModal
                    isOpen={analysisModalOpen}
                    onClose={() => {
                        setAnalysisModalOpen(false);
                        setAnalysisOrderId(null);
                    }}
                    orderId={analysisOrderId}
                />
            )}

            {/* Модалка создания заказа вручную */}
            <Modal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title="Новый заказ вручную"
            >
                <div className="space-y-5">
                    {/* Номер заказа + срочность */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Номер заказа
                            </label>
                            <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 flex items-center gap-2">
                                {newOrderId === '...'
                                    ? <><Loader className="w-3.5 h-3.5 animate-spin text-purple-500" /> Генерация...</>
                                    : <><span className="text-purple-600 font-semibold">{newOrderId}</span> <span className="text-gray-400 text-xs">(авто)</span></>
                                }
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Срочность</label>
                            <select
                                value={newOrderFast}
                                onChange={e => setNewOrderFast(e.target.value as 'yes' | 'no')}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="no">Обычный</option>
                                <option value="yes">Срочный 🚨</option>
                            </select>
                        </div>
                    </div>

                    {/* Товары */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">
                                Товары <span className="text-red-500">*</span>
                            </label>
                            <button
                                onClick={handleAddItem}
                                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                            >
                                <Plus className="w-4 h-4" /> Добавить строку
                            </button>
                        </div>

                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">Наименование *</th>
                                        <th className="px-3 py-2 text-left font-medium">Категория</th>
                                        <th className="px-3 py-2 text-center font-medium w-20">Кол-во</th>
                                        <th className="w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {newItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={item.tovar}
                                                    onChange={e => handleItemChange(idx, 'tovar', e.target.value)}
                                                    placeholder="Бумага А4"
                                                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={item.specific}
                                                    onChange={e => handleItemChange(idx, 'specific', e.target.value)}
                                                    placeholder="Канцтовары"
                                                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.qty}
                                                    onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                                                    className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-purple-400"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                {newItems.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemoveItem(idx)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Ошибка */}
                    {createError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {createError}
                        </div>
                    )}

                    {/* Кнопки */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setCreateModalOpen(false)}
                            className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleCreateOrder}
                            disabled={creating}
                            className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {creating ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {creating ? 'Создание...' : 'Создать заказ'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
