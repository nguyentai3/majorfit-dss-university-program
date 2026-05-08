import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Form, message } from 'antd';
import { getApiErrorMessage } from '@frontend/api/api';
import { queryClient } from '@frontend/api/queryClient';
import { QUERY_KEYS } from '@frontend/constants/queryKeys';
import {
    fetchAdminUsers,
    downloadAdminAssessmentExport,
    fetchAdminAssessmentStudentReport,
} from '@frontend/api/services';
import { useAuth } from '@frontend/contexts/AuthContext';
import { isAdminUser } from '@frontend/utils/admin';
import { createUserColumns } from '@frontend/features/admin/config/tableColumns';
import { createEmptyStudentReportModal } from '@frontend/features/admin/utils/modalState';
import { SectionShell } from '@frontend/features/admin/components/layout/SectionShell';
import { UsersSection } from '@frontend/features/admin/sections/UsersSection';
import { StudentReportModal } from '@frontend/features/admin/components/modals/StudentReportModal';

export function UsersPage() {
    const { adminUser } = useAuth();
    const admin = isAdminUser(adminUser);

    const [userSearch, setUserSearch] = useState('');
    const [studentReportModal, setStudentReportModal] = useState(createEmptyStudentReportModal);

    const usersQuery = useQuery({
        queryKey: [...QUERY_KEYS.ADMIN_USERS, userSearch],
        queryFn: () => fetchAdminUsers({ q: userSearch, limit: 200 }),
        enabled: admin,
    });

    const openStudentReport = async (userId) => {
        try {
            setStudentReportModal({ open: true, loading: true, report: null });
            const report = await fetchAdminAssessmentStudentReport(userId);
            setStudentReportModal({ open: true, loading: false, report });
        } catch (error) {
            message.error(getApiErrorMessage(error, 'Could not load student assessment report'));
            setStudentReportModal(createEmptyStudentReportModal());
        }
    };

    const exportAssessmentCsv = async () => {
        try {
            const blob = await downloadAdminAssessmentExport();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `assessment-export-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(url);
            message.success('Assessment CSV exported');
        } catch (error) {
            message.error(getApiErrorMessage(error, 'Assessment export failed'));
        }
    };

    const userColumns = createUserColumns({ openStudentReport });

    return (
        <SectionShell>
            <UsersSection
                error={usersQuery.error}
                loading={usersQuery.isLoading}
                users={usersQuery.data?.users ?? []}
                userColumns={userColumns}
                setUserSearch={setUserSearch}
                exportAssessmentCsv={exportAssessmentCsv}
            />
            <StudentReportModal
                studentReportModal={studentReportModal}
                setStudentReportModal={setStudentReportModal}
            />
        </SectionShell>
    );
}
