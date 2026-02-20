import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Users, Tag, RefreshCw, Phone, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { publicApi } from '../api/apiBase';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

type SupplierApi = {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  whatsapp?: string;
  category?: string;
};

type CategoryApi = { id: number; name: string };
type CountsApi = { categories: number; suppliers: number };

const PAGE_SIZE = 12;

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierApi[]>([]);
  const [categories, setCategories] = useState<CategoryApi[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<CountsApi | null>(null);
  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Reset page when category changes
  useEffect(() => {
    setPage(1);
  }, [selectedCategory]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [catsRes, supsRes] = await Promise.all([
        publicApi.get<CategoryApi[]>('/categories'),
        publicApi.get<SupplierApi[]>('/suppliers', {
          params: {
            category: selectedCategory || undefined,
            q: debouncedQuery || undefined,
          },
        }),
      ]);

      setCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
      setSuppliers(Array.isArray(supsRes.data) ? supsRes.data : []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Ошибка загрузки поставщиков';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, debouncedQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    publicApi.get<CountsApi>('/debug/counts')
      .then(r => setCounts(r.data))
      .catch(() => setCounts(null));
  }, []);

  // Client-side pagination
  const totalPages = Math.max(1, Math.ceil(suppliers.length / PAGE_SIZE));
  const paginated = useMemo(
    () => suppliers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [suppliers, page]
  );

  const withWhatsapp = useMemo(
    () => suppliers.filter(s => s.whatsapp && s.whatsapp.trim()).length,
    [suppliers]
  );

  return (
    <div className="container mx-auto px-6 py-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Поставщики</h1>
          <p className="text-gray-500 text-sm">
            Управление базой поставщиков
          </p>
        </div>
        <button
          onClick={() => { setPage(1); load(); }}
          className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users, label: 'Всего поставщиков', value: counts?.suppliers ?? suppliers.length, color: 'bg-purple-100 text-purple-600' },
          { icon: Tag, label: 'Категорий', value: counts?.categories ?? categories.length, color: 'bg-blue-100 text-blue-600' },
          { icon: MessageCircle, label: 'С WhatsApp', value: withWhatsapp, color: 'bg-green-100 text-green-600' },
          { icon: Search, label: 'Найдено', value: suppliers.length, color: 'bg-orange-100 text-orange-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>

        {(selectedCategory || query) && (
          <button
            onClick={() => { setSelectedCategory(''); setQuery(''); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton count={PAGE_SIZE} variant="card" />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={load} className="mt-3 text-sm text-red-500 underline">Попробовать снова</button>
        </div>
      ) : paginated.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Поставщики не найдены</p>
          {(query || selectedCategory) && (
            <p className="text-sm mt-1">Попробуйте изменить параметры поиска</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map((s) => (
              <SupplierItem key={s.id} supplier={s} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Показано {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, suppliers.length)} из {suppliers.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | '...')[]>((acc, p, i, arr) => {
                    if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="px-2 text-gray-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                          page === p
                            ? 'bg-purple-600 text-white'
                            : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Supplier card ─────────────────────────────────────────── */
function SupplierItem({ supplier: s }: { supplier: SupplierApi }) {
  const initial = s.name.trim().charAt(0).toUpperCase();
  const colors = ['bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700'];
  const color = colors[s.id % colors.length];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-purple-200 transition-all">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center text-lg font-bold shrink-0`}>
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 truncate">{s.name}</h3>
          {s.contact_person && (
            <p className="text-sm text-gray-500 truncate">👤 {s.contact_person}</p>
          )}
          {s.category && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-md font-medium">
              {s.category}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {s.phone ? (
          <a
            href={`tel:${s.phone.replace(/\s/g, '')}`}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition"
          >
            <Phone className="w-4 h-4 shrink-0" />
            <span className="truncate">{s.phone}</span>
          </a>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Phone className="w-4 h-4 shrink-0" />
            <span>Телефон не указан</span>
          </div>
        )}

        {s.whatsapp ? (
          <a
            href={`https://wa.me/${s.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800 transition"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>WhatsApp</span>
            <span className="ml-auto w-2 h-2 rounded-full bg-green-400 shrink-0" title="Доступен в WhatsApp" />
          </a>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>WhatsApp не указан</span>
          </div>
        )}
      </div>
    </div>
  );
}
