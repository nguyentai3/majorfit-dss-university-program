import { api } from '@frontend/api/api';

function buildListQuery(params = {}) {
    const searchParams = new URLSearchParams();
    const {
        q = '',
        limit = 100,
        offset = 0,
        universityId,
        focusArea,
        statusFilter,
        version,
    } = params;

    searchParams.set('limit', String(limit));
    searchParams.set('offset', String(offset));

    if (typeof q === 'string' && q.trim()) searchParams.set('q', q.trim());
    if (typeof universityId === 'string' && universityId.trim()) searchParams.set('universityId', universityId.trim());
    if (typeof focusArea === 'string' && focusArea.trim()) searchParams.set('focusArea', focusArea.trim());
    if (typeof statusFilter === 'string' && statusFilter.trim()) searchParams.set('statusFilter', statusFilter.trim());
    if (version !== undefined && version !== null && String(version).trim()) searchParams.set('version', String(version));

    return searchParams.toString();
}

export async function fetchAdminStats() {
    const response = await api.get('/admin/stats');
    return response.data;
}

export async function fetchAdminUsers({ q = '', limit = 100, offset = 0 } = {}) {
    const query = buildListQuery({ q, limit, offset });
    const response = await api.get(`/admin/users?${query}`);
    return response.data;
}

export async function fetchAdminUniversities({ q = '', limit = 100, offset = 0 } = {}) {
    const query = buildListQuery({ q, limit, offset });
    const response = await api.get(`/admin/universities?${query}`);
    return response.data;
}

export async function createAdminUniversity(payload) {
    const response = await api.post('/admin/universities', payload);
    return response.data;
}

export async function updateAdminUniversity(universityId, payload) {
    const response = await api.patch(`/admin/universities/${universityId}`, payload);
    return response.data;
}

export async function deleteAdminUniversity(universityId) {
    const response = await api.delete(`/admin/universities/${universityId}`);
    return response.data;
}

export async function fetchAdminPrograms({ q = '', limit = 100, offset = 0, universityId = '', focusArea = '', statusFilter = '' } = {}) {
    const query = buildListQuery({ q, limit, offset, universityId, focusArea, statusFilter });
    const response = await api.get(`/admin/programs?${query}`);
    return response.data;
}

export async function fetchAdminProgramDetail(programId) {
    const response = await api.get(`/admin/programs/${programId}/detail`);
    return response.data?.item ?? null;
}

export async function createAdminProgram(payload) {
    const response = await api.post('/admin/programs', payload);
    return response.data;
}

export async function updateAdminProgram(programId, payload) {
    const response = await api.patch(`/admin/programs/${programId}`, payload);
    return response.data;
}

export async function deleteAdminProgram(programId) {
    const response = await api.delete(`/admin/programs/${programId}`);
    return response.data;
}

export async function clearAdminProgramFailedAnalysisRuns(programId) {
    const response = await api.delete(`/admin/programs/${programId}/analysis-runs/failed`);
    return response.data;
}

export async function deleteAdminProgramAnalysisRun(programId, runId) {
    const response = await api.delete(`/admin/programs/${programId}/analysis-runs/${runId}`);
    return response.data;
}

export async function createAdminProgramCurriculum(programId, payload) {
    const response = await api.post(`/admin/programs/${programId}/curriculum`, payload);
    return response.data;
}

export async function runAiCurriculumAnalysis(programId, mode = 'suggest', provider = null, model = null) {
    const payload = { mode };
    if (provider) payload.provider = provider;
    if (model) payload.model = model;
    const response = await api.post(`/admin/programs/${programId}/ai-analyze`, payload, { timeout: 120000 });
    return response.data;
}

export async function extractAdminProgramCurriculumPdf(programId, file) {
    const formData = new FormData();
    formData.append('document', file);
    const response = await api.post(`/admin/programs/${programId}/curriculum/extract-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
}

export async function bulkImportPrograms(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/admin/programs/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
}

export function getBulkImportTemplateUrl() {
    return `${api.defaults.baseURL}/admin/programs/bulk-import/template`;
}

export async function updateAdminProgramProfile(profileId, payload) {
    const response = await api.patch(`/admin/program-profiles/${profileId}`, payload);
    return response.data;
}

export async function fetchAdminQuestionBanks() {
    const response = await api.get('/admin/question-banks');
    return response.data;
}

export async function createAdminQuestionBank(payload) {
    const response = await api.post('/admin/question-banks', payload);
    return response.data;
}

export async function updateAdminQuestionBank(bankId, payload) {
    const response = await api.patch(`/admin/question-banks/${bankId}`, payload);
    return response.data;
}

export async function cloneAdminQuestionBank(bankId, payload = {}) {
    const response = await api.post(`/admin/question-banks/${bankId}/clone`, payload);
    return response.data;
}

export async function publishAdminQuestionBank(bankId) {
    const response = await api.post(`/admin/question-banks/${bankId}/publish`);
    return response.data;
}

export async function setDefaultAdminQuestionBank(bankId) {
    const response = await api.post(`/admin/question-banks/${bankId}/set-default`);
    return response.data;
}

export async function deleteAdminQuestionBank(bankId) {
    const response = await api.delete(`/admin/question-banks/${bankId}`);
    return response.data;
}

export async function fetchAdminQuestions({ q = '', limit = 100, offset = 0, version = null } = {}) {
    const query = buildListQuery({ q, limit, offset, version });
    const response = await api.get(`/admin/questions?${query}`);
    return response.data;
}

export async function createAdminQuestion(payload) {
    const response = await api.post('/admin/questions', payload);
    return response.data;
}

export async function updateAdminQuestion(questionId, payload) {
    const response = await api.patch(`/admin/questions/${questionId}`, payload);
    return response.data;
}

export async function deleteAdminQuestion(questionId) {
    const response = await api.delete(`/admin/questions/${questionId}`);
    return response.data;
}

export async function fetchAdminAssessmentStudentReport(userId) {
    const response = await api.get(`/admin/assessment/students/${userId}`);
    return response.data?.report ?? null;
}

export async function downloadAdminAssessmentExport(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            searchParams.set(key, String(value));
        }
    });

    const response = await api.get(`/admin/assessment/export?${searchParams.toString()}`, {
        responseType: 'blob',
    });
    return response.data;
}

export async function fetchAdminEvaluationComparison() {
    const response = await api.get('/admin/evaluation/comparison');
    return response.data?.evaluation ?? null;
}

export async function fetchAdminFeedbackStats() {
    const response = await api.get('/admin/feedback/stats');
    return response.data?.stats ?? null;
}

export async function fetchAdminProgramExpertReviews(programId) {
    const response = await api.get(`/admin/programs/${programId}/expert-reviews`);
    return response.data;
}

export async function fetchOnetLinks(programId) {
    const response = await api.get(`/admin/programs/${programId}/onet-links`);
    return response.data;
}

export async function addOnetLink(programId, payload) {
    const response = await api.post(`/admin/programs/${programId}/onet-links`, payload);
    return response.data;
}

export async function updateOnetLink(programId, linkId, payload) {
    const response = await api.patch(`/admin/programs/${programId}/onet-links/${linkId}`, payload);
    return response.data;
}

export async function deleteOnetLink(programId, linkId) {
    const response = await api.delete(`/admin/programs/${programId}/onet-links/${linkId}`);
    return response.data;
}

export async function suggestOnetOccupations(programId, q) {
    const response = await api.get(`/admin/programs/${programId}/onet-suggest`, { params: { q } });
    return response.data;
}

export async function runAiEstimateRiasec(programId, { runConsistency = false, provider = null, model = null } = {}) {
    const payload = { runConsistency };
    if (provider) payload.provider = provider;
    if (model) payload.model = model;
    const response = await api.post(
        `/admin/programs/${programId}/ai-estimate-riasec`,
        payload,
        { timeout: 120000 },
    );
    return response.data;
}

export async function acceptEstimateAsProfile(programId, payload) {
    const response = await api.post(`/admin/programs/${programId}/accept-estimate`, payload);
    return response.data;
}
