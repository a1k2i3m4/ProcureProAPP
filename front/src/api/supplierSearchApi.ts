import api from './authApi';

const MIN_RESULTS_LIMIT = 1;
const MAX_RESULTS_LIMIT = 40;

function clampResults(value: number | undefined): number | undefined {
  if (value == null) return undefined;
  if (!Number.isFinite(value)) return 10;
  return Math.min(MAX_RESULTS_LIMIT, Math.max(MIN_RESULTS_LIMIT, Math.round(value)));
}

export interface InternetSupplier {
  id?: number;
  company_name: string;
  website?: string;
  description?: string;
  found_via?: string;
  emails: string[];
  phones: string[];
  telegrams: string[];
  created_at?: string;
  price?: number | null;
  price_currency?: string | null;
}

export interface SearchSuppliersRequest {
  nomenclature: string;
  specs?: string;
  region?: string;
  maxResults?: number;
}

export interface SearchSuppliersResponse {
  ok: boolean;
  count: number;
  suppliers: InternetSupplier[];
}

/** Запускает поиск поставщиков в интернете */
export async function searchSuppliersOnline(
  data: SearchSuppliersRequest
): Promise<SearchSuppliersResponse> {
  const payload: SearchSuppliersRequest = {
    ...data,
    maxResults: clampResults(data.maxResults),
  };
  const res = await api.post<SearchSuppliersResponse>(
    '/supplier-search',
    payload,
    { timeout: 120000 }
  );
  return res.data;
}

/** Получает кэшированные результаты из БД */
export async function getCachedSuppliers(
  query: string,
  limit = 50,
  offset = 0
): Promise<SearchSuppliersResponse> {
  const res = await api.get<SearchSuppliersResponse>('/supplier-search', {
    params: { query, limit, offset },
  });
  return res.data;
}

/** Удаляет запись из кэша */
export async function deleteCachedSupplier(id: number): Promise<void> {
  await api.delete(`/supplier-search/${id}`);
}

