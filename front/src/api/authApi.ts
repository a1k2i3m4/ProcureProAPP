/// <reference types="vite/client" />
import axios, {AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig} from 'axios'
import {AuthCredentials, AuthResponse, RegisterData, User} from "../types/auth.ts";
import { getApiBaseUrl } from './apiBase';

const API_URL = getApiBaseUrl();

interface ApiResponse <T = unknown> {
    data: T;
    message?: string;
    status: number;
}

const createApiInstance = (): AxiosInstance =>{
    const instance = axios.create({
        baseURL: API_URL,
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: 10000,
    })

    instance.interceptors.request.use(
        (config:InternalAxiosRequestConfig): InternalAxiosRequestConfig =>{
            const token = localStorage.getItem('token');
            if(token && config.headers){
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config
        },
        (error : AxiosError): Promise<AxiosError> => {
        return Promise.reject(error);
        }
    )

    instance.interceptors.response.use(
        (response : AxiosResponse):AxiosResponse =>response,
        async (error : AxiosError) => {
            const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

            if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if(refreshToken){
                    const response = await axios.post<ApiResponse<AuthResponse>>(`${API_URL}/api/auth/refresh`, {
                        refreshToken,
                    });
                    const refreshData = response.data?.data;
                    const token = refreshData?.token;
                    const newRefreshToken = refreshData?.refreshToken;
                    const refreshedUser = refreshData?.user;

                    if (!token) {
                        throw new Error('LOCAL_REFRESH_NO_TOKEN');
                    }

                    localStorage.setItem('token', token);
                    if(newRefreshToken){
                        localStorage.setItem('refreshToken', newRefreshToken);
                    }
                    if (refreshedUser) {
                        localStorage.setItem('user', JSON.stringify(refreshedUser));
                    }

                    if(originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    return instance(originalRequest)
                }

                const authServiceUrl = ((import.meta as any).env?.VITE_AUTH_SERVICE_URL || '').replace(/\/+$/, '');
                if (authServiceUrl) {
                    const response = await axios.post<AuthResponse>(
                        `${authServiceUrl}/api/auth/refresh`,
                        {},
                        { withCredentials: true }
                    );

                    const token = response.data?.token;
                    if (!token) {
                        throw new Error('SSO_REFRESH_NO_TOKEN');
                    }

                    localStorage.setItem('token', token);
                    if (response.data?.user) {
                        localStorage.setItem('user', JSON.stringify(response.data.user));
                    }

                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    return instance(originalRequest);
                }
            }catch(error){
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                // В ProcurePro нет собственного логина: редиректим в централизованный AuthService
                const authLoginUrl = (import.meta as any).env?.VITE_AUTH_LOGIN_URL || '/'
                window.location.href = authLoginUrl;
            }
            return Promise.reject(error);

        }
    )
    return instance;
}

const api = createApiInstance();


export const authApi = {
    login: async (credentials: AuthCredentials): Promise<AuthResponse> => {
        try{
            const response = await api.post<ApiResponse<AuthResponse>>('/api/auth/login', credentials);
            return response.data.data;
        }catch(error){
            const axiosError = error as AxiosError<{message: string}>;
            throw new Error(axiosError.response?.data.message || 'Ошибка при входе');
        }
    },

    register: async (userData: RegisterData): Promise<AuthResponse> => {
        try {
            const response = await api.post<ApiResponse<AuthResponse>>('/api/auth/register', userData);
            return response.data.data;
        }catch(error){
            const axiosError = error as AxiosError<{message: string}>;
            throw new Error(axiosError.response?.data.message || 'Ошибка при регистрации');
        }
    },

    logout: async (): Promise<void> => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            await api.post('/api/auth/logout', {refreshToken});
        }catch(error){
            console.error('Logout error:', error);
        }finally {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');        }
    },

    getProfile: async (): Promise<User> => {
        try{
            const response = await api.get<ApiResponse<User>>('/api/auth/profile');
            return response.data.data;
        }catch (error){
            const axiosError = error as AxiosError<{message: string}>;
            throw new Error(axiosError.response?.data?.message || 'Ошибка при получении профиля');
        }
    },updateProfile: async (userData: Partial<User>): Promise<User> => {
        try {
            const response = await api.put<ApiResponse<User>>('/api/auth/profile', userData);
            return response.data.data;
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            throw new Error(axiosError.response?.data?.message || 'Ошибка при обновлении профиля');
        }
    },
};

export default api;
