import React, { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "../components/layout/Layout";
import LoadingPage from "../pages/LoadingPage";
import NotFoundPage from "../pages/NotFoundPage.tsx";
import { LoginPage } from "../pages/LoginPage.tsx";
import { RegisterPage } from "../pages/RegisterPage.tsx";
import { ProtectedRoute } from "../components/route/ProtectedRoute";
import { PublicRoute } from "../components/route/PublicRoute";

// ========================================
// 🚀 ЛЕНИВАЯ ЗАГРУЗКА СТРАНИЦ
// Оптимизация: код загружается только при переходе
// ========================================
const HomePage = lazy(() => import('../pages/HomePage'));
const SuppliersPage = lazy(() => import('../pages/SuppliersPage'));

/**
 * 🔀 AppRoutes - Основная маршрутизация приложения
 *
 * Структура:
 * ├── 🔒 Protected Routes (требуют авторизации)
 * ├── 🔓 Public Routes (доступны всем)
 * └── ⚠️  Error Routes (обработка ошибок)
 */
const AppRoutes: React.FC = () => {
    return (
        <BrowserRouter>
            <Suspense fallback={<LoadingPage />}>
                <Routes>
                    {/* ═════════════════════════════════════════════════════════════
                        🔒 ЗАЩИЩЁННЫЕ МАРШРУТЫ (требуют авторизации)
                        ═════════════════════════════════════════════════════════════ */}

                    {/* 🏠 Главная страница - Панель управления */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <HomePage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    {/* 👥 Страница поставщиков - Управление поставщиками */}
                    <Route
                        path="/suppliers"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <SuppliersPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    {/* ═════════════════════════════════════════════════════════════
                        🔓 ПУБЛИЧНЫЕ МАРШРУТЫ (доступны без авторизации)
                        ═════════════════════════════════════════════════════════════ */}

                    {/* 🔐 Вход - Страница авторизации */}
                    <Route
                        path="/login"
                        element={
                            <PublicRoute>
                                <LoginPage />
                            </PublicRoute>
                        }
                    />

                    {/* ✍️ Регистрация - Создание аккаунта */}
                    <Route
                        path="/register"
                        element={
                            <PublicRoute>
                                <RegisterPage />
                            </PublicRoute>
                        }
                    />

                    {/* ═════════════════════════════════════════════════════════════
                        ⚠️ ОБРАБОТКА ОШИБОК
                        ═════════════════════════════════════════════════════════════ */}

                    {/* ❌ Catch-all маршрут - Несуществующие страницы */}
                    <Route
                        path="*"
                        element={
                            <Layout>
                                <NotFoundPage />
                            </Layout>
                        }
                    />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
};

export default AppRoutes;

