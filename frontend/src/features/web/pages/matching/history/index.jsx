import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Clock3,
    History,
    Layers3,
    Target,
} from 'lucide-react';

import Link from '@frontend/components/AppLink';
import { fetchMatchingHistory } from '@frontend/api/services';
import { QUERY_KEYS } from '@frontend/constants/queryKeys';
import { APP_ROUTES } from '@frontend/constants/routes';
import { useRouter, useSearchParams } from '@frontend/routes/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';

const PAGE_SIZE = 20;

function getScopeShortLabel(scope, text = {}) {
    if (scope === 'SAVED_ONLY') return text.scopeSavedShort || 'Saved shortlist';
    if (scope === 'COMPARE') return text.scopeCompareShort || 'Direct compare';
    return text.scopeAllShort || 'All published';
}

function parsePage(searchParams) {
    const raw = Number(searchParams.get('page') || 1);
    if (!Number.isFinite(raw) || raw < 1) return 1;
    return Math.round(raw);
}

function buildHistoryHref(page) {
    return page > 1 ? `${APP_ROUTES.MATCHING_HISTORY}?page=${page}` : APP_ROUTES.MATCHING_HISTORY;
}

function StatCard({ label, value }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
        </div>
    );
}

function HistoryRunCard({ item, isLatest, onOpen, text = {} }) {
    const topProgram = item.topResult?.program?.name || text.emptyRun || 'Empty run';
    const topScore = Math.round(item.topResult?.finalScore || 0);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">{topProgram}</h2>
                        {isLatest && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                {text.latest || 'Latest'}
                            </span>
                        )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                            <Layers3 className="h-3.5 w-3.5" />
                            {getScopeShortLabel(item.scope, text)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            {new Date(item.createdAt).toLocaleString()}
                        </span>
                        {item.focusArea ? <span>{item.focusArea}</span> : <span>{text.allAreas || 'All areas'}</span>}
                    </div>
                </div>

                <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-500">{text.topScore || 'Top Score'}</div>
                    <div className="text-xl font-black text-slate-900">{topScore}</div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <StatCard label={text.programs || 'Programs'} value={item.totalPrograms} />
                <StatCard label={text.topScope || 'Top Scope'} value={item.topResult?.fitLevelLabel || '-'} />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-500">
                    {text.snapshotNote || 'Snapshot of this run is preserved. Opening it does not recompute matching.'}
                </div>
                <button
                    type="button"
                    onClick={onOpen}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-sky-600 hover:to-indigo-700 transition-all"
                >
                    <Target className="h-4 w-4" />
                    {text.openRun || 'Open run'}
                </button>
            </div>
        </div>
    );
}

export default function MatchingHistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const { translations } = useLanguage();
    const text = translations.matchingHistoryPage || {};
    const router = useRouter();
    const searchParams = useSearchParams();
    const page = parsePage(searchParams);
    const offset = (page - 1) * PAGE_SIZE;

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/signin?next=%2Fmatching%2Fhistory');
        }
    }, [authLoading, router, user]);

    const historyQuery = useQuery({
        queryKey: [...QUERY_KEYS.MATCHING_HISTORY, 'page', page],
        queryFn: () => fetchMatchingHistory({ limit: PAGE_SIZE, offset }),
        enabled: Boolean(user),
    });

    const items = historyQuery.data?.items || [];
    const total = Number(historyQuery.data?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const latestRun = items[0] || null;

    const summary = useMemo(() => ({
        totalRuns: total,
        currentPage: page,
        totalPages,
        latestDate: latestRun?.createdAt ? new Date(latestRun.createdAt).toLocaleString() : '-',
    }), [latestRun?.createdAt, page, total, totalPages]);

    useEffect(() => {
        if (!historyQuery.isLoading && page > totalPages) {
            router.replace(buildHistoryHref(totalPages));
        }
    }, [historyQuery.isLoading, page, router, totalPages]);

    function goToPage(nextPage) {
        const safePage = Math.min(Math.max(nextPage, 1), totalPages);
        router.replace(buildHistoryHref(safePage));
    }

    function openRun(runId) {
        router.push(`${APP_ROUTES.MATCHING}?runId=${encodeURIComponent(runId)}`);
    }

    if (authLoading) {
        return <main className="min-h-screen bg-[#f7fafc] pt-24 pb-16 flex items-center justify-center text-slate-500">{text.loading || 'Loading...'}</main>;
    }

    if (!user) return null;

    return (
        <main className="min-h-screen bg-[#f7fafc] pt-24 pb-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Link href={APP_ROUTES.MATCHING} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-sky-700">
                            <ArrowLeft className="h-4 w-4" />
                            {text.backToMatching || 'Back to matching'}
                        </Link>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700">
                            <History className="h-3.5 w-3.5" />
                            {text.badge || 'Matching History'}
                        </div>
                        <h1 className="mt-3 text-3xl font-black text-slate-950 md:text-4xl">{text.title || 'Previous Matching Runs'}</h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-500">
                            {text.subtitle || 'Reopen old matching snapshots without recomputing. Use this page to review how your results changed over time.'}
                        </p>
                    </div>

                    <Link
                        href={APP_ROUTES.MATCHING}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-sky-200 hover:text-sky-700 transition-colors"
                    >
                        {text.runNewMatching || 'Run new matching'}
                    </Link>
                </div>

                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <StatCard label={text.totalRuns || 'Total runs'} value={summary.totalRuns} />
                        <StatCard label={text.page || 'Page'} value={`${summary.currentPage}/${summary.totalPages}`} />
                        <StatCard label={text.perPage || 'Per page'} value={PAGE_SIZE} />
                        <StatCard label={text.latestLoaded || 'Latest loaded'} value={summary.latestDate} />
                    </div>
                </div>

                {historyQuery.isLoading ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
                        {text.loadingHistory || 'Loading matching history...'}
                    </div>
                ) : historyQuery.isError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-12 text-center">
                        <h2 className="text-xl font-bold text-rose-900">{text.errorTitle || 'Could not load matching history'}</h2>
                        <p className="mt-2 text-sm text-rose-700">{text.errorHelp || 'Please refresh or return to the matching page and try again.'}</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                        <History className="mx-auto h-10 w-10 text-slate-300" />
                        <h2 className="mt-4 text-xl font-bold text-slate-700">{text.emptyTitle || 'No matching history yet'}</h2>
                        <p className="mt-2 text-sm text-slate-500">{text.emptyHelp || 'Run matching at least once to create a reusable history snapshot.'}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <HistoryRunCard
                                key={item.id}
                                item={item}
                                isLatest={page === 1 && index === 0}
                                onOpen={() => openRun(item.id)}
                                text={text}
                            />
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-sm text-slate-500">
                            {text.showing || 'Showing'} {offset + 1}-{Math.min(offset + items.length, total)} {text.of || 'of'} {total} {text.runs || 'runs'}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => goToPage(page - 1)}
                                disabled={page <= 1}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:border-sky-200 hover:text-sky-700 disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                {text.previous || 'Previous'}
                            </button>
                            <span className="px-2 text-sm font-semibold text-slate-700">
                                {text.page || 'Page'} {page} / {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => goToPage(page + 1)}
                                disabled={page >= totalPages}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:border-sky-200 hover:text-sky-700 disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-600 transition-colors"
                            >
                                {text.next || 'Next'}
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
