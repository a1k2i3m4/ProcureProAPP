import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, MessageSquare, Users, LogOut, User, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Header: React.FC = () => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isAuthenticated } = useAuth();
    const currentPath = location.pathname;

    // Закрытие меню при клике вне его
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const navItems = [
        { label: 'Главная', icon: <Home size={20} />, path: '/' },
        { label: 'WhatsApp', icon: <MessageSquare size={20} />, path: '/whatsapp' },
        { label: 'Поставщики', icon: <Users size={20} />, path: '/suppliers' },
    ];

    const isActive = (path: string) => {
        return currentPath === path;
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        window.scrollTo(0, 0);
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (error) {
            console.error("Ошибка при выходе:", error);
        } finally {
            setIsProfileOpen(false);
        }
    };

    // Если пользователь не авторизован, не показываем хедер
    if (!isAuthenticated) {
        return null;
    }

    return (
        <header
            className="fixed w-full top-0 z-50 border-b border-white/20 shadow-sm"
            style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)'
            }}
        >
            <div className="px-4 sm:px-6 py-2">
                <div className="flex items-center justify-between h-14">
                    {/* Левый блок: Логотип и название */}
                    <div className="flex items-center gap-3">
                        {/* Логотип */}
                        <div
                            className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shrink-0 cursor-pointer"
                            onClick={() => handleNavigation("/")}
                        >
                            <span className="text-white font-bold text-lg">CU</span>
                        </div>

                        {/* Название системы - скрываем на очень маленьких экранах */}
                        <div className="hidden xs:block">
                            <h1 className="text-base sm:text-lg font-bold text-white whitespace-nowrap">
                                Система Закупок
                            </h1>
                        </div>
                    </div>

                    {/* Центр: Навигация (только иконки на мобильных) */}
                    <nav className="flex items-center gap-4 sm:gap-6">
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => handleNavigation(item.path)}
                                className={`
                                    flex items-center justify-center sm:justify-start
                                    p-2.5 sm:px-4 sm:py-3 
                                    rounded-lg sm:rounded-xl
                                    text-white hover:bg-white/20 
                                    transition-colors duration-300
                                    ${isActive(item.path)
                                    ? 'bg-white/20 shadow-sm'
                                    : 'hover:bg-white/10'
                                }
                                `}
                                title={item.label}
                            >
                                {/* Иконка всегда видна */}
                                {item.icon}

                                {/* Текст показываем только на средних экранах и выше */}
                                <span className="hidden lg:block ml-2.5 text-sm lg:text-base font-medium">
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </nav>

                    {/* Правый блок: Профиль пользователя */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/20 transition-colors group"
                            aria-label="Профиль пользователя"
                        >
                            {/* Информация о пользователе (скрыта на мобильных) */}
                            <div className="hidden md:block text-right">
                                <p className="text-sm font-semibold text-white group-hover:text-white/90">
                                    {user?.username || user?.email || 'Пользователь'}
                                </p>
                                <p className="text-xs text-white/80 group-hover:text-white/70">
                                    {user?.role === 'admin' && 'Администратор'}
                                    {user?.role === 'manager' && 'Менеджер закупок'}
                                    {user?.role === 'user' && 'Пользователь'}
                                </p>
                            </div>

                            {/* Аватар */}
                            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-white/10 text-white border border-white/20 group-hover:bg-white/20">
                                {user?.username ? (
                                    <span className="font-semibold">
                                        {user.username.charAt(0).toUpperCase()}
                                    </span>
                                ) : (
                                    <User size={18} />
                                )}
                            </div>
                        </button>

                        {/* Выпадающее меню профиля */}
                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20 animate-fadeIn">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <p className="text-sm font-semibold text-gray-900">
                                        {user?.username || user?.email || 'Пользователь'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {user?.email && (
                                            <div className="truncate">{user.email}</div>
                                        )}
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className={`inline-block w-2 h-2 rounded-full ${
                                                user?.role === 'admin' ? 'bg-red-500' :
                                                    user?.role === 'manager' ? 'bg-blue-500' :
                                                        'bg-green-500'
                                            }`}></span>
                                            <span>
                                                {user?.role === 'admin' && 'Администратор'}
                                                {user?.role === 'manager' && 'Менеджер закупок'}
                                                {user?.role === 'user' && 'Пользователь'}
                                            </span>
                                        </div>
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        handleNavigation("/profile");
                                        setIsProfileOpen(false);
                                    }}
                                    className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <User size={16} className="mr-3 text-gray-500" />
                                    Профиль
                                </button>

                                <button
                                    onClick={() => {
                                        handleNavigation("/settings");
                                        setIsProfileOpen(false);
                                    }}
                                    className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Settings size={16} className="mr-3 text-gray-500" />
                                    Настройки
                                </button>

                                <div className="border-t border-gray-100 my-1"></div>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={16} className="mr-3" />
                                    Выйти
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;