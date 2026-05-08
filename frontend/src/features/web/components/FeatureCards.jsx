import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Sparkles, MapPin, Target, Zap, BookOpen, Bookmark } from 'lucide-react';

import { useRouter } from '@frontend/routes/navigation';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

function PrimaryFeatureCard({ feature, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const router = useRouter();
  const { user } = useAuth();
  const IconComponent = feature.icon;

  const handleClick = () => {
    if (feature.id === 'assessment') {
      router.push('/assessment');
      return;
    }

    if (feature.id === 'program-explorer') {
      router.push('/programs');
      return;
    }

    if (user) {
      router.push('/matching');
    } else {
      router.push('/auth/signin?next=/matching');
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.96 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, type: 'spring', stiffness: 110, damping: 16 }}
      whileHover={{ y: -8, scale: 1.01 }}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      className="group relative h-full cursor-pointer rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:border-sky-200 hover:shadow-xl"
      role="button"
      tabIndex={0}
      aria-label={`Learn more about ${feature.title}`}
    >
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-transparent via-transparent to-transparent group-hover:from-sky-50 group-hover:via-indigo-50 group-hover:to-fuchsia-50" />

      <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-lg transition-transform duration-300 group-hover:scale-110">
        <IconComponent className="h-8 w-8 text-white" />
      </div>

      <div className="relative z-10 space-y-4">
        <motion.h3 className="text-2xl font-bold text-slate-900" whileHover={{ scale: 1.03 }}>
          {feature.title}
        </motion.h3>
        <p className="leading-relaxed text-slate-600">{feature.description}</p>
      </div>

      <div className="absolute bottom-6 right-6 flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <Zap className="h-4 w-4 text-sky-700" />
      </div>
    </motion.div>
  );
}

function SecondaryFeatureCard({ feature, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const router = useRouter();
  const { user } = useAuth();
  const IconComponent = feature.icon;

  const handleClick = () => {
    if (!feature.href) return;

    if ((feature.href === '/dashboard' || feature.href === '/matching' || feature.href === '/saved-programs') && !user) {
      router.push(`/auth/signin?next=${encodeURIComponent(feature.href)}`);
      return;
    }

    router.push(feature.href);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.55, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      className="group flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-sky-200 hover:bg-slate-50 hover:shadow-lg"
      role="button"
      tabIndex={0}
      aria-label={`Navigate to ${feature.title}`}
    >
      <div className="rounded-xl bg-sky-50 p-3 text-sky-700 transition-colors duration-300 group-hover:bg-sky-100">
        <IconComponent className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h4 className="text-lg font-semibold text-slate-900">{feature.title}</h4>
        <p className="text-sm text-slate-600">{feature.description}</p>
      </div>
    </motion.div>
  );
}

export default function FeatureCards() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });
  const { translations } = useLanguage();

  const primaryFeatures = [
    {
      id: 'assessment',
      icon: Sparkles,
      title: translations?.featureCards?.careerVisualization?.title || 'Skill Assessment',
      description:
        translations?.featureCards?.careerVisualization?.description ||
        'Measure student strengths with a reusable assessment profile',
    },
    {
      id: 'program-explorer',
      icon: MapPin,
      title: translations?.featureCards?.programExplorer?.title || 'Program Explorer',
      description:
        translations?.featureCards?.programExplorer?.description ||
        'Browse curriculum-based program profiles from participating universities',
    },
    {
      id: 'matching',
      icon: Target,
      title: translations?.featureCards?.assessmentProfile?.title || 'Matching Results',
      description:
        translations?.featureCards?.assessmentProfile?.description ||
        'Match student profiles with program profiles using the Step 3 engine',
    },
  ];

  const secondaryFeatures = [
    {
      icon: Zap,
      title: translations?.featureCards?.additionalFeatures?.aiInsights?.title || 'Matching Workspace',
      description:
        translations?.featureCards?.additionalFeatures?.aiInsights?.description ||
        'Open deterministic matching and the optional AI compare advisor',
      href: '/matching',
    },
    {
      icon: Bookmark,
      title: translations?.featureCards?.additionalFeatures?.studyMaterials?.title || 'Saved Programs',
      description:
        translations?.featureCards?.additionalFeatures?.studyMaterials?.description ||
        'Keep a shortlist of programs you want to compare later',
      href: '/saved-programs',
    },
    {
      icon: BookOpen,
      title: translations?.featureCards?.additionalFeatures?.goalSetting?.title || 'Capability Dashboard',
      description:
        translations?.featureCards?.additionalFeatures?.goalSetting?.description ||
        'Review assessment history, strengths, and program readiness in one place',
      href: '/dashboard',
    },
  ];

  const handleExploreFeatures = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      const featuresButton = document.querySelector('[aria-label="Features menu"]')?.parentElement?.querySelector('button');
      if (featuresButton) {
        featuresButton.click();
      }
    }, 500);
  };

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 pt-8 pb-20"
    >
      <div className="absolute inset-0 opacity-20">
        <div className="grid-bg" />
      </div>
      <div className="absolute left-0 top-24 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
      <div className="absolute bottom-8 right-0 h-64 w-64 rounded-full bg-fuchsia-100 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-12 text-center"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-6 text-4xl font-bold text-slate-900 sm:text-5xl"
          >
            <span className="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
              {translations?.featureCards?.sectionTitle || 'Powerful Features for Your Future'}
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mx-auto max-w-3xl text-xl text-slate-600"
          >
            {translations?.featureCards?.sectionSubtitle ||
              'Discover the tools and insights you need to make informed decisions about your career and education path.'}
          </motion.p>
        </motion.div>

        <div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {primaryFeatures.map((feature, index) => (
            <PrimaryFeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {secondaryFeatures.map((feature, index) => (
            <SecondaryFeatureCard key={feature.href} feature={feature} index={index} />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExploreFeatures}
            className="cursor-pointer rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 px-8 py-4 text-lg font-bold text-white transition-all duration-300 hover:shadow-lg hover:shadow-sky-400/25"
            role="button"
            aria-label="Explore all platform features"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleExploreFeatures();
              }
            }}
          >
            {translations?.featureCards?.exploreAll || 'Explore All Features'}
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
