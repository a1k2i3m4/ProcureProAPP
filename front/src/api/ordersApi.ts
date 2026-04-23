import { publicApi } from './apiBase';

export interface OrderItem {
    tovar: string;
    specific: string;
    qty: number;
    gs_code?: string;
}

export interface TriggerOption {
    id: number;
    name: string;
}

export interface StockOption {
    id: number;
    gs_code: string | null;
    group_name: string | null;
    name: string;
    stock_qty: number | null;
    min_stock: number | null;
}

export interface Order {
    order_id: string;
    fast: 'yes' | 'no';
    items?: OrderItem[];
    items_count: number;
    source_file: string;
    status: string;
    created_at: string;
    imported_at: string;
}

export interface Stats {
    total_orders: number;
    total_items: number;
}

export interface AnalysisStatus {
    order_id: string;
    status: 'in_progress' | 'completed' | 'timeout' | 'cancelled';
    started_at: string;
    completed_at?: string;
    timeout_at: string;
    timeout_minutes: number;
    suppliers_contacted: number;
    responses_received: number;
    time_remaining_ms: number;
    time_remaining_formatted: string;
    progress_percent: number;
}

export interface SupplierResponseItem {
    item_name: string;
    price: number;
    quantity_available: number;
    delivery_days: number;
    response_time: string;
}

export interface SupplierResponse {
    id: number;
    order_id: string;
    supplier_id: number;
    supplier_name: string;
    rating: number;
    can_urgent: boolean;
    category_name: string;
    item_name: string;
    price: number;
    quantity_available: number;
    delivery_days: number;
    response_time: string;
    raw_message?: string;
}

export interface BestOffer {
    supplier_id: number;
    supplier_name: string;
    rating: number;
    can_urgent: boolean;
    category_name: string;
    items: SupplierResponseItem[];
    total_price: number;
    max_delivery_days: number;
    score: number;
    items_count: number;
}

export interface OptimalSupplierItem {
    item_name: string;
    quantity: number;
    price_per_unit: number;
    total: number;
    delivery_days: number;
}

export interface OptimalSupplier {
    supplier_id: number;
    supplier_name: string;
    rating: number;
    can_urgent: boolean;
    items: OptimalSupplierItem[];
    total: number;
    max_delivery_days: number;
}

export interface OptimalCombination {
    suppliers: OptimalSupplier[];
    grand_total: number;
    max_delivery_days: number;
    coverage: number;
    items_covered: number;
    items_required: number;
    message?: string;
}

export interface AnalysisError {
    id: number;
    order_id: string;
    supplier_id?: number;
    supplier_name?: string;
    error_type: string;
    error_message: string;
    created_at: string;
}

export const ordersApi = {
    createOrder: async (data: { order_id: string; fast: 'yes' | 'no'; items: OrderItem[] }) => {
        const response = await publicApi.post('/orders', data);
        return response.data;
    },
    getTriggerOptions: async () => {
        const response = await publicApi.get<TriggerOption[]>('/categories/available');
        return response.data;
    },
    getStocks: async () => {
        const response = await publicApi.get<StockOption[]>('/stocks');
        return response.data;
    },
    getNextManualId: async (): Promise<{ next_id: string }> => {
        const response = await publicApi.get<{ next_id: string }>('/orders/next-manual-id');
        return response.data;
    },
    getOrders: async () => {
        const response = await publicApi.get<Order[]>('/orders');
        return response.data;
    },
    getOrdersToday: async () => {
        const response = await publicApi.get<Order[]>('/orders/today');
        return response.data;
    },
    getOrderDetails: async (id: string) => {
        const response = await publicApi.get<Order>(`/orders/${id}`);
        return response.data;
    },
    getStats: async () => {
        const response = await publicApi.get<Stats>('/stats');
        return response.data;
    },

    // Analysis methods
    analyzeOrder: async (orderId: string) => {
        try {
            const response = await publicApi.post(`/orders/${orderId}/analyze`);
            return response.data;
        } catch (error: unknown) {
            console.error('Error in analyzeOrder:', error);
            const axiosError = error as { config?: { url?: string }; response?: { status?: number; data?: unknown } };
            console.error('Request URL:', axiosError.config?.url);
            console.error('Response status:', axiosError.response?.status);
            console.error('Response data:', axiosError.response?.data);
            throw error;
        }
    },

    getAnalysisStatus: async (orderId: string) => {
        const response = await publicApi.get<AnalysisStatus>(`/orders/${orderId}/analysis-status`);
        return response.data;
    },

    completeAnalysis: async (orderId: string) => {
        const response = await publicApi.post(`/orders/${orderId}/complete-analysis`);
        return response.data;
    },

    restartAnalysis: async (orderId: string) => {
        const response = await publicApi.post(`/orders/${orderId}/restart-analysis`);
        return response.data;
    },

    getSupplierResponses: async (orderId: string) => {
        const response = await publicApi.get<SupplierResponse[]>(`/orders/${orderId}/responses`);
        return response.data;
    },

    getBestOffers: async (orderId: string, limit = 10) => {
        const response = await publicApi.get<BestOffer[]>(`/orders/${orderId}/best-offers`, {
            params: { limit }
        });
        return response.data;
    },

    getOptimalCombination: async (orderId: string) => {
        const response = await publicApi.get<OptimalCombination>(`/orders/${orderId}/optimal-combination`);
        return response.data;
    },

    getAnalysisErrors: async (orderId: string) => {
        const response = await publicApi.get<AnalysisError[]>(`/orders/${orderId}/errors`);
        return response.data;
    }
};
