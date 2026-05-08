import { Typography } from 'antd';
import { useLocation } from 'react-router-dom';
import { ADMIN_SECTION_META } from '@frontend/features/admin/config/navigation';

export function SectionShell({ children }) {
    const { pathname } = useLocation();
    const section = pathname.split('/').pop() || 'dashboard';
    const meta = ADMIN_SECTION_META[section] || ADMIN_SECTION_META.dashboard;

    return (
        <div className="bg-white border border-slate-200 rounded-md shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200">
                <Typography.Title level={4} style={{ margin: 0 }}>
                    {meta.title}
                </Typography.Title>
                <Typography.Text type="secondary">{meta.description}</Typography.Text>
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}
