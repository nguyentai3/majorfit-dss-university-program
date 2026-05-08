import { api } from '@frontend/api/api';

export async function fetchPrograms(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            searchParams.set(key, String(value));
        }
    });

    const response = await api.get(`/programs?${searchParams.toString()}`);
    return response.data;
}

export async function fetchProgramDetail(identifier) {
    const response = await api.get(`/programs/${identifier}`);
    return response.data?.item ?? null;
}
