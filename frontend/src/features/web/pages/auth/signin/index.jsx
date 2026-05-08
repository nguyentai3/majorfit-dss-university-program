import { Fragment, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';

import Link from '@frontend/components/AppLink';
import { useRouter } from '@frontend/routes/navigation';

import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import BrandLogo from '../../../components/BrandLogo';

export default function SignInPage() {
  const router = useRouter();
  const { signIn, user, loading: authLoading } = useAuth();
  const { translations } = useLanguage();
  const text = translations.auth?.signInPage || {};
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user && !authLoading) {
      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get('next') || '/dashboard';
      router.push(next);
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const message = searchParams.get('message');

    if (message === 'account-created') {
      setSuccessMessage(text.accountCreated || 'Account created successfully! You can now sign in.');
    }
  }, [text.accountCreated]);

  const validateForm = () => {
    const nextErrors = {};

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
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        setErrors({ general: error.message || text.invalidCredentials || 'Invalid credentials. Please try again.' });
        return;
      }

      window.setTimeout(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const next = searchParams.get('next') || '/dashboard';
        router.push(next);
      }, 100);
    } catch {
      setErrors({ general: text.unexpectedError || 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field) => (event) => {
    setFormData((previous) => ({ ...previous, [field]: event.target.value }));

    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-space-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-cyan border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-space-dark px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute inset-0 opacity-10">
        <div className="grid-bg" />
      </div>

      <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-space-dark via-space-darker to-space-dark" />

      <div className="relative z-10 w-full max-w-md">
        <div className="fade-in-up">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <BrandLogo markOnly size="lg" theme="light" />
            </div>

            <h1 className="mb-2 text-3xl font-bold text-white">{text.title || 'Welcome Back'}</h1>
            <p className="text-gray-400">{text.subtitle || 'Sign in to continue your career journey'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="glass-card rounded-2xl p-8">
              {successMessage ? (
                <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/20 p-4 text-sm text-green-300">
                  {successMessage}
                </div>
              ) : null}

              {errors.general ? (
                <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/20 p-4 text-sm text-red-300">
                  {errors.general}
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  {text.emailLabel || 'Email Address'}
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>

                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    className={`block w-full rounded-lg border bg-black/20 py-3 pl-12 pr-3 text-white placeholder-gray-400 transition-all focus:outline-none focus:ring-2 ${
                      errors.email
                        ? 'border-red-500 focus:ring-red-500/50'
                        : 'border-gray-600 focus:border-neon-cyan focus:ring-neon-cyan/50'
                    }`}
                    placeholder={text.emailPlaceholder || 'Enter your email'}
                    disabled={loading}
                  />
                </div>

                {errors.email ? <p className="text-sm text-red-400">{errors.email}</p> : null}
              </div>

              <div className="mt-6 space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  {text.passwordLabel || 'Password'}
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    className={`block w-full rounded-lg border bg-black/20 py-3 pl-12 pr-12 text-white placeholder-gray-400 transition-all focus:outline-none focus:ring-2 ${
                      errors.password
                        ? 'border-red-500 focus:ring-red-500/50'
                        : 'border-gray-600 focus:border-neon-cyan focus:ring-neon-cyan/50'
                    }`}
                    placeholder={text.passwordPlaceholder || 'Enter your password'}
                    disabled={loading}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-neon-cyan"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {errors.password ? <p className="text-sm text-red-400">{errors.password}</p> : null}
              </div>

              <div className="mt-4 text-right">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-neon-cyan transition-colors hover:text-neon-pink"
                >
                  {text.forgotPassword || 'Forgot your password?'}
                </Link>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                className="mt-6 flex w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 px-8 py-4 text-lg font-bold text-white transition-all hover:shadow-lg hover:shadow-sky-400/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Fragment>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-space-dark border-t-transparent" />
                    <span>{text.signingIn || 'Signing In...'}</span>
                  </Fragment>
                ) : (
                  <Fragment>
                    <span>{text.submit || 'Sign In'}</span>
                    <ArrowRight className="h-5 w-5" />
                  </Fragment>
                )}
              </motion.button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {text.noAccount || "Don't have an account?"}{' '}
              <Link
                href="/auth/signup"
                className="font-semibold text-neon-cyan transition-colors hover:text-neon-pink"
              >
                {text.signUpNow || 'Sign up now'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
