import { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoadingPage from '../../pages/LoadingPage';
import { resolveAuthLoginUrl } from '../../utils/authRedirect';

interface ProtectedRouteProps {
    children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <LoadingPage />;
    }

    if (!isAuthenticated) {
        const authLoginUrl = resolveAuthLoginUrl();
        window.location.href = authLoginUrl
        return null
    }

    return <>{children}</>;
};