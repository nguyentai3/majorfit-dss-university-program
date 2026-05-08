import { motion } from 'framer-motion';
import {
  ArrowUp,
  Mail,
} from 'lucide-react';

import { useLanguage } from '../contexts/LanguageContext';
import BrandLogo from './BrandLogo';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { translations } = useLanguage();

  const footerLinks = {
    product: [
      { name: translations?.footer?.features || 'Features', href: '#features' },
      { name: translations?.features?.skillAssessment?.name || 'Skill Assessment', href: '/assessment' },
      { name: translations?.features?.programExplorer?.name || 'Program Explorer', href: '/programs' },
      { name: translations?.features?.matchingResults?.name || 'Matching Results', href: '/matching' },
      { name: translations?.features?.savedPrograms?.name || 'Saved Programs', href: '/saved-programs' },
    ],
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLinkClick = (href) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);

      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }

      return;
    }

    window.location.href = href;
  };

  const getCategoryLabel = (category) => {
    if (category === 'product') {
      return translations?.footer?.features || 'Features';
    }

    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <footer
      className="home-footer relative border-t border-slate-200 bg-gradient-to-t from-slate-50 to-white"
      style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}
    >
      <div className="absolute inset-0 opacity-20">
        <div className="grid-bg" />
      </div>

      <div className="absolute left-1/4 top-0 h-32 w-32 rounded-full bg-sky-100 blur-3xl" />
      <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-indigo-100 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-6 lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <BrandLogo theme="light" size="sm" />
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="max-w-md text-sm leading-relaxed text-slate-600"
              >
                {translations?.footer?.description ||
                  'A thesis-first platform for student assessment, curriculum-based program profiling, and measurable matching.'}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="flex items-center space-x-3 text-sm text-slate-600"
              >
                <Mail className="h-4 w-4 text-neon-cyan" />
                <span>contact@majorfit.local</span>
              </motion.div>
            </div>

            {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
              <div key={category} className="space-y-4">
                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
                  viewport={{ once: true }}
                  className="text-sm font-semibold uppercase tracking-wider text-slate-900"
                >
                  {getCategoryLabel(category)}
                </motion.h3>

                <ul className="space-y-3">
                  {links.map((link, linkIndex) => (
                    <motion.li
                      key={link.name}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: categoryIndex * 0.1 + linkIndex * 0.05,
                      }}
                      viewport={{ once: true }}
                    >
                      <button
                        onClick={() => handleLinkClick(link.href)}
                        className="group flex items-center text-sm text-slate-600 transition-colors duration-300 hover:text-sky-700"
                      >
                        <span className="relative">
                          {link.name}
                          <span className="absolute inset-x-0 -bottom-1 h-0.5 scale-x-0 bg-sky-500 transition-transform duration-300 group-hover:scale-x-100" />
                        </span>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            viewport={{ once: true }}
            className="mt-12 border-t border-slate-200 pt-8"
          />
        </div>

        <div className="border-t border-slate-200 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-sm text-slate-500"
            >
              © {currentYear} MajorFit. {translations?.footer?.copyright || 'All rights reserved.'}{' '}
              {translations?.footer?.builtWithLove || 'Built with care for students everywhere.'}
            </motion.p>

            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              whileHover={{ scale: 1.1, y: -2 }}
              viewport={{ once: true }}
              onClick={scrollToTop}
              className="self-end rounded-full border border-slate-200 bg-white p-3 text-slate-500 shadow-sm transition-all duration-300 hover:text-sky-700 hover:shadow-lg hover:shadow-sky-100 md:self-auto"
              aria-label={translations?.common?.scrollToTop || 'Scroll to top'}
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </div>

    </footer>
  );
}
