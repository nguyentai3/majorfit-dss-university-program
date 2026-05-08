import { useEffect, useRef, useState } from 'react';

import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSwitcher({ compact = false, className = '' }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const { availableLanguages, currentLanguage, setLanguage, translations } = useLanguage();
  const current = availableLanguages[currentLanguage] || availableLanguages.vi;

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = async (language) => {
    await setLanguage(language);
    setOpen(false);
  };

  return (
    <div ref={menuRef} className={`relative ${compact ? 'w-full' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center rounded-lg border border-sky-100 bg-white/90 text-slate-800 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50 ${
          compact ? 'w-full justify-center px-3 py-2 text-sm font-semibold' : 'justify-center px-4 py-2.5 text-sm font-semibold'
        }`}
        aria-label={translations?.common?.changeLanguage || 'Change language'}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {current.nativeName}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-44 overflow-hidden rounded-xl border border-sky-100 bg-white shadow-xl shadow-sky-100/70 ${
            compact ? 'left-0' : 'right-0'
          }`}
          role="menu"
        >
          {Object.values(availableLanguages).map((language) => {
            const selected = language.code === currentLanguage;

            return (
              <button
                key={language.code}
                type="button"
                onClick={() => handleSelect(language.code)}
                className={`block w-full px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-sky-50 hover:text-sky-700 ${
                  selected ? 'bg-sky-50 text-sky-700' : 'text-slate-700'
                }`}
                role="menuitem"
              >
                {language.nativeName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
