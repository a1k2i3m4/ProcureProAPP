import React, {useState} from "react";
import {useLocation} from "react-router-dom";
import {Home, MessageSquare, Users, LogOut, User} from "lucide-react";

interface HeaderProps {
    userName?: string;
    userRole?: string;
}

const Header: React.FC<HeaderProps> = ({
                                           userName = 'akim123zzz@gmail.com',
                                           userRole = 'Менеджер закупок',
                                       }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const location = useLocation();
    const currentPath = location.pathname;

    const navItems = [
        { label: 'Главная', icon: <Home size={20} />, href: '/' },
        { label: 'WhatsApp', icon: <MessageSquare size={20} />, href: '/whatsapp' },
        { label: 'Поставщики', icon: <Users size={20} />, href: '/suppliers'},
    ];

    const isActive = (itemPage: string) => {
        if (currentPath === itemPage || currentPath === `/${itemPage}`) {
            return true;
        }
        if (itemPage === '/' && currentPath === '/') {
            return true;
        }
        return false;
    };

    return (
        <header className="fixed w-full top-0 z-50 border-b border-white/20 shadow-sm"
                style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)'
                }}>
            <div className="px-4 sm:px-6 py-2">
                <div className="flex items-center justify-between h-14">
                    {/* Левый блок: Логотип и название */}
                    <div className="flex items-center gap-3">
                        {/* Логотип */}
                        <div
                            className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shrink-0">
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
                            <a
                                key={item.label}
                                href={item.href}
                                className={`
                                    flex items-center justify-center sm:justify-start
                                    p-2.5 sm:px-4 sm:py-3 
                                    rounded-lg sm:rounded-xl
                                    text-white hover:bg-white/20 
                                    transition-colors duration-300
                                    ${isActive(item.href)
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
                            </a>
                        ))}
                    </nav>

                    {/* Правый блок: Профиль пользователя */}
                    <div className="flex items-center gap-3">
                        <div className="hidden md:block text-right">
                            <p className="text-sm font-semibold text-white">
                                {userName}
                            </p>
                            <p className="text-xs text-white/80">{userRole}</p>
                        </div>

                        {/* Аватар и выпадающее меню */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                                aria-label="Профиль пользователя"
                            >
                                <div
                                    className="flex items-center justify-center h-9 w-9 rounded-lg bg-white/10 text-white border border-white/20">
                                    <User size={18}/>
                                </div>
                            </button>

                            {/* Выпадающее меню профиля */}
                            {isProfileOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-semibold text-gray-900">{userName}</p>
                                        <p className="text-xs text-gray-500 mt-1">{userRole}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            console.log("logout");
                                            setIsProfileOpen(false);
                                        }}
                                        className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut size={16} className="mr-3"/>
                                        Выйти
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;