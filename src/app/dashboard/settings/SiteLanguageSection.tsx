'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, Check, Sparkles } from 'lucide-react';
import { TOP_20_LANGUAGES, LanguageOption } from '@/lib/languages';

const SITE_LANG_KEY = 'dullbot_site_language';

interface SiteLanguageSectionProps {
  currentLanguageMix?: string;
  onLanguageChange?: (langCode: string) => void;
}

export default function SiteLanguageSection({ currentLanguageMix, onLanguageChange }: SiteLanguageSectionProps) {
  const [selectedLang, setSelectedLang] = useState<string>('en');
  const [search, setSearch] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SITE_LANG_KEY) || (currentLanguageMix === 'bangla' ? 'bn' : 'en');
    setSelectedLang(saved);
  }, [currentLanguageMix]);

  const handleSelect = (code: string) => {
    setSelectedLang(code);
    localStorage.setItem(SITE_LANG_KEY, code);
    if (onLanguageChange) {
      onLanguageChange(code);
    }
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const filtered = TOP_20_LANGUAGES.filter(
    l => l.name.toLowerCase().includes(search.toLowerCase()) ||
         l.native.toLowerCase().includes(search.toLowerCase()) ||
         l.code.toLowerCase().includes(search.toLowerCase())
  );

  const activeObj = TOP_20_LANGUAGES.find(l => l.code === selectedLang) || TOP_20_LANGUAGES[0];

  return (
    <div className="space-y-4">
      {/* Current selection summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-fog rounded-inputs border border-dove/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-dove/15 shadow-xs flex items-center justify-center text-xl">
            {activeObj.flag}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink">{activeObj.name} ({activeObj.native})</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                Active Locale
              </span>
            </div>
            <p className="text-xs text-ash">Interface, notifications, and merchant tools will use this locale.</p>
          </div>
        </div>

        {justSaved && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <Check className="w-3.5 h-3.5" /> Language updated
          </span>
        )}
      </div>

      {/* Search & Grid */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-graphite" />
          <input
            type="text"
            placeholder="Search language by name or native script..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-dove/20 rounded-inputs text-xs text-ink focus:outline-none focus:border-ink transition-colors shadow-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
          {filtered.map((lang) => {
            const isSelected = selectedLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`p-3 rounded-inputs border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-ink bg-ink text-white shadow-subtle'
                    : 'border-dove/15 bg-white hover:border-dove/30 hover:bg-fog/50 text-ink'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-1">
                  <span className="text-lg shrink-0">{lang.flag}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate leading-tight">{lang.name}</p>
                    <p className={`text-[10px] truncate ${isSelected ? 'text-pure-white/70' : 'text-ash'}`}>
                      {lang.native} · {lang.speakers}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-white text-ink flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-ink" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
