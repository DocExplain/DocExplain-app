import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { generateDraft } from '../services/aiOrchestrator';
import { useLanguage } from '../i18n/LanguageContext';
import { AdModal } from '../components/AdModal';
import { PreviewModal } from '../components/PreviewModal';

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

    const [viewMode, setViewMode] = useState<'analysis' | 'draft'>('analysis');
    const [selectedPath, setSelectedPath] = useState<ResponsePath>(getInitialPath());
    const [draft, setDraft] = useState('');
    const [customQuestion, setCustomQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    // Tone removed per user request, defaulting to 'Professional' internally if needed or just redundant
    const [tone, setTone] = useState<'Professional' | 'Friendly' | 'Firm'>('Professional');

    // Ad logic for "Fill Form"
    const [showAd, setShowAd] = useState(false);
    const [pendingPath, setPendingPath] = useState<ResponsePath | null>(null);

    // Preview Logic
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (viewMode === 'draft') {
            handleGenerate();
        }
    }, [viewMode, selectedPath]); // Trigger when entering draft mode or changing path

    const handleGenerate = async (query?: string) => {
        setLoading(true);
        try {
            const context = result.fullText || result.summary;
            const template = query ? `Question: ${query}` : templateMap[selectedPath];
            // Uses 'Professional' tone by default now as buttons are removed, or we could pass 'Tutor' for forms implicitly
            // Actually api/draft.ts logic for 'Form Filling Data' ignores tone largely and uses its own style.
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
            setViewMode('draft');
        }
    };

    const handleAdComplete = () => {
        setShowAd(false);
        if (pendingPath) {
            setSelectedPath(pendingPath);
            setPendingPath(null);
            setViewMode('draft');
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

    const handleBack = () => {
        if (viewMode === 'draft') {
            setViewMode('analysis');
        } else {
            onBack();
        }
    };

    return (
        <div className="flex-1 flex flex-col pb-40 animate-slide-up overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <button onClick={handleBack} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <span className="material-symbols-rounded text-gray-900 dark:text-white">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                    {viewMode === 'analysis' ? 'Analysis Result' : t.draftResponse}
                </h2>
            </div>

            <div className="p-4 space-y-6">
                {/* Original Document Card - Always Visible or just in Analysis? User said "explain content THEN deepen" */}
                {viewMode === 'analysis' && (
                    <>

                        {/* 1. Visual Document Preview & Legibility Warning */}
                        <div className="mb-4">
                            {result.isLegible === false && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 flex items-start gap-3 animate-fade-in">
                                    <span className="material-symbols-rounded text-red-500 mt-0.5">warning</span>
                                    <div>
                                        <h3 className="text-sm font-bold text-red-700 dark:text-red-300">Document may be unclear</h3>
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                            {result.illegibleReason || "The AI had trouble reading this document. Results might be inaccurate."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div
                                onClick={() => setShowPreview(true)}
                                className="relative w-full h-48 bg-slate-900 rounded-2xl overflow-hidden shadow-lg cursor-pointer group transition-all hover:scale-[1.01]"
                            >
                                {result.originalDoc ? (
                                    <>
                                        <img
                                            src={`data:${result.originalDoc.mimeType};base64,${result.originalDoc.data}`}
                                            alt="Document"
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="material-symbols-rounded text-white text-sm drop-shadow-md">visibility</span>
                                                <span className="text-white text-xs font-bold uppercase tracking-wider drop-shadow-md">Preview Original</span>
                                            </div>
                                            <h3 className="text-white text-lg font-bold leading-tight drop-shadow-md line-clamp-1">{result.fileName}</h3>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                        <span className="material-symbols-rounded text-4xl mb-2">description</span>
                                        <span className="text-xs">No preview available</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Analysis Summary Card */}
                        <div className="rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-rounded text-primary">auto_awesome</span>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Summary</h3>
                                </div>

                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                                    {result.summary || "No summary available."}
                                </p>

                                {/* Key Points */}
                                {result.keyPoints && result.keyPoints.length > 0 && (
                                    <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                                        {result.keyPoints.slice(0, 3).map((point, i) => (
                                            <div key={i} className="flex gap-2 items-start">
                                                <span className="text-primary mt-1 text-[10px]">●</span>
                                                <p className="text-gray-700 dark:text-gray-300 text-xs">{point}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <p className="text-gray-400 text-[10px] mt-3 text-right">Analyzed on {formatDate()}</p>
                            </div>
                        </div>

                        {/* 3. Choose a Response Actions */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">{t.chooseResponse}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {responsePaths.map((path) => (
                                    <button
                                        key={path.id}
                                        onClick={() => onSelectPath(path.id)}
                                        className="relative flex flex-col items-start p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark hover:border-primary hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200"
                                    >
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                            <span className="material-symbols-rounded">{path.icon}</span>
                                        </div>
                                        <p className="text-sm font-semibold leading-tight text-gray-900 dark:text-white">{path.label}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{path.subtitle}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-6">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">{t.askQuestion || "Ask a Question"}</h3>
                            <form onSubmit={handleAskQuestion} className="flex gap-2">
                                <input
                                    type="text"
                                    value={customQuestion}
                                    onChange={(e) => setCustomQuestion(e.target.value)}
                                    placeholder={t.askPlaceholder || "Ask about this document..."}
                                    className="flex-1 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors shadow-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !customQuestion.trim()}
                                    className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center disabled:opacity-50 shadow-md shadow-primary/20"
                                >
                                    <span className="material-symbols-rounded">send</span>
                                </button>
                            </form>
                        </div>
                    </>
                )}

                {/* Draft Editor Section - Only in Draft Mode */}
                {viewMode === 'draft' && (
                    <div className="animate-slide-up">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                {selectedPath === 'fill' ? 'Guidance & Tutorial' : 'Draft Editor'}
                            </h3>
                            <div className="flex items-center gap-2">
                                {result.originalDoc && (
                                    <button
                                        onClick={() => setShowPreview(true)}
                                        className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        title="View Original Document"
                                    >
                                        <span className="material-symbols-rounded text-gray-500 text-sm">visibility</span>
                                    </button>
                                )}
                                <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
                                    <span className="material-symbols-rounded text-sm">auto_awesome</span>
                                    AI Generated
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center min-h-[200px]">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t.generating}</p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                                        Topic: {responsePaths.find(p => p.id === selectedPath)?.label}
                                    </p>
                                </div>
                                <textarea
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    className="w-full min-h-[300px] p-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300 bg-transparent placeholder-gray-400 focus:outline-none resize-none"
                                    spellCheck={false}
                                />
                            </div>
                        )}

                        {/* Ask a Question Section - Keeps this available for "refaire une analyse" or clarification */}
                        <div className="mt-4">
                            <form onSubmit={handleAskQuestion} className="flex gap-2">
                                <input
                                    type="text"
                                    value={customQuestion}
                                    onChange={(e) => setCustomQuestion(e.target.value)}
                                    placeholder={t.askPlaceholder || "Ask about this document..."}
                                    className="flex-1 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors shadow-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !customQuestion.trim()}
                                    className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center disabled:opacity-50 shadow-md shadow-primary/20"
                                >
                                    <span className="material-symbols-rounded">send</span>
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Fixed Bottom Bar - Only show Copy/Action in Draft Mode */}
            {
                viewMode === 'draft' && (
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
                )
            }

            {
                showAd && (
                    <AdModal
                        isOpen={showAd}
                        onClose={handleAdComplete}
                        type="reward"
                    />
                )
            }

            <PreviewModal
                isOpen={showPreview}
                imageSrc={result.originalDoc ? `data:${result.originalDoc.mimeType};base64,${result.originalDoc.data}` : null}
                onClose={() => setShowPreview(false)}
            />
        </div >
    );
};
