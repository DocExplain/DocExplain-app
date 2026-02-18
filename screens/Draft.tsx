import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { useLanguage, SUPPORTED_LANGS, SupportedLang } from '../i18n/LanguageContext';

const VITE_API_URL = import.meta.env.VITE_API_URL || '';

interface DraftProps {
  result: AnalysisResult;
  onBack: () => void;
}

export const Draft: React.FC<DraftProps> = ({ result, onBack }) => {
  const { lang: appLanguage, t } = useLanguage();
  const [tone, setTone] = useState<'Professional' | 'Friendly' | 'Firm'>('Professional');
  const [template, setTemplate] = useState<'Dispute' | 'Clarify' | 'Accept' | 'Extension'>('Clarify');
  const [responseLang, setResponseLang] = useState<SupportedLang>(appLanguage);

  const [draft, setDraft] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tone, template, responseLang]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Updated orchestrated call for dual response
      const response = await fetch(`${VITE_API_URL}/api/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: result.summary,
          tone,
          template,
          responseLanguage: SUPPORTED_LANGS.find(l => l.code === responseLang)?.name || 'English',
          appLanguage: SUPPORTED_LANGS.find(l => l.code === appLanguage)?.name || 'English'
        })
      });
      const data = await response.json();
      setDraft(data.draft || '');
      setExplanation(data.explanation || '');
    } catch (e) {
      console.error(e);
      setDraft("Error generating draft.");
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-background-dark animate-fade-in pb-24">
      <div className="p-4 overflow-y-auto">
        {/* Context Card */}
        <div className="mb-6 relative overflow-hidden rounded-xl bg-slate-900 shadow-lg">
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-800 to-slate-900"></div>
          <div className="relative z-10 p-5 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-rounded text-primary text-sm">description</span>
              <p className="text-primary text-xs font-bold uppercase tracking-wider">Context Source</p>
            </div>
            <p className="text-white text-lg font-bold leading-tight">{result.fileName}</p>
            <p className="text-slate-300 text-xs font-medium mt-1 line-clamp-1">{result.summary}</p>
          </div>
        </div>

        {/* Templates */}
        <h3 className="text-gray-900 dark:text-white text-sm font-semibold mb-3 px-1">{t.chooseResponse}</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mb-4">
          {[
            { id: 'Dispute', icon: 'gavel', label: t.dispute },
            { id: 'Clarify', icon: 'help', label: t.clarify },
            { id: 'Accept', icon: 'check_circle', label: t.accept },
            { id: 'Extension', icon: 'schedule', label: t.reqExtension },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTemplate(item.id as any)}
              className={`shrink-0 flex flex-col items-center justify-center gap-2 w-24 h-20 rounded-xl border transition-all ${template === item.id
                ? 'bg-primary text-white border-primary shadow-lg shadow-blue-500/20'
                : 'bg-white dark:bg-surface-dark text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                }`}
            >
              <span className="material-symbols-rounded text-2xl">{item.icon}</span>
              <span className="text-[10px] font-bold text-center px-1 truncate w-full">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Language Selection */}
        <h3 className="text-gray-900 dark:text-white text-sm font-semibold mb-3 px-1">{t.targetLang}</h3>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
          {SUPPORTED_LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setResponseLang(l.code)}
              className={`shrink-0 px-4 py-2 rounded-full border text-xs font-semibold transition-all ${responseLang === l.code
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white dark:bg-surface-dark border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              {l.name}
            </button>
          ))}
        </div>

        {/* Explanation Section */}
        {explanation && (
          <div className="mb-6 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4">
            <h3 className="text-primary text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="material-symbols-rounded text-sm">info</span>
              {t.simpleExplanation}
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
              "{explanation}"
            </p>
          </div>
        )}

        {/* Editor */}
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-gray-900 dark:text-white text-sm font-semibold">{t.generatedDraft}</h3>
          {loading && (
            <span className="text-xs text-primary flex items-center gap-1">
              <span className="material-symbols-rounded text-sm animate-spin">refresh</span>
              {t.generating}
            </span>
          )}
        </div>

        <div className="relative group">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-h-[250px] bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-sm leading-relaxed text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none shadow-sm"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md border-t border-gray-100 dark:border-gray-700 p-4 pb-8 z-50">
        <div className="flex items-center gap-3 max-w-md mx-auto w-full">
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm transition-colors shrink-0 w-24"
          >
            {t.back}
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all text-sm"
            onClick={() => {
              navigator.clipboard.writeText(draft);
              alert(t.copied);
            }}
          >
            <span className="material-symbols-rounded text-lg">content_copy</span>
            {t.copy}
          </button>
        </div>
      </div>
    </div>
  );
};