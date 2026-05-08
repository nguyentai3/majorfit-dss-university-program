import { Brain, GraduationCap, Target } from 'lucide-react';
import Link from '@frontend/components/AppLink';
import { useLanguage } from '../../contexts/LanguageContext';

const STEPS = [
    { key: 'assessment', label: 'Assessment', icon: Brain, href: '/assessment' },
    { key: 'programs', label: 'Programs', icon: GraduationCap, href: '/programs' },
    { key: 'matching', label: 'Matching', icon: Target, href: '/matching' },
];

export default function StepIndicator({ current }) {
    const { translations } = useLanguage();
    const currentIndex = STEPS.findIndex((s) => s.key === current);
    const labels = {
        assessment: translations?.steps?.assessment || 'Assessment',
        programs: translations?.steps?.programs || 'Programs',
        matching: translations?.steps?.matching || 'Matching',
    };

    return (
        <nav className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.key === current;
                const isCompleted = index < currentIndex;

                return (
                    <div key={step.key} className="flex items-center gap-2">
                        {index > 0 && (
                            <div
                                className={`hidden sm:block w-8 h-0.5 ${
                                    isCompleted || isActive ? 'bg-cyan-500' : 'bg-slate-300'
                                }`}
                            />
                        )}
                        <Link
                            href={step.href}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                                isActive
                                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                    : isCompleted
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{translations?.steps?.step || 'Step'} {index + 1}</span>
                            <span className="hidden md:inline">— {labels[step.key] || step.label}</span>
                        </Link>
                    </div>
                );
            })}
        </nav>
    );
}
