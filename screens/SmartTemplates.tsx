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
        // Updated for v1.3 universal categories
        if (['identity', 'education', 'social'].includes(cat) && path.id !== 'clarify') {
            return path.id === 'fill'; // identity/education forms → fill
        }
        if (path.id === 'fill') return ['identity', 'education', 'social'].includes(cat);
        if (path.id === 'dispute') return ['taxation', 'finance', 'legal', 'housing', 'transport'].includes(cat);
        if (path.id === 'extension') return ['taxation', 'finance', 'legal', 'housing'].includes(cat);
        return true; // clarify and accept always shown
    });

    const templateMap: Record<ResponsePath, string> = {
        extension: 'Extension',
        dispute: 'Dispute',
        clarify: 'Ask for clarifications',
        accept: 'Accept',
        fill: 'Form Filling Data',
    };

    const getInitialPath = (): ResponsePath => {
        if (!initialAction) return 'extension';
        const typeStr = initialAction.type?.toLowerCase() || '';
        if (typeStr.includes('dispute')) return 'dispute';
        if (typeStr.includes('clarify') || typeStr.includes('clarifications')) return 'clarify';
        if (typeStr.includes('fill')) return 'fill';
        if (typeStr.includes('pay') || typeStr.includes('accept')) return 'accept';
        return 'extension';
    };

    const [viewMode, setViewMode] = useState<'analysis' | 'draft'>('analysis');
    const [selectedPath, setSelectedPath] = useState<ResponsePath>(getInitialPath());
    const [draft, setDraft] = useState('');
    const [chatLog, setChatLog] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
    const [customQuestion, setCustomQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    // Tone removed per user request, defaulting to 'Professional' internally if needed or just redundant
    const [tone, setTone] = useState<'Professional' | 'Friendly' | 'Firm'>('Professional');

    // Ad logic for "Fill Form"
    const [showAd, setShowAd] = useState(false);
    const [pendingPath, setPendingPath] = useState<ResponsePath | null>(null);

    // Preview Logic
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (viewMode === 'draft' && !chatLog.length) {
            handleGenerate();
        }
    }, [viewMode, selectedPath]);

    const handleGenerate = async (query?: string) => {
        setLoading(true);
        try {
            const context = result.fullText || result.summary;
            const template = query ? `Question: ${query}` : templateMap[selectedPath];
            const responseData = await generateDraft(context, tone, template, lang, draft);

            if (query) {
                const newChatResponse = responseData.chatResponse || responseData.explanation || "Done.";
                const newEntries: { role: 'user' | 'ai', content: string }[] = [
                    { role: 'user', content: query },
                    { role: 'ai', content: newChatResponse },
                ];
                // If a draft was generated from the question (user asked to write a mail), show it in chat
                if (responseData.draft && responseData.draft !== draft && responseData.draft.length > 50) {
                    newEntries.push({ role: 'ai', content: `📝 ${t.generatedDraft}:\n\n${responseData.draft}` });
                    setDraft(responseData.draft);
                }
                setChatLog(prev => [...prev, ...newEntries]);
                setCustomQuestion('');
            } else {
                setDraft(responseData.draft || "");
                setChatLog([]);
            }
        } catch {
            if (!query) setDraft('Could not generate draft. Please try again.');
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
        // Stay in analysis mode — just ask the question and show the answer inline
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
        <div className="flex-1 flex flex-col pb-56 animate-slide-up overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <button onClick={handleBack} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <span className="material-symbols-rounded text-gray-900 dark:text-white">arrow_back</span>
                </button>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                    {viewMode === 'analysis' ? t.analysisResult : t.draftResponse}
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
                                        <h3 className="text-sm font-bold text-red-700 dark:text-red-300">{t.documentUnclear}</h3>
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
                                        {result.originalDoc.mimeType === 'text/plain' ? (
                                            <div className="w-full h-full p-4 overflow-y-auto bg-white/90 dark:bg-black/90 text-[10px] font-mono text-gray-800 dark:text-gray-300 whitespace-pre-wrap opacity-80 group-hover:opacity-100 transition-opacity">
                                                {decodeURIComponent(escape(window.atob(result.originalDoc.data))).substring(0, 800)}...
                                            </div>
                                        ) : (
                                            <img
                                                src={`data:${result.originalDoc.mimeType};base64,${result.originalDoc.data}`}
                                                alt="Document"
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                            />
                                        )}
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

                        {/* 2. Analysis Summary Card (Paginated) */}
                        <div className="rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-rounded text-primary">auto_awesome</span>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Summary</h3>
                                    </div>
                                    {result.pages && result.pages.length > 1 && (
                                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full px-2 py-1">
                                            <button
                                                onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}
                                                disabled={currentPageIndex === 0}
                                                className="p-1 rounded-full text-gray-500 hover:text-primary disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                                            >
                                                <span className="material-symbols-rounded text-sm">chevron_left</span>
                                            </button>
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                                Page {currentPageIndex + 1} / {result.pages.length}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPageIndex(p => Math.min((result.pages?.length || 1) - 1, p + 1))}
                                                disabled={currentPageIndex === (result.pages?.length || 1) - 1}
                                                className="p-1 rounded-full text-gray-500 hover:text-primary disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                                            >
                                                <span className="material-symbols-rounded text-sm">chevron_right</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                                    {result.pages && result.pages.length > 0
                                        ? result.pages[currentPageIndex].summary
                                        : (result.summary || "No summary available.")}
                                </p>

                                {/* Key Points - show only on the first page or if not paginated */}
                                {(!result.pages || currentPageIndex === 0) && result.keyPoints && result.keyPoints.length > 0 && (
                                    <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4">
                                        {result.keyPoints.map((point, i) => (
                                            <div key={i} className="flex gap-2 items-start">
                                                <span className="text-primary mt-1 text-[10px]">●</span>
                                                <p className="text-gray-700 dark:text-gray-300 text-xs">{point}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Extracted Text Transcription for the current page */}
                                {result.pages && result.pages.length > 0 && result.pages[currentPageIndex].extractedText && (
                                    <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-rounded text-xs text-gray-400">subject</span>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Transcription</h4>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-3 max-h-48 overflow-y-auto">
                                            <p className="text-[10px] font-mono whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                                                {result.pages[currentPageIndex].extractedText}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!result.pages && result.fullText && (
                                    <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-rounded text-xs text-gray-400">subject</span>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Transcription</h4>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-3 max-h-48 overflow-y-auto">
                                            <p className="text-[10px] font-mono whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                                                {result.fullText}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <p className="text-gray-400 text-[10px] mt-4 text-right">Analyzed on {formatDate()}</p>
                            </div>
                        </div>

                        {/* AI Suggested Action Buttons - shown in analysis mode */}
                        {result.suggestedActions && result.suggestedActions.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">{t.nextSteps}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {result.suggestedActions.map((action, i) => {
                                        const severityColors = {
                                            high: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300',
                                            medium: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300',
                                            low: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
                                        };
                                        const colors = severityColors[(action.severity as keyof typeof severityColors)] || severityColors.low;
                                        const iconMap: Record<string, string> = {
                                            contact: 'call', fill: 'edit_square', dispute: 'gavel',
                                            ignore: 'check_circle', verify: 'fact_check', archive: 'inventory_2',
                                            'ask for clarifications': 'help',
                                        };
                                        const icon = iconMap[action.type] || 'arrow_forward';
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    // Map AI action to a response path and switch to draft mode
                                                    const type = action.type?.toLowerCase() || '';
                                                    if (type.includes('fill')) { onSelectPath('fill'); }
                                                    else if (type.includes('dispute')) { onSelectPath('dispute'); }
                                                    else if (type.includes('clarif')) { onSelectPath('clarify'); }
                                                    else {
                                                        // For actions not in the standard list, use the action label as template
                                                        setSelectedPath('clarify');
                                                        setViewMode('draft');
                                                    }
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all active:scale-95 ${colors}`}
                                            >
                                                <span className="material-symbols-rounded text-base">{icon}</span>
                                                <div className="text-left">
                                                    <p className="font-semibold text-xs">{action.label}</p>
                                                    <p className="text-[10px] opacity-70 mt-0.5">{action.description}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Key Dates */}
                        {result.keyDates && result.keyDates.length > 0 && (
                            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-4 mb-4 animate-fade-in">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-rounded text-amber-500">calendar_clock</span>
                                    <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">{t.keyDatesLabel}</h3>
                                </div>
                                <ul className="space-y-1">
                                    {result.keyDates.map((date, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-amber-500 mt-0.5 text-xs">⏰</span>
                                            <p className="text-sm text-amber-800 dark:text-amber-200">{date}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Regional Context */}
                        {result.regionalContext && result.regionalContext !== 'null' && (
                            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-4 mb-4 animate-fade-in">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-rounded text-blue-500">public</span>
                                    <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300">{t.localContext}</h3>
                                </div>
                                <p className="text-sm text-blue-700 dark:text-blue-200 leading-relaxed">{result.regionalContext}</p>
                            </div>
                        )}

                        {/* Complex Terms Lexique */}
                        {result.complexTerms && result.complexTerms.length > 0 && (
                            <div className="rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 p-4 mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-rounded text-primary">menu_book</span>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t.lexicon}</h3>
                                </div>
                                <div className="space-y-2">
                                    {result.complexTerms.map((item, i) => (
                                        <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                                            <p className="text-xs font-bold text-primary mb-0.5">{item.term}</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-300">{item.explanation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-6">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">{t.askQuestionOnDoc || "Ask a Question"}</h3>
                            <form onSubmit={handleAskQuestion} className="flex gap-2">
                                <input
                                    type="text"
                                    value={customQuestion}
                                    onChange={(e) => setCustomQuestion(e.target.value)}
                                    placeholder={t.askQuestionOnDoc || "Ask about this document..."}
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

                            {/* Inline loading indicator for questions */}
                            {loading && viewMode === 'analysis' && (
                                <div className="flex items-center gap-2 mt-3 px-1 animate-fade-in">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                    <p className="text-xs text-gray-500">{t.generating}</p>
                                </div>
                            )}

                            {/* DRAFT WORKSPACE — appears when a draft is generated from a question */}
                            {draft && draft.length > 50 && viewMode === 'analysis' && (
                                <div className="mt-4 animate-fade-in">
                                    <div className="rounded-2xl border-2 border-primary/30 bg-blue-50/50 dark:bg-blue-900/10 overflow-hidden">
                                        {/* Draft header */}
                                        <div className="flex items-center justify-between px-4 py-2.5 bg-primary/10 dark:bg-primary/20 border-b border-primary/20">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-rounded text-primary text-base">edit_document</span>
                                                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">{t.generatedDraft}</h4>
                                                {loading && <span className="text-[10px] text-primary/60 animate-pulse">— en cours…</span>}
                                            </div>
                                            <button
                                                onClick={handleCopy}
                                                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
                                            >
                                                <span className="material-symbols-rounded text-sm">content_copy</span>
                                                {t.copy}
                                            </button>
                                        </div>
                                        {/* Draft content */}
                                        <div className="p-4 max-h-[300px] overflow-y-auto">
                                            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{draft}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Chat messages — shown below draft workspace */}
                            {chatLog.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    {chatLog.filter(msg => !msg.content.startsWith('📝')).map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                                ? 'bg-primary text-white rounded-br-sm'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                                                }`}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* DRAFT MODE */}
                {viewMode === 'draft' && (
                    <div className="animate-slide-up flex flex-col h-full space-y-4">
                        {/* 3. Choose a Response Actions - Moved to Draft Mode */}
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

                        {loading && !draft ? (
                            <div className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center min-h-[200px]">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t.generating}</p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm relative">
                                {loading && draft && (
                                    <div className="absolute inset-0 bg-white/50 dark:bg-surface-dark/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg flex items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t.generating}</span>
                                        </div>
                                    </div>
                                )}
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

                        {/* Suggestion Shortcuts before Chat Input */}
                        <div className="mt-4">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.nextSteps || "Quick Actions"}</h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {responsePaths.map((path) => (
                                    <button
                                        key={path.id}
                                        onClick={() => handleGenerate(path.label)}
                                        className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 hover:border-primary text-gray-700 dark:text-gray-300 text-xs py-1.5 px-3 rounded-full flex items-center gap-1.5 transition-colors"
                                    >
                                        <span className="material-symbols-rounded text-sm">{path.icon}</span>
                                        {path.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ask a Question Section - Chat Interface */}
                        <div className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm relative z-30">
                            {chatLog.length > 0 && (
                                <div className="mb-4 space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {chatLog.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`rounded-xl px-3 py-2 text-sm max-w-[85%] animate-fade-in ${msg.role === 'user' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <form onSubmit={handleAskQuestion} className="flex gap-2">
                                <input
                                    type="text"
                                    value={customQuestion}
                                    onChange={(e) => setCustomQuestion(e.target.value)}
                                    placeholder={t.askPlaceholder || "Ask about document or modify draft..."}
                                    className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors shadow-inner"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !customQuestion.trim()}
                                    className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center disabled:opacity-50 shadow-md shadow-primary/20 hover:bg-blue-600 transition-colors"
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
