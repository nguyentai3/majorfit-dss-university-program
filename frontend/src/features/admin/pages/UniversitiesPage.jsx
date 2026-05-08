import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Form, message } from 'antd';
import { getApiErrorMessage } from '@frontend/api/api';
import { queryClient } from '@frontend/api/queryClient';
import { QUERY_KEYS } from '@frontend/constants/queryKeys';
import {
    fetchAdminUniversities,
    createAdminUniversity,
    updateAdminUniversity,
    deleteAdminUniversity,
} from '@frontend/api/services';
import { useAuth } from '@frontend/contexts/AuthContext';
import { isAdminUser } from '@frontend/utils/admin';
import { createUniversityColumns } from '@frontend/features/admin/config/tableColumns';
import { SectionShell } from '@frontend/features/admin/components/layout/SectionShell';
import { UniversitiesSection } from '@frontend/features/admin/sections/UniversitiesSection';
import { UniversityModal } from '@frontend/features/admin/components/modals/UniversityModal';

export function UniversitiesPage() {
    const { adminUser } = useAuth();
    const admin = isAdminUser(adminUser);

    const [universitySearch, setUniversitySearch] = useState('');
    const [universityModal, setUniversityModal] = useState({ open: false, mode: 'create', record: null });
    const [universityForm] = Form.useForm();

    const universitiesQuery = useQuery({
        queryKey: [...QUERY_KEYS.ADMIN_UNIVERSITIES, universitySearch],
        queryFn: () => fetchAdminUniversities({ q: universitySearch, limit: 200 }),
        enabled: admin,
    });

    const invalidateAdmin = () => queryClient.invalidateQueries({ queryKey: ['admin'] });

    const saveUniversityMutation = useMutation({
        mutationFn: ({ universityId, payload }) =>
            universityId ? updateAdminUniversity(universityId, payload) : createAdminUniversity(payload),
        onSuccess: async () => {
            message.success('University saved');
            setUniversityModal({ open: false, mode: 'create', record: null });
            universityForm.resetFields();
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'University save failed')),
    });

    const deleteUniversityMutation = useMutation({
        mutationFn: deleteAdminUniversity,
        onSuccess: async () => {
            message.success('University deleted');
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'Delete failed')),
    });

    const universityColumns = createUniversityColumns({
        setUniversityModal,
        universityForm,
        deleteUniversityMutation,
    });

    return (
        <SectionShell>
            <UniversitiesSection
                error={universitiesQuery.error}
                loading={universitiesQuery.isLoading}
                universities={universitiesQuery.data?.items ?? []}
                universityColumns={universityColumns}
                setUniversitySearch={setUniversitySearch}
                setUniversityModal={setUniversityModal}
                universityForm={universityForm}
            />
            <UniversityModal
                universityModal={universityModal}
                setUniversityModal={setUniversityModal}
                universityForm={universityForm}
                saveUniversityMutation={saveUniversityMutation}
            />
        </SectionShell>
    );
}
