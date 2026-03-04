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
const HomePage = lazy(() => import("../pages/HomePage"));
const SuppliersPage = lazy(() => import("../pages/SuppliersPage"));
const AnalyticsPage = lazy(() => import("../pages/AnalyticsPage"));
const SupplierFormPage = lazy(() => import("../pages/SupplierFormPage"));
const AnalysisDetailsPage = lazy(() => import("../pages/AnalysisDetailsPage"));
const SupplierInternetSearchPage = lazy(() => import("../pages/SupplierInternetSearchPage"));
const StocksPage = lazy(() => import("../pages/StocksPage"));

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
          {/* Protected Routes */}
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

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <AnalyticsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <AnalysisDetailsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/supplier-search"
            element={
              <ProtectedRoute>
                <Layout>
                  <SupplierInternetSearchPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/stocks"
            element={
              <ProtectedRoute>
                <Layout>
                  <StocksPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Supplier Form - public page (link from WhatsApp) */}
          <Route path="/supplier-form/:orderId/:supplierId" element={<SupplierFormPage />} />

          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* Catch-all route */}
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

