import axios from 'axios';
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    withCredentials: true,
});
export function getApiErrorMessage(error, fallback = 'Request failed') {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        return data?.message || data?.error || error.message || fallback;
    }
    if (error instanceof Error)
        return error.message;
    return fallback;
}
