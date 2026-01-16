import React from "react";
import { Link } from "react-router-dom";
import { MdOutlineErrorOutline } from "react-icons/md";

const NotFoundPage: React.FC = () => {
    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="max-w-md w-full text-center p-8 bg-white rounded-xl shadow-lg border-2 border-red-500">
                <MdOutlineErrorOutline className="text-red-500 text-8xl mx-auto mb-4" />

                <h1 className="text-6xl font-bold text-red-500 mb-2">404</h1>

                <h2 className="text-2xl font-semibold mb-2">Страница не найдена</h2>

                <p className="text-gray-600 mb-6">
                    К сожалению, адрес, по которому вы перешли, больше не существует или был перемещен.
                </p>

                <Link
                    to="/"
                    className="inline-block px-6 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg shadow hover:bg-blue-700 transition"
                >
                    Перейти на Главную
                </Link>
            </div>
        </div>
    );
};

export default NotFoundPage;