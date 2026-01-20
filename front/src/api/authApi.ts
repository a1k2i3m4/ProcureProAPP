/// <reference types="vite/client" />
import axios, {AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig} from 'axios'
import {AuthCredentials, AuthResponse, RegisterData, User} from "../types/auth.ts";

const API_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:3000';

interface ApiResponse <T = any> {
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

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if(refreshToken){
                    const response = await axios.post<AuthResponse>(`${API_URL}/auth/refresh`, {
                        refreshToken,
                    })
                    const {token, refreshToken: newRefreshToken} = response.data;
                    localStorage.setItem('token', token);
                    if(newRefreshToken){
                        localStorage.setItem('refreshToken', newRefreshToken);
                    }

                    if(originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    return instance(originalRequest)
                }
            }catch(error){
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
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
            const response = await api.post<ApiResponse<AuthResponse>>('auth/login', credentials);
            return response.data.data;
        }catch(error){
            const axiosError = error as AxiosError<{message: string}>;
            throw new Error(axiosError.response?.data.message || 'Ошибка при входе');
        }
    },

    register: async (userData: RegisterData): Promise<AuthResponse> => {
        try {
            const response = await api.post<ApiResponse<AuthResponse>>('auth/register', userData);
            return response.data.data;
        }catch(error){
            const axiosError = error as AxiosError<{message: string}>;
            throw new Error(axiosError.response?.data.message || 'Ошибка при регистрации');
        }
    },

    logout: async (): Promise<void> => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            await api.post('auth/logout', {refreshToken});
        }catch(error){
            console.error('Logout error:', error);
        }finally {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');        }
    },

    getProfile: async (): Promise<User> => {
        try{
            const response = await api.get<ApiResponse<User>>('auth/Profile');
            return response.data.data;
        }catch (error){
            const axiosError = error as AxiosError<{message: string}>;
            throw new Error(axiosError.response?.data?.message || 'Ошибка при получении профиля');
        }
    },updateProfile: async (userData: Partial<User>): Promise<User> => {
        try {
            const response = await api.put<ApiResponse<User>>('/auth/profile', userData);
            return response.data.data;
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            throw new Error(axiosError.response?.data?.message || 'Ошибка при обновлении профиля');
        }
    },
};

export default api;
