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
            const authLoginUrl = (import.meta as any).env?.VITE_AUTH_LOGIN_URL || '/'
            const authServiceUrl = ((import.meta as any).env?.VITE_AUTH_SERVICE_URL || '').replace(/\/+$/, '')

            const params = new URLSearchParams(window.location.search)
            const sessionId = params.get('sessionId')
            const token = localStorage.getItem('token')

            // 1) Если токен уже есть — используем сохранённого юзера из localStorage (SSO)
            if (token) {
                const savedUser = localStorage.getItem('user')
                if (savedUser) {
                    try {
                        setUser(JSON.parse(savedUser))
                    } catch { /* ignore parse error */ }
                    setLoading(false)
                    return
                }
                // Фоллбек: пробуем getProfile() (работает только для локальных юзеров ProcurePro DB)
                try {
                    const userData = await authApi.getProfile();
                    setUser(userData);
                    localStorage.setItem('user', JSON.stringify(userData))
                } catch (err) {
                    console.error('Ошибка при проверке авторизации:', err);
                    // Пробуем декодировать юзера из JWT токена
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]))
                        const fallbackUser = { id: payload.id || payload.sub || payload.phone, name: payload.name || payload.phone || 'User', phone: payload.phone, role: payload.role || 'user' }
                        localStorage.setItem('user', JSON.stringify(fallbackUser))
                        setUser(fallbackUser as any)
                    } catch {
                        // Совсем не удалось — чистим и редиректим
                        localStorage.removeItem('token');
                        localStorage.removeItem('refreshToken');
                        localStorage.removeItem('user');
                    }
                } finally {
                    setLoading(false);
                }
                return
            }

            // 2) Если пришли с sessionId — обмениваем его в AuthService на JWT (SSO)
            if (sessionId) {
                try {
                    if (!authServiceUrl) {
                        throw new Error('VITE_AUTH_SERVICE_URL is not set')
                    }

                    const resp = await fetch(`${authServiceUrl}/api/auth/session/${encodeURIComponent(sessionId)}`, {
                        method: 'GET',
                        credentials: 'include',
                    })

                    if (!resp.ok) {
                        throw new Error('SESSION_EXCHANGE_FAILED')
                    }

                    const data: any = await resp.json().catch(() => null)
                    const exchangedToken: string | undefined = data?.token
                    const exchangedRefreshToken: string | undefined = data?.refreshToken
                    const exchangedUser: any = data?.user || data?.employee || data?.supervisor || null

                    if (!exchangedToken) {
                        throw new Error('NO_TOKEN_IN_SESSION_EXCHANGE')
                    }

                    localStorage.setItem('token', exchangedToken)
                    if (exchangedRefreshToken) {
                        localStorage.setItem('refreshToken', exchangedRefreshToken)
                    }

                    if (exchangedUser) {
                        localStorage.setItem('user', JSON.stringify(exchangedUser))
                        setUser(exchangedUser)
                    } else {
                        // Фоллбек — если юзер не вернулся, пробуем профиль
                        const userData = await authApi.getProfile();
                        setUser(userData);
                    }

                    // чистим sessionId из URL
                    params.delete('sessionId')
                    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
                    window.history.replaceState({}, '', newUrl)
                } catch (err) {
                    console.error('SESSION EXCHANGE ERROR:', err)
                    window.location.href = authLoginUrl
                } finally {
                    setLoading(false)
                }
                return
            }

            // 3) Ни токена, ни sessionId — значит пользователь не авторизован в основной системе
            setLoading(false)
            window.location.href = authLoginUrl
        }

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