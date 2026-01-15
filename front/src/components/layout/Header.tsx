// import {useState} from 'react';
// import {Link, useNavigate} from 'react-router-dom'
// import {Home, MessageSquare, Users} from "lucide-react";

import React from "react";

interface HeaderProps {
    userName?: string;
    userRole?: string;
}

const Header:React.FC<HeaderProps> = ({
    userName,
    userRole
}) => {
    // const navigate = useNavigate()
    // const isAuthenticated = false ;
    //
    // const [isProfileOpen, setIsProfileOpen] = useState(false);
    //
    // const navItems = [
    //     { label: 'Главная', icon: <Home size={18} />, href: '/', color: 'text-gray-700 hover:text-blue-600' },
    //     { label: 'WhatsApp', icon: <MessageSquare size={18} />, href: '/whatsapp', color: 'text-gray-700 hover:text-green-600' },
    //     { label: 'Поставщики', icon: <Users size={18} />, href: '/suppliers', color: 'text-gray-700 hover:text-blue-600' },
    // ];
console.log(userName, userRole);
    return (
     <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
            kfjg
     </header>
 )
}

export default Header