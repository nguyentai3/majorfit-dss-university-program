import { useEffect, useState } from 'react';
import { Brain, GraduationCap, Target, TrendingUp, ChevronRight, BookOpen, BarChart3, Bookmark } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '@frontend/routes/navigation';
import Link from '@frontend/components/AppLink';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useLanguage } from '../../contexts/LanguageContext';

function StepCard({ step, title, description, icon: Icon, href, color, stepLabel, goToLabel }) {
  return (
    <div
      className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6 hover:border-gray-600 transition-all duration-300 group fade-in-up"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className="text-xs text-gray-500 font-mono">{stepLabel || 'Step'} {step}</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-neon-cyan transition-colors">
        {title}
      </h3>
      <p className="text-sm text-gray-400 mb-4 leading-relaxed">{description}</p>
      <Link
        href={href}
        className="inline-flex items-center text-sm text-neon-cyan hover:text-white transition-colors"
      >
        {goToLabel || 'Go to'} {title} <ChevronRight className="w-4 h-4 ml-1" />
      </Link>
    </div>
  );
}

function QuickLink({ icon: Icon, label, href, count }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/50 transition-colors group"
    >
      <div className="flex items-center space-x-3">
        <Icon className="w-4 h-4 text-gray-400 group-hover:text-neon-cyan transition-colors" />
        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{label}</span>
      </div>
      {count !== undefined && (
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{count}</span>
      )}
    </Link>
  );
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const { translations } = useLanguage();
  const text = translations?.dashboardPage || {};
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-base flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return null;

  const displayName = profile?.firstName || profile?.first_name || user?.firstName || text.student || 'Student';

  return (
    <div className="min-h-screen bg-dark-base pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 fade-in-up">
          <h1 className="text-3xl font-bold text-white">
            {text.welcome || 'Welcome back'}, <span className="text-neon-cyan">{displayName}</span>
          </h1>
          <p className="text-gray-400 mt-2">
            {text.subtitle || 'Your career decision support dashboard — explore the 3 thesis steps below.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StepCard
            step={1}
            title={text.assessmentTitle || 'Assessment'}
            description={text.assessmentDescription || 'Take the RIASEC assessment to build your capability profile. Track your development over multiple attempts.'}
            icon={Brain}
            href="/assessment"
            color="bg-neon-cyan"
            stepLabel={text.step || 'Step'}
            goToLabel={text.goTo || 'Go to'}
          />
          <StepCard
            step={2}
            title={text.programsTitle || 'Programs'}
            description={text.programsDescription || 'Explore university programs analyzed by AI. Each program is mapped to measurable skill sets.'}
            icon={GraduationCap}
            href="/programs"
            color="bg-neon-pink"
            stepLabel={text.step || 'Step'}
            goToLabel={text.goTo || 'Go to'}
          />
          <StepCard
            step={3}
            title={text.matchingTitle || 'Matching'}
            description={text.matchingDescription || 'Match your profile against program profiles using the weighted scoring algorithm.'}
            icon={Target}
            href="/matching"
            color="bg-purple-500"
            stepLabel={text.step || 'Step'}
            goToLabel={text.goTo || 'Go to'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in-up">
          <div className="bg-gradient-to-b from-gray-900/50 to-black/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-neon-cyan" />
              {text.quickLinks || 'Quick Links'}
            </h3>
            <div className="space-y-1">
              <QuickLink icon={Brain} label={text.takeAssessment || 'Take Assessment'} href="/assessment" />
              <QuickLink icon={TrendingUp} label={text.assessmentHistory || 'Assessment History'} href="/assessment/history" />
              <QuickLink icon={BookOpen} label={text.browsePrograms || 'Browse Programs'} href="/programs" />
              <QuickLink icon={Bookmark} label={text.savedPrograms || 'Saved Programs'} href="/saved-programs" />
              <QuickLink icon={Target} label={text.runMatching || 'Run Matching'} href="/matching" />
            </div>
          </div>

          <div className="bg-gradient-to-b from-gray-900/50 to-black/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-neon-pink" />
              {text.howItWorks || 'How It Works'}
            </h3>
            <div className="space-y-4 text-sm text-gray-400">
              <div className="flex items-start space-x-3">
                <span className="text-neon-cyan font-mono text-xs mt-0.5">01</span>
                <p>{text.how1 || 'Complete the RIASEC assessment to generate your capability profile with skill vectors and confidence scores.'}</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-neon-pink font-mono text-xs mt-0.5">02</span>
                <p>{text.how2 || 'Browse programs that have been analyzed by AI — each has a profile of required skills mapped from their curriculum.'}</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-purple-400 font-mono text-xs mt-0.5">03</span>
                <p>{text.how3 || 'Run the matching engine to find programs that fit your profile. Results show fit level, scores, and explanations.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
