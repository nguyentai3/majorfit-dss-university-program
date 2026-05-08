import { useMemo } from 'react';
import {
    useLocation,
    useNavigate,
    useParams as useRouteParams,
    useSearchParams as useRouteSearchParams,
} from 'react-router-dom';

export function useRouter() {
    const navigate = useNavigate();

    return useMemo(() => ({
        push: (href) => navigate(href),
        replace: (href) => navigate(href, { replace: true }),
        back: () => navigate(-1),
        refresh: () => window.location.reload(),
        prefetch: async () => undefined,
    }), [navigate]);
}

export function usePathname() {
    return useLocation().pathname;
}

export function useSearchParams() {
    const [searchParams] = useRouteSearchParams();
    return searchParams;
}

export function useParams() {
    return useRouteParams();
}
