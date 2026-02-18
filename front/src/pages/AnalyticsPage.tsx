import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, Package, Eye, RefreshCw } from 'lucide-react';
import { analyticsApi, AnalysisSummary } from '../api/analyticsApi';

type AnalysisStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'timeout' | 'cancelled' | 'error';

const AnalyticsPage: React.FC = () => {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<AnalysisStatus>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = selectedStatus !== 'all' ? { status: selectedStatus } : {};
      const data = await analyticsApi.getAnalytics(params);
      setAnalyses(data); // data is already an array of analyses
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки аналитики';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const restartAnalysis = async (orderId: string) => {
    try {
      await analyticsApi.restartAnalysis(orderId);
      fetchAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка перезапуска анализа');
    }
  };

  const completeAnalysis = async (orderId: string) => {
    try {
      await analyticsApi.completeAnalysis(orderId);
      fetchAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка завершения анализа');
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(() => {
      if (analyses.some(a => a.status === 'in_progress')) {
        fetchAnalytics();
      }
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />Ожидает</span>,
      in_progress: <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />В процессе</span>,
      completed: <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" />Завершен</span>,
      timeout: <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full flex items-center gap-1"><AlertCircle className="w-3 h-3" />Таймаут</span>,
      cancelled: <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full flex items-center gap-1"><XCircle className="w-3 h-3" />Отменен</span>,
      error: <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1"><XCircle className="w-3 h-3" />Ошибка</span>,
    };
    return badges[status as keyof typeof badges] || null;
  };

  const formatDuration = (startedAt: string, completedAt: string | null, timeoutAt: string, status: string) => {
    const start = new Date(startedAt).getTime();
    const end = completedAt
      ? new Date(completedAt).getTime()
      : status === 'in_progress'
        ? Date.now()
        : new Date(timeoutAt).getTime();

    const seconds = Math.max(0, Math.floor((end - start) / 1000));
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const statusButtons = [
    { value: 'all', label: 'Все', icon: '📊' },
    { value: 'pending', label: 'Ожидающие', icon: '⏳' },
    { value: 'in_progress', label: 'В процессе', icon: '🔄' },
    { value: 'completed', label: 'Завершенные', icon: '✅' },
    { value: 'timeout', label: 'Таймаут', icon: '⏰' },
    { value: 'cancelled', label: 'Отмененные', icon: '❌' },
    { value: 'error', label: 'Ошибки', icon: '🚫' },
  ];

  const stats = {
    total: analyses.length,
    inProgress: analyses.filter(a => a.status === 'in_progress').length,
    completed: analyses.filter(a => a.status === 'completed').length,
    avgResponseRate: analyses.length > 0 ? Math.round((analyses.reduce((sum, a) => sum + (a.suppliers_contacted > 0 ? (a.responses_received / a.suppliers_contacted) * 100 : 0), 0) / analyses.length)) : 0,
  };

  if (loading && analyses.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <BarChart3 className="w-10 h-10 text-purple-600" />
                Аналитика заказов
              </h1>
              <p className="text-gray-600">Отслеживание и анализ всех запросов поставщикам</p>
            </div>
            <button onClick={fetchAnalytics} disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 shadow-lg">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/70 backdrop-blur-md rounded-xl p-5 border border-purple-100 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">Всего анализов</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-md rounded-xl p-5 border border-blue-100 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">В процессе</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-md rounded-xl p-5 border border-green-100 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">Завершено</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-md rounded-xl p-5 border border-orange-100 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">Средний отклик</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.avgResponseRate}%</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {statusButtons.map((button) => (
              <button key={button.value} onClick={() => setSelectedStatus(button.value as AnalysisStatus)} className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${selectedStatus === button.value ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30 scale-105' : 'bg-white/70 text-gray-700 hover:bg-white border border-gray-200 hover:border-purple-300'}`}>
                <span>{button.icon}</span>
                {button.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </p>
          </div>
        )}

        {analyses.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-md rounded-xl p-12 text-center border border-gray-200">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Нет данных для отображения</h3>
            <p className="text-gray-600">{selectedStatus === 'all' ? 'Пока не запущено ни одного анализа' : `Нет анализов со статусом "${statusButtons.find(b => b.value === selectedStatus)?.label}"`}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {analyses.map((analysis) => (
              <div key={analysis.id} className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-all duration-300 hover:border-purple-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">Заказ {analysis.order_id}</h3>
                      {getStatusBadge(analysis.status)}
                      {analysis.fast && <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">⚡ СРОЧНО</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />Начат: {new Date(analysis.started_at).toLocaleString('ru-RU')}</span>
                      {analysis.completed_at && <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4" />Завершен: {new Date(analysis.completed_at).toLocaleString('ru-RU')}</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Товаров</p>
                    <p className="text-lg font-bold text-gray-900">{analysis.items_count}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Обращений</p>
                    <p className="text-lg font-bold text-blue-600">{analysis.suppliers_contacted}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Ответов</p>
                    <p className="text-lg font-bold text-green-600">{analysis.responses_received}/{analysis.suppliers_contacted}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Длительность</p>
                    <p className="text-lg font-bold text-purple-600">{formatDuration(analysis.started_at, analysis.completed_at, analysis.timeout_at, analysis.status)}</p>
                  </div>
                  {analysis.status === 'in_progress' ? (
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Осталось</p>
                      <p className="text-lg font-bold text-orange-600">{analysis.time_remaining_formatted || 'Вычисляется...'}</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Отклик</p>
                      <p className="text-lg font-bold text-gray-900">{analysis.suppliers_contacted > 0 ? Math.round((analysis.responses_received / analysis.suppliers_contacted) * 100) : 0}%</p>
                    </div>
                  )}
                </div>

                {analysis.status === 'in_progress' && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600">Прогресс анализа</span>
                      <span className="text-xs font-semibold text-gray-900">{Math.round(analysis.progress_percent || 0)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${analysis.progress_percent || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => window.location.href = `/analytics/${analysis.id}`}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 font-semibold"
                  >
                    <Eye className="w-5 h-5" />
                    Посмотреть результаты
                  </button>

                  {analysis.status === 'in_progress' && (
                    <button
                      onClick={() => completeAnalysis(analysis.order_id)}
                      className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all flex items-center justify-center gap-2 font-semibold"
                    >
                      <XCircle className="w-5 h-5" />
                      Завершить досрочно
                    </button>
                  )}

                  {(analysis.status === 'completed' || analysis.status === 'timeout' || analysis.status === 'cancelled') && (
                    <button
                      onClick={() => restartAnalysis(analysis.order_id)}
                      className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 font-semibold"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Повторить анализ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;

