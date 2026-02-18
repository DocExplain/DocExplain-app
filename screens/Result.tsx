import React from 'react';
import { AnalysisResult, Screen } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface ResultProps {
  result: AnalysisResult;
  onBack: () => void;
  onDraft: (action?: any) => void;
}

export const Result: React.FC<ResultProps> = ({ result, onBack, onDraft }) => {
  const { t } = useLanguage();
  return (
    <div className="flex-1 flex flex-col p-4 pb-24 animate-slide-up">
      <div className="flex items-center bg-white dark:bg-surface-dark rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-500 mr-3 shrink-0">
          <span className="material-symbols-rounded">picture_as_pdf</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{result.fileName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t.processedNow}</p>
        </div>
        <span className="material-symbols-rounded text-green-500 text-lg">check_circle</span>
      </div>

      {result.category && (
        <div className="mb-4 flex gap-2">
          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full">
            {result.category === 'bill' ? t.catBill :
              result.category === 'form' ? t.catForm :
                result.category === 'scam' ? t.catScam :
                  result.category === 'legal' ? t.catLegal : result.category}
          </span>
        </div>
      )}

      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
        <div className="bg-primary/5 dark:bg-primary/10 px-5 py-4 border-b border-primary/10 dark:border-primary/20 flex items-center justify-between">
          <h2 className="text-primary font-semibold flex items-center gap-2">
            <span className="material-symbols-rounded text-xl">auto_awesome</span>
            {t.plainLang}
          </h2>
          <div className="flex gap-2">
            <button className="text-gray-400 hover:text-primary transition-colors">
              <span className="material-symbols-rounded text-xl">share</span>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <section>
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">{t.summary}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {result.summary}
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">{t.keyPoints}</h3>
            <ul className="space-y-3">
              {result.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="material-symbols-rounded text-primary text-[10px] mt-1.5">circle</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">{point}</span>
                </li>
              ))}
            </ul>
          </section>

          {result.warning && (
            <div className={`p-4 rounded-xl border ${result.category === 'scam' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800/30'}`}>
              <div className="flex items-start gap-3">
                <span className={`material-symbols-rounded text-lg mt-0.5 ${result.category === 'scam' ? 'text-red-600 dark:text-red-500' : 'text-yellow-600 dark:text-yellow-500'}`}>
                  {result.category === 'scam' ? 'emergency_home' : 'warning'}
                </span>
                <p className={`text-sm leading-relaxed ${result.category === 'scam' ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                  <strong>{t.note}:</strong> {result.warning}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 ml-1">{t.nextSteps}</h3>
        <div className="grid grid-cols-1 gap-3">
          {result.suggestedActions?.map((action, i) => (
            <button
              key={i}
              onClick={() => onDraft(action)}
              className="flex items-center p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary dark:hover:border-primary group transition-all"
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${action.type === 'pay' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 group-hover:bg-green-600 group-hover:text-white' :
                action.type === 'dispute' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 group-hover:bg-red-600 group-hover:text-white' :
                  'bg-blue-50 dark:bg-blue-900/20 text-primary group-hover:bg-primary group-hover:text-white'
                }`}>
                <span className="material-symbols-rounded">
                  {action.type === 'pay' ? 'payments' :
                    action.type === 'fill' ? 'edit_square' :
                      action.type === 'dispute' ? 'gavel' :
                        action.type === 'ignore' ? 'verified_user' : 'edit_note'}
                </span>
              </div>
              <div className="ml-4 text-left">
                <p className="font-medium text-gray-900 dark:text-white">{action.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{action.description}</p>
              </div>
              <span className="material-symbols-rounded ml-auto text-gray-300 group-hover:text-primary">chevron_right</span>
            </button>
          ))}
          {!result.suggestedActions && (
            <button
              onClick={onDraft}
              className="flex items-center p-4 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary dark:hover:border-primary group transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-rounded">edit_note</span>
              </div>
              <div className="ml-4 text-left">
                <p className="font-medium text-gray-900 dark:text-white">{t.draftResponse}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.createEmail}</p>
              </div>
              <span className="material-symbols-rounded ml-auto text-gray-300 group-hover:text-primary">chevron_right</span>
            </button>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 p-4 z-40" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-md mx-auto flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t.back}
          </button>
          <button className="flex-1 bg-primary text-white font-medium py-3 rounded-xl shadow-lg shadow-primary/30 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-rounded text-sm">chat</span>
            {t.askFollowup}
          </button>
        </div>
      </div>
    </div >
  );
};