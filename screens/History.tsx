import React from 'react';
import { AnalysisResult } from '../types';

interface HistoryProps {
  items: AnalysisResult[];
}

export const History: React.FC<HistoryProps> = ({ items }) => {
  // Mock items if empty for UI demonstration
  const displayItems = items.length > 0 ? items : [
    {
      fileName: 'Employment_Contract.pdf',
      summary: 'Analyzed clauses regarding termination and non-compete.',
      timestamp: '2h ago',
      keyPoints: []
    },
    {
      fileName: 'NDA_Draft_v2.docx',
      summary: 'Summary of confidentiality terms and duration.',
      timestamp: 'Yesterday',
      keyPoints: []
    },
    {
      fileName: 'Lease_Agreement_2024.pdf',
      summary: 'Breakdown of tenant rights and deposit return.',
      timestamp: 'Oct 12',
      keyPoints: []
    }
  ];

  return (
    <div className="flex-1 px-4 py-4 pb-24 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 px-2">History</h1>
      
      {/* Privacy Banner */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 flex gap-3 items-start mb-6">
        <div className="flex-shrink-0 size-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-primary dark:text-blue-300">
          <span className="material-symbols-rounded text-sm">lock</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Stored locally only</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
            Your documents are encrypted and stored on your device.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
          <span className="material-symbols-rounded">search</span>
        </div>
        <input 
          className="w-full bg-white dark:bg-surface-dark border-none rounded-xl py-3 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary shadow-sm" 
          placeholder="Search past explanations..." 
          type="text" 
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 mb-1">Recent</h2>
        
        {displayItems.map((item, idx) => (
          <div key={idx} className="group flex flex-col bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 size-12 rounded-lg flex items-center justify-center ${
                item.fileName.endsWith('pdf') ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 
                item.fileName.endsWith('docx') ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-500'
              }`}>
                <span className="material-symbols-rounded text-2xl">
                    {item.fileName.endsWith('pdf') ? 'picture_as_pdf' : 'description'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate pr-2">{item.fileName}</h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{item.timestamp}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{item.summary}</p>
                
                <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-50 dark:border-gray-700 pt-3">
                    <button className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors">
                        <span className="material-symbols-rounded text-sm">delete</span>
                        Delete
                    </button>
                    <button className="flex items-center gap-1 text-xs font-medium text-primary bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                        <span className="material-symbols-rounded text-sm">visibility</span>
                        View
                    </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};