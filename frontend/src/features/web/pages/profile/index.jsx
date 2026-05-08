import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Info, Settings, Target, TrendingUp, User } from 'lucide-react';
import { fetchRiasecProfile } from '@frontend/api/services';

import dynamic from '@frontend/components/loadable';
import { useRouter, useSearchParams } from '@frontend/routes/navigation';

import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { DIMENSION_LABELS } from '@frontend/utils/riasec';

const CONSISTENCY_INFO = {
    no_data: { label: 'No Data', color: 'text-gray-400', bg: 'bg-gray-500/20' },
    single_attempt: { label: 'Single Attempt', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    highly_consistent: { label: 'Highly Consistent', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    moderately_consistent: { label: 'Moderately Consistent', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    variable: { label: 'Variable', color: 'text-orange-400', bg: 'bg-orange-500/20' },
};

function formatAcademicContext(context = {}) {
    const parts = [
        context.gradeLevel ? `Grade ${context.gradeLevel}` : null,
        context.academicYear || null,
        context.semester || null,
    ].filter(Boolean);

    return parts.join(' • ') || 'No academic context attached';
}

function formatDelta(value) {
    if (value == null) {
        return { text: 'N/A', color: 'text-gray-500' };
    }
    if (value > 0) {
        return { text: `+${value}`, color: 'text-emerald-400' };
    }
    if (value < 0) {
        return { text: `${value}`, color: 'text-red-400' };
    }
    return { text: '0', color: 'text-gray-500' };
}

function ScoreBar({ dimension, value }) {
    const { translations } = useLanguage();
    const dimensionLabel = translations?.riasec?.dimensions?.[dimension] || DIMENSION_LABELS[dimension];

    return (
        <div key={dimension}>
            <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">
                    {dimension} - {dimensionLabel}
                </span>
                <span className="font-semibold text-slate-900">{value}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200">
                <div
                    className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}



const ProfileSettings = dynamic(() => import('../../components/profile/ProfileSettings'), {
    ssr: false,
    loading: () => <div className="w-full h-64 bg-gray-800/50 rounded-xl animate-pulse" />,
});

function StatCard({ title, value, icon: Icon, color }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <div className={`rounded-xl bg-gradient-to-r ${color} p-2.5 text-white shadow-sm`}>
                    <Icon size={18} className="text-white" />
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">{value}</div>
                    <div className="text-sm text-slate-500">{title}</div>
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { user, profile, loading } = useAuth();
    const { translations } = useLanguage();
    const text = translations?.profilePage || {};
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('overview');
    const [userStats, setUserStats] = useState({
        completedAssessments: 0,
        savedPrograms: 0,
    });
    const [assessmentProfile, setAssessmentProfile] = useState(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/signin');
        }
    }, [loading, router, user]);

    useEffect(() => {
        if (user && profile) {
            fetchUserStats();
            fetchAssessmentProfile();
        }
    }, [profile, user]);

    useEffect(() => {
        const tabParam = searchParams.get('tab');

        if (
            tabParam &&
            ['overview', 'settings'].includes(tabParam)
        ) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    const fetchUserStats = async () => {
        try {
            const response = await fetch('/api/profile/stats');

            if (!response.ok) {
                return;
            }

            const stats = await response.json();
            setUserStats(stats);
        } catch (error) {
            console.error('Error fetching user stats:', error);
        }
    };

    const fetchAssessmentProfile = async () => {
        try {
            const nextProfile = await fetchRiasecProfile();
            setAssessmentProfile(nextProfile);
        } catch (error) {
            console.error('Error fetching assessment profile:', error);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!user || !profile) {
        return null;
    }

    const tabs = [
        { id: 'overview', label: text.overview || 'Overview', icon: User },
        { id: 'settings', label: text.settings || 'Settings', icon: Settings },
    ];

    const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.trim().toUpperCase() || 'U';

    return (
        <div className="min-h-screen" style={{ background: '#ffffff' }}>
            <div className="relative pt-24 pb-8">
                <div className="container mx-auto px-4">
                    <div className="mb-8 text-center">
                        <h1 className="mb-3 text-3xl font-bold text-slate-900 md:text-4xl">
                            {text.title || 'Your Capability Profile'}
                        </h1>
                        <p className="mx-auto max-w-3xl text-base text-slate-600">
                            {text.subtitle || 'Track your assessment profile across multiple years, compare the latest snapshot with a stable profile, and prepare a measurable skill vector for later program matching.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="sticky top-20 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="container mx-auto px-4">
                    <div className="flex justify-center">
                        <div className="flex space-x-1 rounded-xl bg-slate-100 p-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                                        activeTab === tab.id
                                            ? 'bg-sky-500 text-white shadow-sm'
                                            : 'text-slate-500 hover:bg-white hover:text-slate-900'
                                    }`}
                                >
                                    <tab.icon size={18} />
                                    <span className="font-medium">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        <div className="grid gap-6 lg:grid-cols-[1.2fr,1.8fr]">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-xl font-bold text-white shadow-sm">
                                        {initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-lg font-semibold text-slate-900">
                                            {profile.first_name} {profile.last_name}
                                        </h3>
                                        <p className="text-sm text-slate-500">{profile.email}</p>
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                            {profile.school_name || profile.schoolName ? (
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                                                    {profile.school_name || profile.schoolName}
                                                </span>
                                            ) : null}
                                            {profile.class_code || profile.classCode ? (
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                                                    {profile.class_code || profile.classCode}
                                                </span>
                                            ) : null}
                                            {profile.academic_year || profile.academicYear ? (
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                                                    {profile.academic_year || profile.academicYear}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <StatCard
                                    title={text.assessments || 'Assessments'}
                                    value={userStats.completedAssessments}
                                    icon={BookOpen}
                                    color="from-neon-cyan to-blue-500"
                                />
                                <StatCard
                                    title={text.hollandCode || 'Holland Code'}
                                    value={userStats.hollandCode || '-'}
                                    icon={Target}
                                    color="from-neon-pink to-purple-500"
                                />
                                <StatCard
                                    title={text.strongestDimension || 'Strongest Dimension'}
                                    value={userStats.strongestDimension || '-'}
                                    icon={TrendingUp}
                                    color="from-neon-purple to-violet-500"
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <h3 className="mb-2 text-xl font-semibold text-slate-900">
                                        {text.longitudinalTitle || 'Longitudinal Assessment Profile'}
                                    </h3>
                                    <p className="text-slate-500">
                                        {text.longitudinalSubtitle || 'This view combines the latest attempt, a stable profile from recent attempts, and growth indicators from earlier baselines.'}
                                    </p>
                                </div>
                                <div className="text-sm text-slate-500">
                                    {assessmentProfile?.lastAssessedAt
                                        ? `${text.lastAssessed || 'Last assessed'}: ${new Date(assessmentProfile.lastAssessedAt).toLocaleString()}`
                                        : (text.noAssessment || 'No assessment submitted yet')}
                                </div>
                            </div>

                            {assessmentProfile?.latestHollandCode ? (
                                <div className="space-y-6">
                                    <div className="grid lg:grid-cols-[0.8fr,1.2fr] gap-6">
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                            <div className="mb-4 grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-xs uppercase tracking-wide text-slate-500">
                                                        {text.latestAttempt || 'Latest Attempt'}
                                                    </div>
                                                    <div className="mt-1 text-3xl font-bold text-slate-600">
                                                        {assessmentProfile.latestHollandCode}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs uppercase tracking-wide text-sky-600">
                                                        {text.stableCode || 'Stable Code'}
                                                        <span className="ml-1 text-[10px] font-normal normal-case text-sky-500/80">
                                                            ({text.usedForMatching || 'used for matching'})
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 text-3xl font-bold text-indigo-600">
                                                        {assessmentProfile.stableHollandCode || assessmentProfile.latestHollandCode}
                                                    </div>
                                                </div>
                                            </div>
                                            {assessmentProfile.stableHollandCode && assessmentProfile.stableHollandCode !== assessmentProfile.latestHollandCode && (
                                                <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-300">
                                                    Your latest code differs from your stable code. Matching uses the stable code from your recent attempts.
                                                </div>
                                            )}
                                            {assessmentProfile.hollandAnalysis?.isAmbiguous && (
                                                <div className="mb-4 rounded-lg bg-orange-500/10 border border-orange-500/30 px-3 py-2 text-xs text-orange-300">
                                                    ⚠ Your top RIASEC dimensions are close (within {assessmentProfile.hollandAnalysis.dominantMargin} pts). Your Holland code may shift with additional attempts. Consider retaking the assessment for a more definitive result.
                                                </div>
                                            )}
                                            {assessmentProfile.profileConsistency?.hollandStability === 'volatile' && assessmentProfile.totalAttempts >= 3 && (
                                                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
                                                    Your Holland code has changed across attempts ({assessmentProfile.profileConsistency.hollandCodes?.join(' → ')}). This may indicate your interests are still developing, or external factors are influencing responses.
                                                </div>
                                            )}
                                            {assessmentProfile.responseQuality?.warnings?.length > 0 && (
                                                <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-300">
                                                    ⚠ Response quality ({assessmentProfile.responseQuality.quality}):{' '}
                                                    {assessmentProfile.responseQuality.warnings.map((w, i) => (
                                                        <span key={w.type}>{i > 0 ? ' • ' : ''}{w.message}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="space-y-2 text-sm text-slate-600">
                                                <div>{text.totalAttempts || 'Total attempts'}: {assessmentProfile.totalAttempts}</div>
                                                <div>
                                                    {text.strongestDimension || 'Strongest dimension'}:{' '}
                                                    {assessmentProfile.strongestDimension || '-'}
                                                </div>
                                                <div>
                                                    {text.weakestDimension || 'Weakest dimension'}:{' '}
                                                    {assessmentProfile.weakestDimension || '-'}
                                                </div>
                                                <div>
                                                    {text.academicContext || 'Academic context'}:{' '}
                                                    {formatAcademicContext(assessmentProfile.academicContext)}
                                                </div>
                                                <div>
                                                    {text.firstAssessed || 'First assessed'}:{' '}
                                                    {assessmentProfile.firstAssessedAt
                                                        ? new Date(assessmentProfile.firstAssessedAt).toLocaleDateString()
                                                        : '-'}
                                                </div>
                                                {assessmentProfile.instrumentVersions?.length > 0 && (
                                                    <div>
                                                        Instruments used:{' '}
                                                        {assessmentProfile.instrumentVersions.map((v) => `V${v}`).join(', ')}
                                                        {assessmentProfile.mixedInstruments && (
                                                            <span className="ml-1 text-xs text-amber-500">(mixed)</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                            <h4 className="mb-1 text-lg font-semibold text-slate-900">
                                                {text.latestBreakdown || 'Latest Dimension Breakdown'}
                                            </h4>
                                            <p className="mb-4 text-xs text-slate-500">{text.latestBreakdownHelp || 'Scores from your most recent attempt only'}</p>
                                            <div className="space-y-4">
                                                {Object.entries(
                                                    assessmentProfile.normalizedScores || {},
                                                ).map(([dimension, value]) => (
                                                    <ScoreBar key={dimension} dimension={dimension} value={value} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <h4 className="text-lg font-semibold text-slate-900">
                                                    {text.readyTitle || 'Ready for Step 3 Matching'}
                                                </h4>
                                                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                                                    {text.readySubtitle || 'Your stable profile and measured skill vector are ready to compare against published program profiles from Step 2.'}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => router.push('/matching')}
                                                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition hover:from-sky-600 hover:to-indigo-700"
                                                >
                                                    {text.openMatching || 'Open Matching'}
                                                    <ArrowRight size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => router.push('/saved-programs')}
                                                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
                                                >
                                                    {text.reviewSaved || 'Review Saved Programs'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid lg:grid-cols-3 gap-6">
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                            <h4 className="mb-1 text-lg font-semibold text-slate-900">
                                                {text.stableProfile || 'Stable Profile'}
                                                <span className="ml-2 text-xs font-normal text-sky-600">
                                                    {text.usedForMatching || 'used for matching'}
                                                </span>
                                            </h4>
                                            <p className="mb-4 text-xs text-slate-500">
                                                Built from your recent attempts so one unusual response pattern does not dominate matching.
                                            </p>
                                            <div className="space-y-4">
                                                {Object.entries(assessmentProfile.stableScores || {}).map(
                                                    ([dimension, value]) => (
                                                        <ScoreBar
                                                            key={dimension}
                                                            dimension={dimension}
                                                            value={value}
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                            <h4 className="mb-4 text-lg font-semibold text-slate-900">
                                                {text.growthTitle || 'Growth From Previous / Baseline'}
                                            </h4>
                                            <div className="space-y-3">
                                                {(assessmentProfile.growth || []).map((item) => {
                                                    const prevDelta = formatDelta(item.deltaFromPrevious);
                                                    const baseDelta = formatDelta(item.deltaFromBaseline);
                                                    return (
                                                    <div
                                                        key={item.dimension}
                                                        className="rounded-xl bg-slate-50 px-4 py-3"
                                                    >
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-slate-600">
                                                                {item.dimension} - {translations?.riasec?.dimensions?.[item.dimension] || DIMENSION_LABELS[item.dimension]}
                                                            </span>
                                                            <span className="font-semibold text-slate-900">
                                                                {item.latest}%
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 text-xs">
                                                            <span className="text-slate-400">Prev </span>
                                                            <span className={`font-semibold ${prevDelta.color}`}>{prevDelta.text}</span>
                                                            <span className="text-slate-400"> • Base </span>
                                                            <span className={`font-semibold ${baseDelta.color}`}>{baseDelta.text}</span>
                                                        </div>
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {assessmentProfile.profileConsistency && (
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <Info size={20} className="text-sky-600" />
                                                <h4 className="text-lg font-semibold text-slate-900">
                                                    {text.profileReliability || 'Profile Reliability'}
                                                </h4>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-slate-500">{text.overallConsistency || 'Overall Consistency'}</span>
                                                        <span className="text-2xl font-bold text-slate-900">
                                                            {assessmentProfile.profileConsistency.overallConsistency != null
                                                                ? `${assessmentProfile.profileConsistency.overallConsistency}%`
                                                                : '-'}
                                                        </span>
                                                    </div>

                                                    {(() => {
                                                        const info = CONSISTENCY_INFO[assessmentProfile.profileConsistency.interpretation] || CONSISTENCY_INFO.no_data;
                                                        return (
                                                            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${info.bg} ${info.color}`}>
                                                                {info.label}
                                                            </div>
                                                        );
                                                    })()}

                                                    {assessmentProfile.profileConsistency.isConverging != null && (
                                                        <div className="text-sm">
                                                            {assessmentProfile.profileConsistency.isConverging ? (
                                                                <span className="text-emerald-400">
                                                                    {text.scoresConverging || '↗ Your scores are converging — your profile is becoming more stable over time.'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-orange-400">
                                                                    {text.scoresVarying || '↘ Your recent scores show more variation — this can reflect genuine development.'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {assessmentProfile.profileConsistency?.hollandStability && assessmentProfile.profileConsistency.hollandStability !== 'no_data' && (
                                                        <div className="mt-3 pt-3 border-t border-gray-700/50">
                                                            <div className="text-xs text-gray-400 mb-1">{text.hollandCodeStability || 'Holland Code Stability'}</div>
                                                            <div className={`text-sm font-medium ${
                                                                assessmentProfile.profileConsistency.hollandStability === 'stable' ? 'text-emerald-400' :
                                                                assessmentProfile.profileConsistency.hollandStability === 'developing' ? 'text-blue-400' :
                                                                assessmentProfile.profileConsistency.hollandStability === 'volatile' ? 'text-orange-500' :
                                                                'text-slate-500'
                                                            }`}>
                                                                {assessmentProfile.profileConsistency.hollandStability === 'stable' && (text.stableSameCodes || 'Stable — same Holland code across attempts')}
                                                                {assessmentProfile.profileConsistency.hollandStability === 'single_attempt' && (text.singleAttempt || 'Single attempt — take more for stability data')}
                                                                {assessmentProfile.profileConsistency.hollandStability === 'developing' && (text.developingCodes || 'Developing — {{count}} unique codes observed').replace('{{count}}', assessmentProfile.profileConsistency.uniqueHollandCodes)}
                                                                {assessmentProfile.profileConsistency.hollandStability === 'volatile' && (text.volatileCodes || 'Volatile — {{count}} different codes across attempts').replace('{{count}}', assessmentProfile.profileConsistency.uniqueHollandCodes)}
                                                            </div>
                                                            {assessmentProfile.profileConsistency.hollandCodes?.length > 1 && (
                                                                <div className="mt-1 text-[10px] text-slate-500">
                                                                    {text.history || 'History'}: {assessmentProfile.profileConsistency.hollandCodes.join(' → ')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 space-y-3">
                                                    <div className="mb-2 text-base font-semibold text-slate-900">
                                                        {text.howMatchingPrepared || 'How your matching profile is prepared'}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex items-start gap-2">
                                                            <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-white">1</span>
                                                            <div>
                                                                <span className="font-medium text-slate-900">{text.latestScores || 'Latest Scores'}</span>
                                                                <span className="text-slate-500"> — {text.latestScoresDesc || 'your most recent assessment result.'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white">2</span>
                                                            <div>
                                                                <span className="font-medium text-sky-700">{text.stableScores || 'Stable Scores'}</span>
                                                                <span className="text-slate-500"> — {text.stableScoresDesc || 'a steadier profile built from recent attempts.'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">3</span>
                                                            <div>
                                                                <span className="font-medium text-indigo-700">{text.matching || 'Matching'}</span>
                                                                <span className="text-slate-500"> — {text.matchingUsesStable || 'the program matching algorithm uses your'} </span>
                                                                <span className="font-medium text-sky-700">{text.stableScores || 'Stable Scores'}</span>
                                                                <span className="text-slate-500">{text.matchingMoreAttempts || ', not the latest attempt alone. So more attempts → more accurate matching.'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 border-t border-slate-200 pt-3">
                                                        <div className="mb-1 text-xs font-medium text-slate-900">{text.whyNotLatest || 'Why not just use the latest?'}</div>
                                                        <p className="text-xs text-slate-500">
                                                            {text.whyNotLatestDesc || 'Interests can shift between attempts. A stable profile keeps matching from overreacting to one unusual assessment.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                                    {text.completeFirst || 'Complete the first assessment to generate your initial RIASEC profile.'}
                                </div>
                            )}
                        </div>

                    </div>
                )}

                {activeTab === 'settings' && (
                    <div>
                        <ProfileSettings
                            onUpdate={() => {
                                fetchUserStats();
                                fetchAssessmentProfile();
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
