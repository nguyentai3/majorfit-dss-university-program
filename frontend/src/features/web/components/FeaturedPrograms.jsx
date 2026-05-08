import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useInView } from 'framer-motion';
import { Building2, ChevronRight, Sparkles } from 'lucide-react';
import Link from '@frontend/components/AppLink';
import { fetchHomepageData } from '@frontend/api/services';
import { QUERY_KEYS } from '@frontend/constants/queryKeys';
import { RIASEC_COLORS, DIMENSION_LABELS as RIASEC_LABELS } from '@frontend/utils/riasec';
import { useLanguage } from '../contexts/LanguageContext';

function ProgramCard({ program, index }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.1 });
    const hollandLetters = (program.hollandCode || '').split('').slice(0, 3);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: index * 0.08 }}
        >
            <Link
                href={`/programs/${program.slug || program.id}`}
                className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-sky-200 hover:-translate-y-1"
            >
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-sky-700 transition-colors truncate">
                            {program.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5 text-sm text-slate-500">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{program.university?.shortName || program.university?.name}</span>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-500 transition-colors shrink-0 mt-1" />
                </div>

                {program.focusArea && (
                    <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100 mb-3">
                        {program.focusArea}
                    </span>
                )}

                {program.summary && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                        {program.summary}
                    </p>
                )}

                {hollandLetters.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {hollandLetters.map((letter) => (
                            <span
                                key={letter}
                                className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${RIASEC_COLORS[letter] || 'bg-slate-100 text-slate-600'}`}
                                title={RIASEC_LABELS[letter]}
                            >
                                {letter} — {RIASEC_LABELS[letter]}
                            </span>
                        ))}
                    </div>
                )}
            </Link>
        </motion.div>
    );
}

export default function FeaturedPrograms() {
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { once: true, amount: 0.05 });
    const { translations } = useLanguage();

    const { data } = useQuery({
        queryKey: QUERY_KEYS.HOMEPAGE,
        queryFn: fetchHomepageData,
        staleTime: 60_000,
    });

    const programs = data?.featuredPrograms ?? [];

    if (programs.length === 0) return null;

    return (
        <section
            ref={sectionRef}
            className="home-featured-programs relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white py-20"
            style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)' }}
        >
            <div className="absolute inset-0 opacity-20">
                <div className="grid-bg" />
            </div>
            <div className="absolute -top-12 left-0 h-56 w-56 rounded-full bg-sky-100 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-indigo-100 blur-3xl" />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {programs.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="text-center mb-10">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700">
                                <Sparkles className="w-4 h-4" />
                                {translations?.featuredPrograms?.eyebrow || 'Featured Programs'}
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                                {translations?.featuredPrograms?.title || 'Explore Top Programs'}
                            </h2>
                            <p className="text-slate-600 max-w-2xl mx-auto">
                                {translations?.featuredPrograms?.description ||
                                    'Programs marked as featured by administrators. Toggle the featured flag in the Admin Panel to control what appears here.'}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {programs.map((p, i) => (
                                <ProgramCard key={p.id} program={p} index={i} />
                            ))}
                        </div>
                        <div className="text-center mt-10">
                            <Link
                                href="/programs"
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-slate-700 font-medium shadow-sm transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                            >
                                {translations?.featuredPrograms?.viewAll || 'View All Programs'}
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </motion.div>
                )}
            </div>
        </section>
    );
}
