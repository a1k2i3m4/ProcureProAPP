import { useEffect, useMemo, useState } from 'react';
import { publicApi } from '../api/apiBase';
import { SupplierCard } from '../components/SupplierCard';

type SupplierApi = {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  category?: string;
};

type CategoryApi = { id: number; name: string };
type CountsApi = { categories: number; suppliers: number };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierApi[]>([]);
  const [categories, setCategories] = useState<CategoryApi[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<CountsApi | null>(null);

  const filtered = useMemo(() => {
    return suppliers;
  }, [suppliers]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [catsRes, supsRes] = await Promise.all([
          publicApi.get<CategoryApi[]>('/categories'),
          publicApi.get<SupplierApi[]>('/suppliers', {
            params: {
              category: selectedCategory || undefined,
              q: query || undefined,
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
    };

    load();
  }, [selectedCategory, query]);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const res = await publicApi.get<CountsApi>('/debug/counts');
        setCounts(res.data);
      } catch {
        setCounts(null);
      }
    };

    loadCounts();
  }, []);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Поставщики</h1>
          <p className="text-gray-600">Всего: {filtered.length}</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl bg-white"
          >
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по поставщику..."
            className="px-4 py-2 border border-gray-300 rounded-xl bg-white"
          />
        </div>
      </div>

      <div className="mt-6">
        {loading && <p className="text-gray-600">Загрузка...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">
            Поставщиков не найдено.
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((s) => (
            <SupplierCard
              key={s.id}
              companyName={s.name}
              contactPerson={s.contact_person}
              phoneNumber={s.phone}
              email={undefined}
              triggers={s.category ? [s.category] : []}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        <div>API: <span className="font-mono">{import.meta.env.VITE_API_URL}</span></div>
        {counts && (
          <div>DB: categories={counts.categories}, suppliers={counts.suppliers}</div>
        )}
      </div>
    </div>
  );
}
