import { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoadingPage from '../../pages/LoadingPage';

interface ProtectedRouteProps {
    children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <LoadingPage />;
    }

    if (!isAuthenticated) {
        const authLoginUrl = (import.meta as any).env?.VITE_AUTH_LOGIN_URL || '/'
        window.location.href = authLoginUrl
        return null
    }

    return <>{children}</>;
};