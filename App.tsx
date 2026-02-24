import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { RevenueCatUI, PAYWALL_RESULT } from '@revenuecat/purchases-capacitor-ui';
import { AdMob, InterstitialAdPluginEvents } from '@capacitor-community/admob';
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

// ── AdMob Ad Unit IDs ──────────────────────────────────────────────────────
// ⚠️  Replace these with your real Ad Unit IDs from AdMob Console before release.
//     Use Google test IDs for now (they show real test ads, no policy risk).
const ADMOB_APP_ID_IOS = 'ca-app-pub-3940256099942544~1458002511';          // Test App ID
const ADMOB_INTERSTITIAL_IOS = 'ca-app-pub-3940256099942544/4411468910';    // Test Interstitial
// const ADMOB_INTERSTITIAL_IOS = 'ca-app-pub-XXXXXXXX/YOUR_REAL_UNIT_ID'; // ← replace for production

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.HOME);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Subscription State
  const [isPro, setIsPro] = useState(false);
  // Guard: only allow paywall when RevenueCat is fully configured
  const [isPurchasesReady, setIsPurchasesReady] = useState(false);
  // Track pending result while ad is showing
  const pendingResultRef = useRef<AnalysisResult | null>(null);

  // ── RevenueCat Init ─────────────────────────────────────────────────────
  useEffect(() => {
    const initPurchases = async () => {
      if (Capacitor.getPlatform() === 'web') {
        console.log("RevenueCat: SDK not supported on web. Mocking Pro state.");
        return;
      }

      try {
        if (Capacitor.getPlatform() === 'ios') {
          await Purchases.configure({ apiKey: 'appl_cubDksaszunSkjAHHVhrFejxttW' });
        } else if (Capacitor.getPlatform() === 'android') {
          await Purchases.configure({ apiKey: 'test_aqrwUXptWgcKqadnjavnJwKLKHB' });
        }

        if (import.meta.env.DEV) {
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        }

        const result: any = await Purchases.getCustomerInfo();
        const customerInfo = result.customerInfo || result;
        setIsPro(customerInfo.entitlements?.active?.['DocExplain Premium'] !== undefined);

        await Purchases.addCustomerInfoUpdateListener((info: any) => {
          const customerInfo = info.customerInfo || info;
          setIsPro(customerInfo.entitlements?.active?.['DocExplain Premium'] !== undefined);
        });

        // ✅ SDK is ready — unlock the paywall button
        setIsPurchasesReady(true);
      } catch (e) {
        console.warn("RevenueCat initialization failed:", e);
        // Still mark as ready so the fallback paywall screen can be used
        setIsPurchasesReady(true);
      }
    };

    initPurchases();
  }, []);

  // ── AdMob Init ──────────────────────────────────────────────────────────
  useEffect(() => {
    const initAdMob = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        await AdMob.initialize({ testingDevices: [] });
        // Pre-load first interstitial
        preloadInterstitial();
      } catch (e) {
        console.warn("AdMob init failed:", e);
      }
    };
    initAdMob();
  }, []);

  const preloadInterstitial = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const adId = Capacitor.getPlatform() === 'ios' ? ADMOB_INTERSTITIAL_IOS : ADMOB_INTERSTITIAL_IOS;
      await AdMob.prepareInterstitial({ adId });
    } catch (e) {
      console.warn("AdMob preload failed:", e);
    }
  };

  const showInterstitialAndNavigate = async (result: AnalysisResult) => {
    if (!Capacitor.isNativePlatform() || isPro) {
      // No ad for Pro users or web
      navigateToResult(result);
      return;
    }

    try {
      // Listen for ad dismissal to then navigate
      const listener = await AdMob.addListener(
        InterstitialAdPluginEvents.Dismissed,
        () => {
          listener.remove();
          navigateToResult(result);
          // Pre-load next ad
          preloadInterstitial();
        }
      );

      // Also handle ad failure gracefully
      const failListener = await AdMob.addListener(
        InterstitialAdPluginEvents.FailedToLoad,
        () => {
          failListener.remove();
          listener.remove();
          navigateToResult(result);
        }
      );

      await AdMob.showInterstitial();
    } catch (e) {
      console.warn("AdMob show failed, navigating directly:", e);
      navigateToResult(result);
    }
  };

  const navigateToResult = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setHistory((prev) => [result, ...prev]);
    setCurrentScreen(Screen.RESULT);
  };

  const handleAnalysisComplete = (result: AnalysisResult) => {
    showInterstitialAndNavigate(result);
  };

  // ── Paywall ─────────────────────────────────────────────────────────────
  const handleOpenPaywall = async () => {
    if (!isPurchasesReady) {
      setCurrentScreen(Screen.PAYWALL);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        // First check if offerings/paywall are available
        const offerings = await Purchases.getOfferings();
        const current = (offerings as any)?.current || (offerings as any)?.offerings?.current;

        if (!current || !current.availablePackages || current.availablePackages.length === 0) {
          console.warn("No offerings available, using fallback paywall");
          setCurrentScreen(Screen.PAYWALL);
          return;
        }

        // Offerings exist — try native paywall
        const result = await RevenueCatUI.presentPaywall();
        if (result.result === PAYWALL_RESULT.PURCHASED || result.result === PAYWALL_RESULT.RESTORED) {
          setIsPro(true);
        }
      } catch (e: any) {
        console.error("Paywall error, using fallback:", e);
        setCurrentScreen(Screen.PAYWALL);
      }
    } else {
      setCurrentScreen(Screen.PAYWALL);
    }
  };


  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.HOME:
        return (
          <Home
            onAnalysisComplete={handleAnalysisComplete}
            onNavigate={(screen) => screen === Screen.PAYWALL ? handleOpenPaywall() : setCurrentScreen(screen)}
            setLoading={setLoading}
            isPro={isPro}
          />
        );
      case Screen.RESULT:
        return analysisResult ? (
          <Result
            result={analysisResult}
            onBack={() => setCurrentScreen(Screen.HOME)}
            onDraft={(action) => {
              setSelectedAction(action);
              setCurrentScreen(Screen.SMART_TEMPLATES);
            }}
          />
        ) : <Home onAnalysisComplete={handleAnalysisComplete} onNavigate={(screen) => screen === Screen.PAYWALL ? handleOpenPaywall() : setCurrentScreen(screen)} setLoading={setLoading} isPro={isPro} />;
      case Screen.SMART_TEMPLATES:
        return analysisResult ? (
          <SmartTemplates
            result={analysisResult}
            initialAction={selectedAction}
            onBack={() => setCurrentScreen(Screen.RESULT)}
            isPro={isPro}
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
        return <History
          items={history}
          onView={(item) => {
            setAnalysisResult(item);
            setCurrentScreen(Screen.RESULT);
          }}
          onDelete={(item) => {
            setHistory(prev => prev.filter(i => i !== item));
          }}
        />;
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
        return <Home onAnalysisComplete={handleAnalysisComplete} onNavigate={(screen) => screen === Screen.PAYWALL ? handleOpenPaywall() : setCurrentScreen(screen)} setLoading={setLoading} isPro={isPro} />;
    }
  };

  return (
    <LanguageProvider>
      <div className="bg-gray-100 dark:bg-black min-h-screen flex justify-center font-sans">
        <div className="w-full max-w-md bg-white dark:bg-background-dark min-h-screen relative flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <header className="px-6 py-4 flex justify-between items-center sticky top-0 z-30 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
            {currentScreen !== Screen.HOME && currentScreen !== Screen.FAQ && currentScreen !== Screen.HISTORY && currentScreen !== Screen.PAYWALL ? (
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
                  onClick={handleOpenPaywall}
                  className="flex items-center gap-1 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-rounded text-sm">diamond</span>
                  PRO
                </button>
              )}
            </div>
          </header>

          {/* Loading Banner (non-blocking) */}
          {loading && (
            <div className="mx-4 mt-2 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between z-40 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-primary">Analyzing Document...</p>
              </div>
              <button
                onClick={() => setLoading(false)}
                className="text-xs text-gray-500 hover:text-red-500 font-medium transition-colors"
              >
                Cancel
              </button>
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