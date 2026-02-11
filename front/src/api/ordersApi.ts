import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:5001';

const publicApi = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
});

export interface OrderItem {
    tovar: string;
    specific: string;
    qty: number;
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

export const ordersApi = {
    getOrders: async () => {
        const response = await publicApi.get<Order[]>('/api/orders');
        return response.data;
    },
    getOrdersToday: async () => {
        const response = await publicApi.get<Order[]>('/api/orders/today');
        return response.data;
    },
    getOrderDetails: async (id: string) => {
        const response = await publicApi.get<Order>(`/api/orders/${id}`);
        return response.data;
    },
    getStats: async () => {
        const response = await publicApi.get<Stats>('/api/stats');
        return response.data;
    }
};
