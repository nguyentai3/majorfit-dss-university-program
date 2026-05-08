import { api } from '@frontend/api/api';

function buildQuery(params = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || String(value).trim() === '') {
            return;
        }
        searchParams.set(key, String(value));
    });

    return searchParams.toString();
}

export async function fetchLatestMatchingRun(params = {}) {
    const query = buildQuery(params);
    const response = await api.get(`/matching/latest${query ? `?${query}` : ''}`);
    return response.data?.item ?? null;
}

export async function runMatching(payload = {}) {
    const response = await api.post('/matching/run', payload);
    return response.data?.item ?? null;
}

export async function runWhatIfMatching(payload = {}) {
    const response = await api.post('/matching/what-if', payload);
    return response.data?.item ?? null;
}

export async function fetchMatchingHistory(params = {}) {
    const query = buildQuery(params);
    const response = await api.get(`/matching/history${query ? `?${query}` : ''}`);
    return response.data ?? { items: [], total: 0, limit: 0, offset: 0, hasMore: false };
}

export async function fetchMatchingRunDetail(runId, params = {}) {
    const query = buildQuery(params);
    const response = await api.get(`/matching/runs/${runId}${query ? `?${query}` : ''}`);
    return response.data?.item ?? null;
}

export async function submitMatchFeedback(payload = {}) {
    const response = await api.post('/matching/feedback', payload);
    return response.data ?? null;
}
