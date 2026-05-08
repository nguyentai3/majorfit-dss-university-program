import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useState } from 'react';
import {
    ArrowLeft, BookOpen, Bookmark, Brain, Building2,
    Cpu, ExternalLink,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import Link from '@frontend/components/AppLink';
import { createSavedProgram, deleteSavedProgram, fetchProgramDetail, fetchSavedPrograms } from '@frontend/api/services';
import { QUERY_KEYS } from '@frontend/constants/queryKeys';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useRouter } from '@frontend/routes/navigation';
import toast from 'react-hot-toast';

const RIASEC_LABELS = {
    R: 'Realistic', I: 'Investigative', A: 'Artistic',
    S: 'Social', E: 'Enterprising', C: 'Conventional',
};



export default function ProgramDetailPage() {
    const { user } = useAuth();
    const { translations } = useLanguage();
    const text = translations.programDetailPage || {};
    const dimensionLabels = translations.riasec?.dimensions || {};
    const router = useRouter();
    const queryClient = useQueryClient();
    const { programId } = useParams();
    const [saving, setSaving] = useState(false);
    const detailQuery = useQuery({
        queryKey: [...QUERY_KEYS.PROGRAM_DETAIL, programId],
        queryFn: () => fetchProgramDetail(programId),
        enabled: Boolean(programId),
    });
    const savedProgramsQuery = useQuery({
        queryKey: QUERY_KEYS.SAVED_PROGRAMS,
        queryFn: fetchSavedPrograms,
        enabled: Boolean(user),
    });

    const item = detailQuery.data;
    const isSaved = Boolean(item && (savedProgramsQuery.data ?? []).some((entry) => entry.id === item.id));

    async function handleToggleSave() {
        if (!item) return;
        if (!user) {
            router.push(`/auth/signin?next=${encodeURIComponent(`/programs/${item.slug}`)}`);
            return;
        }
        setSaving(true);
        try {
            if (isSaved) {
                await deleteSavedProgram({ programId: item.id });
                toast.success(text.removedToast || 'Program removed from shortlist');
            } else {
                await createSavedProgram({ programId: item.id });
                toast.success(text.addedToast || 'Program added to shortlist');
            }
            await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SAVED_PROGRAMS });
        } catch (error) {
            console.error('Failed to update saved program:', error);
            toast.error(text.failedToast || 'Failed to update saved program');
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f7fafc] pt-24 pb-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <Link href="/programs" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
                        <ArrowLeft className="w-4 h-4" />
                        {text.backToPrograms || 'Back to Program Explorer'}
                    </Link>
                </div>

                {detailQuery.isLoading ? (
                    <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-slate-500">
                        {text.loading || 'Loading program profile...'}
                    </div>
                ) : detailQuery.isError || !item ? (
                    <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-10 text-rose-700">
                        {text.loadFailed || 'Program detail could not be loaded.'}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <section
                            className="fade-in-up rounded-[32px] border border-slate-200 bg-white p-8 md:p-10"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                                <div className="max-w-3xl">
                                    <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700">
                                        <Building2 className="w-4 h-4" />
                                        {item.university?.name}
                                    </div>
                                    <h1 className="mt-5 text-4xl md:text-5xl font-black text-slate-950">{item.name}</h1>
                                    <p className="mt-4 text-lg text-slate-600 leading-relaxed">{item.summary}</p>
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => void handleToggleSave()}
                                            disabled={saving}
                                            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
                                                isSaved
                                                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-100'
                                                    : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                                            }`}
                                        >
                                            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                                            {isSaved ? (text.savedToShortlist || 'Saved to shortlist') : (text.saveProgram || 'Save Program')}
                                        </button>
                                        <Link
                                            href="/matching"
                                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
                                        >
                                            {text.compareWithProfile || 'Compare With My Profile'}
                                        </Link>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4 min-w-[260px]">
                                    <div className="rounded-3xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 text-white p-5 shadow-lg shadow-cyan-100">
                                        <div className="text-sm text-cyan-50/90">{text.focusArea || 'Focus area'}</div>
                                        <div className="mt-2 text-xl font-black text-white">{item.focusArea || text.general || 'General'}</div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
                            <div className="rounded-[28px] border border-slate-200 bg-white p-8">
                                <div className="flex items-center gap-3">
                                    <Brain className="w-5 h-5 text-cyan-600" />
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-950">{text.riasecProfile || 'O*NET-Derived RIASEC Profile'}</h2>
                                        <p className="text-sm text-slate-500 mt-0.5">
                                            {text.riasecProfileHelp || 'Computed from linked O*NET occupations · weighted average · source: O*NET v30.2'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {Object.entries(item.latestProfile?.riasecScores || {}).map(([dimension, score]) => (
                                        <div key={dimension} className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                                            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">RIASEC</div>
                                            <div className="mt-2 text-lg font-black text-slate-950">{dimension}</div>
                                            <div className="text-cyan-700 font-bold">{score}/100</div>
                                            <div className="mt-1 text-xs text-slate-400">{dimensionLabels[dimension] || RIASEC_LABELS[dimension]}</div>
                                        </div>
                                    ))}
                                </div>

                                {item.latestProfile?.hollandCode && (
                                    <div className="mt-6 rounded-2xl bg-cyan-50 border border-cyan-200 p-4">
                                        <div className="text-xs uppercase tracking-widest text-cyan-400 mb-1">{text.hollandCode || 'Holland Code'}</div>
                                        <div className="text-2xl font-black text-cyan-800 tracking-[0.3em]">{item.latestProfile.hollandCode}</div>
                                        <div className="mt-1 text-xs text-cyan-600">
                                            {item.latestProfile.hollandCode.split('').map(c => dimensionLabels[c] || RIASEC_LABELS[c]).filter(Boolean).join(' · ')}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                                    <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">{text.calculation || 'Calculation'}</div>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {text.calculationPrefix || 'This profile is calculated using a'} <strong>weighted average</strong> {text.calculationSuffix || 'from the O*NET occupations assigned to this program. Each occupation has its own RIASEC score, normalized to 0-100 and multiplied by relevance weight before averaging.'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="rounded-[28px] border border-slate-200 bg-white p-8">
                                    <h3 className="text-lg font-bold text-slate-950">{text.topSkills || 'Top Skills (O*NET)'}</h3>
                                    <p className="mt-1 text-sm text-slate-500">{text.topSkillsHelp || 'Aggregated from linked O*NET occupations'}</p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {((item.latestProfile?.extractedSkills || []).length > 0
                                            ? item.latestProfile?.extractedSkills
                                            : item.latestProfile?.topSkills || []).map((skill) => (
                                            <span key={skill} className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-[28px] border border-slate-200 bg-white p-8">
                                    <div className="flex items-center gap-3">
                                        <BookOpen className="w-5 h-5 text-cyan-600" />
                                        <h3 className="text-lg font-bold text-slate-950">{text.curriculumSnapshot || 'Curriculum Snapshot'}</h3>
                                    </div>
                                    <div className="mt-4 space-y-3 text-slate-600">
                                        <p><span className="font-semibold text-slate-900">{text.curriculumTitle || 'Title'}:</span> {item.latestCurriculum?.title || '-'}</p>
                                        <p><span className="font-semibold text-slate-900">{text.source || 'Source'}:</span> {item.latestCurriculum?.sourceType || '-'}</p>
                                        <p><span className="font-semibold text-slate-900">{text.version || 'Version'}:</span> {item.latestCurriculum?.version || '-'}</p>
                                        {item.sourceUrl ? (
                                            <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-cyan-700 font-semibold">
                                                {text.viewSourceUrl || 'View source URL'}
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        ) : null}
                                    </div>
                                </div>

                                {(item.keyCourses || []).length > 0 && (
                                    <div className="rounded-[28px] border border-slate-200 bg-white p-8">
                                        <div className="flex items-center gap-3">
                                            <BookOpen className="w-5 h-5 text-violet-600" />
                                            <h3 className="text-lg font-bold text-slate-950">{text.keyCourses || 'Key Courses'}</h3>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-500">{text.keyCoursesHelp || 'Main subjects in the curriculum'}</p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {item.keyCourses.map((course, i) => (
                                                <span key={i} className="inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-800">
                                                    {course}
                                                </span>
                                            ))}
                                        </div>
                                        {item.courseSourceUrl && (
                                            <a href={item.courseSourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900">
                                                {text.viewOriginalCurriculum || 'View original curriculum'}
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                )}

                                {(item.careerOutcomes || []).length > 0 && (
                                    <div className="rounded-[28px] border border-slate-200 bg-white p-8">
                                        <div className="flex items-center gap-3">
                                            <Cpu className="w-5 h-5 text-cyan-600" />
                                            <h3 className="text-lg font-bold text-slate-950">{text.careerMapping || 'O*NET Career Mapping'}</h3>
                                        </div>
                                        <p className="mt-2 text-sm text-slate-500">{text.careerMappingHelp || 'Linked O*NET occupations used for career recommendations'}</p>
                                        <div className="mt-4 space-y-3">
                                            {item.careerOutcomes.map((outcome, i) => (
                                                <div key={outcome.onetCode || i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${outcome.isPrimary ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                            {outcome.isPrimary ? (text.primary || 'Primary') : `#${i + 1}`}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-semibold text-slate-900 text-sm truncate">{outcome.title}</div>
                                                            <div className="text-xs text-slate-400">{outcome.onetCode} · {text.relevance || 'Relevance'} {outcome.relevance}/100</div>
                                                        </div>
                                                        {outcome.jobOutlook && (
                                                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                                outcome.brightOutlook ? 'bg-emerald-100 text-emerald-700' :
                                                                outcome.jobOutlook === 'Average' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {outcome.brightOutlook ? text.bright || 'Bright' : outcome.jobOutlook}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {(outcome.educationLevel || outcome.jobZone) && (
                                                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                                                            {outcome.educationLevel && (
                                                                <span>🎓 {outcome.educationLevel}</span>
                                                            )}
                                                            {outcome.jobZone && (
                                                                <span>{text.zone || 'Zone'} {outcome.jobZone}/5</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}
