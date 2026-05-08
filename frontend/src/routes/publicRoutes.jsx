import React, { Suspense, lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { RouteLoading } from '@frontend/components/RouteLoading';
import { PublicLayout } from '@frontend/layouts/PublicLayout';

function lazyScreen(loader) {
    const Screen = lazy(loader);

    return (
        <Suspense
            fallback={<RouteLoading />}
        >
            <Screen />
        </Suspense>
    );
}

const publicPageRoutes = [
    ['assessment', () => import('@frontend/features/web/pages/assessment/index')],
    ['assessment/history', () => import('@frontend/features/web/pages/assessment/history/index')],
    ['auth/signin', () => import('@frontend/features/web/pages/auth/signin/index')],
    ['auth/signup', () => import('@frontend/features/web/pages/auth/signup/index')],
    ['dashboard', () => import('@frontend/features/web/pages/dashboard/index')],
    ['matching', () => import('@frontend/features/web/pages/matching/index')],
    ['matching/history', () => import('@frontend/features/web/pages/matching/history/index')],
    ['programs', () => import('@frontend/features/web/pages/programs/index')],
    ['programs/:programId', () => import('@frontend/features/web/pages/programs/detail/index')],
    ['profile', () => import('@frontend/features/web/pages/profile/index')],
    ['saved-programs', () => import('@frontend/features/web/pages/saved-programs/index')],
];

export const publicRoutes = [
    {
        path: '/',
        element: <PublicLayout />,
        children: [
            { index: true, element: lazyScreen(() => import('@frontend/features/home/pages/HomePage')) },
            ...publicPageRoutes.map(([path, loader]) => ({
                path,
                element: lazyScreen(loader),
            })),
            { path: 'saved-colleges', element: <Navigate to="/saved-programs" replace /> },
            { path: 'signin', element: <Navigate to="/auth/signin" replace /> },
            { path: 'signup', element: <Navigate to="/auth/signup" replace /> },
        ],
    },
];
