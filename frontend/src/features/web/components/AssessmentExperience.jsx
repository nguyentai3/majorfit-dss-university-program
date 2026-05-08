import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
const STORAGE_KEY = 'majorfit_assessment_progress';

function saveProgress(data) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
    } catch {  }
}

function loadProgress() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - data.savedAt > 2 * 60 * 60 * 1000) {
            sessionStorage.removeItem(STORAGE_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function clearProgress() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {  }
}
import {
    ArrowLeft,
    ArrowRight,
    BarChart3,
    Brain,
    Calendar,
    CheckCircle,
    Clock,
    GraduationCap,
    History,
    Layers,
    Play,
    Shuffle,
    Target,
    TrendingUp,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import Link from '@frontend/components/AppLink';
import StepIndicator from './ui/StepIndicator';
import {
    fetchRiasecHistory,
    fetchRiasecProfile,
    fetchRiasecQuestions,
    submitRiasecAssessment,
    fetchCareerSuggestions,
} from '@frontend/api/services';
import { useRouter } from '@frontend/routes/navigation';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { DIMENSION_LABELS } from '@frontend/utils/riasec';


function ScoreBar({ dimension, value }) {
    const { translations } = useLanguage();
    const dimensionLabel = translations?.riasec?.dimensions?.[dimension] || DIMENSION_LABELS[dimension];

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">
                    {dimension} - {dimensionLabel}
                </span>
                <span className="text-sm font-semibold text-[#1f2937]">{value}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200">
                <div
                    className="h-2 rounded-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-all duration-500"
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

function buildAssessmentContext(profile) {
    return {
        gradeLevel: profile?.grade_level ?? profile?.gradeLevel ?? '',
        academicYear: profile?.academic_year ?? profile?.academicYear ?? '',
        semester: profile?.current_semester ?? profile?.currentSemester ?? '',
    };
}

function formatAcademicContext(context = {}) {
    const parts = [
        context.gradeLevel ? `Grade ${context.gradeLevel}` : null,
        context.academicYear || null,
        context.semester || null,
        context.attemptLabel || null,
    ].filter(Boolean);

    return parts.join(' • ') || 'No academic context attached yet';
}

function toDisplayDuration(seconds) {
    if (!seconds || seconds < 60) {
        return seconds ? `${seconds}s` : 'N/A';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default function AssessmentExperience() {
    const router = useRouter();
    const { user, profile, loading: authLoading } = useAuth();
    const { translations } = useLanguage();
    const originalQuestionsRef = useRef([]);
    const answersRef = useRef({});

    const [view, setView] = useState('landing');
    const [questions, setQuestions] = useState([]);
    const [scaleOptions, setScaleOptions] = useState([]);
    const [questionVersion, setQuestionVersion] = useState(0);
    const [questionMode, setQuestionMode] = useState('adaptive');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [assessmentProfile, setAssessmentProfile] = useState(null);
    const [contextForm, setContextForm] = useState(buildAssessmentContext(profile));
    const [assessmentStartedAt, setAssessmentStartedAt] = useState(null);
    const [loadingQuestions, setLoadingQuestions] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [careerSuggestions, setCareerSuggestions] = useState([]);
    const [hasSavedProgress, setHasSavedProgress] = useState(false);

    useEffect(() => {
        loadQuestions();
    }, []);

    const restoredRef = useRef(false);
    useEffect(() => {
        if (restoredRef.current || loadingQuestions || !originalQuestionsRef.current.length) return;
        restoredRef.current = true;
        const saved = loadProgress();
        if (!saved || !saved.answers || !saved.questionOrder?.length) return;

        const orderMap = new Map(originalQuestionsRef.current.map((q) => [q.id, q]));
        const restoredQuestions = saved.questionOrder
            .map((id) => orderMap.get(id))
            .filter(Boolean);
        if (restoredQuestions.length !== originalQuestionsRef.current.length) return;

        setHasSavedProgress(true);
    }, [loadingQuestions]);

    function resumeAssessment() {
        const saved = loadProgress();
        if (!saved || !saved.answers || !saved.questionOrder?.length) {
            setHasSavedProgress(false);
            toast.error('Không tìm thấy bài test đã lưu');
            return;
        }
        const orderMap = new Map(originalQuestionsRef.current.map((q) => [q.id, q]));
        const restoredQuestions = saved.questionOrder
            .map((id) => orderMap.get(id))
            .filter(Boolean);
        if (restoredQuestions.length !== originalQuestionsRef.current.length) {
            clearProgress();
            setHasSavedProgress(false);
            toast.error('Câu hỏi đã thay đổi, vui lòng làm lại bài test');
            return;
        }
        setQuestions(restoredQuestions);
        setAnswers(saved.answers);
        answersRef.current = saved.answers;
        setCurrentQuestionIndex(saved.currentQuestionIndex || 0);
        setAssessmentStartedAt(saved.startedAt || null);
        setContextForm((prev) => ({ ...prev, ...saved.contextForm }));
        setHasSavedProgress(false);
        setView('assessment');
        toast.success(`Đã khôi phục bài test (${Object.keys(saved.answers).length}/${restoredQuestions.length} câu đã trả lời)`);
    }

    useEffect(() => {
        setContextForm(buildAssessmentContext(profile));
    }, [profile]);

    useEffect(() => {
        if (user) {
            loadHistory();
            loadProfile();
            loadCareerSuggestions();
        }
    }, [user]);

    const latestAttempt = history[0] || assessmentProfile?.latestAttempt || null;
    const currentQuestion = questions[currentQuestionIndex] || null;
    const assessmentText = translations?.assessment || {};
    const landingText = assessmentText?.landing || {};
    const answeredCount = Object.keys(answers).length;
    const progress = questions.length
        ? Math.round((answeredCount / questions.length) * 100)
        : 0;

    const getQuestionPrompt = (question) => {
        if (!question) return '';
        return assessmentText?.questions?.[questionMode]?.[question.code] || question.prompt;
    };

    const getScaleLabel = (option) => assessmentText?.scale?.[String(option.value)] || option.label;

    const getPointLabel = (value) => {
        if (Number(value) === 1) {
            return assessmentText?.point || 'point';
        }

        return assessmentText?.points || 'points';
    };

    const growthHighlights = useMemo(() => {
        const growth = assessmentProfile?.growth || [];
        return [...growth]
            .filter((item) => item.deltaFromBaseline != null || item.deltaFromPrevious != null)
            .sort(
                (a, b) =>
                    Math.abs(Number(b.deltaFromBaseline ?? b.deltaFromPrevious ?? 0))
                    - Math.abs(Number(a.deltaFromBaseline ?? a.deltaFromPrevious ?? 0)),
            )
            .slice(0, 4);
    }, [assessmentProfile?.growth]);

    function renderSubmittingOverlay() {
        if (!submitting) {
            return null;
        }

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full border-4 border-neon-cyan border-t-transparent animate-spin" />
                    <h2 className="mb-2 text-2xl font-bold text-slate-900">Calculating Your Profile</h2>
                    <p className="text-slate-600">
                        We are generating your Holland code, stable profile, and skill vector.
                    </p>
                </div>
            </div>
        );
    }

    async function loadQuestions() {
        try {
            setLoadingQuestions(true);
            const data = await fetchRiasecQuestions({ mode: 'iip48' });
            originalQuestionsRef.current = data.questions || [];
            setQuestions(data.questions || []);
            setScaleOptions(data.scale || []);
            setQuestionVersion(data.version ?? 0);
            setQuestionMode(data.mode || 'iip48');
        } catch (error) {
            console.error('Failed to load assessment questions:', error);
            toast.error('Failed to load assessment questions');
        } finally {
            setLoadingQuestions(false);
        }
    }

    async function loadHistory() {
        try {
            const data = await fetchRiasecHistory();
            setHistory(data.attempts || []);
        } catch (error) {
            console.error('Failed to load assessment history:', error);
        }
    }

    async function loadProfile() {
        try {
            const data = await fetchRiasecProfile();
            setAssessmentProfile(data);
        } catch (error) {
            console.error('Failed to load assessment profile:', error);
        }
    }

    async function loadCareerSuggestions() {
        try {
            const careers = await fetchCareerSuggestions(12);
            setCareerSuggestions(careers);
        } catch (error) {
            console.error('Failed to load career suggestions:', error);
        }
    }

    function startAssessment() {
        if (!user) {
            router.push('/auth/signin?next=/assessment');
            return;
        }

        clearProgress();
        setHasSavedProgress(false);
        const shuffled = shuffleArray(originalQuestionsRef.current);
        setQuestions(shuffled);
        setAnswers({});
        answersRef.current = {};
        setResult(null);
        setCurrentQuestionIndex(0);
        const startedAt = new Date().toISOString();
        setAssessmentStartedAt(startedAt);
        setView('assessment');

        saveProgress({
            questionOrder: shuffled.map((q) => q.id),
            answers: {},
            currentQuestionIndex: 0,
            startedAt,
            contextForm,
        });
    }

    function handleAnswer(value) {
        if (!currentQuestion) return;

        setAnswers((current) => {
            const nextAnswers = {
                ...current,
                [currentQuestion.id]: value,
            };
            answersRef.current = nextAnswers;

            saveProgress({
                questionOrder: questions.map((q) => q.id),
                answers: nextAnswers,
                currentQuestionIndex,
                startedAt: assessmentStartedAt,
                contextForm,
            });

            return nextAnswers;
        });
    }

    function findMissingQuestionIds(submission = answersRef.current) {
        return questions
            .filter((question) => {
                const value = Number(submission?.[question.id]);
                return !Number.isFinite(value) || value < 1 || value > 5;
            })
            .map((question) => question.id);
    }

    function jumpToFirstMissingQuestion(submission = answersRef.current) {
        const missingIds = findMissingQuestionIds(submission);
        if (!missingIds.length) {
            return false;
        }

        const firstMissingIndex = questions.findIndex((question) => question.id === missingIds[0]);
        if (firstMissingIndex >= 0) {
            setCurrentQuestionIndex(firstMissingIndex);
        }
        setView('assessment');
        toast.error(`Bạn còn thiếu ${missingIds.length} câu RIASEC. Vui lòng trả lời đủ trước khi xem kết quả.`);
        return true;
    }

    async function handleNext() {
        if (!currentQuestion) {
            return;
        }

        const currentAnswers = answersRef.current;
        if (!currentAnswers[currentQuestion.id]) {
            toast.error(assessmentText?.selectOne || 'Please select one answer before continuing');
            return;
        }

        if (currentQuestionIndex < questions.length - 1) {
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);
            saveProgress({
                questionOrder: questions.map((q) => q.id),
                answers: currentAnswers,
                currentQuestionIndex: nextIndex,
                startedAt: assessmentStartedAt,
                contextForm,
            });
            return;
        }

        if (jumpToFirstMissingQuestion(currentAnswers)) {
            return;
        }

        await handleSubmit();
    }

    function handlePrevious() {
        const prevIndex = Math.max(currentQuestionIndex - 1, 0);
        setCurrentQuestionIndex(prevIndex);
        saveProgress({
            questionOrder: questions.map((q) => q.id),
            answers: answersRef.current,
            currentQuestionIndex: prevIndex,
            startedAt: assessmentStartedAt,
            contextForm,
        });
    }

    async function handleSubmit() {
        const submissionAnswers = answersRef.current;
        if (jumpToFirstMissingQuestion(submissionAnswers)) {
            return;
        }

        try {
            setSubmitting(true);
            const startedAt = assessmentStartedAt || new Date().toISOString();
            const durationSeconds = Math.max(
                0,
                Math.round((Date.now() - new Date(startedAt).getTime()) / 1000),
            );
            const data = await submitRiasecAssessment({
                answers: submissionAnswers,
                version: questionVersion,
                mode: questionMode,
                context: {
                    gradeLevel: contextForm.gradeLevel ? Number(contextForm.gradeLevel) : null,
                    academicYear: contextForm.academicYear?.trim() || null,
                    semester: contextForm.semester?.trim() || null,
                    attemptLabel: `Attempt ${history.length + 1}`,
                    startedAt,
                    durationSeconds,
                },
            });

            setResult(data.result || null);
            setView('results');
            clearProgress();
            toast.success('Assessment submitted successfully');
            await Promise.all([loadHistory(), loadProfile(), loadCareerSuggestions()]);
        } catch (error) {
            console.error('Failed to submit assessment:', error);
            toast.error(error?.response?.data?.error || 'Failed to submit assessment');
        } finally {
            setSubmitting(false);
        }
    }

    if (loadingQuestions || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#ffffff]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">{assessmentText?.loading || 'Loading assessment...'}</p>
                </div>
            </div>
        );
    }

    if (view === 'results' && result) {
        return (
            <>
                {renderSubmittingOverlay()}
                <div className="min-h-screen bg-[#ffffff] pt-24 pb-12">
                    <div className="container mx-auto max-w-6xl px-4">
                        <div className="space-y-8 fade-in-up">
                            <div className="rounded-[28px] border border-neon-cyan/40 bg-white p-8 shadow-[0_18px_60px_rgba(34,211,238,0.12)]">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full bg-neon-cyan/10 px-4 py-2 text-sm font-semibold text-slate-800">
                                        <CheckCircle size={16} className="text-neon-cyan" />
                                        Assessment Completed
                                    </div>
                                    <h1 className="mt-4 text-4xl font-bold text-slate-900">
                                        Holland Code: <span className="text-neon-pink">{result.hollandCode}</span>
                                    </h1>
                                    <p className="mt-3 max-w-2xl text-lg text-slate-600">
                                        {result.summary?.narrative
                                            || 'This is your current student capability profile based on the latest RIASEC assessment.'}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200 min-w-[260px]">
                                    <div className="text-sm text-slate-500">Assessment Mode</div>
                                    <div className="text-2xl font-bold text-slate-900">{questionMode === 'adaptive' ? 'Adaptive' : `v${questionVersion}`}</div>
                                    <div className="mt-4 text-sm text-slate-500">Assessment Context</div>
                                    <div className="mt-2 text-sm font-semibold text-slate-800">
                                        {formatAcademicContext(result)}
                                    </div>
                                    <div className="mt-3 text-sm text-slate-500">
                                        Duration: {toDisplayDuration(result.durationSeconds)}
                                    </div>
                                </div>
                            </div>
                            </div>

                        <div className="grid gap-8 lg:grid-cols-[1.15fr,0.85fr]">
                            <div className="space-y-8">
                                <div className="rounded-[28px] border border-slate-200 bg-white p-8">
                                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-6">
                                        <BarChart3 size={22} className="text-neon-cyan" />
                                        Latest RIASEC Snapshot
                                    </h2>
                                    <div className="space-y-5">
                                        {Object.entries(result.normalizedScores || {}).map(([dimension, value]) => (
                                            <ScoreBar key={dimension} dimension={dimension} value={Number(value || 0)} />
                                        ))}
                                    </div>
                                </div>

                                {assessmentProfile?.stableScores ? (
                                    <div className="rounded-[28px] border border-slate-200 bg-white p-8">
                                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-6">
                                            <Layers size={22} className="text-neon-pink" />
                                            Stable Profile Across Recent Attempts
                                        </h2>
                                        <div className="space-y-5">
                                            {Object.entries(assessmentProfile.stableScores || {}).map(([dimension, value]) => (
                                                <ScoreBar key={dimension} dimension={dimension} value={Number(value || 0)} />
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="space-y-6">
                                <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                                    <h3 className="text-xl font-bold text-slate-900 mb-4">Growth over time</h3>
                                    <div className="space-y-3">
                                        {growthHighlights.length ? (
                                            growthHighlights.map((item) => (
                                                <div
                                                    key={item.dimension}
                                                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                                                >
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-900">
                                                            {item.dimension} - {DIMENSION_LABELS[item.dimension]}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            Baseline delta {item.deltaFromBaseline ?? 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm text-slate-500">Latest</div>
                                                        <div className="text-lg font-bold text-slate-900">
                                                            {item.latest}%
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-slate-600">
                                                Growth indicators will appear after multiple assessment attempts.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {careerSuggestions.length > 0 && (
                                    <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                                        <h3 className="text-xl font-bold text-slate-900 mb-1">Matched Careers (O*NET)</h3>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Top careers matching your RIASEC profile — 997 occupations from O*NET v30.2
                                        </p>
                                        <div className="space-y-2">
                                            {careerSuggestions.map((career, i) => (
                                                <div key={career.onetCode} className="rounded-2xl bg-slate-50 px-4 py-3">
                                                    <div className="flex items-start justify-between gap-3">
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
                                                                {career.fitLabel}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-[28px] border border-neon-cyan/30 bg-gradient-to-br from-cyan-50/60 to-white p-6">
                                    <h3 className="text-xl font-bold text-slate-900 mb-4">Continue to next step</h3>
                                    <div className="grid gap-3">
                                        <Link
                                            href="/programs"
                                            className="rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-700 px-5 py-3 font-semibold text-white text-center shadow-sm hover:shadow-cyan-200/60 transition-shadow"
                                        >
                                            Step 2: Explore Programs →
                                        </Link>
                                        <Link
                                            href="/matching"
                                            className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-5 py-3 font-semibold text-white text-center shadow-sm hover:shadow-purple-200/60 transition-shadow"
                                        >
                                            Step 3: Run Matching →
                                        </Link>
                                    </div>
                                </div>

                                <div className="rounded-[28px] border border-slate-200 bg-white p-6">
                                    <h3 className="text-xl font-bold text-slate-900 mb-4">Other actions</h3>
                                    <div className="grid gap-3">
                                        <button
                                            type="button"
                                            onClick={startAssessment}
                                            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 text-center hover:border-neon-cyan hover:text-slate-900 transition-colors"
                                        >
                                            Retake Assessment
                                        </button>
                                        <Link
                                            href="/assessment/history"
                                            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 text-center hover:border-neon-cyan hover:text-slate-900 transition-colors"
                                        >
                                            View History
                                        </Link>
                                        <Link
                                            href="/profile"
                                            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 text-center hover:border-neon-cyan hover:text-slate-900 transition-colors"
                                        >
                                            Open Profile
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (view === 'assessment' && currentQuestion) {
        return (
            <>
                {renderSubmittingOverlay()}
                <div className="min-h-screen bg-[#ffffff] pt-24 pb-12">
                    <div className="container mx-auto max-w-6xl px-4">
                        <div className="text-center mb-10">
                            <h1 className="text-5xl font-bold text-slate-900 mb-4">
                                {assessmentText?.title || 'RIASEC Skill Assessment'}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center gap-5 text-lg text-slate-500">
                                <span>
                                    {assessmentText?.questionLabel || 'Question'} {currentQuestionIndex + 1} / {questions.length}
                                </span>
                                <span className="text-neon-cyan">•</span>
                                <span>{assessmentText?.answeredLabel || 'Answered'} {answeredCount}/{questions.length} ({progress}%)</span>
                                <span className="text-neon-cyan">•</span>
                                <span>{formatAcademicContext(contextForm)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-3 w-full rounded-full bg-slate-200 mb-8">
                        <div
                            className="h-3 rounded-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="rounded-[32px] border-2 border-neon-cyan bg-white p-10 shadow-[0_20px_60px_rgba(34,211,238,0.08)]">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 mb-6">
                            <Target size={16} className="text-neon-pink" />
                            {currentQuestion.dimension} - {DIMENSION_LABELS[currentQuestion.dimension]}
                        </div>

                        <h2 className="text-4xl font-bold text-slate-900 text-center leading-tight mb-10">
                            {getQuestionPrompt(currentQuestion)}
                        </h2>

                        <div className="grid gap-4 md:grid-cols-2">
                            {scaleOptions.map((option) => {
                                const selected = answers[currentQuestion.id] === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleAnswer(option.value)}
                                        className={`rounded-2xl border px-6 py-5 text-left transition-all ${
                                            selected
                                                ? 'border-neon-cyan bg-neon-cyan/10 shadow-[0_10px_30px_rgba(34,211,238,0.12)]'
                                                : 'border-slate-200 bg-white hover:border-neon-cyan/60'
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div
                                                className={`mt-1 h-6 w-6 rounded-full border-2 ${
                                                    selected
                                                        ? 'border-neon-cyan bg-neon-cyan'
                                                        : 'border-slate-400'
                                                }`}
                                            />
                                            <div>
                                                <div className="text-sm font-semibold text-slate-500 mb-1">
                                                    {option.code} • {option.value} {getPointLabel(option.value)}
                                                </div>
                                                <div className="text-xl font-semibold text-slate-900">
                                                    {getScaleLabel(option)}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handlePrevious}
                            disabled={currentQuestionIndex === 0}
                            className="rounded-2xl border border-slate-200 px-8 py-4 text-xl font-semibold text-slate-500 disabled:opacity-50"
                        >
                            <span className="inline-flex items-center gap-3">
                                <ArrowLeft size={22} />
                                {assessmentText?.previous || 'Previous'}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={handleNext}
                            className="rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 px-8 py-4 text-xl font-semibold text-white shadow-sm hover:shadow-sky-200/60"
                        >
                            <span className="inline-flex items-center gap-3">
                                {currentQuestionIndex === questions.length - 1
                                    ? (assessmentText?.submit || 'Submit')
                                    : (assessmentText?.next || 'Next')}
                                <ArrowRight size={22} />
                            </span>
                        </button>
                    </div>

                    <div className="mt-10 text-center">
                        <button
                            type="button"
                            onClick={() => setView('landing')}
                            className="text-xl text-slate-500 hover:text-slate-900 transition-colors"
                        >
                            ← {assessmentText?.backToHub || 'Back to Assessment Hub'}
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {renderSubmittingOverlay()}
            <div className="min-h-screen bg-[#ffffff] pt-24 pb-12">
                <div className="container mx-auto max-w-6xl px-4">
                    <StepIndicator current="assessment" />
                    <div className="grid gap-8 lg:grid-cols-[1.15fr,0.85fr] fade-in-up">
                    <div className="space-y-8">
                        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
                            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-neon-cyan/20 to-neon-pink/20 px-4 py-2 text-sm font-semibold text-slate-900">
                                <Brain size={16} className="text-neon-cyan" />
                                {landingText.badge || 'Step 1 - Student Assessment Profile'}
                            </div>
                            <h1 className="mt-5 text-5xl font-bold leading-tight text-slate-900">
                                {landingText.title || 'Build your online capability profile with a RIASEC assessment'}
                            </h1>
                            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                                {landingText.subtitle || 'This assessment stores every attempt, calculates your Holland code, tracks your development over multiple years, and builds a reusable skill vector for later program matching.'}
                            </p>

                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="text-sm text-slate-500">{landingText.totalQuestions || 'Total Questions'}</div>
                                    <div className="text-3xl font-bold text-slate-900">{questions.length}</div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="text-sm text-slate-500">{landingText.assessmentMode || 'Assessment Mode'}</div>
                                    <div className="text-3xl font-bold text-slate-900">{questionMode === 'adaptive' ? 'Adaptive' : `v${questionVersion}`}</div>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="text-sm text-slate-500">{landingText.attemptsSaved || 'Attempts Saved'}</div>
                                    <div className="text-3xl font-bold text-slate-900">{history.length}</div>
                                </div>
                            </div>

                            <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                                <div className="flex items-start gap-3">
                                    <GraduationCap className="mt-1 text-neon-pink" size={20} />
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">
                                            {landingText.academicContext || 'Academic Context'}
                                        </h2>
                                        <p className="mt-2 text-slate-600">
                                            {landingText.academicContextHelp || 'Automatically attached from your profile. Update via'}{' '}
                                            <Link href="/profile?tab=settings" className="text-neon-cyan underline hover:text-sky-700">{landingText.profileSettings || 'Profile Settings'}</Link>.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{landingText.gradeLevel || 'Grade Level'}</div>
                                        <div className="mt-1 text-lg font-bold text-slate-900">{contextForm.gradeLevel || '—'}</div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{landingText.academicYear || 'Academic Year'}</div>
                                        <div className="mt-1 text-lg font-bold text-slate-900">{contextForm.academicYear || '—'}</div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{landingText.semester || 'Semester'}</div>
                                        <div className="mt-1 text-lg font-bold text-slate-900">{contextForm.semester || '—'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <button
                                    type="button"
                                    onClick={hasSavedProgress ? resumeAssessment : startAssessment}
                                    className="rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:shadow-sky-200/60"
                                >
                                    <span className="inline-flex items-center gap-3">
                                        <Play size={20} />
                                        {history.length ? (landingText.retakeAssessment || 'Retake Assessment') : (landingText.startAssessment || 'Start Assessment')}
                                    </span>
                                </button>

                                <Link
                                    href="/assessment/history"
                                    className="rounded-2xl border border-slate-300 px-8 py-4 text-lg font-semibold text-slate-700 hover:border-neon-cyan hover:text-slate-900 transition-colors"
                                >
                                    <span className="inline-flex items-center gap-3">
                                        <History size={20} />
                                        {landingText.viewHistory || 'View History'}
                                    </span>
                                </Link>

                                <Link
                                    href="/profile?tab=settings"
                                    className="rounded-2xl border border-slate-300 px-8 py-4 text-lg font-semibold text-slate-700 hover:border-neon-cyan hover:text-slate-900 transition-colors"
                                >
                                    {landingText.updateStudentProfile || 'Update Student Profile'}
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-[32px] border border-slate-200 bg-white p-6">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">{landingText.assessmentScale || 'Assessment Scale'}</h2>
                            <div className="space-y-3">
                                {scaleOptions.map((option) => (
                                    <div key={option.value} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                        <span className="font-semibold text-slate-700">
                                            {option.code} - {getScaleLabel(option)}
                                        </span>
                                        <span className="text-sm font-semibold text-slate-500">
                                            {option.value} {getPointLabel(option.value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[32px] border border-slate-200 bg-white p-6">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">{landingText.latestSnapshot || 'Latest Snapshot'}</h2>
                            {latestAttempt ? (
                                <div className="space-y-4">
                                    <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200">
                                        <div className="text-sm text-slate-500">{landingText.currentHollandCode || 'Current Holland Code'}</div>
                                        <div className="text-4xl font-bold text-neon-pink mt-2">
                                            {latestAttempt.hollandCode}
                                        </div>
                                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                                            <Calendar size={15} />
                                            {new Date(latestAttempt.submittedAt).toLocaleString()}
                                        </div>
                                        <div className="mt-2 text-sm text-slate-600">
                                            {formatAcademicContext(latestAttempt)}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {Object.entries(latestAttempt.normalizedScores || {}).map(([dimension, value]) => (
                                            <ScoreBar key={dimension} dimension={dimension} value={Number(value || 0)} />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-600">
                                    {landingText.noAssessment || 'No assessment has been completed yet. Start the first attempt to create the initial student profile.'}
                                </p>
                            )}
                        </div>

                        <div className="rounded-[32px] border border-slate-200 bg-white p-6">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">{landingText.whatGetsSaved || 'What gets saved'}</h2>
                            <ul className="space-y-3 text-slate-600">
                                <li>{landingText.savedAttempt || 'Every attempt is stored separately with grade, year, and semester.'}</li>
                                <li>{landingText.savedLatest || 'The latest attempt becomes your current profile snapshot.'}</li>
                                <li>{landingText.savedStable || 'The system also computes a stable profile from recent attempts.'}</li>
                                <li>{landingText.savedGrowth || 'Growth indicators compare your latest profile against previous and baseline attempts.'}</li>
                            </ul>
                        </div>

                        <div className="rounded-[32px] border border-slate-200 bg-white p-6">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">{landingText.profileReadiness || 'Profile readiness'}</h2>
                            <div className="space-y-3 text-slate-600">
                                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                    <span className="inline-flex items-center gap-2">
                                        <TrendingUp size={16} className="text-neon-cyan" />
                                        {landingText.stableProfileAvailable || 'Stable profile available'}
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                        {assessmentProfile?.totalAttempts > 1 ? (landingText.yes || 'Yes') : (landingText.notYet || 'Not yet')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                    <span className="inline-flex items-center gap-2">
                                        <Clock size={16} className="text-neon-pink" />
                                        {landingText.firstAssessed || 'First assessed'}
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                        {assessmentProfile?.firstAssessedAt
                                            ? new Date(assessmentProfile.firstAssessedAt).toLocaleDateString()
                                            : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </>
    );
}
