import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { generateDraft } from '../services/aiOrchestrator';

interface DraftProps {
  result: AnalysisResult;
  onBack: () => void;
}

export const Draft: React.FC<DraftProps> = ({ result, onBack }) => {
  const [tone, setTone] = useState<'Professional' | 'Friendly' | 'Firm'>('Professional');
  const [template, setTemplate] = useState<'Dispute' | 'Clarify' | 'Accept' | 'Extension'>('Clarify');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tone, template]);

  const handleGenerate = async () => {
    setLoading(true);
    const text = await generateDraft(result.summary, tone, template);
    setDraft(text);
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-background-dark animate-fade-in pb-24">
      {/* Header handled by App.tsx generally, but we might want custom here */}

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
        <h3 className="text-gray-900 dark:text-white text-sm font-semibold mb-3 px-1">Response Goal</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mb-4">
          {[
            { id: 'Dispute', icon: 'gavel', label: 'Dispute' },
            { id: 'Clarify', icon: 'help', label: 'Clarify' },
            { id: 'Accept', icon: 'check_circle', label: 'Accept' },
            { id: 'Extension', icon: 'schedule', label: 'Extend' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id as any)}
              className={`shrink-0 flex flex-col items-center justify-center gap-2 w-24 h-20 rounded-xl border transition-all ${template === t.id
                  ? 'bg-primary text-white border-primary shadow-lg shadow-blue-500/20'
                  : 'bg-white dark:bg-surface-dark text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                }`}
            >
              <span className="material-symbols-rounded text-2xl">{t.icon}</span>
              <span className="text-xs font-semibold">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tone */}
        <h3 className="text-gray-900 dark:text-white text-sm font-semibold mb-3 px-1">Tone</h3>
        <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl mb-6">
          {['Professional', 'Friendly', 'Firm'].map((t) => (
            <button
              key={t}
              onClick={() => setTone(t as any)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tone === t
                  ? 'bg-white dark:bg-surface-dark text-primary shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-gray-900 dark:text-white text-sm font-semibold">Generated Draft</h3>
          {loading && (
            <span className="text-xs text-primary flex items-center gap-1">
              <span className="material-symbols-rounded text-sm animate-spin">refresh</span>
              Generating...
            </span>
          )}
        </div>

        <div className="relative group">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-h-[300px] bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-sm leading-relaxed text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none shadow-sm"
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
            Back
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all text-sm"
            onClick={() => navigator.clipboard.writeText(draft)}
          >
            <span className="material-symbols-rounded text-lg">content_copy</span>
            Copy Response
          </button>
        </div>
      </div>
    </div>
  );
};