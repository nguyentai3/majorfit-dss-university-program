import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    Bookmark,
    BookOpen,
    Building2,
    Download,
    Heart,
    Search,
    SortAsc,
    Target,
    Trash2,
} from 'lucide-react';
import Link from '@frontend/components/AppLink';
import { deleteSavedProgram, fetchSavedPrograms } from '@frontend/api/services';
import { useRouter } from '@frontend/routes/navigation';
import { useSavedProgramsUpdates } from '../../lib/hooks/useRealtimeUpdates';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { downloadCsv } from '../../utils/exportCsv';
import { buildHollandCode } from '@frontend/utils/riasec';

export default function SavedProgramsPage() {
    const { user, loading: authLoading } = useAuth();
    const { translations } = useLanguage();
    const text = translations?.savedProgramsPage || {};
    const router = useRouter();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('savedAt');
    const [activeFocusArea, setActiveFocusArea] = useState('');
    const [removing, setRemoving] = useState(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/signin?next=%2Fsaved-programs');
        }
    }, [authLoading, router, user]);

    useEffect(() => {
        if (!user) {
            return;
        }
        void loadSavedPrograms();
    }, [user]);

    useSavedProgramsUpdates((updatedItems) => {
        setItems(updatedItems);
    });

    async function loadSavedPrograms() {
        try {
            setLoading(true);
            const nextItems = await fetchSavedPrograms();
            setItems(nextItems);
        } catch (error) {
            console.error('Failed to fetch saved programs:', error);
            toast.error(text?.toasts?.loadFailed || 'Failed to fetch saved programs');
        } finally {
            setLoading(false);
        }
    }

    async function handleRemoveProgram(item) {
        try {
            setRemoving(item.savedId);
            await deleteSavedProgram({ savedId: item.savedId, programId: item.id });
            setItems((current) => current.filter((entry) => entry.savedId !== item.savedId));
            toast.success(`${item.name} ${text?.toasts?.removedSuffix || 'removed from saved programs'}`);
        } catch (error) {
            console.error('Failed to remove saved program:', error);
            toast.error(text?.toasts?.removeFailed || 'Failed to remove saved program');
        } finally {
            setRemoving(null);
        }
    }

    const focusAreas = useMemo(
        () => Array.from(new Set(items.map((item) => item.focusArea).filter(Boolean))).sort(),
        [items],
    );

    function handleExportCsv() {
        if (!filteredItems.length) return;
        downloadCsv({
            filename: `saved-programs-${new Date().toISOString().slice(0, 10)}.csv`,
            columns: [
                { key: 'name', header: 'Program Name' },
                { key: 'university', header: 'University' },
                { key: 'focusArea', header: 'Focus Area' },
                { key: 'degreeLevel', header: 'Degree Level' },
                { key: 'hollandCode', header: 'Holland Code' },
                { key: 'savedAt', header: 'Saved At' },
            ],
            rows: filteredItems.map((item) => ({
                name: item.name,
                university: item.university?.shortName || item.university?.name || '',
                focusArea: item.focusArea || '',
                degreeLevel: item.degreeLevel || '',
                hollandCode: buildHollandCode(item.latestProfile?.riasecScores),
                savedAt: item.savedAt ? new Date(item.savedAt).toLocaleDateString() : '',
            })),
        });
    }

    const filteredItems = useMemo(() => {
        const nextItems = [...items]
            .filter((item) => {
                if (activeFocusArea && item.focusArea !== activeFocusArea) {
                    return false;
                }

                if (!searchTerm) {
                    return true;
                }

                const haystack = [
                    item.name,
                    item.university?.name,
                    item.university?.shortName,
                    item.focusArea,
                    item.department,
                    ...(item.latestProfile?.extractedSkills || []),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return haystack.includes(searchTerm.toLowerCase());
            });

        nextItems.sort((left, right) => {
            if (sortBy === 'name') {
                return left.name.localeCompare(right.name);
            }
            if (sortBy === 'university') {
                return (left.university?.shortName || left.university?.name || '').localeCompare(
                    right.university?.shortName || right.university?.name || '',
                );
            }

            return new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime();
        });

        return nextItems;
    }, [activeFocusArea, items, searchTerm, sortBy]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#f7fafc] pt-24 flex items-center justify-center">
                <div className="text-center">
                    <LoadingSpinner />
                    <p className="mt-4 text-slate-500">{text.loading || 'Loading your saved programs...'}</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <main className="min-h-screen bg-[#f7fafc] pt-24 pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <section className="rounded-[32px] border border-slate-200 bg-white p-8 md:p-10 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700">
                                <Bookmark className="w-4 h-4" />
                                {text.badge || 'Program Shortlist'}
                            </div>
                            <h1 className="mt-5 text-4xl md:text-5xl font-black text-slate-950">
                                {text.title || 'Saved Programs'}
                            </h1>
                            <p className="mt-4 text-lg text-slate-600">
                                {text.subtitle || 'Keep track of majors and university programs you want to compare in Step 3.'}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 sm:items-stretch">
                            <div className="min-w-[220px] rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-indigo-50 to-white p-5 text-slate-900 shadow-sm">
                                <div className="text-sm text-sky-700">{text.programsSaved || 'Programs saved'}</div>
                                <div className="mt-2 text-4xl font-black text-slate-900">{items.length}</div>
                            </div>
                            <button
                                type="button"
                                onClick={handleExportCsv}
                                disabled={!filteredItems.length}
                                className="inline-flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-6 py-5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-cyan-200 hover:text-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Download className="w-4 h-4" />
                                {text.exportCsv || 'Export CSV'}
                            </button>
                            <Link
                                href="/matching"
                                className="inline-flex items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-5 text-sm font-semibold text-white shadow-sm transition-all hover:from-sky-600 hover:via-blue-600 hover:to-indigo-600 hover:shadow-lg hover:shadow-sky-200"
                            >
                                <Target className="w-4 h-4" />
                                {text.runMatching || 'Run Matching'}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1fr] gap-4">
                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <Search className="w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder={text.searchPlaceholder || 'Search saved programs...'}
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                            />
                        </label>

                        <label className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2 mb-2 font-medium">
                                <BookOpen className="w-4 h-4" />
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

                        <label className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2 mb-2 font-medium">
                                <SortAsc className="w-4 h-4" />
                                {text.sortBy || 'Sort by'}
                            </div>
                            <select
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value)}
                                className="w-full bg-transparent outline-none text-slate-800"
                            >
                                <option value="savedAt">{text.recentlySaved || 'Recently saved'}</option>
                                <option value="name">{text.programName || 'Program name'}</option>
                                <option value="university">{text.university || 'University'}</option>
                            </select>
                        </label>
                    </div>
                </section>

                {filteredItems.length === 0 ? (
                    <section className="mt-8 rounded-[32px] border border-slate-200 bg-white p-12 text-center shadow-sm">
                        <Heart className="mx-auto w-16 h-16 text-slate-300" />
                        <h2 className="mt-6 text-3xl font-black text-slate-900">
                            {searchTerm || activeFocusArea ? (text.noFound || 'No saved programs found') : (text.noYet || 'No saved programs yet')}
                        </h2>
                        <p className="mt-3 text-slate-500">
                            {searchTerm || activeFocusArea
                                ? (text.noFoundHelp || 'Try adjusting your search or filters.')
                                : (text.noYetHelp || 'Browse the Step 2 dataset and save programs you want to revisit.')}
                        </p>
                        <Link
                            href="/programs"
                            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-sky-600 hover:via-blue-600 hover:to-indigo-600 hover:shadow-lg hover:shadow-sky-200"
                        >
                            {text.browsePrograms || 'Browse Programs'}
                        </Link>
                        <Link
                            href="/matching"
                            className="mt-4 ml-3 inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700"
                        >
                            {text.openMatching || 'Open Matching'}
                        </Link>
                    </section>
                ) : (
                    <section className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <AnimatePresence>
                            {filteredItems.map((item, index) => {
                                const hollandCode = buildHollandCode(item.latestProfile?.riasecScores);

                                return (
                                    <motion.article
                                        key={item.savedId}
                                        initial={{ opacity: 0, y: 18 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ delay: index * 0.04 }}
                                        className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700">
                                                    <Building2 className="w-4 h-4" />
                                                    {item.university?.shortName || item.university?.name}
                                                </div>
                                                <h2 className="mt-3 text-2xl font-black text-slate-950">{item.name}</h2>
                                                <p className="mt-2 text-slate-600 leading-relaxed">{item.summary}</p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => void handleRemoveProgram(item)}
                                                disabled={removing === item.savedId}
                                                className="shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-rose-600 hover:bg-rose-100 disabled:opacity-60"
                                            >
                                                {removing === item.savedId ? <LoadingSpinner /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        <div className="mt-5 flex flex-wrap gap-2">
                                            <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
                                                {item.focusArea || text.general || 'General'}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                                                {item.degreeLevel || text.bachelor || 'Bachelor'}
                                            </span>
                                            <span className="rounded-full border border-sky-100 bg-gradient-to-r from-sky-50 to-indigo-50 px-3 py-1 text-sm font-semibold text-sky-800">
                                                {hollandCode || 'N/A'}
                                            </span>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between gap-4 text-sm text-slate-500">
                                            <span>{text.saved || 'Saved'} {new Date(item.savedAt).toLocaleDateString()}</span>
                                                <Link
                                                    href={`/programs/${item.slug}`}
                                                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-sky-600 hover:via-blue-600 hover:to-indigo-600 hover:shadow-lg hover:shadow-sky-200"
                                                >
                                                {text.viewProgram || 'View Program'}
                                            </Link>
                                        </div>
                                    </motion.article>
                                );
                            })}
                        </AnimatePresence>
                    </section>
                )}
            </div>
        </main>
    );
}
