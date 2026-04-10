import React, { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "../components/layout/Layout";
import LoadingPage from "../pages/LoadingPage";
import NotFoundPage from "../pages/NotFoundPage.tsx";
import { ProtectedRoute } from "../components/route/ProtectedRoute";
import { Navigate } from "react-router-dom";

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
  // Get base path from environment (for docker deployment under /procurepro/)
  const basename = import.meta.env.VITE_BASE_PATH?.replace(/\/$/, '') || '';
  
  return (
    <BrowserRouter basename={basename}>
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
          {/* Auth routes are disabled: centralized login via AuthService */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />

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

