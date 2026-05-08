import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { RouteLoading } from '@frontend/components/RouteLoading';
import { NotFoundPage } from '@frontend/app/pages/NotFoundPage';
import { AdminUiProvider } from '@frontend/providers/AdminUiProvider';
import { AppProviders } from '@frontend/providers/AppProviders';
import { publicRoutes } from '@frontend/routes/publicRoutes';
import { APP_ROUTES } from '@frontend/constants/routes';
import { AdminProtectedLayout, AdminPublicOnly } from '@frontend/routes/guards';

const AdminSignInPage = lazy(() => import('@frontend/features/admin/pages/AdminSignInPage').then((m) => ({ default: m.AdminSignInPage })));
const AdminLayout = lazy(() => import('@frontend/features/admin/components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const DashboardPage = lazy(() => import('@frontend/features/admin/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProgramsPage = lazy(() => import('@frontend/features/admin/pages/ProgramsPage').then((m) => ({ default: m.ProgramsPage })));
const ProgramWorkspacePage = lazy(() => import('@frontend/features/admin/pages/ProgramWorkspacePage').then((m) => ({ default: m.ProgramWorkspacePage })));
const UsersPage = lazy(() => import('@frontend/features/admin/pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const UniversitiesPage = lazy(() => import('@frontend/features/admin/pages/UniversitiesPage').then((m) => ({ default: m.UniversitiesPage })));
const QuestionsPage = lazy(() => import('@frontend/features/admin/pages/QuestionsPage').then((m) => ({ default: m.QuestionsPage })));
const EvaluationPage = lazy(() => import('@frontend/features/admin/pages/EvaluationPage').then((m) => ({ default: m.EvaluationPage })));

function withRouteSuspense(element) {
    return (
        <Suspense fallback={<RouteLoading />}>
            {element}
        </Suspense>
    );
}

function AppLayout() {
    return (
        <AppProviders>
            <Outlet />
        </AppProviders>
    );
}

export const router = createBrowserRouter([
    {
        element: <AppLayout />,
        children: [
            ...publicRoutes,
            {
                path: APP_ROUTES.ADMIN_SIGN_IN,
                element: (
                    <AdminUiProvider>
                        <AdminPublicOnly>{withRouteSuspense(<AdminSignInPage />)}</AdminPublicOnly>
                    </AdminUiProvider>
                ),
            },
            {
                path: APP_ROUTES.ADMIN,
                element: (
                    <AdminUiProvider>
                        <AdminProtectedLayout />
                    </AdminUiProvider>
                ),
                children: [
                    { index: true, element: <Navigate to="dashboard" replace /> },
                    {
                        element: withRouteSuspense(<AdminLayout />),
                        children: [
                            { path: 'dashboard', element: withRouteSuspense(<DashboardPage />) },
                            { path: 'programs', element: withRouteSuspense(<ProgramsPage />) },
                            { path: 'programs/:programId/analyze', element: withRouteSuspense(<ProgramWorkspacePage />) },
                            { path: 'users', element: withRouteSuspense(<UsersPage />) },
                            { path: 'universities', element: withRouteSuspense(<UniversitiesPage />) },
                            { path: 'questions', element: withRouteSuspense(<QuestionsPage />) },
                            { path: 'evaluation', element: withRouteSuspense(<EvaluationPage />) },
                        ],
                    },
                ],
            },
            { path: '*', element: <NotFoundPage /> },
        ],
    },
]);
