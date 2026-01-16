// import {useNavigate} from 'react-router-dom'
import {Home, MessageSquare, Users, LogOut, User} from "lucide-react";

import React, {useState} from "react";
import {useLocation} from "react-router-dom";

interface HeaderProps {
    userName?: string;
    userRole?: string;
}

const Header:React.FC<HeaderProps> = ({
    userName = 'akim123zzz@gmail.com',
    userRole = 'Менеджер закупок',
}) => {
    // const navigate = useNavigate()
    // const isAuthenticated = false ;
    //
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const location = useLocation()
    const currentPath = location.pathname;

    const navItems = [
        { label: 'Главная', icon: <Home size={18} />, href: '/'  },
        { label: 'WhatsApp', icon: <MessageSquare size={18} />, href: '/whatsapp' },
        { label: 'Поставщики', icon: <Users size={18} />, href: '/suppliers'},
    ];

    const isActive = (itemPage: string) => {
        // Проверяем по пути
        if (currentPath === itemPage || currentPath === `/${itemPage}`) {
            return true;
        }
        // Для главной страницы
        if (itemPage === 'home' && currentPath === '/') {
            return true;
        }

        return false;
    };


    return (
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm"
                style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)'
                }}>
            <div className="px-6 py-1.5">
                <div className="flex items-center justify-between h-16">
                    {/* Левый блок: Логотип */}
                    <div className="flex items-center">
                        <div
                            className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                            <span className="text-white font-bold text-lg">CU</span>
                        </div>
                        <div className="ml-4">
                            <h1 className="text-xl font-bold text-white">
                                Система Закупок
                            </h1>
                        </div>
                    </div>

                    <nav className="flex items-center space-x-6">
                        {navItems.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                className={`flex items-center px-4 py-4 rounded-xl text-lg font-bold text-white hover:bg-gray-300 hover:bg-opacity-20 transition-colors duration-300 
                            ${isActive(item.href)
                                    ? 'bg-white/20 text-white shadow-sm'
                                    : 'text-white/90 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <span className="mr-2">{item.icon}</span>
                                {item.label}
                            </a>
                        ))}
                    </nav>

                    {/* Профиль пользователя */}
                    <div className="relative ">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white/20 duration-300 transition-colors bg-white/10 "
                            aria-label="Профиль пользователя"
                        >
                            <div className="flex items-center">
                                <div
                                    className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/10  text-white border border-white/20 transition-colors">
                                    <User size={18}/>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-sm font-semibold text-white">
                                    {userName}
                                </p>
                                <p className="text-xs text-white/80">{userRole}</p>
                            </div>

                        </button>

                        {isProfileOpen && (
                            <div
                                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                                {/* Единственная кнопка - Выйти */}
                                <button
                                    onClick={() => console.log("logout")}
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
        </header>
    )
}

export default Header