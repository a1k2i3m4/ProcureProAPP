import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader, CheckCircle, Clock, AlertTriangle, BarChart3, Users } from 'lucide-react';
import {
    ordersApi,
    AnalysisStatus,
    BestOffer,
    OptimalCombination as OptimalCombinationType,
    SupplierResponse
} from '../api/ordersApi';
import { SupplierResponseCard } from './SupplierResponseCard';
import { OptimalCombination } from './OptimalCombination';

interface AnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
}

type TabType = 'all' | 'best' | 'optimal';

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, orderId }) => {
    const [status, setStatus] = useState<AnalysisStatus | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('best');
    const [allResponses, setAllResponses] = useState<SupplierResponse[]>([]);
    const [bestOffers, setBestOffers] = useState<BestOffer[]>([]);
    const [optimalCombination, setOptimalCombination] = useState<OptimalCombinationType | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasStartedAnalysis, setHasStartedAnalysis] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isRestarting, setIsRestarting] = useState(false);

    const loadResults = useCallback(async () => {
        try {
            const [responses, offers, combination] = await Promise.all([
                ordersApi.getSupplierResponses(orderId),
                ordersApi.getBestOffers(orderId, 10),
                ordersApi.getOptimalCombination(orderId)
            ]);

            setAllResponses(responses);
            setBestOffers(offers);
            setOptimalCombination(combination);
        } catch (err) {
            console.error('Error loading results:', err);
        }
    }, [orderId]);

    const checkExistingAnalysis = useCallback(async () => {
        try {
            const existingStatus = await ordersApi.getAnalysisStatus(orderId);
            setStatus(existingStatus);
            setHasStartedAnalysis(true);

            if (existingStatus.status !== 'in_progress') {
                // Load results if analysis is completed
                await loadResults();
            }
        } catch (err: unknown) {
            // No analysis exists yet
            const responseError = err as { response?: { status?: number } };
            if (responseError.response?.status === 404) {
                setStatus(null);
                setHasStartedAnalysis(false);
            }
        }
    }, [orderId, loadResults]);

    // Check if analysis exists
    useEffect(() => {
        if (isOpen && orderId) {
            checkExistingAnalysis();
        }
    }, [isOpen, orderId, checkExistingAnalysis]);

    // Poll for status updates
    useEffect(() => {
        if (!isOpen || !hasStartedAnalysis || !status || status.status !== 'in_progress') {
            return;
        }

        const interval = setInterval(async () => {
            try {
                const updatedStatus = await ordersApi.getAnalysisStatus(orderId);
                setStatus(updatedStatus);

                if (updatedStatus.status !== 'in_progress') {
                    // Analysis completed, load results
                    await loadResults();
                }
            } catch (err) {
                console.error('Error polling status:', err);
            }
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, [isOpen, hasStartedAnalysis, status, orderId, loadResults]);

    const startAnalysis = async () => {
        try {
            setIsAnalyzing(true);
            setError(null);

            await ordersApi.analyzeOrder(orderId);

            // Fetch initial status
            const initialStatus = await ordersApi.getAnalysisStatus(orderId);
            setStatus(initialStatus);
            setHasStartedAnalysis(true);

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Ошибка запуска анализа';
            const responseError = err as { response?: { status?: number; data?: { error?: string } } };

            if (responseError.response?.status === 409) {
                // Analysis already exists, just load the status
                await checkExistingAnalysis();
            } else {
                setError(responseError.response?.data?.error || errorMsg);
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const completeAnalysisManually = async () => {
        const confirmMessage = status?.responses_received
            ? 'Завершить анализ досрочно и рассчитать результаты по текущим ответам?'
            : 'Ответов пока нет. Завершить анализ досрочно и закрыть сбор ответов?';

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            setIsCompleting(true);
            await ordersApi.completeAnalysis(orderId);
            const updatedStatus = await ordersApi.getAnalysisStatus(orderId);
            setStatus(updatedStatus);
            await loadResults();
        } catch (err) {
            const responseError = err as { response?: { data?: { error?: string } } };
            setError(responseError.response?.data?.error || 'Ошибка завершения анализа');
        } finally {
            setIsCompleting(false);
        }
    };

    const restartAnalysis = async () => {
        const confirmMessage = status?.status === 'in_progress'
            ? 'Анализ еще идет. Перезапустить и начать заново?'
            : 'Перезапустить анализ и начать заново?';

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            setIsRestarting(true);
            setError(null);
            await ordersApi.restartAnalysis(orderId);
            setAllResponses([]);
            setBestOffers([]);
            setOptimalCombination(null);
            setActiveTab('best');
            const initialStatus = await ordersApi.getAnalysisStatus(orderId);
            setStatus(initialStatus);
            setHasStartedAnalysis(true);
        } catch (err) {
            const responseError = err as { response?: { data?: { error?: string } } };
            setError(responseError.response?.data?.error || 'Ошибка повторного анализа');
        } finally {
            setIsRestarting(false);
        }
    };

    if (!isOpen) return null;

    const renderContent = () => {
        // No analysis started yet
        if (!hasStartedAnalysis && !status) {
            return (
                <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-purple-600" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Анализ заказа</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Система найдет подходящих поставщиков, отправит им детали заказа через WhatsApp
                        и соберет лучшие предложения по цене, срокам и качеству.
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={startAnalysis}
                        disabled={isAnalyzing}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAnalyzing ? (
                            <span className="flex items-center gap-2">
                                <Loader className="w-5 h-5 animate-spin" />
                                Запуск анализа...
                            </span>
                        ) : (
                            '🔍 Начать анализ'
                        )}
                    </button>
                </div>
            );
        }

        // Analysis in progress
        if (status?.status === 'in_progress') {
            const progress = status.progress_percent || 0;

            return (
                <div className="py-8">
                    <div className="text-center mb-6">
                        <Loader className="w-12 h-12 mx-auto mb-4 text-purple-600 animate-spin" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Анализ в процессе...</h3>
                        <p className="text-gray-600">
                            Ожидаем ответы от поставщиков
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div className="max-w-2xl mx-auto mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">
                                Ответили {status.responses_received} из {status.suppliers_contacted} поставщиков
                            </span>
                            <span className="text-sm font-semibold text-purple-600">
                                {progress}%
                            </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Timer */}
                    <div className="flex items-center justify-center gap-2 text-gray-600 mb-6">
                        <Clock className="w-5 h-5" />
                        <span className="text-lg font-mono">
                            Осталось: {status.time_remaining_formatted}
                        </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                            <div className="text-2xl font-bold text-blue-900">{status.suppliers_contacted}</div>
                            <div className="text-sm text-blue-700">Отправлено</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
                            <div className="text-2xl font-bold text-green-900">{status.responses_received}</div>
                            <div className="text-sm text-green-700">Получено</div>
                        </div>
                    </div>

                    {/* Manual complete button */}
                    <div className="text-center">
                        {status.responses_received === 0 && (
                            <div className="mb-3 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 inline-block">
                                Ответов пока нет. Можно завершить анализ вручную.
                            </div>
                        )}
                        <button
                            onClick={completeAnalysisManually}
                            disabled={isCompleting}
                            className="px-6 py-2 bg-white border border-purple-300 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCompleting ? 'Завершаем анализ...' : 'Завершить анализ досрочно'}
                        </button>
                    </div>
                </div>
            );
        }

        // Analysis completed - show results with tabs
        if (status && ['completed', 'timeout'].includes(status.status)) {
            return (
                <div>
                    {/* Status banner */}
                    <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                        status.status === 'completed' 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                        {status.status === 'completed' ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                            <AlertTriangle className="w-6 h-6 text-yellow-600" />
                        )}
                        <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">
                                {status.status === 'completed' ? 'Анализ завершен' : 'Анализ завершен по тайм-ауту'}
                            </h4>
                            <p className="text-sm text-gray-600">
                                Получено {status.responses_received} ответов от {status.suppliers_contacted} поставщиков
                            </p>
                        </div>
                        <button
                            onClick={restartAnalysis}
                            disabled={isRestarting}
                            className="px-4 py-2 bg-white border border-purple-300 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRestarting ? 'Перезапуск...' : 'Повторить анализ'}
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-6 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('best')}
                            className={`px-4 py-2 font-medium transition-colors relative ${
                                activeTab === 'best'
                                    ? 'text-purple-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            🏆 Лучшие предложения
                            {activeTab === 'best' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('optimal')}
                            className={`px-4 py-2 font-medium transition-colors relative ${
                                activeTab === 'optimal'
                                    ? 'text-purple-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            ✨ Оптимальная комбинация
                            {activeTab === 'optimal' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-2 font-medium transition-colors relative ${
                                activeTab === 'all'
                                    ? 'text-purple-600'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            📋 Все ответы ({allResponses.length})
                            {activeTab === 'all' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                            )}
                        </button>
                    </div>

                    {/* Tab content */}
                    <div className="max-h-[60vh] overflow-y-auto">
                        {activeTab === 'best' && (
                            <div className="space-y-4">
                                {bestOffers.length > 0 ? (
                                    bestOffers.map((offer) => (
                                        <SupplierResponseCard key={offer.supplier_id} {...offer} />
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        Нет предложений для отображения
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'optimal' && optimalCombination && (
                            <OptimalCombination data={optimalCombination} />
                        )}

                        {activeTab === 'all' && (
                            <div className="space-y-3">
                                {allResponses.length > 0 ? (
                                    allResponses.map((response) => (
                                        <div key={response.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-gray-900">{response.supplier_name}</h4>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(response.response_time).toLocaleString('ru-RU')}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-gray-600">Товар:</span>
                                                    <span className="ml-2 font-medium text-gray-900">{response.item_name}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Цена:</span>
                                                    <span className="ml-2 font-medium text-gray-900">{response.price.toLocaleString('ru-RU')} ₸</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Количество:</span>
                                                    <span className="ml-2 font-medium text-gray-900">{response.quantity_available} шт</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Срок:</span>
                                                    <span className="ml-2 font-medium text-gray-900">{response.delivery_days} дн</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        Нет ответов от поставщиков
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">
                        Анализ заказа #{orderId}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

