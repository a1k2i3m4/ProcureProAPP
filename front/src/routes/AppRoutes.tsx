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
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const SupplierFormPage = lazy(() => import('../pages/SupplierFormPage'));
const AnalysisDetailsPage = lazy(() => import('../pages/AnalysisDetailsPage'));

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
                        </ProtectedRoute>
                    } />

                    {/* Suppliers page (public) */}
                    <Route path="/suppliers" element={
                        <Layout>
                            <SuppliersPage />
                        </Layout>
                    } />

                    {/* Analytics page */}
                    <Route path="/analytics" element={
                        <Layout>
                            <AnalyticsPage />
                        </Layout>
                    } />

                    {/* Analytics details page */}
                    <Route path="/analytics/:id" element={
                        <Layout>
                            <AnalysisDetailsPage />
                        </Layout>
                    } />

                    {/* Supplier Form - Public page without Layout */}
                    <Route path="/supplier-form/:orderId/:supplierId" element={
                        <SupplierFormPage />
                    } />

                    {/* Public Routes */}
                    <Route path="/login" element={
                        <PublicRoute>
                            <LoginPage  />
                        </PublicRoute>
                    } />

                    <Route path="/register" element={
                        <PublicRoute>
                            <RegisterPage />
                        </PublicRoute>
                    } />

                    {/* Catch-all route */}
                    <Route path="*" element={
                        <Layout>
                            <NotFoundPage />
                        </Layout>
                    } />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
};

export default AppRoutes;

