import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    BarChart3,
    BookOpen,
    Brain,
    Calendar,
    Clock,
    Compass,
    History,
    Lightbulb,
    Loader2,
    MessageCircle,
    Minus,
    RefreshCw,
    Sparkles,
    Target,
    TrendingUp,
    X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import Link from '@frontend/components/AppLink';
import { fetchRiasecHistory, fetchGrowthInterpretation, fetchCareerSuggestions } from '@frontend/api/services';
import { useRouter } from '@frontend/routes/navigation';

import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DIMENSION_LABELS, DIMENSIONS } from '@frontend/utils/riasec';

function formatAcademicContext(attempt = {}, text = {}) {
    const parts = [
        attempt.gradeLevel ? `${text.grade || 'Grade'} ${attempt.gradeLevel}` : null,
        attempt.academicYear || null,
        attempt.semester || null,
        attempt.attemptLabel || null,
    ].filter(Boolean);

    return parts.join(' • ') || text.noAcademicContext || 'No academic context attached';
}

function toDisplayDuration(seconds) {
    if (!seconds || seconds < 60) {
        return seconds ? `${seconds}s` : 'N/A';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function ScoreBadge({ label, value }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
            <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
        </div>
    );
}

function DeltaBadge({ delta }) {
    if (delta == null) return null;
    if (delta === 0) {
        return (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                <Minus size={10} /> 0
            </span>
        );
    }
    const isPositive = delta > 0;
    return (
        <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                isPositive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-600'
            }`}
        >
            {isPositive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            {isPositive ? '+' : ''}{delta}
        </span>
    );
}

function formatCareerFitLabel(label, text = {}) {
    if (label === 'Strong Match') return text.strongMatch || label;
    if (label === 'Good Match') return text.goodMatch || label;
    if (label === 'Possible Match') return text.possibleMatch || label;
    return label;
}

function ScoreProgressionTable({ attempts, text = {}, dimensionLabels = {} }) {
    if (attempts.length < 2) return null;

    const recent = attempts.slice(0, 8).reverse();

    return (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.04)] mb-8">
            <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-sky-50 p-2.5 border border-sky-100">
                    <TrendingUp size={20} className="text-sky-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">
                        {text.scoreProgression || 'Score Progression'}
                    </h3>
                    <p className="text-sm text-slate-500">
                        {(text.scoreProgressionSubtitle || 'How each RIASEC dimension changed across your last {{count}} attempts')
                            .replace('{{count}}', recent.length)}
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {text.dimension || 'Dimension'}
                            </th>
                            {recent.map((attempt, index) => (
                                <th key={attempt.id} className="pb-3 px-3 text-center text-xs font-semibold text-slate-500">
                                    <div>#{index + 1}</div>
                                    <div className="font-normal text-[10px] text-slate-400">
                                        {new Date(attempt.submittedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                    </div>
                                </th>
                            ))}
                            <th className="pb-3 pl-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {text.totalDelta || 'Total Δ'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {DIMENSIONS.map((dim) => {
                            const first = recent[0]?.normalizedScores?.[dim] ?? 0;
                            const last = recent[recent.length - 1]?.normalizedScores?.[dim] ?? 0;
                            const totalDelta = last - first;

                            return (
                                <tr key={dim} className="border-b border-slate-100 last:border-0">
                                    <td className="py-3 pr-4 font-medium text-slate-700">
                                        {dim} - {dimensionLabels[dim] || DIMENSION_LABELS[dim]}
                                    </td>
                                    {recent.map((attempt, index) => {
                                        const val = attempt.normalizedScores?.[dim] ?? 0;
                                        const prev = index > 0 ? (recent[index - 1]?.normalizedScores?.[dim] ?? 0) : null;
                                        const delta = prev != null ? val - prev : null;

                                        return (
                                            <td key={attempt.id} className="py-3 px-3 text-center">
                                                <div className="font-semibold text-slate-900">{val}%</div>
                                                {delta != null && delta !== 0 && (
                                                    <div className={`text-[10px] font-semibold ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {delta > 0 ? '+' : ''}{delta}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="py-3 pl-3 text-center">
                                        <span
                                            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-bold ${
                                                totalDelta > 0
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : totalDelta < 0
                                                    ? 'bg-red-50 text-red-600'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}
                                        >
                                            {totalDelta > 0 ? <ArrowUp size={12} /> : totalDelta < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
                                            {totalDelta > 0 ? '+' : ''}{totalDelta}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="border-t-2 border-slate-200">
                            <td className="py-3 pr-4 font-semibold text-slate-700">{text.hollandCode || 'Holland Code'}</td>
                            {recent.map((attempt, index) => {
                                const prevCode = index > 0 ? recent[index - 1]?.hollandCode : null;
                                const changed = prevCode != null && attempt.hollandCode !== prevCode;
                                return (
                                    <td key={attempt.id} className="py-3 px-3 text-center">
                                        <span className={`font-bold ${changed ? 'text-amber-600' : 'text-neon-pink'}`}>
                                            {attempt.hollandCode}
                                        </span>
                                        {changed && (
                                            <div className="text-[10px] text-amber-500 font-medium">{text.changed || 'changed'}</div>
                                        )}
                                    </td>
                                );
                            })}
                            <td />
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function AssessmentHistoryPage() {
    const { user } = useAuth();
    const { currentLanguage, translations } = useLanguage();
    const text = translations.assessmentHistory || {};
    const dimensionLabels = translations.riasec?.dimensions || {};
    const router = useRouter();
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAttempt, setSelectedAttempt] = useState(null);
    const [growthData, setGrowthData] = useState(null);
    const [growthLoading, setGrowthLoading] = useState(false);
    const [showGrowth, setShowGrowth] = useState(false);
    const [careerSuggestions, setCareerSuggestions] = useState([]);

    useEffect(() => {
        if (!user) {
            router.push('/auth/signin?next=/assessment/history');
            return;
        }

        loadHistory();
    }, [router, user]);

    async function loadHistory() {
        try {
            setLoading(true);
            const data = await fetchRiasecHistory();
            setAttempts(data.attempts || []);
            if (data.attempts?.length > 0) {
                fetchCareerSuggestions(12).then(setCareerSuggestions).catch(() => {});
            }
        } catch (error) {
            console.error('Failed to load assessment history:', error);
            toast.error(text.loadFailed || 'Failed to load assessment history');
        } finally {
            setLoading(false);
        }
    }

    async function loadGrowthInterpretation() {
        try {
            setGrowthLoading(true);
            setShowGrowth(true);
            const data = await fetchGrowthInterpretation(currentLanguage);
            setGrowthData(data);
        } catch (error) {
            console.error('Failed to load growth interpretation:', error);
            toast.error(text.growthFailed || 'Failed to load AI growth interpretation');
            setShowGrowth(false);
        } finally {
            setGrowthLoading(false);
        }
    }

    const summary = useMemo(() => {
        if (!attempts.length) {
            return {
                total: 0,
                latestCode: '-',
                strongestDimension: '-',
                trackedYears: 0,
            };
        }

        const latest = attempts[0];
        const trackedYears = new Set(
            attempts.map((attempt) => attempt.academicYear).filter(Boolean),
        ).size;
        const strongestDimension =
            Object.entries(latest.normalizedScores || {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0]
            || '-';

        return {
            total: attempts.length,
            latestCode: latest.hollandCode || '-',
            strongestDimension,
            trackedYears,
        };
    }, [attempts]);

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#ffffff] pt-24 pb-12">
            <div className="container mx-auto max-w-6xl px-4">
                <div className="fade-in-up">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/assessment"
                                className="rounded-xl border border-slate-200 bg-white p-3 text-slate-700 transition-colors hover:border-neon-cyan hover:text-slate-900"
                            >
                                <ArrowLeft size={20} />
                            </Link>
                            <div>
                                <h1 className="text-4xl font-bold text-slate-900">{text.title || 'Assessment History'}</h1>
                                <p className="mt-2 text-lg text-slate-600">
                                    {text.subtitle || 'Review every saved attempt, its academic context, and how the profile has changed over time.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={loadHistory}
                                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:border-neon-cyan transition-colors"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <RefreshCw size={18} />
                                    {text.refresh || 'Refresh'}
                                </span>
                            </button>
                            {attempts.length >= 2 && (
                                <button
                                    type="button"
                                    onClick={loadGrowthInterpretation}
                                    disabled={growthLoading}
                                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 font-semibold text-indigo-700 hover:border-indigo-400 transition-colors disabled:opacity-60"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        {growthLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                        {text.aiGrowthAnalysis || 'AI Growth Analysis'}
                                    </span>
                                </button>
                            )}
                            <Link
                                href="/assessment"
                                className="rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 px-5 py-3 font-semibold text-white shadow-sm hover:shadow-sky-200/60"
                            >
                                {text.takeNewAssessment || 'Take New Assessment'}
                            </Link>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-6 md:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="h-40 animate-pulse rounded-3xl bg-slate-100" />
                        ))}
                    </div>
                ) : attempts.length === 0 ? (
                    <div className="rounded-[32px] border border-slate-200 bg-white p-12 text-center">
                        <History size={52} className="mx-auto mb-5 text-neon-cyan" />
                        <h2 className="text-3xl font-bold text-slate-900 mb-3">{text.noHistoryTitle || 'No Assessment History Yet'}</h2>
                        <p className="max-w-2xl mx-auto text-slate-600 mb-8">
                            {text.noHistorySubtitle || 'The first completed attempt will become the initial student capability profile and start the longitudinal timeline.'}
                        </p>
                        <Link
                            href="/assessment"
                            className="inline-flex items-center rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 px-6 py-4 font-semibold text-white shadow-sm hover:shadow-sky-200/60"
                        >
                            <Brain size={18} className="mr-2" />
                            {text.startFirstAssessment || 'Start First Assessment'}
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-4 mb-8">
                            <ScoreBadge label={text.totalAttempts || 'Total Attempts'} value={summary.total} />
                            <ScoreBadge label={text.latestHollandCode || 'Latest Holland Code'} value={summary.latestCode} />
                            <ScoreBadge label={text.strongestDimension || 'Strongest Dimension'} value={summary.strongestDimension} />
                            <ScoreBadge label={text.trackedAcademicYears || 'Tracked Academic Years'} value={summary.trackedYears} />
                        </div>

                        <ScoreProgressionTable attempts={attempts} text={text} dimensionLabels={dimensionLabels} />

                        {careerSuggestions.length > 0 && (
                            <div className="mb-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
                                <div className="flex items-center gap-3 mb-1">
                                    <Target size={20} className="text-cyan-500" />
                                    <h3 className="text-xl font-bold text-slate-900">{text.matchedCareers || 'Matched Careers (O*NET)'}</h3>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">
                                    {text.matchedCareersHelp || 'Top careers matching your RIASEC profile — 997 occupations from O*NET v30.2 (U.S. DOL). For reference only; Vietnamese program matching is on the'} <Link href="/matching" className="underline text-cyan-600">{text.matchingPage || 'Matching'}</Link>.
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {careerSuggestions.map((career, i) => (
                                        <div key={career.onetCode} className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                                                    {career.hollandCode && (
                                                        <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">
                                                            {career.hollandCode}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm font-semibold text-slate-900 leading-snug">
                                                    {career.title}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className={`text-lg font-bold ${career.fitLabel === 'Strong Match' ? 'text-emerald-600' : career.fitLabel === 'Good Match' ? 'text-blue-600' : 'text-slate-500'}`}>
                                                    {career.matchScore}%
                                                </div>
                                                <div className={`text-xs font-medium ${career.fitLabel === 'Strong Match' ? 'text-emerald-500' : career.fitLabel === 'Good Match' ? 'text-blue-500' : 'text-slate-400'}`}>
                                                    {formatCareerFitLabel(career.fitLabel, text)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {attempts.length >= 2 && (
                            <div className="mb-8 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 text-sm text-slate-700">
                                <div className="font-semibold text-slate-900 mb-2">
                                    {text.scoreVariabilityTitle || 'Why do my scores change between attempts?'}
                                </div>
                                <p className="mb-2">
                                    {text.scoreVariabilityBody1Prefix || 'Score variation is'} <strong>{text.scoreVariabilityBody1Strong || 'normal and expected'}</strong>. {text.scoreVariabilityBody1Suffix || 'Your interests can shift after new classes, projects, or life experiences.'}
                                </p>
                                <p>
                                    {text.scoreVariabilityBody2Prefix || 'The system uses'} <strong>{text.stableProfile || 'a stable profile'}</strong>{' '}
                                    {text.scoreVariabilityBody2Suffix || 'from recent attempts so matching does not overreact to one unusual result.'}
                                </p>
                            </div>
                        )}

                        <AnimatePresence>
                            {showGrowth && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-8 overflow-hidden"
                                >
                                    <div className="rounded-[28px] border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 shadow-[0_14px_40px_rgba(99,102,241,0.08)]">
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-xl bg-indigo-100 p-2.5">
                                                    <Sparkles size={20} className="text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900">{text.aiGrowthInterpretation || 'AI Growth Interpretation'}</h3>
                                                    <p className="text-sm text-slate-500">
                                                        {growthData?.source === 'ai' ? (text.generatedByAi || 'Generated by AI') : (text.algorithmicAnalysis || 'Profile analysis')}
                                                        {growthData?.generatedAt && ` • ${new Date(growthData.generatedAt).toLocaleString()}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowGrowth(false)}
                                                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-slate-900"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        {growthLoading ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 size={28} className="animate-spin text-indigo-500" />
                                                <span className="ml-3 text-sm text-slate-600">{text.analyzingGrowth || 'Analyzing your growth trajectory...'}</span>
                                            </div>
                                        ) : growthData?.interpretation ? (
                                            <div className="space-y-4">
                                                {growthData.interpretation.overallTrend && (
                                                    <div className="rounded-xl border border-indigo-100 bg-white p-4">
                                                        <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                                                            <TrendingUp size={15} className="text-indigo-500" />
                                                            {text.overallTrend || 'Overall Trend'}
                                                        </h4>
                                                        <p className="text-sm leading-relaxed text-slate-700">{growthData.interpretation.overallTrend}</p>
                                                    </div>
                                                )}

                                                {growthData.interpretation.strengthsEvolution && (
                                                    <div className="rounded-xl border border-indigo-100 bg-white p-4">
                                                        <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                                                            <Target size={15} className="text-emerald-500" />
                                                            {text.strengthsEvolution || 'Strengths Evolution'}
                                                        </h4>
                                                        <p className="text-sm leading-relaxed text-slate-700">{growthData.interpretation.strengthsEvolution}</p>
                                                    </div>
                                                )}

                                                {Array.isArray(growthData.topClusters) && growthData.topClusters.length > 0 && (
                                                    <div className="rounded-xl border border-indigo-100 bg-white p-4">
                                                        <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                                                            <Compass size={15} className="text-rose-500" />
                                                            {text.fieldsThatPull || 'Fields That Pull You In'}
                                                        </h4>
                                                        <p className="text-xs text-slate-500 mb-3">
                                                            {text.fieldsThatPullHelp || "Broad career fields aligned with your interest pattern. Explore widely first — you'll see specific university programs on the matching page."}
                                                        </p>
                                                        <ul className="space-y-3">
                                                            {growthData.topClusters.map((cluster, i) => (
                                                                <li key={i} className="border-l-2 border-rose-200 pl-3 py-1">
                                                                    <div className="flex items-baseline justify-between gap-2 mb-1">
                                                                        <span className="text-sm font-semibold text-slate-800">
                                                                            <span className="mr-1.5">{cluster.emoji}</span>
                                                                            {cluster.title}
                                                                        </span>
                                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                                                                                {cluster.pullLevel}
                                                                            </span>
                                                                            <span className="text-[11px] font-mono text-slate-500">
                                                                                {cluster.hollandPattern}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {Array.isArray(cluster.examples) && cluster.examples.length > 0 && (
                                                                        <p className="text-xs text-slate-600 leading-relaxed">
                                                                            <span className="text-slate-400">{text.examplesPrefix || 'e.g.'} </span>
                                                                            {cluster.examples.slice(0, 4).join(' · ')}
                                                                        </p>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <Link
                                                            href="/matching"
                                                            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                                        >
                                                            {text.seeSpecificPrograms || 'See specific programs in these fields'}
                                                            <span aria-hidden="true">→</span>
                                                        </Link>
                                                    </div>
                                                )}

                                                {Array.isArray(growthData.interpretation.keyInsightsList) && growthData.interpretation.keyInsightsList.length > 0 && (
                                                    <div className="rounded-xl border border-indigo-100 bg-white p-4">
                                                        <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                                                            <Lightbulb size={15} className="text-amber-500" />
                                                            {text.whatThisMeans || 'What This Means'}
                                                        </h4>
                                                        <ul className="space-y-1.5 text-sm leading-relaxed text-slate-700">
                                                            {growthData.interpretation.keyInsightsList.map((insight, i) => (
                                                                <li key={i} className="flex gap-2">
                                                                    <span className="text-amber-500 flex-shrink-0">•</span>
                                                                    <span>{insight}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {Array.isArray(growthData.interpretation.actionsByType) && growthData.interpretation.actionsByType.length > 0 && (
                                                    <div className="rounded-xl border border-indigo-100 bg-white p-4">
                                                        <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                                                            <Compass size={15} className="text-purple-500" />
                                                            {text.waysToExplore || 'Ways to Explore'}
                                                        </h4>
                                                        <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
                                                            {growthData.interpretation.actionsByType.map((action, i) => {
                                                                const Icon = action.type === 'experience' ? Compass
                                                                    : action.type === 'reflect' ? MessageCircle
                                                                    : BookOpen;
                                                                const tagColor = action.type === 'experience' ? 'bg-purple-100 text-purple-700'
                                                                    : action.type === 'reflect' ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-emerald-100 text-emerald-700';
                                                                const tagLabel = action.type === 'experience' ? (text.experience || 'Experience')
                                                                    : action.type === 'reflect' ? (text.reflect || 'Reflect')
                                                                    : action.type === 'explore' ? (text.explore || 'Explore')
                                                                    : '';
                                                                return (
                                                                    <li key={i} className="flex gap-2.5 items-start">
                                                                        <Icon size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                                                        <div className="flex-1">
                                                                            {tagLabel && (
                                                                                <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${tagColor} mr-2`}>
                                                                                    {tagLabel}
                                                                                </span>
                                                                            )}
                                                                            <span>{action.text}</span>
                                                                        </div>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                )}

                                                {growthData.interpretation.reflectionPrompt && (
                                                    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                                        <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                                                            <MessageCircle size={15} className="text-blue-500" />
                                                            {text.questionForYou || 'Question for You'}
                                                        </h4>
                                                        <p className="text-sm italic leading-relaxed text-slate-700">"{growthData.interpretation.reflectionPrompt}"</p>
                                                    </div>
                                                )}

                                                {growthData.interpretation.encouragement && (
                                                    <div className="rounded-xl border border-indigo-100 bg-white p-4">
                                                        <p className="text-sm leading-relaxed text-slate-700 flex gap-2">
                                                            <Sparkles size={15} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                                                            <span>{growthData.interpretation.encouragement}</span>
                                                        </p>
                                                    </div>
                                                )}

                                                {!growthData.interpretation.keyInsightsList?.length
                                                    && !growthData.interpretation.actionsByType?.length
                                                    && growthData.interpretation.recommendations && (
                                                    <div className="rounded-xl border border-indigo-100 bg-white p-4">
                                                        <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                                                            <Brain size={15} className="text-purple-500" />
                                                            {text.recommendations || 'Recommendations'}
                                                        </h4>
                                                        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{growthData.interpretation.recommendations}</p>
                                                    </div>
                                                )}

                                                {growthData.interpretation.methodologyNote && (
                                                    <p className="text-xs text-slate-500 italic px-1">
                                                        ℹ️ {growthData.interpretation.methodologyNote}
                                                    </p>
                                                )}

                                                {typeof growthData.interpretation === 'string' && (
                                                    <div className="rounded-xl border border-indigo-100 bg-white p-4">
                                                        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{growthData.interpretation}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 py-4">{text.noGrowthData || 'No growth data available. Complete at least 2 assessments to see growth analysis.'}</p>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {attempts.map((attempt, index) => {
                                const prevAttempt = index < attempts.length - 1 ? attempts[index + 1] : null;
                                const hollandChanged = prevAttempt && attempt.hollandCode !== prevAttempt.hollandCode;
                                const trendItems = attempt.summary?.trend || [];
                                const avgDelta = trendItems.length
                                    ? Math.round(trendItems.reduce((sum, t) => sum + (t.delta || 0), 0) / trendItems.length)
                                    : null;

                                return (
                                <button
                                    key={attempt.id}
                                    type="button"
                                    onClick={() => setSelectedAttempt(attempt)}
                                    className="rounded-[28px] border border-slate-200 bg-white p-6 text-left shadow-[0_14px_40px_rgba(15,23,42,0.04)] transition-all hover:border-neon-cyan hover:shadow-[0_18px_50px_rgba(34,211,238,0.12)]"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-5">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                    {text.attempt || 'Attempt'} #{attempts.length - index}
                                                </span>
                                                {hollandChanged && (
                                                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                        {text.codeChanged || 'Code changed'}
                                                    </span>
                                                )}
                                                {avgDelta != null && prevAttempt && <DeltaBadge delta={avgDelta} />}
                                            </div>
                                            <div className="mt-2 text-3xl font-bold text-neon-pink">
                                                {attempt.hollandCode}
                                            </div>
                                            {hollandChanged && (
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {text.was || 'was'} {prevAttempt.hollandCode}
                                                </div>
                                            )}
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                                            <Brain size={22} className="text-neon-cyan" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                                        <Calendar size={15} />
                                        {new Date(attempt.submittedAt).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-slate-600 mb-4">
                                        {formatAcademicContext(attempt, text)}
                                    </div>

                                    <div className="space-y-3">
                                        {Object.entries(attempt.normalizedScores || {})
                                            .sort((a, b) => Number(b[1]) - Number(a[1]))
                                            .slice(0, 3)
                                            .map(([dimension, value]) => {
                                                const prevVal = prevAttempt?.normalizedScores?.[dimension];
                                                const delta = typeof prevVal === 'number' ? value - prevVal : null;
                                                return (
                                                    <div key={dimension} className="flex items-center justify-between text-sm">
                                                        <span className="font-medium text-slate-700">
                                                            {dimension} - {dimensionLabels[dimension] || DIMENSION_LABELS[dimension]}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                                                            {value}%
                                                            <DeltaBadge delta={delta} />
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                    </div>

                                </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            <AnimatePresence>
                {selectedAttempt ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4 py-6"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.98 }}
                            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-5"
                        >
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-neon-cyan/10 px-3 py-1 text-xs font-semibold text-slate-800">
                                        <Clock size={13} className="text-neon-cyan" />
                                        {text.savedAttempt || 'Saved attempt'}
                                    </div>
                                    <h2 className="mt-2 text-xl font-bold text-slate-900">
                                        {text.hollandCode || 'Holland Code'} {selectedAttempt.hollandCode}
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-600">
                                        {new Date(selectedAttempt.submittedAt).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {formatAcademicContext(selectedAttempt, text)}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedAttempt(null)}
                                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:text-slate-900"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid gap-5 lg:grid-cols-[1fr,0.85fr]">
                                <div className="space-y-5">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
                                            <BarChart3 size={15} className="text-neon-cyan" />
                                            {text.riasecBreakdown || 'RIASEC Breakdown'}
                                        </h3>
                                        <div className="space-y-2.5">
                                            {Object.entries(selectedAttempt.normalizedScores || {}).map(([dimension, value]) => (
                                                <div key={dimension}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-medium text-slate-700">
                                                            {dimension} - {dimensionLabels[dimension] || DIMENSION_LABELS[dimension]}
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-900">
                                                            {value}%
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-slate-200">
                                                        <div
                                                            className="h-1.5 rounded-full bg-gradient-to-r from-neon-cyan to-neon-pink"
                                                            style={{ width: `${value}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                                            <Target size={15} className="text-neon-pink" />
                                            {text.summary || 'Summary'}
                                        </h3>
                                        <p className="text-xs leading-relaxed text-slate-600">
                                            {selectedAttempt.summary?.narrative
                                                || text.defaultSummary
                                                || 'This attempt is stored as part of the student development history.'}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                                            <TrendingUp size={15} className="text-neon-cyan" />
                                            {text.trendSnapshot || 'Trend Snapshot'}
                                        </h3>
                                        <div className="space-y-1.5">
                                            {(selectedAttempt.summary?.trend || []).map((item) => (
                                                <div key={item.dimension} className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-600">{item.dimension}</span>
                                                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                                                        {item.current}%
                                                        {item.delta != null && (
                                                            <span className={`text-[10px] font-bold ${
                                                                item.delta > 0 ? 'text-emerald-600' : item.delta < 0 ? 'text-red-500' : 'text-slate-400'
                                                            }`}>
                                                                ({item.delta > 0 ? '+' : ''}{item.delta})
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                                            <Clock size={15} className="text-neon-cyan" />
                                            {text.attemptMetadata || 'Attempt Metadata'}
                                        </h3>
                                        <div className="space-y-1 text-xs text-slate-600">
                                            <div>{text.duration || 'Duration'}: {toDisplayDuration(selectedAttempt.durationSeconds)}</div>
                                            <div>{text.status || 'Status'}: {selectedAttempt.status || 'COMPLETED'}</div>
                                            <div>{text.questionVersion || 'Question version'}: {selectedAttempt.questionVersion || 1}</div>
                                            <div>{text.savedOn || 'Saved on'}: {new Date(selectedAttempt.submittedAt).toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
