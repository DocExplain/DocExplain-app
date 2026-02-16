import React from 'react';

export const FAQ: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col px-5 pt-4 pb-24 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Help & FAQ</h1>
      
      <div className="mb-4">
        <div className="relative group flex items-center">
            <span className="absolute left-3 text-gray-400">
                <span className="material-symbols-rounded">search</span>
            </span>
            <input 
                className="h-12 w-full rounded-xl border-none bg-white dark:bg-surface-dark py-3 pl-10 pr-4 text-sm text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-primary placeholder:text-gray-400" 
                placeholder="Search for help..." 
                type="text" 
            />
        </div>
      </div>

      <div className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Common Questions</h3>
        <div className="flex flex-col gap-3">
            {[
                { q: "Supported File Formats", a: "We support PDF, DOCX, JPG, and PNG formats up to 20MB." },
                { q: "How it works", a: "DocuMate uses AI to analyze text and provide simplified summaries." },
                { q: "Privacy & Security", a: "We do not store your documents after processing. Data is encrypted in transit." },
            ].map((item, idx) => (
                <details key={idx} className="group rounded-xl bg-white dark:bg-surface-dark shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 transition-all duration-300">
                    <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold text-gray-900 dark:text-white text-sm">
                        <span>{item.q}</span>
                        <span className="material-symbols-rounded text-gray-400 group-open:rotate-180 transition-transform duration-300">expand_more</span>
                    </summary>
                    <div className="border-t border-gray-100 dark:border-gray-700 px-4 pb-4 pt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {item.a}
                    </div>
                </details>
            ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-gradient-to-br from-primary/10 to-blue-200/20 dark:from-primary/20 dark:to-slate-800 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
            <span className="material-symbols-rounded">support_agent</span>
        </div>
        <h4 className="text-base font-bold text-gray-900 dark:text-white">Still have questions?</h4>
        <p className="mt-1 mb-4 text-sm text-gray-500 dark:text-gray-400">Our team is here to help.</p>
        <button className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform active:scale-[0.98] hover:bg-blue-600 flex items-center justify-center gap-2">
            <span className="material-symbols-rounded text-[20px]">mail</span>
            Contact Support
        </button>
      </div>
    </div>
  );
};