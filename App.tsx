import React, { useState } from 'react';
import { Navigation } from './components/Navigation';
import { Home } from './screens/Home';
import { Result } from './screens/Result';
import { Draft } from './screens/Draft';
import { SmartTemplates } from './screens/SmartTemplates';
import { History } from './screens/History';
import { Paywall } from './screens/Paywall';
import { FAQ } from './screens/FAQ';
import { AnalysisResult, Screen } from './types';
import { LanguageProvider } from './i18n/LanguageContext';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.HOME);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Subscription State
  const [isPro, setIsPro] = useState(false);

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setHistory((prev) => [result, ...prev]);
    setCurrentScreen(Screen.RESULT);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.HOME:
        return (
          <Home
            onAnalysisComplete={handleAnalysisComplete}
            onNavigate={setCurrentScreen}
            setLoading={setLoading}
            isPro={isPro}
          />
        );
      case Screen.RESULT:
        return analysisResult ? (
          <Result
            result={analysisResult}
            onBack={() => setCurrentScreen(Screen.HOME)}
            onDraft={() => setCurrentScreen(Screen.SMART_TEMPLATES)}
          />
        ) : <Home onAnalysisComplete={handleAnalysisComplete} onNavigate={setCurrentScreen} setLoading={setLoading} isPro={isPro} />;
      case Screen.SMART_TEMPLATES:
        return analysisResult ? (
          <SmartTemplates
            result={analysisResult}
            onBack={() => setCurrentScreen(Screen.RESULT)}
          />
        ) : null;
      case Screen.DRAFT:
        return analysisResult ? (
          <Draft
            result={analysisResult}
            onBack={() => setCurrentScreen(Screen.RESULT)}
          />
        ) : null;
      case Screen.HISTORY:
        return <History items={history} />;
      case Screen.FAQ:
        return <FAQ />;
      case Screen.PAYWALL:
        return (
          <Paywall
            onClose={() => setCurrentScreen(Screen.HOME)}
            onUpgrade={() => setIsPro(true)}
          />
        );
      default:
        return <Home onAnalysisComplete={handleAnalysisComplete} onNavigate={setCurrentScreen} setLoading={setLoading} isPro={isPro} />;
    }
  };

  return (
    <LanguageProvider>
      <div className="bg-gray-100 dark:bg-black min-h-screen flex justify-center font-sans">
        <div className="w-full max-w-md bg-white dark:bg-background-dark min-h-screen relative flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <header className="px-6 py-4 flex justify-between items-center sticky top-0 z-30 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
            {currentScreen !== Screen.HOME && currentScreen !== Screen.FAQ && currentScreen !== Screen.HISTORY ? (
              <button onClick={() => setCurrentScreen(Screen.HOME)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <span className="material-symbols-rounded text-gray-900 dark:text-white">arrow_back</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <span className="material-symbols-rounded text-xl">description</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-none">DocuMate</h1>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {currentScreen === Screen.HOME && !isPro && (
                <button
                  onClick={() => setCurrentScreen(Screen.PAYWALL)}
                  className="flex items-center gap-1 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-rounded text-sm">diamond</span>
                  PRO
                </button>
              )}
              <button
                onClick={() => setCurrentScreen(Screen.PAYWALL)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="material-symbols-rounded text-gray-600 dark:text-gray-300">settings</span>
              </button>
            </div>
          </header>

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 z-50 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-primary font-bold animate-pulse">Analyzing Document...</p>
            </div>
          )}

          {/* Main Content */}
          {renderScreen()}

          {/* Navigation */}
          <Navigation currentScreen={currentScreen} onNavigate={setCurrentScreen} />
        </div>
      </div>
    </LanguageProvider>
  );
};

export default App;