import { Navigate, Outlet } from 'react-router-dom';
import { APP_ROUTES } from '@frontend/constants/routes';
import { RouteLoading } from '@frontend/components/RouteLoading';
import { useAuth } from '@frontend/contexts/AuthContext';
import { isAdminUser } from '@frontend/utils/admin';

export function FullPageLoading() {
    return <RouteLoading />;
}

export function AdminProtectedLayout() {
    const { adminUser, loading } = useAuth();

    if (loading) {
        return <FullPageLoading />;
    }

    if (!adminUser || !isAdminUser(adminUser)) {
        return <Navigate to={APP_ROUTES.ADMIN_SIGN_IN} replace />;
    }

    return <Outlet />;
}

export function AdminPublicOnly({ children }) {
    const { adminUser, loading } = useAuth();

    if (loading) {
        return <FullPageLoading />;
    }

    if (adminUser) {
        return <Navigate to={APP_ROUTES.ADMIN} replace />;
    }

    return children;
}
