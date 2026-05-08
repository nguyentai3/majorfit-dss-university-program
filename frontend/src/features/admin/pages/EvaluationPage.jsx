import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@frontend/constants/queryKeys';
import { fetchAdminEvaluationComparison, fetchAdminFeedbackStats } from '@frontend/api/services';
import { useAuth } from '@frontend/contexts/AuthContext';
import { isAdminUser } from '@frontend/utils/admin';
import { SectionShell } from '@frontend/features/admin/components/layout/SectionShell';
import { EvaluationSection } from '@frontend/features/admin/sections/EvaluationSection';

export function EvaluationPage() {
    const { adminUser } = useAuth();
    const admin = isAdminUser(adminUser);

    const evaluationQuery = useQuery({
        queryKey: QUERY_KEYS.ADMIN_EVALUATION,
        queryFn: fetchAdminEvaluationComparison,
        enabled: admin,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });

    const feedbackStatsQuery = useQuery({
        queryKey: QUERY_KEYS.ADMIN_FEEDBACK_STATS,
        queryFn: fetchAdminFeedbackStats,
        enabled: admin,
        staleTime: 2 * 60 * 1000,
    });

    return (
        <SectionShell>
            <EvaluationSection
                error={evaluationQuery.error || feedbackStatsQuery.error}
                evaluationData={evaluationQuery.data}
                feedbackStats={feedbackStatsQuery.data}
                loading={evaluationQuery.isLoading}
                feedbackLoading={feedbackStatsQuery.isLoading}
            />
        </SectionShell>
    );
}
