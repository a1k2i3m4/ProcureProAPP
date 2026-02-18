import { AuthCredentials, AuthResponse, LoginResponse, RegisterData, User } from "../types/auth.ts";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authApi } from "../api/authApi.ts";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: Error | null;
    isAuthenticated: boolean;
    login: (credentials: AuthCredentials) => Promise<LoginResponse>;
    register: (userData: RegisterData) => Promise<LoginResponse>;
    logout: () => Promise<void>;
    updateUser: (userData: Partial<User>) => void;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const initAuth = async (): Promise<void> => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                try {
                    const userData = await authApi.getProfile();
                    setUser(userData);
                } catch (err) {
                    console.error('Ошибка при проверке авторизации:', err);
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (credentials: AuthCredentials): Promise<LoginResponse> => {
        setError(null);
        try {
            const data: AuthResponse = await authApi.login(credentials);

            localStorage.setItem('token', data.token);
            if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
            }

            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
            }
            return { success: true, data };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ошибка при входе';
            const errorObj = new Error(errorMessage);
            setError(errorObj);
            return { success: false, error: errorObj };
        }
    };

    const logout = async (): Promise<void> => {
        try {
            await authApi.logout();
        } finally {
            // Всегда очищаем локальные данные
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
            setError(null);
        }
    };

    const register = async (userData: RegisterData): Promise<LoginResponse> => {
        setError(null);
        try {
            const data: AuthResponse = await authApi.register(userData);

            // Сохраняем токен и данные пользователя
            localStorage.setItem('token', data.token);
            if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
            }
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
            }
            return { success: true, data };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ошибка при регистрации';
            const errorObj = new Error(errorMessage);
            setError(errorObj);
            return { success: false, error: errorObj };
        }
    };

    const updateUser = (userData: Partial<User>): void => {
        if (user) {
            const updatedUser = { ...user, ...userData };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    const clearError = (): void => setError(null);

    const value: AuthContextType = {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        register,
        login,
        logout,
        updateUser,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth должен использоваться внутри AuthProvider');
    }
    return context;
};