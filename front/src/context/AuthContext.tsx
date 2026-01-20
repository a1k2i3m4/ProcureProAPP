import { AuthCredentials, AuthResponse, LoginResponse, RegisterData, User } from "../types/auth.ts";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
// import { authApi } from "../api/authApi.ts";

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

// Mock пользователи для тестирования
const mockUsers: User[] = [
    {
        id: "1",
        email: "admin@company.com",
        username: "admin",
        role: "admin",
    },
    {
        id: "2",
        email: "manager@company.com",
        username: "manager",
        role: "manager",
    },
    {
        id: "3",
        email: "user@company.com",
        username: "user",
        role: "user",
    }
];

// Mock API функции (замените на реальные при подключении API)
const mockAuthApi = {
    login: async (credentials: AuthCredentials): Promise<AuthResponse> => {
        // Имитация задержки сети
        await new Promise(resolve => setTimeout(resolve, 500));

        // Проверяем демо-учетные данные
        const isDemoLogin = credentials.email === "manager" && credentials.password === "1234";
        const isDemoEmail = credentials.email === "manager@company.com" && credentials.password === "1234";

        if (isDemoLogin || isDemoEmail) {
            // Возвращаем менеджера для демо
            const user = mockUsers[1]; // manager
            return {
                token: `mock_jwt_token_${Date.now()}`,
                refreshToken: `mock_refresh_token_${Date.now()}`,
                user,
                expiresIn: 3600
            };
        }

        // Проверяем существующих пользователей
        const foundUser = mockUsers.find(u =>
            (u.email === credentials.email || u.username === credentials.email) &&
            credentials.password === "1234" // Все mock пользователи имеют пароль "1234"
        );

        if (foundUser) {
            return {
                token: `mock_jwt_token_${Date.now()}_${foundUser.id}`,
                refreshToken: `mock_refresh_token_${Date.now()}_${foundUser.id}`,
                user: foundUser,
                expiresIn: 3600
            };
        }

        throw new Error("Неверный email/логин или пароль");
    },

    register: async (userData: RegisterData): Promise<AuthResponse> => {
        await new Promise(resolve => setTimeout(resolve, 500));

        // Проверяем, существует ли пользователь
        const existingUser = mockUsers.find(u =>
            u.email === userData.email || u.username === userData.username
        );

        if (existingUser) {
            throw new Error("Пользователь с таким email или именем уже существует");
        }

        // Создаем нового пользователя
        const newUser: User = {
            id: Date.now().toString(),
            email: userData.email,
            username: userData.username,
            role: "user",
        };

        // В реальном приложении здесь был бы вызов API
        // mockUsers.push(newUser); // Только для имитации на клиенте

        return {
            token: `mock_jwt_token_${Date.now()}_${newUser.id}`,
            refreshToken: `mock_refresh_token_${Date.now()}_${newUser.id}`,
            user: newUser,
            expiresIn: 3600
        };
    },

    logout: async (): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 200));
        // В реальном приложении здесь был бы вызов API для инвалидации токена
        console.log("Mock logout completed");
    },

    getProfile: async (): Promise<User> => {
        await new Promise(resolve => setTimeout(resolve, 300));

        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (!token || !storedUser) {
            throw new Error("Токен отсутствует или устарел");
        }

        try {
            const user = JSON.parse(storedUser);
            return user;
        } catch {
            throw new Error("Ошибка при чтении данных пользователя");
        }
    }
};

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
                    // ЗАКОММЕНТИРОВАТЬ ПРИ ИСПОЛЬЗОВАНИИ API:
                    // const userData = await authApi.getProfile()

                    // ИСПОЛЬЗОВАТЬ MOCK:
                    const userData = await mockAuthApi.getProfile();
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
            // ЗАКОММЕНТИРОВАТЬ ПРИ ИСПОЛЬЗОВАНИИ API:
            // const data: AuthResponse = await authApi.login(credentials)

            // ИСПОЛЬЗОВАТЬ MOCK:
            const data: AuthResponse = await mockAuthApi.login(credentials);

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
            // ЗАКОММЕНТИРОВАТЬ ПРИ ИСПОЛЬЗОВАНИИ API:
            // await authApi.logout();

            // ИСПОЛЬЗОВАТЬ MOCK:
            await mockAuthApi.logout();
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
            // ЗАКОММЕНТИРОВАТЬ ПРИ ИСПОЛЬЗОВАНИИ API:
            // const data: AuthResponse = await authApi.register(userData);

            // ИСПОЛЬЗОВАТЬ MOCK:
            const data: AuthResponse = await mockAuthApi.register(userData);

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