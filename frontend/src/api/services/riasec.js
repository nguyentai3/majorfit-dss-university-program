import { api } from '@frontend/api/api';

export async function fetchRiasecQuestions({ version = null, mode = null } = {}) {
    const params = {};
    if (mode) params.mode = mode;
    else if (version) params.version = version;
    const response = await api.get('/riasec/questions', { params });
    return response.data;
}

export async function submitRiasecAssessment(payload) {
    const response = await api.post('/riasec/submit', payload);
    return response.data;
}

export async function fetchRiasecProfile() {
    const response = await api.get('/riasec/profile');
    return response.data?.profile ?? null;
}

export async function fetchRiasecHistory() {
    const response = await api.get('/riasec/history');
    return response.data;
}

export async function fetchGrowthInterpretation(locale = 'en') {
    const response = await api.get('/riasec/growth-interpretation', { params: { locale } });
    return response.data;
}

export async function fetchCareerSuggestions(limit = 12) {
    const response = await api.get('/riasec/career-suggestions', { params: { limit } });
    return response.data?.careers ?? [];
}
