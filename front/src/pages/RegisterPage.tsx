import { useState } from 'react';
import { Lock, User, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from "../context/AuthContext.tsx";
import { useNavigate } from 'react-router-dom';

export function RegisterPage() {
    const { register, error: authError, loading } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [localError, setLocalError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        // Валидация
        if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
            setLocalError('Пожалуйста, заполните все поля');
            return;
        }

        if (formData.username.length < 3) {
            setLocalError('Имя пользователя должно быть не менее 3 символов');
            return;
        }

        if (formData.password.length < 4) {
            setLocalError('Пароль должен быть не менее 4 символов');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setLocalError('Пароли не совпадают');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setLocalError('Введите корректный email');
            return;
        }

        if (register) {
            const result = await register({
                username: formData.username,
                email: formData.email,
                password: formData.password,
                confirmPassword: formData.confirmPassword,
            });

            if (result.success) {
                navigate('/');
            } else {
                setLocalError(result.error?.message || 'Ошибка регистрации');
            }
        } else {
            setLocalError('Регистрация временно недоступна');
        }
    };

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData({ ...formData, [field]: value });
        setLocalError('');
    };

    // Объединяем ошибки
    const errorMessage = localError || authError?.message;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
                        <span className="text-purple-600 font-bold text-2xl">CU</span>
                    </div>
                    <h1 className="text-3xl text-white mb-2">Создать аккаунт</h1>
                    <p className="text-purple-200">Присоединяйтесь к Системе Закупок</p>
                </div>

                {/* Register Form */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username Field */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-2">
                                Имя пользователя *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => handleChange('username', e.target.value)}
                                    disabled={loading}
                                    placeholder="manager"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-2">
                                Email *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    disabled={loading}
                                    placeholder="manager@company.kz"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-2">
                                Пароль *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    disabled={loading}
                                    placeholder="Минимум 4 символа"
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

                        {/* Confirm Password Field */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-2">
                                Подтвердите пароль *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                    disabled={loading}
                                    placeholder="Повторите пароль"
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={loading}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
                                >
                                    {showConfirmPassword ? (
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

                        {/* Password Requirements */}
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <p className="text-xs text-blue-800 font-medium mb-1">Требования к паролю:</p>
                            <ul className="text-xs text-blue-600 space-y-1">
                                <li className="flex items-center">
                                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${formData.password.length >= 4 ? 'bg-green-500' : 'bg-blue-300'}`}></div>
                                    Минимум 4 символа
                                </li>
                                <li className="flex items-center">
                                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${formData.password === formData.confirmPassword && formData.password ? 'bg-green-500' : 'bg-blue-300'}`}></div>
                                    Пароли должны совпадать
                                </li>
                            </ul>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Регистрация...
                                </>
                            ) : (
                                'Зарегистрироваться'
                            )}
                        </button>
                    </form>

                    {/* Switch to Login */}
                    <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                        <p className="text-sm text-gray-600">
                            Уже есть аккаунт?{' '}
                            <button
                                onClick={() => navigate('/login')}
                                disabled={loading}
                                className="text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
                            >
                                Войти
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