import { Fragment, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';

import { useRouter } from '@frontend/routes/navigation';
import { fetchHomepageData } from '@frontend/api/services';
import { QUERY_KEYS } from '@frontend/constants/queryKeys';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const { translations } = useLanguage();
  const router = useRouter();

  const homepageQuery = useQuery({
    queryKey: QUERY_KEYS.HOMEPAGE,
    queryFn: fetchHomepageData,
    staleTime: 60_000,
  });
  const dbStats = homepageQuery.data?.stats;

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToFeatures = () => {
    const element = document.querySelector('#features');

    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openAssessment = () => {
    if (user) {
      router.push('/assessment');
    } else {
      router.push('/auth/signin?next=/assessment');
    }
  };

  const stats = [
    { number: dbStats ? String(dbStats.questions) : '—', label: translations?.hero?.stats?.assessmentQuestions || 'Assessment Questions' },
    { number: dbStats ? String(dbStats.programs) : '—', label: translations?.hero?.stats?.programsProfiled || 'Programs Profiled' },
    { number: dbStats ? String(dbStats.users) : '—', label: translations?.hero?.stats?.learnersSupported || 'Learners Supported' },
  ];

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white pt-32 pb-10 sm:pt-36 sm:pb-12"
    >
      <div className="absolute inset-0 opacity-30">
        <div className="grid-bg" />
      </div>

      {mounted ? (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.16),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(129,140,248,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))]" />
      ) : null}

      <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="space-y-4"
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2 }}
            className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl lg:text-5xl"
          >
            <span className="bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
              {translations?.hero?.title || 'Build Your Student Capability Profile'}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="mx-auto max-w-4xl text-base leading-relaxed text-slate-600 sm:text-lg"
          >
            {translations?.hero?.subtitle ||
              'Build a measurable student profile, analyze university curricula with AI, and match students to programs with clear reasoning.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex flex-col items-center justify-center gap-4 pt-1 sm:flex-row"
          >
            <Fragment>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={openAssessment}
                className="group relative flex min-w-[200px] items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 px-8 py-4 text-lg font-bold text-white transition-all duration-300 hover:shadow-lg hover:shadow-sky-300/30"
              >
                <span>{translations?.hero?.ctaStart || 'Start Assessment'}</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                <div className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={scrollToFeatures}
                className="group relative flex min-w-[200px] items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white/90 px-8 py-4 text-lg font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:border-sky-300 hover:text-sky-700 hover:shadow-lg hover:shadow-sky-100"
              >
                <Play className="h-5 w-5" />
                <span>{translations?.hero?.ctaLearn || 'Learn How It Works'}</span>
              </motion.button>
            </Fragment>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mx-auto grid max-w-4xl grid-cols-1 gap-6 pt-4 sm:grid-cols-3"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
                className="px-4 py-2 text-center"
              >
                <div className="text-4xl font-bold text-sky-500 sm:text-5xl">{stat.number}</div>
                <div className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-slate-500 sm:text-base">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white via-white/70 to-transparent" />
    </section>
  );
}
