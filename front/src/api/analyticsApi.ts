import { publicApi } from './apiBase';

export interface AnalysisSummary {
  id: number;
  order_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'timeout' | 'cancelled' | 'error';
  started_at: string;
  completed_at: string | null;
  timeout_at: string;
  timeout_minutes: number;
  suppliers_contacted: number;
  responses_received: number;
  is_urgent?: boolean;
  error_message?: string;
  fast: boolean;
  items_count: number;
  created_at: string;
  updated_at: string;
  time_remaining_ms?: number;
  time_remaining_formatted?: string;
  progress_percent: number;
}

export interface SupplierResponse {
  id: number;
  supplier_id: number;
  item_name: string;
  price: number;
  quantity_available: number;
  delivery_days: number;
  response_time: string;
  supplier_name: string;
  rating: number;
  can_urgent: boolean;
}

export interface AnalysisError {
  id: number;
  supplier_id: number | null;
  error_type: 'whatsapp_send' | 'response_parse' | 'supplier_match' | 'timeout' | 'other';
  error_message: string;
  created_at: string;
  supplier_name: string | null;
}

export interface AnalysisDetail extends AnalysisSummary {
  items: Array<{
    name: string;
    quantity: number;
    [key: string]: unknown;
  }>;
  responses: SupplierResponse[];
  errors: AnalysisError[];
}

export interface AnalyticsListResponse {
  analyses: AnalysisSummary[];
  total: number;
  limit: number;
  offset: number;
}

export const analyticsApi = {
  // Get all analyses with pagination and filtering
  getAnalytics: async (params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }) => {
    const response = await publicApi.get(`/analyses`, { params });
    return response.data;
  },

  // Get detailed analysis by ID
  getAnalysisById: async (id: number) => {
    const response = await publicApi.get(`/analyses/${id}`);
    return response.data;
  },

  // Get analytics summary
  getAnalyticsSummary: async () => {
    const response = await publicApi.get(`/analytics/summary`);
    return response.data;
  },

  // Delete analysis
  deleteAnalysis: async (id: number) => {
    const response = await publicApi.delete(`/analyses/${id}`);
    return response.data;
  },

  // Get analysis status by order ID
  getAnalysisStatus: async (orderId: string) => {
    const response = await publicApi.get(`/orders/${orderId}/analysis-status`);
    return response.data;
  },

  // Complete analysis manually
  completeAnalysis: async (orderId: string) => {
    const response = await publicApi.post(`/orders/${orderId}/complete-analysis`);
    return response.data;
  },

  // Restart analysis
  restartAnalysis: async (orderId: string) => {
    const response = await publicApi.post(`/orders/${orderId}/restart-analysis`);
    return response.data;
  },

  // Get best offers for an order
  getBestOffers: async (orderId: string, limit?: number) => {
    const response = await publicApi.get(`/orders/${orderId}/best-offers`, {
      params: { limit }
    });
    return response.data;
  },

  // Get optimal combination
  getOptimalCombination: async (orderId: string) => {
    const response = await publicApi.get(`/orders/${orderId}/optimal-combination`);
    return response.data;
  },
};
