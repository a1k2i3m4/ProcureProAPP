import { publicApi } from './apiBase';

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
  data: SearchSuppliersRequest,
  token: string
): Promise<SearchSuppliersResponse> {
  const res = await publicApi.post<SearchSuppliersResponse>(
    '/supplier-search',
    data,
    { headers: { Authorization: `Bearer ${token}` }, timeout: 120000 }
  );
  return res.data;
}

/** Получает кэшированные результаты из БД */
export async function getCachedSuppliers(
  query: string,
  token: string,
  limit = 50,
  offset = 0
): Promise<SearchSuppliersResponse> {
  const res = await publicApi.get<SearchSuppliersResponse>('/supplier-search', {
    params: { query, limit, offset },
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

/** Удаляет запись из кэша */
export async function deleteCachedSupplier(id: number, token: string): Promise<void> {
  await publicApi.delete(`/supplier-search/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

