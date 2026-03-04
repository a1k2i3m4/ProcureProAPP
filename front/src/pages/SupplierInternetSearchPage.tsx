import React, { useState } from 'react';
import {
  searchSuppliersOnline,
  getCachedSuppliers,
  deleteCachedSupplier,
  InternetSupplier,
} from '../api/supplierSearchApi';

// ─── Иконки (inline SVG) ──────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const GlobeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
  </svg>
);
const MailIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const PhoneIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);
const TelegramIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// ─── Карточка поставщика ──────────────────────────────────────────────────────
interface SupplierCardProps {
  supplier: InternetSupplier;
  onDelete?: (id: number) => void;
}

const InternetSupplierCard: React.FC<SupplierCardProps> = ({ supplier, onDelete }) => {
  const sourceBadgeColor: Record<string, string> = {
    google:     'bg-blue-100 text-blue-700',
    yandex:     'bg-red-100 text-red-700',
    'satu.kz':  'bg-green-100 text-green-700',
    'tiu.ru':   'bg-yellow-100 text-yellow-700',
    'pulscen.ru': 'bg-purple-100 text-purple-700',
    'kazsnab.kz': 'bg-teal-100 text-teal-700',
  };
  const badgeClass = sourceBadgeColor[supplier.found_via || ''] || 'bg-gray-100 text-gray-700';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Заголовок */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{supplier.company_name}</h3>
          {supplier.website && (
            <a
              href={supplier.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 truncate mt-0.5"
            >
              <GlobeIcon />
              <span className="truncate">{supplier.website}</span>
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {supplier.found_via && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
              {supplier.found_via}
            </span>
          )}
          {supplier.id && onDelete && (
            <button
              onClick={() => onDelete(supplier.id!)}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Удалить из кэша"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      {/* Цена */}
      {supplier.price != null && (
        <div className="mb-3 inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-800 rounded-lg px-3 py-1.5">
          <span className="text-lg font-bold">
            {new Intl.NumberFormat('ru-RU').format(supplier.price)} {supplier.price_currency ?? '₸'}
          </span>
          <span className="text-xs text-green-600">/ ед.</span>
        </div>
      )}

      {/* Описание */}
      {supplier.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{supplier.description}</p>
      )}

      {/* Контакты */}
      <div className="space-y-1">
        {supplier.emails.map((email, i) => (
          <a key={i} href={`mailto:${email}`}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600">
            <MailIcon /><span>{email}</span>
          </a>
        ))}
        {supplier.phones.map((phone, i) => (
          <a key={i} href={`tel:${phone}`}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-green-600">
            <PhoneIcon /><span>{phone}</span>
          </a>
        ))}
        {supplier.telegrams.map((tg, i) => (
          <a key={i} href={`https://t.me/${tg.replace('@', '')}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700">
            <TelegramIcon /><span>{tg}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

// ─── Главная страница поиска ──────────────────────────────────────────────────
const SupplierInternetSearchPage: React.FC = () => {
  const token: string = localStorage.getItem('token') || '';

  // Форма
  const [nomenclature, setNomenclature] = useState('');
  const [specs, setSpecs]               = useState('');
  const [region, setRegion]             = useState('');
  const [maxResults, setMaxResults]     = useState(10);

  // Состояние
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<InternetSupplier[]>([]);
  const [searched, setSearched]   = useState(false);

  // Кэш
  const [cacheQuery, setCacheQuery]     = useState('');
  const [cacheResults, setCacheResults] = useState<InternetSupplier[]>([]);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [activeTab, setActiveTab]       = useState<'search' | 'cache'>('search');

  // ── Поиск в интернете ──────────────────────────────────────────────────────
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomenclature.trim()) return;

    setLoading(true);
    setError(null);
    setSuppliers([]);
    setSearched(false);

    try {
      const res = await searchSuppliersOnline(
        { nomenclature: nomenclature.trim(), specs: specs.trim(), region: region.trim() || undefined, maxResults },
        token
      );
      setSuppliers(res.suppliers);
      setSearched(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } }; message?: string };
      setError(e?.response?.data?.detail || e?.response?.data?.message || e.message || 'Ошибка поиска');
    } finally {
      setLoading(false);
    }
  };

  // ── Поиск в кэше ───────────────────────────────────────────────────────────
  const handleCacheSearch = async () => {
    setCacheLoading(true);
    try {
      const res = await getCachedSuppliers(cacheQuery, token);
      setCacheResults(res.suppliers);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e.message || 'Ошибка');
    } finally {
      setCacheLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCachedSupplier(id, token);
      setCacheResults((prev) => prev.filter((s) => s.id !== id));
    } catch (_) {
      // игнорируем ошибку удаления
    }  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SearchIcon />
            Поиск поставщиков в интернете
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Автоматический поиск через Google, Yandex и B2B-платформы (satu.kz, tiu.ru, pulscen.ru)
          </p>
        </div>

        {/* Табы */}
        <div className="flex gap-2 mb-6">
          {(['search', 'cache'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab === 'search' ? '🔍 Новый поиск' : '📋 История поиска'}
            </button>
          ))}
        </div>

        {/* ── Таб: Новый поиск ── */}
        {activeTab === 'search' && (
          <>
            {/* Форма */}
            <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Номенклатура <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nomenclature}
                    onChange={(e) => setNomenclature(e.target.value)}
                    placeholder="Например: трубы стальные ВГП ГОСТ 3262-75"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ГОСТ / Спецификация
                  </label>
                  <input
                    type="text"
                    value={specs}
                    onChange={(e) => setSpecs(e.target.value)}
                    placeholder="Например: Ду25 оцинкованные"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Регион
                  </label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Например: Алматы"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Макс. результатов: <strong>{maxResults}</strong>
                  </label>
                  <input
                    type="range" min={3} max={20} value={maxResults}
                    onChange={(e) => setMaxResults(Number(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={loading || !nomenclature.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        Идёт поиск... (может занять 1-2 минуты)
                      </>
                    ) : (
                      <><SearchIcon /> Найти поставщиков</>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Ошибка */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Результаты */}
            {loading && (
              <div className="text-center py-16 text-gray-500">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"/>
                <p className="font-medium">Браузер ищет поставщиков...</p>
                <p className="text-sm mt-1">Проверяем Google, Yandex и B2B-платформы</p>
              </div>
            )}

            {!loading && searched && suppliers.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">🔍</div>
                <p className="font-medium text-gray-600">Поставщики не найдены</p>
                <p className="text-sm mt-1">Попробуйте изменить запрос или убрать спецификацию</p>
              </div>
            )}

            {!loading && suppliers.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-3">
                  Найдено <strong>{suppliers.length}</strong> поставщиков для «{nomenclature}»
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suppliers.map((s, i) => (
                    <InternetSupplierCard key={i} supplier={s} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Таб: История поиска (кэш) ── */}
        {activeTab === 'cache' && (
          <>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={cacheQuery}
                onChange={(e) => setCacheQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCacheSearch()}
                placeholder="Поиск по названию..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleCacheSearch}
                disabled={cacheLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {cacheLoading ? '...' : 'Показать'}
              </button>
            </div>

            {cacheResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cacheResults.map((s) => (
                  <InternetSupplierCard key={s.id} supplier={s} onDelete={handleDelete} />
                ))}
              </div>
            )}

            {!cacheLoading && cacheResults.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">📋</div>
                <p>Нажмите «Показать» чтобы загрузить историю поиска</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SupplierInternetSearchPage;






