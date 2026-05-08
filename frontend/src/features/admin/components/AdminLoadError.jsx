import { Alert } from 'antd';
import { getApiErrorMessage } from '@frontend/api/api';

export function AdminLoadError({ error }) {
    if (!error) return null;

    return (
        <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="Failed to load data"
            description={getApiErrorMessage(error)}
        />
    );
}
