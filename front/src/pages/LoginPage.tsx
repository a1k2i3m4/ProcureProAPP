import { useState } from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from "../context/AuthContext.tsx";

export function LoginPage() {
    const { login, error: authError,loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (!email || !password) {
            setLocalError('Пожалуйста, заполните все поля');
            return;
        }

        const result = await login({ email, password });
        if (!result.success) {
            setLocalError(result.error?.message || 'Ошибка входа');
        }
    };

    // Отображаем либо локальную ошибку, либо ошибку из контекста
    const errorMessage = localError || authError?.message;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
                        <span className="text-purple-600 font-bold text-2xl">CU</span>
                    </div>
                    <h1 className="text-3xl text-white mb-2">Система Закупок</h1>
                    <p className="text-purple-200">Войдите в свой аккаунт</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email/Username Field */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-2">
                                Email или имя пользователя
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setLocalError('');
                                    }}
                                    disabled={loading}
                                    placeholder="Введите email или имя пользователя"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-2">
                                Пароль
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setLocalError('');
                                    }}
                                    disabled={loading}
                                    placeholder="Введите пароль"
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={loading}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                    ) : (
                                        <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {errorMessage && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm animate-fadeIn">
                                {errorMessage}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Вход...
                                </>
                            ) : (
                                'Войти'
                            )}
                        </button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <p className="text-center text-sm text-gray-600 mb-2">
                            Для демо используйте:
                        </p>
                        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 space-y-1">
                            <div>
                                <span className="font-medium">Email/Login:</span> manager
                            </div>
                            <div>
                                <span className="font-medium">Пароль:</span> 1234
                            </div>
                            <div className="text-gray-500 text-[10px] mt-1">
                                Или любой email с паролем 1234
                            </div>
                        </div>
                    </div>

                    {/* Switch to Register */}
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-600">
                            Нет аккаунта?{' '}
                            <button
                                onClick={() => window.location.href = '/register'}
                                disabled={loading}
                                className="text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
                            >
                                Зарегистрироваться
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-purple-200 text-sm">
                    © 2026 CU Система Закупок. Все права защищены.
                </div>
            </div>
        </div>
    );
}