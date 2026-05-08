import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Form, message } from 'antd';
import { getApiErrorMessage } from '@frontend/api/api';
import { queryClient } from '@frontend/api/queryClient';
import { QUERY_KEYS } from '@frontend/constants/queryKeys';
import {
    cloneAdminQuestionBank,
    createAdminQuestion,
    createAdminQuestionBank,
    deleteAdminQuestion,
    deleteAdminQuestionBank,
    fetchAdminQuestionBanks,
    fetchAdminQuestions,
    publishAdminQuestionBank,
    setDefaultAdminQuestionBank,
    updateAdminQuestion,
    updateAdminQuestionBank,
} from '@frontend/api/services';
import { useAuth } from '@frontend/contexts/AuthContext';
import { isAdminUser } from '@frontend/utils/admin';
import { createQuestionColumns } from '@frontend/features/admin/config/tableColumns';
import { SectionShell } from '@frontend/features/admin/components/layout/SectionShell';
import { QuestionsSection } from '@frontend/features/admin/sections/QuestionsSection';
import { QuestionBankModal } from '@frontend/features/admin/components/modals/QuestionBankModal';
import { QuestionModal } from '@frontend/features/admin/components/modals/QuestionModal';

export function QuestionsPage() {
    const { adminUser } = useAuth();
    const admin = isAdminUser(adminUser);

    const [questionSearch, setQuestionSearch] = useState('');
    const [selectedBankVersion, setSelectedBankVersion] = useState(null);
    const [bankModal, setBankModal] = useState({ open: false, mode: 'create', record: null });
    const [questionModal, setQuestionModal] = useState({ open: false, mode: 'create', record: null });
    const [bankForm] = Form.useForm();
    const [questionForm] = Form.useForm();

    const questionBanksQuery = useQuery({
        queryKey: QUERY_KEYS.ADMIN_QUESTION_BANKS,
        queryFn: fetchAdminQuestionBanks,
        enabled: admin,
    });

    const questionBanks = questionBanksQuery.data?.items ?? [];
    const defaultBank = questionBanks.find((bank) => bank.isDefault);
    const activeBankVersion = selectedBankVersion ?? defaultBank?.version ?? questionBanks[0]?.version ?? 2;

    const questionsQuery = useQuery({
        queryKey: [...QUERY_KEYS.ADMIN_QUESTIONS, activeBankVersion, questionSearch],
        queryFn: () => fetchAdminQuestions({ q: questionSearch, limit: 200, version: activeBankVersion }),
        enabled: admin,
    });

    const invalidateAdmin = () => queryClient.invalidateQueries({ queryKey: ['admin'] });

    const saveBankMutation = useMutation({
        mutationFn: ({ bankId, payload }) =>
            bankId ? updateAdminQuestionBank(bankId, payload) : createAdminQuestionBank(payload),
        onSuccess: async () => {
            message.success('Question bank saved');
            setBankModal({ open: false, mode: 'create', record: null });
            bankForm.resetFields();
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'Question bank save failed')),
    });

    const cloneBankMutation = useMutation({
        mutationFn: ({ bankId, payload }) => cloneAdminQuestionBank(bankId, payload),
        onSuccess: async (data) => {
            message.success('Question bank cloned');
            setSelectedBankVersion(data.item?.version ?? null);
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'Clone failed')),
    });

    const publishBankMutation = useMutation({
        mutationFn: publishAdminQuestionBank,
        onSuccess: async () => {
            message.success('Question bank published');
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'Publish failed')),
    });

    const setDefaultBankMutation = useMutation({
        mutationFn: setDefaultAdminQuestionBank,
        onSuccess: async (data) => {
            message.success('Default question bank updated');
            setSelectedBankVersion(data.bank?.version ?? null);
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'Set default failed')),
    });

    const deleteBankMutation = useMutation({
        mutationFn: deleteAdminQuestionBank,
        onSuccess: async () => {
            message.success('Question bank deleted');
            setSelectedBankVersion(null);
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'Delete bank failed')),
    });

    const saveQuestionMutation = useMutation({
        mutationFn: ({ questionId, payload }) =>
            questionId ? updateAdminQuestion(questionId, payload) : createAdminQuestion(payload),
        onSuccess: async () => {
            message.success('Question saved');
            setQuestionModal({ open: false, mode: 'create', record: null });
            questionForm.resetFields();
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'Question save failed')),
    });

    const deleteQuestionMutation = useMutation({
        mutationFn: deleteAdminQuestion,
        onSuccess: async () => {
            message.success('Question deleted');
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'Delete failed')),
    });

    const questionColumns = createQuestionColumns({
        setQuestionModal,
        questionForm,
        deleteQuestionMutation,
    });

    return (
        <SectionShell>
            <QuestionsSection
                error={questionsQuery.error}
                loading={questionsQuery.isLoading}
                questions={questionsQuery.data?.items ?? []}
                questionColumns={questionColumns}
                setQuestionSearch={setQuestionSearch}
                setQuestionModal={setQuestionModal}
                questionForm={questionForm}
                questionBanks={questionBanks}
                questionBanksLoading={questionBanksQuery.isLoading}
                selectedBankVersion={activeBankVersion}
                setSelectedBankVersion={setSelectedBankVersion}
                setBankModal={setBankModal}
                cloneBankMutation={cloneBankMutation}
                publishBankMutation={publishBankMutation}
                setDefaultBankMutation={setDefaultBankMutation}
                deleteBankMutation={deleteBankMutation}
            />
            <QuestionBankModal
                bankModal={bankModal}
                setBankModal={setBankModal}
                bankForm={bankForm}
                saveBankMutation={saveBankMutation}
            />
            <QuestionModal
                questionModal={questionModal}
                setQuestionModal={setQuestionModal}
                questionForm={questionForm}
                saveQuestionMutation={saveQuestionMutation}
                questionBanks={questionBanks}
            />
        </SectionShell>
    );
}
