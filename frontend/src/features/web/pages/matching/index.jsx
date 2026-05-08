import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle,
    ArrowRight,
    BookOpen,
    Brain,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Compass,
    Download,
    History,
    Layers3,
    ListFilter,
    Play,
    Sparkles,
    Target,
    TrendingUp,
    Trophy,
} from 'lucide-react';
import Link from '@frontend/components/AppLink';
import {
    fetchLatestMatchingRun,
    fetchMatchingHistory,
    fetchMatchingRunDetail,
    fetchPrograms,
    fetchSavedPrograms,
    runMatching,
    runWhatIfMatching,
} from '@frontend/api/services';
import { QUERY_KEYS } from '@frontend/constants/queryKeys';
import { APP_ROUTES } from '@frontend/constants/routes';
import { useRouter, useSearchParams } from '@frontend/routes/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import StepIndicator from '../../components/ui/StepIndicator';
import toast from 'react-hot-toast';
import { downloadCsv } from '../../utils/exportCsv';
import FeedbackWidget from './FeedbackWidget';

const MATCHING_SCOPES = [
    { value: 'SAVED_ONLY', label: 'Saved Programs Only', shortLabel: 'Saved shortlist', description: 'Only programs you have saved.' },
    { value: 'ALL_PUBLISHED', label: 'All Published Programs', shortLabel: 'All published', description: 'Every published Step-2 program.' },
    { value: 'COMPARE', label: 'Compare Selected', shortLabel: 'Direct compare', description: 'Pick 2-3 saved programs to compare.' },
];

const RIASEC_DIMENSIONS = ['R', 'I', 'A', 'S', 'E', 'C'];
const DEFAULT_SCENARIO_SCORES = { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 };

function getScopeMeta(scope) {
    return MATCHING_SCOPES.find((s) => s.value === scope) || MATCHING_SCOPES[0];
}
function fitColor(fitLevel) {
    if (fitLevel === 'HIGH_FIT') return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'from-emerald-400 to-emerald-600' };
    if (fitLevel === 'MEDIUM_FIT') return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', bar: 'from-sky-400 to-blue-500' };
    return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'from-amber-400 to-orange-500' };
}

function fitLabel(fitLevel, text = {}) {
    if (fitLevel === 'HIGH_FIT') return text?.fit?.high || 'High Fit';
    if (fitLevel === 'MEDIUM_FIT') return text?.fit?.medium || 'Medium Fit';
    return text?.fit?.stretch || 'Stretch';
}

function comparisonNote(confidence) {
    const value = String(confidence || '').toUpperCase();
    if (value === 'HIGH') return 'The top result has a clear score advantage.';
    if (value === 'MEDIUM') return 'The top result leads, but the next options are still worth comparing.';
    if (value === 'LOW') return 'Top programs are close in score. Compare the first few options before deciding.';
    return '';
}
function ResultRow({ result, defaultExpanded = false, text = {} }) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const fit = fitColor(result.fitLevel);
    const score = Math.round(result.finalScore || 0);

    const explanationLines = [
        result.explanation?.summary,
        result.explanation?.whyItFits,
        result.explanation?.growthNarrative,
        result.explanation?.caution,
        result.explanation?.careerNarrative,
    ].filter(Boolean);

    return (
        <div
            className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-colors ${expanded ? 'border-sky-200' : 'border-slate-200'}`}
        >
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors"
            >
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {result.rank}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate">{result.program?.name}</div>
                    <div className="text-sm text-slate-500 truncate">
                        {result.program?.university?.shortName || result.program?.university?.name}
                        {result.program?.focusArea ? ` \u00b7 ${result.program.focusArea}` : ''}
                        {result.explanation?.primaryCareer ? ` \u2192 ${result.explanation.primaryCareer}` : ''}
                    </div>
                </div>

                <div className="hidden sm:flex items-center gap-3 flex-shrink-0 w-40">
                    <div className="flex-1 h-2 rounded-full bg-slate-100">
                        <div className={`h-2 rounded-full bg-gradient-to-r ${fit.bar}`} style={{ width: `${score}%` }} />
                    </div>
                    <span className="text-lg font-black text-slate-900 w-10 text-right">{score}</span>
                </div>

                <span className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${fit.bg} ${fit.text} ${fit.border} border`}>
                    {fitLabel(result.fitLevel, text)}
                </span>

                <span className="sm:hidden text-lg font-black text-slate-900">{score}</span>

                {expanded ? <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />}
            </button>

            {expanded && (
                <div className="overflow-hidden border-t border-slate-100">
                        <div className="px-5 py-5 space-y-5">
                            {(result.explanation?.riasecComparison || []).length > 0 && (
                                <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-cyan-600 mb-3">{text.riasecComparison || 'RIASEC Comparison: You vs Program'}</div>
                                    <div className="space-y-2">
                                        {result.explanation.riasecComparison.map((dim) => (
                                            <div key={dim.dimension} className="flex items-center gap-2">
                                                <span className="w-6 text-xs font-bold text-cyan-800 text-center">{dim.dimension}</span>
                                                <div className="flex-1 flex items-center gap-1">
                                                    <div className="flex-1 relative h-4 rounded bg-slate-100">
                                                        <div className="absolute inset-y-0 left-0 rounded bg-gradient-to-r from-cyan-400 to-cyan-500" style={{ width: `${dim.student}%` }} />
                                                        <span className="absolute inset-y-0 left-1 flex items-center text-[10px] font-semibold text-white drop-shadow">{dim.student}</span>
                                                    </div>
                                                    <div className="flex-1 relative h-4 rounded bg-slate-100">
                                                        <div className="absolute inset-y-0 left-0 rounded bg-gradient-to-r from-indigo-400 to-indigo-500" style={{ width: `${dim.program}%` }} />
                                                        <span className="absolute inset-y-0 left-1 flex items-center text-[10px] font-semibold text-white drop-shadow">{dim.program}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-2 flex items-center gap-4 text-[10px] font-medium text-slate-500">
                                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-cyan-400" /> {text.you || 'You'}</span>
                                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-indigo-400" /> {text.program || 'Program'}</span>
                                    </div>
                                </div>
                            )}

                            {((result.explanation?.specializationTags || []).length > 0 || result.explanation?.primaryCareer) && (
                                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                                    {(result.explanation?.specializationTags || []).length > 0 && (
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-2">{text.specializations || 'Specializations'}</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {result.explanation.specializationTags.map((tag, i) => (
                                                    <span key={i} className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700">{tag}</span>
                                                ))}
                                                {result.explanation.learningOrientation && (
                                                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                                        {result.explanation.learningOrientation}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {result.explanation?.primaryCareer && (
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-2">{text.careerPathway || 'Career Pathway'}</div>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {(result.explanation.careerPathways || []).map((path, i) => (
                                                    <span key={i} className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${i === 0 ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-600'}`}>
                                                        {i === 0 ? `★ ${path}` : path}
                                                    </span>
                                                ))}
                                            </div>
                                            {result.explanation.careerDifferentiation && (
                                                <p className="mt-2 text-xs leading-relaxed text-indigo-600">
                                                    {result.explanation.careerDifferentiation}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <TagList label={text.strengths || 'Strengths'} items={result.strengths} color="cyan" />
                                <TagList label={text.gaps || 'Gaps'} items={result.gaps} color="rose" />
                            </div>

                            {explanationLines.length > 0 && (
                                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
                                    {explanationLines.map((line, i) => (
                                        <p key={i} className="text-sm leading-relaxed text-slate-600">{line}</p>
                                    ))}
                                </div>
                            )}



                            {(result.aiExplanation || result.aiExplanationDetail) && (
                                <AiCounselorBlock
                                    summary={result.aiExplanation}
                                    detail={result.aiExplanationDetail}
                                    text={text}
                                />
                            )}

                            {(result.program?.keyCourses || []).length > 0 && (
                                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-violet-500 mb-2">{text.keyCourses || 'Key Courses'}</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {result.program.keyCourses.map((course, i) => (
                                            <span key={i} className="rounded-md bg-white border border-violet-200 px-2 py-0.5 text-xs font-medium text-violet-700">
                                                {course}
                                            </span>
                                        ))}
                                    </div>
                                    {result.program.courseSourceUrl && (
                                        <a href={result.program.courseSourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800">
                                            {text.viewOriginalCurriculum || 'View original curriculum'} ↗
                                        </a>
                                    )}
                                </div>
                            )}

                            {(result.program?.latestCurriculum?.objectives || []).length > 0 && (
                                <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-sky-500 mb-2">{text.programObjectives || 'Program Objectives'}</div>
                                    <ul className="space-y-1">
                                        {result.program.latestCurriculum.objectives.slice(0, 4).map((obj, i) => (
                                            <li key={i} className="text-xs leading-relaxed text-sky-800 flex gap-2">
                                                <span className="text-sky-400 flex-shrink-0">•</span>
                                                <span>{obj}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {(result.program?.careerOutcomes || []).filter(c => c.title).length > 0 && (
                                <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-teal-500 mb-2">{text.careerOutcomes || 'Career Outcomes'}</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {result.program.careerOutcomes.filter(c => c.title).map((c, i) => (
                                            <span key={i} className={`rounded-md border px-2.5 py-1 text-xs font-medium ${c.isPrimary ? 'border-teal-300 bg-teal-100 text-teal-800 font-semibold' : 'border-slate-200 bg-white text-slate-600'}`}>
                                                {c.title}
                                                <span className="ml-1 text-[10px] text-slate-400">({c.relevance}/10)</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Link
                                href={`/programs/${result.program?.slug || result.program?.id}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-sky-600 hover:to-blue-700 transition-all"
                            >
                                {text.viewProgramDetail || 'View Program Detail'}
                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            {result.id && (
                                <FeedbackWidget matchResultId={result.id} />
                            )}
                        </div>
                </div>
            )}
        </div>
    );
}

function TagList({ label, items = [], color = 'cyan' }) {
    const cls = color === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-cyan-50 text-cyan-700 border-cyan-100';
    return (
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{label}</div>
            <div className="flex flex-wrap gap-1.5">
                {items?.length ? items.map((item) => (
                    <span key={`${item.type}-${item.key}`} className={`rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>{item.label}</span>
                )) : (
                    <span className="text-xs text-slate-400">&mdash;</span>
                )}
            </div>
        </div>
    );
}
function AiCounselorBlock({ summary, detail, text = {} }) {
    const [expanded, setExpanded] = useState(false);
    const hasDetail = detail && typeof detail === 'object' && (
        detail.whyTopChoice || detail.evidenceFromCurriculum || detail.whyItFits
        || detail.growthNarrative || detail.caution
        || (Array.isArray(detail.guidance) && detail.guidance.length > 0)
    );
    const headline = detail?.headline || '';
    const layer1Text = detail?.summary || summary || '';
    const evidenceShort = detail?.evidenceFromCurriculum || '';

    if (!layer1Text && !headline) return null;

    return (
        <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-fuchsia-800">
                    <Sparkles className="h-4 w-4" />
                    {text.aiCounselor || 'AI Counselor'}
                    <span className="text-[10px] font-normal text-fuchsia-500">{text.decisionSupport || 'decision support'}</span>
                </div>
            </div>

            {headline && (
                <p className="text-sm font-semibold text-fuchsia-900 mb-1.5 leading-snug">{headline}</p>
            )}

            {layer1Text && (
                <p className="text-sm leading-relaxed text-fuchsia-700">{layer1Text}</p>
            )}

            {evidenceShort && !expanded && (
                <p className="mt-1.5 text-xs leading-relaxed text-fuchsia-600 italic flex gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>{evidenceShort}</span>
                </p>
            )}

            {hasDetail && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-700 hover:text-fuchsia-900 transition-colors"
                >
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {expanded ? (text.showLess || 'Show less') : (text.seeFullAnalysis || 'See full analysis')}
                </button>
            )}

            {expanded && hasDetail && (
                <div className="mt-3 space-y-3 border-t border-fuchsia-200 pt-3">
                    {detail.whyTopChoice && (
                        <DetailRow icon={Trophy} color="text-amber-600" label={text.whatSetsApart || 'What sets this apart'}>
                            {detail.whyTopChoice}
                        </DetailRow>
                    )}
                    {detail.evidenceFromCurriculum && (
                        <DetailRow icon={BookOpen} color="text-violet-600" label={text.evidenceFromCurriculum || 'Evidence from curriculum'}>
                            {detail.evidenceFromCurriculum}
                        </DetailRow>
                    )}
                    {detail.whyItFits && (
                        <DetailRow icon={CheckCircle2} color="text-emerald-600" label={text.howItAligns || 'How it aligns with your profile'}>
                            {detail.whyItFits}
                        </DetailRow>
                    )}
                    {detail.growthNarrative && (
                        <DetailRow icon={TrendingUp} color="text-indigo-600" label={text.connectionToGrowth || 'Connection to your growth'}>
                            {detail.growthNarrative}
                        </DetailRow>
                    )}
                    {detail.caution && (
                        <DetailRow icon={AlertTriangle} color="text-orange-600" label={text.thingsToWatch || 'Things to watch for'}>
                            {detail.caution}
                        </DetailRow>
                    )}
                    {Array.isArray(detail.guidance) && detail.guidance.length > 0 && (
                        <DetailRow icon={Compass} color="text-rose-600" label={text.ifYouExplore || 'If you decide to explore this'}>
                            <ul className="space-y-1">
                                {detail.guidance.map((step, i) => (
                                    <li key={i} className="flex gap-2">
                                        <span className="text-rose-400 flex-shrink-0">{i + 1}.</span>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ul>
                        </DetailRow>
                    )}
                </div>
            )}

            <p className="mt-3 text-[10px] text-fuchsia-500 italic">
                ℹ️ AI guidance complements but does not replace counseling from teachers, family, and advisors.
            </p>
        </div>
    );
}

function DetailRow({ icon: Icon, color, label, children }) {
    return (
        <div className="flex gap-2.5">
            <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${color}`} />
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">{label}</div>
                <div className="text-sm leading-relaxed text-slate-700">{children}</div>
            </div>
        </div>
    );
}
function AiInsightCollapsible({ aiParsed, text = {} }) {
    const [open, setOpen] = useState(false);
    const hasMore = !!(aiParsed.differentiator || aiParsed.dayInTheLife || aiParsed.careerOutlook
        || (Array.isArray(aiParsed.tradeoffs) && aiParsed.tradeoffs.length > 0)
        || aiParsed.nextStepAdvice);

    return (
        <div className="mt-3 rounded-lg border border-fuchsia-100 bg-fuchsia-50/50 p-3">
            <div className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-1 text-fuchsia-600" />
                <p className="text-sm leading-relaxed text-fuchsia-900 flex-1">
                    {aiParsed.comparisonSummary}
                </p>
            </div>
            {hasMore && (
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-fuchsia-700 hover:text-fuchsia-900"
                >
                    {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {open ? (text.hideDetails || 'Hide details') : (text.showCurriculumDetails || 'Show curriculum, careers & next step')}
                </button>
            )}
            {open && hasMore && (
                <div className="mt-2 pt-2 border-t border-fuchsia-100 space-y-2">
                    {aiParsed.differentiator && (
                        <InsightLine icon={Trophy} color="text-amber-600" label={text.whatSetsItApart || 'What sets it apart'}>{aiParsed.differentiator}</InsightLine>
                    )}
                    {aiParsed.dayInTheLife && (
                        <InsightLine icon={BookOpen} color="text-violet-600" label={text.aWeekHere || 'A week here'}>{aiParsed.dayInTheLife}</InsightLine>
                    )}
                    {aiParsed.careerOutlook && (
                        <InsightLine icon={Target} color="text-rose-600" label={text.whereGraduatesGo || 'Where graduates go'}>{aiParsed.careerOutlook}</InsightLine>
                    )}
                    {Array.isArray(aiParsed.tradeoffs) && aiParsed.tradeoffs.length > 0 && (
                        <InsightLine icon={CheckCircle2} color="text-emerald-600" label={text.tradeoffs || 'Tradeoffs'}>
                            <ul className="space-y-0.5">
                                {aiParsed.tradeoffs.map((t, i) => (
                                    <li key={i} className="flex gap-1.5"><span className="text-emerald-400 flex-shrink-0">•</span><span>{t}</span></li>
                                ))}
                            </ul>
                        </InsightLine>
                    )}
                    {aiParsed.nextStepAdvice && (
                        <InsightLine icon={Compass} color="text-indigo-600" label={text.thisWeek || 'This week'}>{aiParsed.nextStepAdvice}</InsightLine>
                    )}
                </div>
            )}
        </div>
    );
}

function InsightLine({ icon: Icon, color, label, children }) {
    return (
        <div className="flex gap-2 text-xs leading-relaxed text-slate-700">
            <Icon className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${color}`} />
            <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mr-1.5">{label}:</span>
                {children}
            </div>
        </div>
    );
}
function ComparisonBanner({ comparison, aiComparison, text = {} }) {
    if (!comparison) return null;
    const aiParsed = aiComparison?.parsed || null;
    const note = comparisonNote(comparison.confidence);

    return (
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="max-w-2xl">
                    <div className="text-xs font-bold uppercase tracking-wider text-sky-600">{text.recommendation || 'Recommendation'}</div>
                    <h3 className="mt-1 text-xl font-black text-slate-900">{comparison.recommendedProgramName || text.bestMatch || 'Best match'}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{comparison.summary}</p>
                    {comparison.counselorAdvice && (
                        <p className="mt-2 text-sm leading-relaxed text-sky-800 bg-sky-50 rounded-lg p-3 border border-sky-100">
                            {comparison.counselorAdvice}
                        </p>
                    )}
                    {note ? <p className="mt-2 text-xs text-slate-500">{note}</p> : null}
                    {aiParsed?.comparisonSummary && <AiInsightCollapsible aiParsed={aiParsed} text={text} />}
                </div>
                <div className="flex gap-3 flex-shrink-0">
                    <div className="rounded-xl bg-white border border-sky-100 p-3 text-center min-w-[80px] shadow-sm">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{text.gap || 'Gap'}</div>
                        <div className="text-xl font-black text-slate-900">{Number(comparison.scoreGap || 0).toFixed(1)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
function MiniStat({ label, value }) {
    return (
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="mt-0.5 text-base font-bold text-slate-900">{value}</div>
        </div>
    );
}
export default function MatchingPage() {
    const { user, loading: authLoading } = useAuth();
    const { translations } = useLanguage();
    const text = translations?.matchingPage || {};
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const [scope, setScope] = useState('ALL_PUBLISHED');
    const [focusArea, setFocusArea] = useState('');
    const [includeAiExplanation, setIncludeAiExplanation] = useState(false);
    const [activeRunId, setActiveRunId] = useState('');
    const [selectedProgramIds, setSelectedProgramIds] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showWhatIf, setShowWhatIf] = useState(false);
    const [scenarioScores, setScenarioScores] = useState(DEFAULT_SCENARIO_SCORES);

    useEffect(() => {
        if (!authLoading && !user) router.push('/auth/signin?next=%2Fmatching');
    }, [authLoading, router, user]);

    useEffect(() => {
        const requestedRunId = searchParams.get('runId') || '';
        if (requestedRunId && requestedRunId !== activeRunId) {
            setActiveRunId(requestedRunId);
        }
    }, [activeRunId, searchParams]);

    const datasetQuery = useQuery({
        queryKey: [...QUERY_KEYS.PROGRAMS, 'matching-options'],
        queryFn: () => fetchPrograms({ limit: 100 }),
    });

    const latestRunQuery = useQuery({
        queryKey: [...QUERY_KEYS.MATCHING_LATEST, scope, focusArea],
        queryFn: () => fetchLatestMatchingRun({ scope, focusArea, limit: 12 }),
        enabled: Boolean(user && scope !== 'COMPARE'),
    });

    const historyQuery = useQuery({
        queryKey: QUERY_KEYS.MATCHING_HISTORY,
        queryFn: () => fetchMatchingHistory({ limit: 8 }),
        enabled: Boolean(user),
    });

    const activeRunQuery = useQuery({
        queryKey: [...QUERY_KEYS.MATCHING_RUN, activeRunId],
        queryFn: () => fetchMatchingRunDetail(activeRunId, { limit: 16 }),
        enabled: Boolean(user && activeRunId),
    });

    const savedProgramsQuery = useQuery({
        queryKey: QUERY_KEYS.SAVED_PROGRAMS,
        queryFn: fetchSavedPrograms,
        enabled: Boolean(user),
    });

    const focusAreas = useMemo(
        () => Array.from(new Set((datasetQuery.data?.items || []).map((i) => i.focusArea).filter(Boolean))).sort(),
        [datasetQuery.data?.items],
    );

    const runMutation = useMutation({
        mutationFn: () =>
            runMatching({
                scope,
                focusArea,
                limit: 12,
                includeAiExplanation,
                programIds: scope === 'COMPARE' ? selectedProgramIds : undefined,
            }),
        onSuccess: async (item) => {
            setActiveRunId(item?.id || '');
            setShowWhatIf(false);
            router.replace(APP_ROUTES.MATCHING);
            toast.success(text.matchingComplete || 'Matching complete');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MATCHING_HISTORY }),
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MATCHING_LATEST }),
            ]);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.error || error?.message || text.matchingFailed || 'Matching failed');
        },
    });

    const whatIfMutation = useMutation({
        mutationFn: () => runWhatIfMatching({ riasec: scenarioScores }),
        onSuccess: () => {
            setActiveRunId('');
            router.replace(APP_ROUTES.MATCHING);
            toast.success(text.whatIfComplete || 'What-if preview ready');
        },
        onError: (error) => {
            toast.error(error?.response?.data?.error || error?.message || text.whatIfFailed || 'What-if preview failed');
        },
    });

    const persistedRun = activeRunQuery.data || runMutation.data || (scope === 'COMPARE' ? null : latestRunQuery.data) || null;
    const currentRun = (showWhatIf && whatIfMutation.data) || persistedRun;
    const realProfileScores = persistedRun?.stableScores || persistedRun?.profileSnapshot?.stableScores || DEFAULT_SCENARIO_SCORES;
    const historyItems = historyQuery.data?.items || [];
    const historyTotal = Number(historyQuery.data?.total || 0);
    const savedPrograms = savedProgramsQuery.data || [];
    const scopeOptions = MATCHING_SCOPES.map((item) => {
        if (item.value === 'SAVED_ONLY') {
            return {
                ...item,
                label: text?.scopes?.savedOnly || item.label,
                shortLabel: text?.scopes?.savedShort || item.shortLabel,
            };
        }
        if (item.value === 'ALL_PUBLISHED') {
            return {
                ...item,
                label: text?.scopes?.allPublished || item.label,
                shortLabel: text?.scopes?.allShort || item.shortLabel,
            };
        }
        return {
            ...item,
            label: text?.scopes?.compare || item.label,
            shortLabel: text?.scopes?.compareShort || item.shortLabel,
        };
    });
    const getScopeMetaFor = (value) => scopeOptions.find((item) => item.value === value) || scopeOptions[0] || getScopeMeta(value);

    function handleExportCsv() {
        if (!currentRun?.results?.length) return;
        downloadCsv({
            filename: `matching-${new Date().toISOString().slice(0, 10)}.csv`,
            columns: [
                { key: 'rank', header: 'Rank' },
                { key: 'program', header: 'Program' },
                { key: 'university', header: 'University' },
                { key: 'finalScore', header: 'Score' },
                { key: 'fitLevel', header: 'Fit' },
                { key: 'riasecScore', header: 'RIASEC' },
            ],
            rows: currentRun.results.map((r, i) => ({
                rank: i + 1,
                program: r.program?.name || '',
                university: r.program?.university?.shortName || '',
                finalScore: Math.round(r.finalScore || 0),
                fitLevel: r.fitLevel || '',
                riasecScore: Math.round(r.riasecScore || 0),
            })),
        });
    }

    function toggleSelectedProgram(programId) {
        setSelectedProgramIds((c) =>
            c.includes(programId) ? c.filter((x) => x !== programId) : c.length >= 3 ? [...c.slice(1), programId] : [...c, programId],
        );
    }

    function openWhatIf() {
        setShowWhatIf((current) => {
            const next = !current;
            if (next) {
                setScenarioScores({ ...DEFAULT_SCENARIO_SCORES, ...realProfileScores });
            }
            return next;
        });
    }

    function updateScenarioScore(dimension, value) {
        const score = Math.max(0, Math.min(100, Number(value) || 0));
        setScenarioScores((current) => ({ ...current, [dimension]: score }));
    }

    function resetScenarioScores() {
        setScenarioScores({ ...DEFAULT_SCENARIO_SCORES, ...realProfileScores });
    }

    function openRun(runId) {
        setActiveRunId(runId);
        setShowWhatIf(false);
        setShowHistory(false);
        router.replace(`${APP_ROUTES.MATCHING}?runId=${encodeURIComponent(runId)}`);
    }

    function handleRun() {
        if (scope === 'COMPARE' && selectedProgramIds.length < 2) {
            toast.error(text.selectAtLeastTwo || 'Select at least 2 programs.');
            return;
        }
        runMutation.mutate();
    }

    if (authLoading) {
        return <main className="min-h-screen bg-[#f7fafc] pt-24 pb-16 flex items-center justify-center text-slate-500">{text.loading || 'Loading...'}</main>;
    }
    if (!user) return null;

    return (
        <main className="min-h-screen bg-[#f7fafc] pt-24 pb-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <StepIndicator current="matching" />

                <div className="mb-6">
                    <div className="inline-flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700">
                        <Target className="h-3.5 w-3.5" />
                        {text.badge || 'Step 3 — Matching Engine'}
                    </div>
                    <h1 className="mt-3 text-3xl font-black text-slate-950 md:text-4xl">{text.title || 'Program Matching'}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-500">
                        {text.subtitle || 'Compare your RIASEC + skill profile against published program profiles. Score is deterministic; AI adds optional explanations.'}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                        <label className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1.5">
                                <Layers3 className="h-3.5 w-3.5" /> {text.scope || 'Scope'}
                            </span>
                            <select
                                value={scope}
                                onChange={(e) => {
                                    setScope(e.target.value);
                                    setActiveRunId('');
                                    setShowWhatIf(false);
                                    router.replace(APP_ROUTES.MATCHING);
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-300"
                            >
                                {scopeOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </label>

                        <label className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1.5">
                                <ListFilter className="h-3.5 w-3.5" /> {text.focusArea || 'Focus Area'}
                            </span>
                            <select
                                value={focusArea}
                                onChange={(e) => { setFocusArea(e.target.value); setActiveRunId(''); router.replace(APP_ROUTES.MATCHING); }}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-300"
                            >
                                <option value="">{text.allAreas || 'All areas'}</option>
                                {focusAreas.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </label>

                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={includeAiExplanation} onChange={(e) => setIncludeAiExplanation(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                            <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" />
                            <span>{text.aiLayer || 'AI Layer'}</span>
                        </label>

                        <button
                            type="button"
                            onClick={handleRun}
                            disabled={runMutation.isPending}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-sky-600 hover:to-indigo-700 disabled:opacity-60 transition-all"
                        >
                            {runMutation.isPending ? <><Brain className="h-4 w-4 animate-pulse" /> {text.running || 'Running...'}</> : <><Play className="h-4 w-4" /> {text.runMatching || 'Run Matching'}</>}
                        </button>
                    </div>

                    {scope === 'ALL_PUBLISHED' ? (
                        <div className="mt-2">
                            <button
                                type="button"
                                onClick={openWhatIf}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-200"
                            >
                                <Sparkles className="h-3 w-3" />
                                What-if
                            </button>
                        </div>
                    ) : null}

                    {showWhatIf ? (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">What-if simulation</div>
                                    <div className="text-xs text-slate-400">Preview only. This does not change your saved profile.</div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={resetScenarioScores}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => whatIfMutation.mutate()}
                                        disabled={whatIfMutation.isPending}
                                        className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-60"
                                    >
                                        {whatIfMutation.isPending ? 'Previewing...' : 'Preview'}
                                    </button>
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {RIASEC_DIMENSIONS.map((dimension) => (
                                    <label key={dimension} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                        <div className="mb-1 flex items-center justify-between text-xs">
                                            <span className="font-bold text-slate-700">{dimension}</span>
                                            <span className="font-semibold text-slate-500">{scenarioScores[dimension]}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={scenarioScores[dimension]}
                                            onChange={(event) => updateScenarioScore(dimension, event.target.value)}
                                            className="w-full accent-sky-500"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {scope === 'COMPARE' && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="text-xs font-semibold text-slate-500 mb-2">{text.selectPrograms || 'Select 2-3 saved programs'} ({selectedProgramIds.length}/3)</div>
                            <div className="flex flex-wrap gap-2">
                                {savedPrograms.length ? savedPrograms.map((p) => {
                                    const sel = selectedProgramIds.includes(p.id);
                                    return (
                                        <button
                                            key={p.savedId || p.id}
                                            type="button"
                                            onClick={() => toggleSelectedProgram(p.id)}
                                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${sel ? 'border-sky-300 bg-sky-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200'}`}
                                        >
                                            {p.name}
                                        </button>
                                    );
                                }) : <span className="text-xs text-slate-400">{text.saveFirst || 'Save programs first in Step 2.'}</span>}
                            </div>
                        </div>
                    )}
                </div>

                {currentRun && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-bold text-slate-900">{currentRun.totalPrograms} {text.programsRanked || 'programs ranked'}</span>
                                <span className="h-4 w-px bg-slate-200" />
                                <span className="text-sm text-slate-500">
                                    {text.top || 'Top'}: <strong className="text-slate-800">{currentRun.topResult?.program?.name || currentRun.results?.[0]?.programName || '\u2014'}</strong> ({Math.round(currentRun.topResult?.finalScore || currentRun.results?.[0]?.hybridScore || 0)}/100)
                                </span>
                                <span className="h-4 w-px bg-slate-200" />
                                <span className="text-xs text-slate-400">
                                    {new Date(currentRun.createdAt).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setShowHistory(!showHistory)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-sky-200 hover:text-sky-700 transition-colors">
                                    <History className="h-3.5 w-3.5" /> {text.history || 'History'}
                                </button>
                                <Link href={APP_ROUTES.MATCHING_HISTORY} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-sky-200 hover:text-sky-700 transition-colors">
                                    {text.viewAll || 'View all'}
                                </Link>
                                <button type="button" onClick={handleExportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-sky-200 hover:text-sky-700 transition-colors">
                                    <Download className="h-3.5 w-3.5" /> {text.csv || 'CSV'}
                                </button>
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <MiniStat label={text.topScore || 'Top Score'} value={Math.round(currentRun.topResult?.finalScore || currentRun.results?.[0]?.hybridScore || 0)} />
                            <MiniStat label={text.programs || 'Programs'} value={currentRun.totalPrograms} />
                            <MiniStat label={text.scopeStat || 'Scope'} value={getScopeMetaFor(currentRun.scope).shortLabel} />
                        </div>
                    </div>
                )}

                {showHistory && (
                    <div className="mb-6 overflow-hidden">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <History className="h-4 w-4 text-cyan-600" /> {text.previousRuns || 'Previous Runs'}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {text.showing || 'Showing'} {historyItems.length} {text.of || 'of'} {historyTotal || historyItems.length}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {historyItems.length ? historyItems.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => openRun(item.id)}
                                            className={`rounded-xl border p-3 text-left transition-all text-sm ${item.id === currentRun?.id ? 'border-sky-200 bg-sky-50' : 'border-slate-100 bg-slate-50 hover:border-sky-200'}`}
                                        >
                                            <div className="font-semibold text-slate-800 truncate">{item.topResult?.program?.name || text.emptyRun || 'Empty run'}</div>
                                            <div className="mt-1 text-xs text-slate-400">{getScopeMetaFor(item.scope).shortLabel} &middot; {item.totalPrograms} {text.progs || 'progs'} &middot; {new Date(item.createdAt).toLocaleString()}</div>
                                        </button>
                                    )) : <div className="text-sm text-slate-400 col-span-full">{text.noPreviousRuns || 'No previous runs.'}</div>}
                                </div>
                                {historyTotal > historyItems.length && (
                                    <div className="mt-3 flex justify-end">
                                        <Link href={APP_ROUTES.MATCHING_HISTORY} className="text-xs font-semibold text-sky-700 hover:text-sky-800">
                                            {text.viewFullHistory || 'View full history'} →
                                        </Link>
                                    </div>
                                )}
                            </div>
                    </div>
                )}

                {!currentRun ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                        <Target className="mx-auto h-10 w-10 text-slate-300" />
                        <h2 className="mt-4 text-xl font-bold text-slate-700">{text.noRunTitle || 'No matching run yet'}</h2>
                        <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">{text.noRunHelp || 'Choose a scope above and click "Run Matching" to compare your profile against programs.'}</p>
                    </div>
                ) : (currentRun.results || []).length === 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                        <h2 className="text-lg font-bold text-amber-900">{text.noProgramsTitle || 'No programs matched'}</h2>
                        <p className="mt-2 text-sm text-amber-800">{text.noProgramsHelp || 'No candidates for this filter. Try "All Published Programs" or save programs first.'}</p>
                        <div className="mt-4 flex gap-3">
                            <button type="button" onClick={() => setScope('ALL_PUBLISHED')} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white">{text.switchToAll || 'Switch to All'}</button>
                            <Link href="/programs" className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900">{text.browsePrograms || 'Browse Programs'}</Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <ComparisonBanner comparison={currentRun.comparison} aiComparison={currentRun.aiComparison} text={text} />
                        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 p-4">
                            <div className="flex items-baseline justify-between gap-3 mb-2">
                                <h3 className="text-sm font-bold text-emerald-900">
                                    {(text.topProgramsTitle || 'Your top {{shown}} programs from {{total}} candidates')
                                        .replace('{{shown}}', currentRun.results.length)
                                        .replace('{{total}}', currentRun.totalPrograms || '93')}
                                </h3>
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                                    {text.strongAlignment || 'Strong alignment'}
                                </span>
                            </div>
                            <p className="text-xs leading-relaxed text-emerald-800">
                                {text.topProgramsHelp || 'These programs match your interest pattern best. Explore each one deeply before deciding.'}
                            </p>
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="flex items-start gap-1.5 text-xs text-emerald-800">
                                    <BookOpen className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                                    <span>{text.readAction || 'Read the curriculum and imagine your weekly schedule.'}</span>
                                </div>
                                <div className="flex items-start gap-1.5 text-xs text-emerald-800">
                                    <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                                    <span>{text.talkAction || 'Talk to a current student or alumni about real life.'}</span>
                                </div>
                                <div className="flex items-start gap-1.5 text-xs text-emerald-800">
                                    <Target className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                                    <span>{text.pictureAction || 'Picture yourself doing this work for 4 years and beyond.'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">
                                {text.programsWorth || 'Programs Worth Considering'} <span className="ml-2 text-sm font-normal text-slate-400">({currentRun.results.length} {text.matched || 'matched'})</span>
                            </h2>
                        </div>
                        <div className="space-y-2">
                            {currentRun.results.map((result, index) => (
                                <ResultRow 
                                    key={result.id || `${currentRun.id}-${result.programId || result.program?.id}`} 
                                    result={result} 
                                    defaultExpanded={index === 0} 
                                    text={text}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
