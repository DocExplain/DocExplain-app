import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { generateDraft } from '../services/aiOrchestrator';
import { useLanguage } from '../i18n/LanguageContext';
import { AdModal } from '../components/AdModal';

interface SmartTemplatesProps {
    result: AnalysisResult;
    initialAction?: any;
    onBack: () => void;
    isPro?: boolean;
}

type ResponsePath = 'extension' | 'dispute' | 'clarify' | 'accept' | 'fill';

export const SmartTemplates: React.FC<SmartTemplatesProps> = ({ result, initialAction, onBack, isPro = false }) => {
    const { t, lang } = useLanguage();

    const allResponsePaths: { id: ResponsePath; icon: string; label: string; subtitle: string }[] = [
        { id: 'extension', icon: 'schedule', label: t.reqExtension, subtitle: t.extSub },
        { id: 'dispute', icon: 'gavel', label: t.dispute, subtitle: t.disputeSub },
        { id: 'clarify', icon: 'help', label: t.clarify, subtitle: t.clarifySub },
        { id: 'accept', icon: 'check_circle', label: t.accept, subtitle: t.acceptSub },
        { id: 'fill', icon: 'edit_square', label: t.fillForm, subtitle: t.fillFormSub },
    ];

    const responsePaths = allResponsePaths.filter(path => {
        const cat = result.category?.toLowerCase() || '';
        // UI CLEANUP per user request: if it's a form, basically only show "fill" 
        // and avoid "clarify" and "accept" which are less relevant
        if (cat === 'form') {
            return path.id === 'fill';
        }

        if (path.id === 'fill') return cat === 'form';
        if (path.id === 'dispute') return ['bill', 'legal', 'lease', 'scam'].includes(cat);
        if (path.id === 'extension') return ['bill', 'legal', 'lease', 'medical'].includes(cat);
        return true; // clarify and accept always shown for non-forms
    });

    const templateMap: Record<ResponsePath, string> = {
        extension: 'Extension',
        dispute: 'Dispute',
        clarify: 'Clarify',
        accept: 'Accept',
        fill: 'Form Filling Data',
    };

    const getInitialPath = (): ResponsePath => {
        if (!initialAction) return 'extension';
        switch (initialAction.type) {
            case 'dispute': return 'dispute';
            case 'clarify': return 'clarify';
            case 'fill': return 'fill';
            case 'pay': return 'accept';
            default: return 'extension';
        }
    };

    const [selectedPath, setSelectedPath] = useState<ResponsePath>(getInitialPath());
    const [draft, setDraft] = useState('');
    const [customQuestion, setCustomQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [tone, setTone] = useState<'Professional' | 'Friendly' | 'Firm'>('Professional');

    // Ad logic for "Fill Form"
    const [showAd, setShowAd] = useState(false);
    const [pendingPath, setPendingPath] = useState<ResponsePath | null>(null);

    useEffect(() => {
        handleGenerate();
    }, [selectedPath, tone]);

    const handleGenerate = async (query?: string) => {
        setLoading(true);
        try {
            const context = result.fullText || result.summary;
            const template = query ? `Question: ${query}` : templateMap[selectedPath];
            const text = await generateDraft(context, tone, template, lang);
            setDraft(text);
        } catch {
            setDraft('Could not generate draft. Please try again.');
        }
        setLoading(false);
    };

    const onSelectPath = (path: ResponsePath) => {
        // PER USER: Click "Remplir" (fill) should trigger ad
        if (path === 'fill' && !isPro) {
            setPendingPath(path);
            setShowAd(true);
        } else {
            setSelectedPath(path);
        }
    };

    const handleAdComplete = () => {
        setShowAd(false);
        if (pendingPath) {
            setSelectedPath(pendingPath);
            setPendingPath(null);
        }
    };

    const handleAskQuestion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customQuestion.trim()) return;
        handleGenerate(customQuestion);
    };

    const formatDate = () => {
        const d = new Date(result.timestamp);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(draft);
        alert(t.copied);
    };

    return (
        <div className="flex-1 flex flex-col pb-40 animate-slide-up overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <button onClick={onBack} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <span className="material-symbols-rounded text-gray-900 dark:text-white">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{t.draftResponse}</h2>
            </div>

            <div className="p-4 space-y-6">
                {/* Original Document Card */}
                <div className="rounded-xl bg-slate-900 shadow-lg overflow-hidden">
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-rounded text-primary text-sm">description</span>
                            <p className="text-primary text-xs font-bold uppercase tracking-wider">Original Document</p>
                        </div>
                        <p className="text-white text-lg font-bold leading-tight">{result.fileName.replace(/\.\w+$/, '').replace(/[-_]/g, ' ')}</p>
                        <p className="text-slate-400 text-xs mt-1">Received: {formatDate()} • <span className="text-amber-400 font-medium">Urgent</span></p>
                    </div>
                </div>

                {/* Choose a Response Path */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">{t.chooseResponse}</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {responsePaths.map((path) => (
                            <button
                                key={path.id}
                                onClick={() => onSelectPath(path.id)}
                                className={`relative flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200 ${selectedPath === path.id
                                    ? 'border-primary bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                {selectedPath === path.id && (
                                    <div className="absolute top-2 right-2">
                                        <span className="material-symbols-rounded text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    </div>
                                )}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${selectedPath === path.id
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                    }`}>
                                    <span className="material-symbols-rounded">{path.icon}</span>
                                </div>
                                <p className={`text-sm font-semibold leading-tight ${selectedPath === path.id ? 'text-primary' : 'text-gray-900 dark:text-white'
                                    }`}>{path.label}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{path.subtitle}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Draft Editor Section */}
                <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Draft Editor</h3>
                        <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
                            <span className="material-symbols-rounded text-sm">auto_awesome</span>
                            AI Generated
                        </div>
                    </div>

                    {loading ? (
                        <div className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center min-h-[200px]">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t.generating}</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                                <p className="text-sm text-gray-900 dark:text-white font-medium">
                                    Subject: {responsePaths.find(p => p.id === selectedPath)?.label} regarding {result.fileName.replace(/\.\w+$/, '').replace(/[-_]/g, ' ')}
                                </p>
                            </div>
                            <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                className="w-full min-h-[180px] p-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300 bg-transparent placeholder-gray-400 focus:outline-none resize-none"
                                spellCheck={false}
                            />
                        </div>
                    )}

                    {/* Ask a Question Section */}
                    <div className="mt-6">
                        <form onSubmit={handleAskQuestion} className="flex gap-2">
                            <input
                                type="text"
                                value={customQuestion}
                                onChange={(e) => setCustomQuestion(e.target.value)}
                                placeholder="Posez une question sur le document..."
                                className="flex-1 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={loading || !customQuestion.trim()}
                                className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center disabled:opacity-50"
                            >
                                <span className="material-symbols-rounded">send</span>
                            </button>
                        </form>
                    </div>

                    {/* Quick Edit Toolbar */}
                    <div className="flex flex-col items-center mt-6">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Tone & Tools</p>
                        <div className="inline-flex items-center bg-slate-900 rounded-full px-2 py-1.5 gap-1 shadow-lg">
                            <button
                                onClick={() => setTone('Professional')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${tone === 'Professional' ? 'bg-white text-slate-900' : 'text-gray-400 hover:text-white'}`}
                            >
                                <span className="material-symbols-rounded text-lg">tune</span>
                                <span className="text-[10px] font-bold uppercase tracking-tight">Serious</span>
                            </button>
                            <button
                                onClick={() => setTone('Friendly')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${tone === 'Friendly' ? 'bg-white text-slate-900' : 'text-gray-400 hover:text-white'}`}
                            >
                                <span className="material-symbols-rounded text-lg">equalizer</span>
                                <span className="text-[10px] font-bold uppercase tracking-tight">Friendly</span>
                            </button>
                            <button
                                onClick={() => setTone('Firm')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${tone === 'Firm' ? 'bg-white text-slate-900' : 'text-gray-400 hover:text-white'}`}
                            >
                                <span className="material-symbols-rounded text-lg">settings</span>
                                <span className="text-[10px] font-bold uppercase tracking-tight">Direct</span>
                            </button>
                            <div className="w-px h-4 bg-gray-700 mx-1"></div>
                            <button
                                onClick={() => handleGenerate()}
                                className="p-2 rounded-full text-primary hover:bg-gray-700 transition-colors"
                                title="Regenerate"
                            >
                                <span className="material-symbols-rounded text-lg">refresh</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Bar - Removed Preview PDF button per user request */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 p-4 pb-6 z-40">
                <div className="max-w-md mx-auto">
                    <button
                        onClick={handleCopy}
                        className="w-full bg-primary text-white font-semibold py-4 rounded-xl shadow-lg shadow-primary/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        {t.copy}
                        <span className="material-symbols-rounded text-lg">content_copy</span>
                    </button>
                </div>
            </div>

            {showAd && (
                <AdModal
                    onClose={handleAdComplete}
                    type="reward"
                />
            )}
        </div>
    );
};
