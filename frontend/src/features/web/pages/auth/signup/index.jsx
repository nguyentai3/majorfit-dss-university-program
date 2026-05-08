import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';

import Link from '@frontend/components/AppLink';
import { useRouter } from '@frontend/routes/navigation';

import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import BrandLogo from '../../../components/BrandLogo';

export default function SignUpPage() {
    const router = useRouter();
    const { signUp, user, loading: authLoading } = useAuth();
    const { translations } = useLanguage();
    const text = translations.auth?.signUpPage || {};
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (user) {
            router.push('/dashboard');
        }
    }, [router, user]);

    const validateForm = () => {
        const nextErrors = {};

        if (!formData.firstName.trim()) {
            nextErrors.firstName = text.firstNameRequired || 'First name is required';
        } else if (formData.firstName.length < 2) {
            nextErrors.firstName = text.firstNameMin || 'First name must be at least 2 characters';
        }

        if (!formData.lastName.trim()) {
            nextErrors.lastName = text.lastNameRequired || 'Last name is required';
        } else if (formData.lastName.length < 2) {
            nextErrors.lastName = text.lastNameMin || 'Last name must be at least 2 characters';
        }

        if (!formData.email.trim()) {
            nextErrors.email = text.emailRequired || 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            nextErrors.email = text.invalidEmail || 'Invalid email format';
        }

        if (!formData.password.trim()) {
            nextErrors.password = text.passwordRequired || 'Password is required';
        } else if (formData.password.length < 6) {
            nextErrors.password = text.passwordMin || 'Password must be at least 6 characters';
        }

        if (!formData.confirmPassword.trim()) {
            nextErrors.confirmPassword = text.confirmPasswordRequired || 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            nextErrors.confirmPassword = text.passwordsDoNotMatch || 'Passwords do not match';
        }

        return nextErrors;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextErrors = validateForm();
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const { error } = await signUp(
                formData.email,
                formData.password,
                formData.firstName,
                formData.lastName,
            );

            if (error) {
                setErrors({
                    general: error.message || text.registrationFailed || 'Registration failed. Please try again.',
                });
            } else {
                router.push('/dashboard');
            }
        } catch (error) {
            setErrors({ general: text.unexpectedError || 'An unexpected error occurred. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field) => (event) => {
        setFormData((current) => ({ ...current, [field]: event.target.value }));

        if (errors[field]) {
            setErrors((current) => ({ ...current, [field]: undefined }));
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-space-dark flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-space-dark relative overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-0 opacity-10">
                <div className="grid-bg" />
            </div>
            <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-space-dark via-space-darker to-space-dark" />

            <div className="relative z-10 w-full max-w-md">
                <div className="fade-in-up">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <BrandLogo markOnly size="lg" theme="light" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">{text.title || 'Join MajorFit'}</h1>
                        <p className="text-gray-400">
                            {text.subtitle || 'Start your personalized career journey today'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="glass-card p-8 rounded-2xl space-y-6">
                            {errors.general && (
                                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                                    {errors.general}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="firstName"
                                        className="block text-sm font-medium text-gray-300"
                                    >
                                        {text.firstNameLabel || 'First Name'}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            id="firstName"
                                            type="text"
                                            value={formData.firstName}
                                            onChange={handleInputChange('firstName')}
                                            className={`block w-full pl-12 pr-3 py-3 bg-black/20 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                                                errors.firstName
                                                    ? 'border-red-500 focus:ring-red-500/50'
                                                    : 'border-gray-600 focus:border-neon-cyan focus:ring-neon-cyan/50'
                                            }`}
                                            placeholder={text.firstNamePlaceholder || 'John'}
                                            disabled={loading}
                                        />
                                    </div>
                                    {errors.firstName && (
                                        <p className="text-red-400 text-sm">{errors.firstName}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="lastName"
                                        className="block text-sm font-medium text-gray-300"
                                    >
                                        {text.lastNameLabel || 'Last Name'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="lastName"
                                            type="text"
                                            value={formData.lastName}
                                            onChange={handleInputChange('lastName')}
                                            className={`block w-full px-3 py-3 bg-black/20 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                                                errors.lastName
                                                    ? 'border-red-500 focus:ring-red-500/50'
                                                    : 'border-gray-600 focus:border-neon-cyan focus:ring-neon-cyan/50'
                                            }`}
                                            placeholder={text.lastNamePlaceholder || 'Doe'}
                                            disabled={loading}
                                        />
                                    </div>
                                    {errors.lastName && (
                                        <p className="text-red-400 text-sm">{errors.lastName}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-300"
                                >
                                    {text.emailLabel || 'Email Address'}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange('email')}
                                        className={`block w-full pl-12 pr-3 py-3 bg-black/20 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                                            errors.email
                                                ? 'border-red-500 focus:ring-red-500/50'
                                                : 'border-gray-600 focus:border-neon-cyan focus:ring-neon-cyan/50'
                                        }`}
                                        placeholder={text.emailPlaceholder || 'john@example.com'}
                                        disabled={loading}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-red-400 text-sm">{errors.email}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-300"
                                >
                                    {text.passwordLabel || 'Password'}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={handleInputChange('password')}
                                        className={`block w-full pl-12 pr-12 py-3 bg-black/20 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                                            errors.password
                                                ? 'border-red-500 focus:ring-red-500/50'
                                                : 'border-gray-600 focus:border-neon-cyan focus:ring-neon-cyan/50'
                                        }`}
                                        placeholder={text.passwordPlaceholder || 'Min 6 characters'}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((current) => !current)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-neon-cyan transition-colors"
                                        disabled={loading}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-red-400 text-sm">{errors.password}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor="confirmPassword"
                                    className="block text-sm font-medium text-gray-300"
                                >
                                    {text.confirmPasswordLabel || 'Confirm Password'}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange('confirmPassword')}
                                        className={`block w-full pl-12 pr-12 py-3 bg-black/20 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                                            errors.confirmPassword
                                                ? 'border-red-500 focus:ring-red-500/50'
                                                : 'border-gray-600 focus:border-neon-cyan focus:ring-neon-cyan/50'
                                        }`}
                                        placeholder={text.confirmPasswordPlaceholder || 'Confirm your password'}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword((current) => !current)
                                        }
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-neon-cyan transition-colors"
                                        disabled={loading}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className="text-red-400 text-sm">
                                        {errors.confirmPassword}
                                    </p>
                                )}
                            </div>

                            <div className="text-sm text-gray-400">
                                {text.agreePrefix || 'By creating an account, you agree to our'}{' '}
                                <Link
                                    href="/terms"
                                    className="text-neon-cyan hover:text-neon-pink transition-colors"
                                >
                                    {text.terms || 'Terms of Service'}
                                </Link>{' '}
                                {text.and || 'and'}{' '}
                                <Link
                                    href="/privacy"
                                    className="text-neon-cyan hover:text-neon-pink transition-colors"
                                >
                                    {text.privacy || 'Privacy Policy'}
                                </Link>
                            </div>

                            <motion.button
                                type="submit"
                                disabled={loading}
                                whileHover={!loading ? { scale: 1.02 } : {}}
                                whileTap={!loading ? { scale: 0.98 } : {}}
                                className="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 px-8 py-4 rounded-lg text-white font-bold text-lg hover:shadow-lg hover:shadow-sky-400/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-space-dark border-t-transparent rounded-full animate-spin" />
                                        <span>{text.creatingAccount || 'Creating Account...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{text.createAccount || 'Create Account'}</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </form>

                    <div className="text-center mt-6">
                        <p className="text-gray-400">
                            {text.hasAccount || 'Already have an account?'}{' '}
                            <Link
                                href="/auth/signin"
                                className="text-neon-cyan hover:text-neon-pink transition-colors font-semibold"
                            >
                                {text.signInHere || 'Sign in here'}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
