import { api } from '@frontend/api/api';

export async function fetchSavedPrograms() {
    const response = await api.get('/saved-programs');
    return response.data?.items ?? [];
}

export async function createSavedProgram(payload) {
    const response = await api.post('/saved-programs', payload);
    return response.data?.item ?? null;
}

export async function deleteSavedProgram({ programId, savedId } = {}) {
    const searchParams = new URLSearchParams();
    if (programId) {
        searchParams.set('programId', programId);
    }
    if (savedId) {
        searchParams.set('savedId', savedId);
    }

    const response = await api.delete(`/saved-programs?${searchParams.toString()}`);
    return response.data;
}
