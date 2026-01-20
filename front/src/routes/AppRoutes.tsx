import React, { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "../components/layout/Layout";
import LoadingPage from "../pages/LoadingPage";
import NotFoundPage from "../pages/NotFoundPage.tsx";
import { LoginPage } from "../pages/LoginPage.tsx";
import { RegisterPage } from "../pages/RegisterPage.tsx";
import { ProtectedRoute } from "../components/route/ProtectedRoute";
import { PublicRoute } from "../components/route/PublicRoute";

// Ленивая загрузка страниц
const HomePage = lazy(() => import('../pages/HomePage'));

const AppRoutes: React.FC = () => {
    return (
        <BrowserRouter>
            <Suspense fallback={<LoadingPage />}>
                <Routes>
                    {/* Protected Routes */}
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Layout>
                                <HomePage />
                            </Layout>
                        </ProtectedRoute>
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