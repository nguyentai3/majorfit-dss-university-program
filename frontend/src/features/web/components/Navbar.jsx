import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, Settings, ChevronDown, Sparkles, MapPin, Target, Bookmark } from 'lucide-react';
import Link from '@frontend/components/AppLink';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useRouter } from '@frontend/routes/navigation';
import BrandLogo from './BrandLogo';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeatureDropdownOpen, setIsFeatureDropdownOpen] = useState(false);
  const [isMobileFeatureDropdownOpen, setIsMobileFeatureDropdownOpen] = useState(false);
  const { user, profile, signOut, loading } = useAuth();
  const { translations } = useLanguage();
  const router = useRouter();
  const featureDropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (featureDropdownRef.current && !featureDropdownRef.current.contains(event.target)) {
        setIsFeatureDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dashboardHref = '/dashboard';
  const dashboardLabel = translations.nav.dashboard;

  const navItems = [
    { name: translations.nav.home, href: '/' },
    { name: translations.features.skillAssessment.name, href: '/assessment' },
  ];

  const features = [
    {
      key: 'assessment',
      name: translations.features.skillAssessment.name,
      href: '/assessment',
      icon: Sparkles,
      description: translations.features.skillAssessment.description,
      requiresAuth: false,
    },
    {
      key: 'programs',
      name: translations.features.programExplorer.name,
      href: '/programs',
      icon: MapPin,
      description: translations.features.programExplorer.description,
      requiresAuth: false,
    },
    {
      key: 'matching',
      name: translations.features.matchingResults.name,
      href: '/matching',
      icon: Target,
      description: translations.features.matchingResults.description,
      requiresAuth: true,
    },
    {
      key: 'saved',
      name: translations.features.savedPrograms.name,
      href: '/saved-programs',
      icon: Bookmark,
      description: translations.features.savedPrograms.description,
      requiresAuth: true,
    },
  ];

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsFeatureDropdownOpen(false);
    setIsMobileFeatureDropdownOpen(false);
  };

  const handleNavClick = (href) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    closeMenus();
  };

  const handleProtectedRoute = (href) => {
    if (!user) {
      router.push(`/auth/signin?next=${encodeURIComponent(href)}`);
      closeMenus();
      return;
    }
    router.push(href);
    closeMenus();
  };

  const handleLogout = async () => {
    await signOut();
    closeMenus();
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-space-dark/90 backdrop-blur-lg border-b border-neon-cyan/20' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <BrandLogo theme="dark" size="sm" />
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-gray-300 hover:text-neon-cyan transition-colors duration-200 font-medium">
                {item.name}
              </Link>
            ))}

            <div className="relative" ref={featureDropdownRef}>
              <button
                onClick={() => setIsFeatureDropdownOpen((v) => !v)}
                className="text-gray-300 hover:text-neon-cyan transition-colors duration-200 font-medium flex items-center space-x-1"
                aria-haspopup="true"
                aria-expanded={isFeatureDropdownOpen}
              >
                <span>{translations.nav.features}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFeatureDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isFeatureDropdownOpen && (
                  <motion.div
                    key="desktop-feature-menu"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full mt-2 w-80 bg-space-dark/95 backdrop-blur-lg border border-neon-cyan/20 rounded-xl shadow-2xl shadow-neon-cyan/10 z-50"
                  >
                    <div className="p-2">
                      {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                          <motion.div
                            key={feature.key}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.04 }}
                          >
                            {feature.requiresAuth && !user ? (
                              <button
                                onClick={() => handleProtectedRoute(feature.href)}
                                className="w-full p-3 rounded-lg hover:bg-gray-800/50 transition-colors group text-left"
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="p-2 bg-neon-cyan/10 rounded-lg group-hover:bg-neon-cyan/20 transition-colors">
                                    <Icon className="w-4 h-4 text-neon-cyan" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-white group-hover:text-neon-cyan transition-colors">{feature.name}</div>
                                    <div className="text-sm text-gray-400 mt-1">{feature.description}</div>
                                    <div className="text-xs text-neon-pink mt-1">{translations.features.signInRequired}</div>
                                  </div>
                                </div>
                              </button>
                            ) : (
                              <Link
                                href={feature.href}
                                onClick={closeMenus}
                                className="block w-full p-3 rounded-lg hover:bg-gray-800/50 transition-colors group"
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="p-2 bg-neon-cyan/10 rounded-lg group-hover:bg-neon-cyan/20 transition-colors">
                                    <Icon className="w-4 h-4 text-neon-cyan" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-white group-hover:text-neon-cyan transition-colors">{feature.name}</div>
                                    <div className="text-sm text-gray-400 mt-1">{feature.description}</div>
                                  </div>
                                </div>
                              </Link>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <LanguageSwitcher />

            {!loading && user && (
              <Link
                href={dashboardHref}
                className="px-4 py-2 bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-lg text-slate-800 hover:border-sky-300 transition-all duration-200 font-semibold flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>{dashboardLabel}</span>
              </Link>
            )}

            {!loading && user ? (
              <div className="flex items-center space-x-4">
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-slate-800 bg-gradient-to-r from-sky-50 to-indigo-50 px-4 py-2 rounded-lg border border-sky-200 font-semibold">
                    <User className="w-4 h-4" />
                    <span>{profile?.first_name || user.email?.split('@')[0] || 'User'}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-space-dark border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-2">
                      <div className="px-4 py-2 text-sm text-gray-400 border-b border-gray-700">{user.email}</div>
                      <Link href="/profile" className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 transition-colors">
                        <User className="w-4 h-4 mr-2" />
                        {translations.nav.profile}
                      </Link>
                      <Link href={dashboardHref} className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 transition-colors">
                        <Settings className="w-4 h-4 mr-2" />
                        {dashboardLabel}
                      </Link>
                      <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-gray-300 hover:bg-gray-800 transition-colors">
                        <LogOut className="w-4 h-4 mr-2" />
                        {translations.nav.signOut}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : !loading ? (
              <div className="flex items-center space-x-4">
                <Link href="/auth/signin" className="text-gray-300 hover:text-white transition-colors">
                  {translations.nav.signIn}
                </Link>
                <Link href="/auth/signup" className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 px-6 py-2 rounded-lg text-white font-semibold">
                  {translations.auth.signUp}
                </Link>
              </div>
            ) : (
              <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen((v) => !v)} className="text-white hover:text-neon-cyan transition-colors p-2">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <div className={`md:hidden overflow-hidden transition-all duration-300 ${isMobileMenuOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="py-4 space-y-4">
            {navItems.map((item) => (
              <Link key={`mobile-${item.href}`} href={item.href} className="block text-gray-300 hover:text-neon-cyan transition-colors font-medium" onClick={closeMenus}>
                {item.name}
              </Link>
            ))}

            <div className="border-t border-gray-700 pt-4">
              <button
                onClick={() => setIsMobileFeatureDropdownOpen((v) => !v)}
                className="w-full flex items-center justify-between text-gray-300 hover:text-neon-cyan transition-colors font-medium text-left"
                aria-haspopup="true"
                aria-expanded={isMobileFeatureDropdownOpen}
              >
                <span>{translations.nav.features}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMobileFeatureDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isMobileFeatureDropdownOpen && (
                  <motion.div
                    key="mobile-feature-menu"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 space-y-2 pl-4 border-l border-gray-700"
                  >
                    {features.map((feature, index) => {
                      const Icon = feature.icon;
                      return (
                        <motion.div key={`mobile-feature-${feature.key}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}>
                          {feature.requiresAuth && !user ? (
                            <button onClick={() => handleProtectedRoute(feature.href)} className="w-full p-2 rounded-lg hover:bg-gray-800/50 text-left">
                              <div className="flex items-center space-x-3">
                                <Icon className="w-4 h-4 text-neon-cyan" />
                                <div className="text-sm font-medium text-white">{feature.name}</div>
                              </div>
                            </button>
                          ) : (
                            <Link href={feature.href} onClick={closeMenus} className="block w-full p-2 rounded-lg hover:bg-gray-800/50">
                              <div className="flex items-center space-x-3">
                                <Icon className="w-4 h-4 text-neon-cyan" />
                                <div className="text-sm font-medium text-white">{feature.name}</div>
                              </div>
                            </Link>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <LanguageSwitcher compact />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
