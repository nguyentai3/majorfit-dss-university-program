import { api } from '@frontend/api/api';

export async function fetchHomepageData() {
    const response = await api.get('/homepage');
    return response.data;
}
