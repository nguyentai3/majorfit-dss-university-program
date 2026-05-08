import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { BookOpen, Bookmark, Brain, Building2, ChevronRight, Cpu, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import Link from '@frontend/components/AppLink';
import { createSavedProgram, deleteSavedProgram, fetchPrograms, fetchSavedPrograms } from '@frontend/api/services';
import { QUERY_KEYS } from '@frontend/constants/queryKeys';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useRouter } from '@frontend/routes/navigation';
import StepIndicator from '../../components/ui/StepIndicator';
import toast from 'react-hot-toast';
import { buildHollandCode } from '@frontend/utils/riasec';

export default function ProgramsPage() {
    const { user } = useAuth();
    const { translations } = useLanguage();
    const text = translations?.programsPage || {};
    const router = useRouter();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [activeUniversity, setActiveUniversity] = useState('');
    const [activeFocusArea, setActiveFocusArea] = useState('');
    const [savingProgramId, setSavingProgramId] = useState('');

    const programsQuery = useQuery({
        queryKey: [...QUERY_KEYS.PROGRAMS, search, activeUniversity, activeFocusArea],
        queryFn: () =>
            fetchPrograms({
                q: search,
                university: activeUniversity,
                focusArea: activeFocusArea,
                limit: 100,
            }),
    });

    const rawItems = programsQuery.data?.items ?? [];
    const items = useMemo(
        () => [...rawItems].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)),
        [rawItems],
    );
    const universities = programsQuery.data?.universities ?? [];
    const savedProgramsQuery = useQuery({
        queryKey: QUERY_KEYS.SAVED_PROGRAMS,
        queryFn: fetchSavedPrograms,
        enabled: Boolean(user),
    });
    const savedProgramIds = new Set((savedProgramsQuery.data ?? []).map((item) => item.id));
    const focusAreas = useMemo(
        () => Array.from(new Set(items.map((item) => item.focusArea).filter(Boolean))).sort(),
        [items],
    );

    async function handleToggleSave(programId) {
        if (!user) {
            router.push(`/auth/signin?next=${encodeURIComponent('/saved-programs')}`);
            return;
        }

        const isSaved = savedProgramIds.has(programId);
        setSavingProgramId(programId);

        try {
            if (isSaved) {
                await deleteSavedProgram({ programId });
                toast.success(text?.toasts?.removed || 'Program removed from shortlist');
            } else {
                await createSavedProgram({ programId });
                toast.success(text?.toasts?.added || 'Program added to shortlist');
            }

            await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SAVED_PROGRAMS });
        } catch (error) {
            console.error('Failed to update saved program:', error);
            toast.error(text?.toasts?.failed || 'Failed to update saved program');
        } finally {
            setSavingProgramId('');
        }
    }

    return (
        <main className="min-h-screen bg-[#f7fafc] pt-24 pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <StepIndicator current="programs" />
                <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 md:p-10">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700">
                                <Brain className="w-4 h-4" />
                                {text.badge || 'Step 2 Program Explorer'}
                            </div>
                            <h1 className="mt-5 text-4xl md:text-6xl font-black text-slate-950 leading-tight">
                                {text.titlePrefix || 'Explore University'}
                                <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-pink-500 bg-clip-text text-transparent">
                                    {' '}{text.titleHighlight || 'Programs'}
                                </span>
                            </h1>
                            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                                {text.subtitle || 'Browse seeded thesis programs, published curriculum profiles, and AI-mapped RIASEC profiles that will drive matching in Step 3.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 min-w-[260px]">
                            <div className="rounded-3xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 text-white p-5 shadow-lg shadow-cyan-100">
                                <div className="text-sm text-cyan-50/90">{text.publishedPrograms || 'Published Programs'}</div>
                                <div className="mt-2 text-3xl font-black text-white">{items.length}</div>
                            </div>
                            <div className="rounded-3xl bg-gradient-to-br from-cyan-50 to-pink-50 p-5 border border-cyan-100">
                                <div className="text-sm text-slate-500">{text.universities || 'Universities'}</div>
                                <div className="mt-2 text-3xl font-black text-slate-900">{universities.length}</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-4">
                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <Search className="w-5 h-5 text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={text.searchPlaceholder || 'Search program, university, department...'}
                                className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                            />
                        </label>

                        <label className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2 mb-2 font-medium">
                                <Building2 className="w-4 h-4" />
                                {text.university || 'University'}
                            </div>
                            <select
                                value={activeUniversity}
                                onChange={(event) => setActiveUniversity(event.target.value)}
                                className="w-full bg-transparent outline-none text-slate-800"
                            >
                                <option value="">{text.allUniversities || 'All universities'}</option>
                                {universities.map((university) => (
                                    <option key={university.id} value={university.code}>
                                        {university.shortName || university.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2 mb-2 font-medium">
                                <SlidersHorizontal className="w-4 h-4" />
                                {text.focusArea || 'Focus area'}
                            </div>
                            <select
                                value={activeFocusArea}
                                onChange={(event) => setActiveFocusArea(event.target.value)}
                                className="w-full bg-transparent outline-none text-slate-800"
                            >
                                <option value="">{text.allFocusAreas || 'All focus areas'}</option>
                                {focusAreas.map((focusArea) => (
                                    <option key={focusArea} value={focusArea}>
                                        {focusArea}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                            href="/matching"
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-100 transition-all hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-200"
                        >
                            {text.runMatching || 'Run Matching'}
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/saved-programs"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
                        >
                            {text.openSavedPrograms || 'Open Saved Programs'}
                        </Link>
                    </div>
                </section>

                <section className="mt-8">
                    {programsQuery.isLoading ? (
                        <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-slate-500">
                            {text.loading || 'Loading program dataset...'}
                        </div>
                    ) : programsQuery.isError ? (
                        <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-10 text-rose-700">
                            {text.failed || 'Failed to load Step 2 program dataset.'}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center">
                            <Search className="w-10 h-10 text-slate-300 mx-auto" />
                            <p className="mt-4 text-lg font-semibold text-slate-700">{text.noResults || 'No programs found'}</p>
                            <p className="mt-2 text-slate-500">{text.noResultsHelp || 'Try changing the filters or search keyword.'}</p>
                            {(search || activeUniversity || activeFocusArea) && (
                                <button
                                    type="button"
                                    onClick={() => { setSearch(''); setActiveUniversity(''); setActiveFocusArea(''); }}
                                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                                >
                                    {text.clearFilters || 'Clear filters'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                            {items.map((item, index) => {
                                const code = buildHollandCode(item.latestProfile?.riasecScores);
                                const isSaved = savedProgramIds.has(item.id);

                                return (
                                    <article
                                        key={item.id}
                                        className="fade-in-up rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm flex flex-col h-full"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="text-sm font-medium text-cyan-700">
                                                    {item.university?.shortName || item.university?.name}
                                                </div>
                                                <h2 className="mt-2 text-2xl font-black text-slate-950">
                                                    {item.name}
                                                </h2>
                                                <p className="mt-2 text-slate-600 leading-relaxed">{item.summary}</p>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleToggleSave(item.id)}
                                                    disabled={savingProgramId === item.id}
                                                    className={`rounded-2xl border px-3 py-3 transition-colors ${
                                                        isSaved
                                                            ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                                                            : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200 hover:text-cyan-700'
                                                    }`}
                                                >
                                                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                                                </button>
                                                <div className="rounded-2xl bg-gradient-to-br from-sky-100 via-indigo-100 to-blue-100 border border-sky-200 px-4 py-3 min-w-[92px] text-center shadow-md shadow-sky-100">
                                                    <div className="text-xs uppercase tracking-[0.24em] text-sky-500/80">RIASEC</div>
                                                    <div className="mt-1 text-2xl font-black text-indigo-700">{code || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-5 flex flex-wrap gap-2">
                                            {item.featured && (
                                                <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 border border-amber-200">
                                                    {text.featured || 'Featured'}
                                                </span>
                                            )}
                                            {item.createdAt && (Date.now() - new Date(item.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000) && (
                                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 border border-emerald-200">
                                                    {text.new || 'New'}
                                                </span>
                                            )}
                                            <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
                                                {item.focusArea || text.general || 'General'}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                                                {item.degreeLevel || text.bachelor || 'Bachelor'}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                                                {item.durationYears ? `${item.durationYears} ${text.years || 'years'}` : (text.durationTbd || 'Duration TBD')}
                                            </span>
                                            {item.latestProfile?.modelName && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-semibold text-violet-700">
                                                    <Cpu className="w-3 h-3" />
                                                    {item.latestProfile.modelName}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4 mt-auto">
                                            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0 flex-1">
                                                <BookOpen className="w-4 h-4 flex-shrink-0" />
                                                <span className="truncate">{item.latestCurriculum?.title || text.curriculumReady || 'Published curriculum profile ready'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleToggleSave(item.id)}
                                                    disabled={savingProgramId === item.id}
                                                    className={`whitespace-nowrap rounded-full px-4 py-3 text-sm font-semibold transition-colors ${
                                                        isSaved
                                                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-100'
                                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {isSaved ? (text.saved || 'Saved') : (text.saveProgram || 'Save Program')}
                                                </button>
                                                <Link
                                                    href={`/programs/${item.slug}`}
                                                    className="whitespace-nowrap inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:shadow-sky-200/60"
                                                >
                                                    {text.viewProgram || 'View Program'}
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="mt-10 rounded-[28px] border border-cyan-100 bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 px-8 py-8 text-white shadow-lg shadow-cyan-100/60">
                    <div className="flex items-start gap-4">
                        <Sparkles className="w-7 h-7 text-cyan-300 shrink-0 mt-1" />
                        <div>
                            <h3 className="text-2xl font-black">{text.thesisTitle || 'Why this matters for the thesis'}</h3>
                            <p className="mt-3 text-slate-300 leading-relaxed">
                                {text.thesisDescription || 'Step 2 turns real university programs into structured program profiles using the same RIASEC language as Step 1. This is the bridge that makes Step 3 matching meaningful instead of generic.'}
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
