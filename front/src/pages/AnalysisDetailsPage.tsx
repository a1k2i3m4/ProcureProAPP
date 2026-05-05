import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Clock, Package, RefreshCw, Star, CheckCircle, XCircle, Flame, Truck, Send, MessageCircle, Printer } from 'lucide-react';
import { analyticsApi } from '../api/analyticsApi';
import { ordersApi, BestOffer, OptimalCombination } from '../api/ordersApi';

type AnalysisDetailsPayload = {
  analysis: {
    id: number;
    order_id: string;
    status: 'pending' | 'in_progress' | 'completed' | 'timeout' | 'cancelled' | 'error' | string;
    started_at: string;
    completed_at: string | null;
    timeout_at: string;
    timeout_minutes: number;
    suppliers_contacted: number;
    responses_received: number;
    created_at: string;
    updated_at: string;
    is_urgent?: boolean;
    error_message?: string | null;
    fast?: string;
    items?: Array<{ qty: number; tovar: string; specific?: string }>;
    items_count?: number;
    time_remaining_formatted?: string;
    progress_percent?: number;
  };
  responses: Array<{
    id: number;
    order_id: string;
    supplier_id: number;
    item_name: string;
    price: string | number;
    quantity_available: number;
    delivery_days: number;
    response_time: string;
    raw_message?: string;
    supplier_name: string;
  }>;
  errors: Array<{
    id: number;
    order_id: string;
    supplier_id: number | null;
    error_type: string;
    error_message: string;
    stack_trace?: string | null;
    created_at: string;
    supplier_name?: string | null;
  }>;
  notifications?: Array<{
    id: number;
    order_id: string;
    supplier_id: number;
    supplier_name: string;
    whatsapp_number: string;
    sent_at: string;
    status: 'sent' | 'failed';
    error_message?: string | null;
    form_url?: string | null;
    rating?: number | null;
    can_urgent?: boolean;
    category_name?: string | null;
  }>;
};

const AnalysisDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [data, setData] = useState<AnalysisDetailsPayload | null>(null);
  const [bestOffers, setBestOffers] = useState<BestOffer[] | null>(null);
  const [optimal, setOptimal] = useState<OptimalCombination | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const badgeByStatus: Record<string, { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }> = {
    pending: { label: 'Ожидает', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', Icon: Clock },
    in_progress: { label: 'В процессе', className: 'bg-blue-100 text-blue-800 border-blue-200', Icon: Clock },
    completed: { label: 'Завершён', className: 'bg-green-100 text-green-800 border-green-200', Icon: CheckCircle },
    timeout: { label: 'Таймаут', className: 'bg-orange-100 text-orange-800 border-orange-200', Icon: AlertCircle },
    cancelled: { label: 'Отменён', className: 'bg-gray-100 text-gray-800 border-gray-200', Icon: XCircle },
    error: { label: 'Ошибка', className: 'bg-red-100 text-red-800 border-red-200', Icon: XCircle },
  };

  function formatMoney(value: unknown) {
    const num = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
    if (!Number.isFinite(num)) return String(value ?? '—');
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(num);
  }

  function formatPercent(value: unknown) {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return '0%';
    return `${Math.round(num)}%`;
  }

  function escapeHtml(value: unknown) {
    return String(value ?? '—')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const analysisId = Number(id);

  const load = async () => {
    if (!id || !Number.isFinite(analysisId)) {
      setError('Некорректный id анализа');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = (await analyticsApi.getAnalysisById(analysisId)) as AnalysisDetailsPayload;
      setData(payload);

      // Load ranking results ("наш анализ")
      if (payload?.analysis?.order_id) {
        const orderId = payload.analysis.order_id;

        try {
          const offers = await ordersApi.getBestOffers(orderId, 10);
          setBestOffers(offers);
        } catch {
          setBestOffers(null);
        }

        try {
          const combo = await ordersApi.getOptimalCombination(orderId);
          setOptimal(combo);
        } catch {
          setOptimal(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки деталей анализа');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---- Derivations (MUST be before any conditional return; Rules of Hooks) ----
  const analysis = data?.analysis;

  const responseStats = useMemo(() => {
    const contacted = analysis?.suppliers_contacted || 0;
    const received = analysis?.responses_received || 0;
    const rate = contacted > 0 ? (received / contacted) * 100 : 0;
    const uniqueSuppliers = new Set(data?.responses?.map((r) => r.supplier_id) || []).size;
    return { contacted, received, rate, uniqueSuppliers };
  }, [analysis?.responses_received, analysis?.suppliers_contacted, data?.responses]);

  const bestOfferTop = bestOffers?.[0] || null;

  const StatusIcon = (analysis && badgeByStatus[analysis.status] ? badgeByStatus[analysis.status] : badgeByStatus.error).Icon;
  const statusBadge = analysis && badgeByStatus[analysis.status]
    ? badgeByStatus[analysis.status]
    : { label: analysis?.status ?? '—', className: 'bg-gray-100 text-gray-800 border-gray-200', Icon: Clock };

  const itemNames = useMemo(() => {
    const fromOrder = analysis?.items?.map((i) => i.tovar) || [];
    const fromResponses = data?.responses?.map((r) => r.item_name) || [];
    return Array.from(new Set([...fromOrder, ...fromResponses].filter(Boolean)));
  }, [analysis?.items, data?.responses]);

  const suppliers = useMemo(() => {
    const list = (data?.responses || [])
      .map((r) => ({ supplier_id: r.supplier_id, supplier_name: r.supplier_name }))
      .filter((s) => s.supplier_id != null);

    const map = new Map<number, string>();
    for (const s of list) map.set(s.supplier_id, s.supplier_name);
    return Array.from(map.entries()).map(([supplier_id, supplier_name]) => ({ supplier_id, supplier_name }));
  }, [data?.responses]);

  const matrix = useMemo(() => {
    const m = new Map<string, Map<number, { price: string | number; delivery_days: number; quantity_available: number }>>();
    for (const r of data?.responses || []) {
      const item = r.item_name;
      if (!item) continue;
      if (!m.has(item)) m.set(item, new Map());
      m.get(item)!.set(r.supplier_id, { price: r.price, delivery_days: r.delivery_days, quantity_available: r.quantity_available });
    }
    return m;
  }, [data?.responses]);

  const bestPriceByItem = useMemo(() => {
    const res = new Map<string, { supplier_id: number; priceValue: number }>();
    for (const item of itemNames) {
      let best: { supplier_id: number; priceValue: number } | null = null;
      for (const s of suppliers) {
        const cell = matrix.get(item)?.get(s.supplier_id);
        if (!cell) continue;
        const priceValue = typeof cell.price === 'number' ? cell.price : Number(cell.price);
        if (!Number.isFinite(priceValue)) continue;
        if (!best || priceValue < best.priceValue) best = { supplier_id: s.supplier_id, priceValue };
      }
      if (best) res.set(item, best);
    }
    return res;
  }, [itemNames, suppliers, matrix]);

  const bestDaysByItem = useMemo(() => {
    const res = new Map<string, { supplier_id: number; days: number }>();
    for (const item of itemNames) {
      let best: { supplier_id: number; days: number } | null = null;
      for (const s of suppliers) {
        const cell = matrix.get(item)?.get(s.supplier_id);
        if (!cell) continue;
        const days = Number(cell.delivery_days);
        if (!Number.isFinite(days)) continue;
        if (!best || days < best.days) best = { supplier_id: s.supplier_id, days };
      }
      if (best) res.set(item, best);
    }
    return res;
  }, [itemNames, suppliers, matrix]);

  const qtyNeededByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of (analysis?.items || [])) {
      if (!it?.tovar) continue;
      const qty = typeof it.qty === 'number' ? it.qty : Number(it.qty);
      map.set(it.tovar, Number.isFinite(qty) ? qty : 0);
    }
    return map;
  }, [analysis?.items]);

  const handlePrintEdoShort = () => {
    if (!analysis || !data) return;

    const itemRows = (analysis.items || [])
      .map((it, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(it.tovar)}</td>
          <td>${escapeHtml(it.specific || '—')}</td>
          <td style="text-align:right">${escapeHtml(it.qty)}</td>
        </tr>
      `)
      .join('');

    const responseRows = (data.responses || [])
      .slice(0, 20)
      .map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(r.supplier_name)}</td>
          <td style="text-align:right">${escapeHtml(formatMoney(r.price))}</td>
          <td style="text-align:right">${escapeHtml(r.delivery_days)} дн.</td>
        </tr>
      `)
      .join('');

    const html = `
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Краткая форма ЭДО — Заказ ${escapeHtml(analysis.order_id)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; font-size: 12px; }
    h1 { margin: 0 0 8px 0; font-size: 18px; }
    h2 { margin: 18px 0 8px 0; font-size: 14px; }
    .muted { color: #666; margin-bottom: 10px; }
    .meta div { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; }
    th { background: #f3f3f3; text-align: left; }
    .sign { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .line { border-top: 1px solid #111; padding-top: 4px; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>Краткая печатная форма для ЭДО</h1>
  <div class="muted">Сформировано: ${escapeHtml(new Date().toLocaleString('ru-RU'))}</div>

  <div class="meta">
    <div><b>Заказ:</b> ${escapeHtml(analysis.order_id)}</div>
    <div><b>Анализ ID:</b> ${escapeHtml(analysis.id)}</div>
    <div><b>Статус:</b> ${escapeHtml(analysis.status)}</div>
    <div><b>Начат:</b> ${escapeHtml(new Date(analysis.started_at).toLocaleString('ru-RU'))}</div>
    <div><b>Завершён:</b> ${escapeHtml(analysis.completed_at ? new Date(analysis.completed_at).toLocaleString('ru-RU') : '—')}</div>
  </div>

  <h2>Позиции заказа</h2>
  <table>
    <thead>
      <tr>
        <th style="width:40px">№</th>
        <th>Товар</th>
        <th>Категория</th>
        <th style="width:80px; text-align:right">Кол-во</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="4">Нет данных</td></tr>'}
    </tbody>
  </table>

  <h2>Ответы поставщиков (кратко)</h2>
  <table>
    <thead>
      <tr>
        <th style="width:40px">№</th>
        <th>Поставщик</th>
        <th style="width:120px; text-align:right">Цена</th>
        <th style="width:100px; text-align:right">Срок</th>
      </tr>
    </thead>
    <tbody>
      ${responseRows || '<tr><td colspan="4">Ответов нет</td></tr>'}
    </tbody>
  </table>

  <div class="sign">
    <div class="line">Ответственный (ФИО, подпись)</div>
    <div class="line">Согласовано (ФИО, подпись)</div>
  </div>
</body>
</html>
    `;

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');

      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc || !iframe.contentWindow) {
        iframe.remove();
        setError('Не удалось открыть печатную форму. Проверьте настройки браузера.');
        return;
      }

      doc.open();
      doc.write(html);
      doc.close();

      const cleanup = () => {
        iframe.contentWindow?.removeEventListener('afterprint', cleanup);
        iframe.remove();
      };

      iframe.contentWindow.addEventListener('afterprint', cleanup);

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(cleanup, 2000);
      }, 350);
    } catch {
      setError('Не удалось открыть печатную форму. Проверьте настройки печати в браузере.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Загрузка деталей анализа...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </p>
        </div>
        <Link to="/analytics" className="inline-flex items-center gap-2 text-purple-700 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Назад к аналитике
        </Link>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <p className="text-gray-600">Нет данных</p>
        <Link to="/analytics" className="inline-flex items-center gap-2 text-purple-700 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Назад к аналитике
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* header + KPI + timings */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link to="/analytics" className="inline-flex items-center gap-2 text-purple-700 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Link>
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900">Заказ {analysis.order_id}</h1>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-semibold ${statusBadge.className}`}>
                <StatusIcon className="w-4 h-4" />
                {statusBadge.label}
              </span>
              {analysis.fast === 'yes' && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-200 bg-red-100 text-red-800 text-sm font-semibold">
                  <Flame className="w-4 h-4" />
                  СРОЧНО
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">Анализ #{analysis.id}</p>
          </div>

          <div className="flex flex-wrap gap-2 self-start">
            <button
              onClick={handlePrintEdoShort}
              className="flex items-center gap-2 px-4 py-3 bg-white text-gray-800 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Printer className="w-5 h-5" />
              Краткая форма ЭДО
            </button>

            <button onClick={load} className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-lg">
              <RefreshCw className="w-5 h-5" />
              Обновить
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/70 backdrop-blur-md rounded-xl p-5 border border-purple-100 shadow-md">
            <p className="text-gray-600 text-sm font-medium mb-1">Позиции</p>
            <p className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-purple-600" />
              {analysis.items_count ?? analysis.items?.length ?? 0}
            </p>
          </div>
          <div className="bg-white/70 backdrop-blur-md rounded-xl p-5 border border-blue-100 shadow-md">
            <p className="text-gray-600 text-sm font-medium mb-1">Поставщики</p>
            <p className="text-3xl font-bold text-blue-600">{responseStats.contacted}</p>
            <p className="text-xs text-gray-500 mt-1">Ответили: {responseStats.uniqueSuppliers}</p>
          </div>
          <div className="bg-white/70 backdrop-blur-md rounded-xl p-5 border border-green-100 shadow-md">
            <p className="text-gray-600 text-sm font-medium mb-1">Ответов</p>
            <p className="text-3xl font-bold text-green-600">{responseStats.received}</p>
            <p className="text-xs text-gray-500 mt-1">Отклик: {formatPercent(responseStats.rate)}</p>
          </div>
          <div className="bg-white/70 backdrop-blur-md rounded-xl p-5 border border-orange-100 shadow-md">
            <p className="text-gray-600 text-sm font-medium mb-1">Осталось</p>
            <p className="text-3xl font-bold text-orange-600">{analysis.time_remaining_formatted ?? '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Таймаут: {analysis.timeout_minutes} мин</p>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-gray-200 shadow-md mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            Тайминги
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
            <div><span className="text-gray-500">Начат:</span> {new Date(analysis.started_at).toLocaleString('ru-RU')}</div>
            <div><span className="text-gray-500">Таймаут:</span> {new Date(analysis.timeout_at).toLocaleString('ru-RU')}</div>
            <div><span className="text-gray-500">Завершён:</span> {analysis.completed_at ? new Date(analysis.completed_at).toLocaleString('ru-RU') : '—'}</div>
          </div>

          {analysis.status === 'in_progress' && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600">Прогресс анализа</span>
                <span className="text-xs font-semibold text-gray-900">{Math.round(analysis.progress_percent || 0)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${analysis.progress_percent || 0}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* MOVED UP: analysis results first */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-gray-200 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-orange-600" />
              Лучшее предложение
            </h2>

            {bestOfferTop ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-lg font-bold">{bestOfferTop.supplier_name}</div>
                    <div className="text-sm opacity-90">Score: <span className="font-semibold">{bestOfferTop.score}</span></div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>Итого: <span className="font-semibold">{formatMoney(bestOfferTop.total_price)}</span></div>
                    <div>Срок: <span className="font-semibold">{bestOfferTop.max_delivery_days} дн.</span></div>
                    <div>Рейтинг: <span className="font-semibold">{bestOfferTop.rating}</span></div>
                    <div>{bestOfferTop.can_urgent ? 'Срочно: да' : 'Срочно: нет'}</div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">Товар</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-700">Цена</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-700">Кол-во</th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-700">Срок</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {bestOfferTop.items.map((it, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-medium text-gray-900">{it.item_name}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{formatMoney(it.price)}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{it.quantity_available}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{it.delivery_days}д</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">Пока недостаточно данных для расчёта лучшего предложения.</p>
            )}
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-gray-200 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Оптимальная комбинация</h2>
            {optimal ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="text-sm opacity-90">Итого</div>
                      <div className="text-3xl font-bold">{formatMoney(optimal.grand_total)} ₸</div>
                    </div>
                    <div>
                      <div className="text-sm opacity-90">Макс. срок</div>
                      <div className="text-3xl font-bold">{optimal.max_delivery_days}д</div>
                    </div>
                    <div>
                      <div className="text-sm opacity-90">Покрытие</div>
                      <div className="text-3xl font-bold">{formatPercent(optimal.coverage)}</div>
                      <div className="text-xs opacity-90">{optimal.items_covered}/{optimal.items_required} позиций</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs opacity-90 mb-2">
                      <span>Покрытие</span>
                      <span>{formatPercent(optimal.coverage)}</span>
                    </div>
                    <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, Number(optimal.coverage) || 0))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {optimal.message && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
                    {optimal.message}
                  </div>
                )}

                {optimal.suppliers?.length ? (
                  <div className="space-y-3">
                    {optimal.suppliers.map((s) => (
                      <div key={s.supplier_id} className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-lg font-bold text-gray-900 truncate"
                              title={s.supplier_name}
                            >
                              {s.supplier_name}
                            </div>
                            <div className="text-sm text-gray-600">Поставщик #{s.supplier_id}</div>
                          </div>
                          <div className="flex gap-2 flex-wrap justify-end">
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">Итого: {formatMoney(s.total)} ₸</span>
                            <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold">Срок: {s.max_delivery_days}д</span>
                            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">Рейтинг: {s.rating}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">Нет выбранных поставщиков</p>
                )}
              </div>
            ) : (
              <p className="text-gray-600">Оптимальная комбинация пока не рассчитана или недостаточно данных.</p>
            )}
          </div>
        </div>

        {/* NEW: comparison matrix */}
        <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-gray-200 shadow-md mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Сравнение предложений по товарам</h2>
          <p className="text-sm text-gray-600 mb-4">Для каждого товара показаны две строки: отдельно цены и отдельно сроки (дни). Лучшие значения подсвечены.</p>

          {suppliers.length === 0 ? (
            <p className="text-gray-600">Пока нет ответов поставщиков, чтобы построить таблицу сравнения.</p>
          ) : (
            <div className="overflow-auto rounded-lg border border-gray-200">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700 min-w-[260px]">Товар / метрика</th>
                    {suppliers.map((s) => (
                      <th key={s.supplier_id} className="text-left px-3 py-2 font-semibold text-gray-700 min-w-[220px]">{s.supplier_name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {itemNames.map((item) => {
                    const bestPriceSupplierId = bestPriceByItem.get(item)?.supplier_id;
                    const bestDaysSupplierId = bestDaysByItem.get(item)?.supplier_id;

                    return (
                      <React.Fragment key={item}>
                        {/* PRICE ROW */}
                        <tr className="border-t border-gray-100 align-top">
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900">{item}</div>
                            <div className="text-xs text-gray-600">Цена</div>
                          </td>
                          {suppliers.map((s) => {
                            const cell = matrix.get(item)?.get(s.supplier_id);
                            if (!cell) return <td key={s.supplier_id} className="px-3 py-3 text-gray-400">—</td>;
                            const isBest = bestPriceSupplierId === s.supplier_id;
                            return (
                              <td key={s.supplier_id} className="px-3 py-3">
                                <div className={`rounded-lg border p-3 ${isBest ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}>
                                  <div className={`text-lg font-bold ${isBest ? 'text-green-700' : 'text-gray-900'}`}>{formatMoney(cell.price)} ₸</div>
                                  {isBest && <div className="text-xs font-semibold mt-1 text-green-800">Лучшее по цене</div>}
                                </div>
                              </td>
                            );
                          })}
                        </tr>

                        {/* DAYS ROW */}
                        <tr className="border-t border-gray-100 align-top">
                          <td className="px-3 py-3">
                            <div className="font-medium text-gray-900">{item}</div>
                            <div className="text-xs text-gray-600">Срок (дни) + количество</div>
                          </td>
                          {suppliers.map((s) => {
                            const cell = matrix.get(item)?.get(s.supplier_id);
                            if (!cell) return <td key={s.supplier_id} className="px-3 py-3 text-gray-400">—</td>;
                            const isBest = bestDaysSupplierId === s.supplier_id;

                            const needed = qtyNeededByItem.get(item) ?? 0;
                            const available = Number(cell.quantity_available) || 0;
                            const missing = Math.max(0, needed - available);

                            const qtyBadge = missing > 0
                              ? 'bg-yellow-100 text-yellow-900'
                              : 'bg-green-100 text-green-900';

                            return (
                              <td key={s.supplier_id} className="px-3 py-3">
                                <div className={`rounded-lg border p-3 ${isBest ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}>
                                  <div className={`text-lg font-bold ${isBest ? 'text-blue-700' : 'text-gray-900'}`}>{cell.delivery_days} дн.</div>

                                  <div className="mt-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${qtyBadge}`}>
                                      Нужно: {needed} · Есть: {available}{missing > 0 ? ` · Не хватает: ${missing}` : ''}
                                    </span>
                                  </div>

                                  {isBest && <div className="text-xs font-semibold mt-2 text-blue-800">Лучшее по сроку</div>}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MOVED DOWN: order items + supplier responses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-gray-200 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Позиции заказа</h2>
            {analysis.items?.length ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700">Товар</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700">Категория</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-700">Кол-во</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {analysis.items.map((it, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-900">{it.tovar}</td>
                        <td className="px-3 py-2 text-gray-600">{it.specific || '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{it.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">Нет позиций</p>
            )}
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-gray-200 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              Уведомлены поставщики
              <span className="ml-auto text-sm font-normal text-gray-500">
                {data.notifications?.length ?? 0} получателей
              </span>
            </h2>
            {data.notifications?.length ? (
              <div className="space-y-2">
                {data.notifications.map((n) => {
                  const hasResponse = data.responses?.some(r => r.supplier_id === n.supplier_id);
                  return (
                    <div key={n.id} className={`flex items-center gap-3 p-3 rounded-xl border ${n.status === 'sent' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${n.status === 'sent' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {n.status === 'sent'
                          ? <MessageCircle className="w-4 h-4 text-green-600" />
                          : <XCircle className="w-4 h-4 text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{n.supplier_name}</span>
                          {n.category_name && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{n.category_name}</span>
                          )}
                          {n.can_urgent && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                              <Flame className="w-3 h-3" />Срочно
                            </span>
                          )}
                          {hasResponse && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />Ответил
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                          <span>📱 {n.whatsapp_number}</span>
                          <span>⏱ {new Date(n.sent_at).toLocaleString('ru-RU')}</span>
                          {n.rating && <span>⭐ {n.rating}</span>}
                        </div>
                        {n.status === 'failed' && n.error_message && (
                          <div className="text-xs text-red-600 mt-1">⚠️ {n.error_message}</div>
                        )}
                        {n.form_url && (
                          <a href={n.form_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-purple-600 hover:underline mt-0.5 block truncate">
                            🔗 {n.form_url}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Данные об уведомлениях появятся после следующего анализа</p>
            )}
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-gray-200 shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ответы поставщиков</h2>
            {data.responses?.length ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700">Поставщик</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700">Товар</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-700">Цена</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-700">Кол-во</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-700">Срок</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {data.responses.map((r) => (
                      <tr key={r.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-900">{r.supplier_name}</td>
                        <td className="px-3 py-2 text-gray-700">{r.item_name}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{formatMoney(r.price)}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{r.quantity_available}</td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          <span className="inline-flex items-center gap-1">
                            <Truck className="w-4 h-4 text-gray-500" />
                            {r.delivery_days}д
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">Ответов пока нет</p>
            )}
          </div>
        </div>

        {/* errors section stays at bottom */}
        <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-gray-200 shadow-md mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ошибки анализа</h2>
          {data.errors?.length ? (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Тип</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Поставщик</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Сообщение</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700">Время</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {data.errors.map((e) => (
                    <tr key={e.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-900">{e.error_type}</td>
                      <td className="px-3 py-2 text-gray-700">{e.supplier_name || (e.supplier_id ? `#${e.supplier_id}` : '—')}</td>
                      <td className="px-3 py-2 text-gray-700">{e.error_message}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{new Date(e.created_at).toLocaleString('ru-RU')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">Ошибок нет</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisDetailsPage;

