import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@frontend/constants/queryKeys';
import { fetchAdminPrograms, fetchAdminStats, fetchHomepageData } from '@frontend/api/services';
import { useAuth } from '@frontend/contexts/AuthContext';
import { isAdminUser } from '@frontend/utils/admin';
import { SectionShell } from '@frontend/features/admin/components/layout/SectionShell';
import { DashboardSection } from '@frontend/features/admin/sections/DashboardSection';

export function DashboardPage() {
    const { adminUser } = useAuth();
    const admin = isAdminUser(adminUser);

    const statsQuery = useQuery({
        queryKey: QUERY_KEYS.ADMIN_STATS,
        queryFn: fetchAdminStats,
        enabled: admin,
    });

    const programsQuery = useQuery({
        queryKey: [...QUERY_KEYS.ADMIN_PROGRAMS, '', '', ''],
        queryFn: () => fetchAdminPrograms({ limit: 200 }),
        enabled: admin,
    });

    const homepageQuery = useQuery({
        queryKey: QUERY_KEYS.HOMEPAGE,
        queryFn: fetchHomepageData,
        enabled: admin,
        staleTime: 60 * 1000,
    });

    const stats = statsQuery.data;
    const programs = programsQuery.data?.items ?? [];
    const authenticProgramCount = programs.filter((p) => p.latestCurriculum?.sourceType === 'AUTHENTIC').length;
    const seededProgramCount = programs.filter((p) => p.latestCurriculum?.sourceType === 'SEEDED').length;

    const contentChartData = useMemo(
        () => ({
            labels: ['Universities', 'Programs', 'Published Profiles', 'Questions'],
            datasets: [
                {
                    data: stats
                        ? [
                              stats.contentDistribution?.universities || 0,
                              stats.contentDistribution?.programs || 0,
                              stats.contentDistribution?.publishedProfiles || 0,
                              stats.contentDistribution?.questions || 0,
                          ]
                        : [0, 0, 0, 0],
                    backgroundColor: ['#0ea5e9', '#6366f1', '#8b5cf6', '#14b8a6'],
                    borderWidth: 0,
                },
            ],
        }),
        [stats],
    );

    const fitDistributionData = useMemo(
        () => ({
            labels: ['High Fit', 'Medium Fit', 'Stretch'],
            datasets: [
                {
                    data: stats?.fitDistribution
                        ? [
                              stats.fitDistribution.HIGH_FIT || 0,
                              stats.fitDistribution.MEDIUM_FIT || 0,
                              stats.fitDistribution.STRETCH || 0,
                          ]
                        : [0, 0, 0],
                    backgroundColor: ['#10b981', '#0ea5e9', '#f59e0b'],
                    borderWidth: 0,
                },
            ],
        }),
        [stats],
    );

    const usageChartData = useMemo(
        () => ({
            labels: (stats?.monthlyUsage || []).map((item) => new Date(item.date).toLocaleDateString()),
            datasets: [
                {
                    label: 'Usage',
                    data: (stats?.monthlyUsage || []).map((item) => item.value),
                    borderColor: '#0ea5e9',
                    backgroundColor: 'rgba(14,165,233,0.15)',
                    fill: true,
                    tension: 0.3,
                },
            ],
        }),
        [stats],
    );

    const lineOptions = {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } },
    };

    return (
        <SectionShell>
            <DashboardSection
                stats={stats}
                statsError={statsQuery.error}
                programsError={programsQuery.error}
                statsLoading={statsQuery.isLoading}
                authenticProgramCount={authenticProgramCount}
                seededProgramCount={seededProgramCount}
                contentChartData={contentChartData}
                fitDistributionData={fitDistributionData}
                usageChartData={usageChartData}
                lineOptions={lineOptions}
                homepageData={homepageQuery.data}
                homepageLoading={homepageQuery.isLoading}
                homepageError={homepageQuery.error}
            />
        </SectionShell>
    );
}
