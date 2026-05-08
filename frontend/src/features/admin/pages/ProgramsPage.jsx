import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Form, message } from 'antd';
import { getApiErrorMessage } from '@frontend/api/api';
import { queryClient } from '@frontend/api/queryClient';
import { QUERY_KEYS } from '@frontend/constants/queryKeys';
import {
    fetchAdminPrograms,
    fetchAdminUniversities,
    fetchAdminProgramDetail,
    createAdminProgram,
    updateAdminProgram,
    deleteAdminProgram,
} from '@frontend/api/services';
import { useAuth } from '@frontend/contexts/AuthContext';
import { isAdminUser } from '@frontend/utils/admin';
import { createProgramColumns } from '@frontend/features/admin/config/tableColumns';
import { SectionShell } from '@frontend/features/admin/components/layout/SectionShell';
import { ProgramsSection } from '@frontend/features/admin/sections/ProgramsSection';
import { ProgramModal } from '@frontend/features/admin/components/modals/ProgramModal';
import { QuickAddProgramModal } from '@frontend/features/admin/components/modals/QuickAddProgramModal';
import { BulkImportModal } from '@frontend/features/admin/components/modals/BulkImportModal';
import { useRouter, useSearchParams } from '@frontend/routes/navigation';

export function ProgramsPage() {
    const { adminUser } = useAuth();
    const admin = isAdminUser(adminUser);

    const [programSearch, setProgramSearch] = useState('');
    const [programUniversityFilter, setProgramUniversityFilter] = useState('');
    const [programFocusAreaFilter, setProgramFocusAreaFilter] = useState('');
    const [programForm] = Form.useForm();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [programStatusFilter, setProgramStatusFilter] = useState(searchParams.get('statusFilter') || '');

    useEffect(() => {
        const filter = searchParams.get('statusFilter');
        if (filter !== null) {
            setProgramStatusFilter(filter);
        }
    }, [searchParams]);

    const [programModal, setProgramModal] = useState({ open: false, mode: 'create', record: null });
    const [wizardOpen, setWizardOpen] = useState(false);
    const [bulkImportOpen, setBulkImportOpen] = useState(false);

    const universitiesQuery = useQuery({
        queryKey: [...QUERY_KEYS.ADMIN_UNIVERSITIES, ''],
        queryFn: () => fetchAdminUniversities({ limit: 200 }),
        enabled: admin,
    });

    const programsQuery = useQuery({
        queryKey: [...QUERY_KEYS.ADMIN_PROGRAMS, programSearch, programUniversityFilter, programFocusAreaFilter, programStatusFilter],
        queryFn: () =>
            fetchAdminPrograms({
                q: programSearch,
                universityId: programUniversityFilter,
                focusArea: programFocusAreaFilter,
                statusFilter: programStatusFilter,
                limit: 200,
            }),
        enabled: admin,
    });

    const universities = universitiesQuery.data?.items ?? [];
    const programs = programsQuery.data?.items ?? [];

    const invalidateAdmin = () => queryClient.invalidateQueries({ queryKey: ['admin'] });

    const saveProgramMutation = useMutation({
        mutationFn: ({ programId, payload }) =>
            programId ? updateAdminProgram(programId, payload) : createAdminProgram(payload),
        onSuccess: async () => {
            message.success('Program saved');
            setProgramModal({ open: false, mode: 'create', record: null });
            programForm.resetFields();
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'Program save failed')),
    });

    const deleteProgramMutation = useMutation({
        mutationFn: deleteAdminProgram,
        onSuccess: async () => {
            message.success('Program deleted');
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'Delete failed')),
    });

    const openProgramWorkspace = (programId) => {
        router.push(`/admin/programs/${programId}/analyze`);
    };

    const programColumns = createProgramColumns({
        openProgramWorkspace,
        setProgramModal,
        programForm,
        deleteProgramMutation,
    });

    return (
        <SectionShell>
            <ProgramsSection
                error={programsQuery.error}
                loading={programsQuery.isLoading}
                programs={programs}
                programColumns={programColumns}
                universities={universities}
                setProgramSearch={setProgramSearch}
                setProgramUniversityFilter={setProgramUniversityFilter}
                setProgramFocusAreaFilter={setProgramFocusAreaFilter}
                setProgramStatusFilter={setProgramStatusFilter}
                programUniversityFilter={programUniversityFilter}
                programFocusAreaFilter={programFocusAreaFilter}
                programStatusFilter={programStatusFilter}
                setProgramModal={setProgramModal}
                programForm={programForm}
                setWizardOpen={setWizardOpen}
                setBulkImportOpen={setBulkImportOpen}
            />

            <ProgramModal
                programModal={programModal}
                setProgramModal={setProgramModal}
                programForm={programForm}
                saveProgramMutation={saveProgramMutation}
                universities={universities}
            />

            <QuickAddProgramModal
                open={wizardOpen}
                onClose={() => setWizardOpen(false)}
                universities={universities}
                onSuccess={async () => {
                    await invalidateAdmin();
                }}
            />

            <BulkImportModal
                open={bulkImportOpen}
                onClose={() => setBulkImportOpen(false)}
                onSuccess={async () => { await invalidateAdmin(); }}
            />
        </SectionShell>
    );
}
