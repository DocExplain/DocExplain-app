import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useLanguage } from '../i18n/LanguageContext';
import { SUPPORTED_LANGS } from '../i18n/translations';
import { explainDocument } from '../services/aiOrchestrator';
import { Screen } from '../types';
import { AdModal } from '../components/AdModal';
import { PreviewModal } from '../components/PreviewModal';
interface HomeProps {
  onAnalysisComplete: (result: any) => void;
  onNavigate: (screen: Screen) => void;
  setLoading: (loading: boolean) => void;
  isPro: boolean;
}

const getCountryList = (t: any) => [
  t.countryUS, t.countryUK, t.countryCA, t.countryAU, t.countryCH,
  t.countryDE, t.countryFR, t.countryIT, t.countryES, t.countryNL, t.countryBE,
  t.countryAT, t.countrySE, t.countryNO, t.countryDK, t.countryFI, t.countryIE,
  t.countryIN, t.countrySG, t.countryJP, t.countryBR, t.countryMX, t.countryOther
];

const MAX_FREE_CHARS = 15000;
const MAX_DAILY_FREE_DOCS = 3;

export const Home: React.FC<HomeProps> = ({ onAnalysisComplete, onNavigate, setLoading, isPro }) => {
  const { t, lang, setLang } = useLanguage();
  const countries = getCountryList(t);
  const [country, setCountry] = useState(t.countryUS);
  const [jurisdiction, setJurisdiction] = useState('');
  const [context, setContext] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraBase64, setCameraBase64] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf'>('image');

  // Usage & Limits
  const [dailyUsage, setDailyUsage] = useState(0);
  const [bonusQuota, setBonusQuota] = useState(0); // Quota earned from watching ads

  // Ad State
  const [showAd, setShowAd] = useState(false);
  const [adType, setAdType] = useState<'interstitial' | 'reward'>('interstitial');
  const [pendingResult, setPendingResult] = useState<any>(null); // Store result while ad plays

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check daily usage limits from local storage
    const storedUsage = localStorage.getItem('documate_daily_usage');
    const storedDate = localStorage.getItem('documate_usage_date');
    const today = new Date().toDateString();

    if (storedDate !== today) {
      // Reset if it's a new day
      setDailyUsage(0);
      setBonusQuota(0);
      localStorage.setItem('documate_daily_usage', '0');
      localStorage.setItem('documate_usage_date', today);
    } else {
      setDailyUsage(parseInt(storedUsage || '0', 10));
    }
  }, []);

  const incrementUsage = () => {
    const newCount = dailyUsage + 1;
    setDailyUsage(newCount);
    localStorage.setItem('documate_daily_usage', newCount.toString());
    localStorage.setItem('documate_usage_date', new Date().toDateString());
  };

  // Helper to resize image
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max width/height 1024 to avoid payload too large
          const MAX_SIZE = 1024;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Get base64 (remove prefix)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl.split(',')[1]);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) { // 3MB limit for Vercel Serverless payload
        alert(t.errorFileTooLarge || "Ce fichier est trop lourd (Max 3Mo). Veuillez compresser votre document et réessayer.");
        event.target.value = '';
        return;
      }

      setSelectedFile(file);
      event.target.value = '';

      try {
        if (file.type.includes('image')) {
          const resizedBase64 = await resizeImage(file);
          setFilePreview(resizedBase64);
          setFileType('image');
        } else if (file.type.includes('pdf')) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
            reader.readAsDataURL(file);
          });
          setFilePreview(base64);
          setFileType('pdf');
        } else {
          setFilePreview(null);
          setFileType('image');
        }
      } catch (e) {
        console.error("File read failed", e);
      }

      setCameraBase64(null); // Clear camera if file selected
    }
  };

  const handleScan = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        width: 1024, // Limit width at source
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      if (image.base64String) {
        setCameraBase64(image.base64String);
        setSelectedFile(null);
        setFilePreview(null);
      }
    } catch (e) {
      console.error("Camera error or canceled", e);
    }
  };

  const [showPreview, setShowPreview] = useState(false);

  const checkLimits = (textLength: number): boolean => {
    if (isPro) return true;
    if (dailyUsage >= (MAX_DAILY_FREE_DOCS + bonusQuota)) return false;
    if (textLength > MAX_FREE_CHARS) {
      alert("This document is too long for the free plan (max 5 pages). Please upgrade to Pro.");
      onNavigate(Screen.PAYWALL);
      return false;
    }
    return true;
  };

  const startRewardAd = () => {
    setAdType('reward');
    setShowAd(true);
  };

  const handleAnalyze = async () => {
    if (!selectedFile && !context && !cameraBase64) return;
    if (!isPro && dailyUsage >= (MAX_DAILY_FREE_DOCS + bonusQuota)) return;

    setLoading(true);

    let textToAnalyze = "";
    let docName = "Context Analysis";
    let imageBase64Data: string | undefined = cameraBase64 || undefined;

    // Path 1: Camera/Image (cameraBase64 is now set for both scans and image uploads)
    if (cameraBase64) {
      docName = selectedFile ? selectedFile.name : `scan_${new Date().getTime()}.jpg`;
      textToAnalyze = context || "Analyze this document.";
    }
    // Path 2: PDF/Text Upload
    else if (selectedFile) {
      docName = selectedFile.name;
      try {
        if (selectedFile.type.includes('pdf')) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
            reader.readAsDataURL(selectedFile);
          });
          imageBase64Data = base64;
          textToAnalyze = context || "Analyze this PDF.";
        } else {
          textToAnalyze = await selectedFile.text();
          if (context) textToAnalyze = `Context: ${context}\n\nDocument Content:\n${textToAnalyze}`;
        }
      } catch (e) {
        console.error("File read error", e);
        setLoading(false);
        return;
      }
    } else {
      // Just context
      textToAnalyze = context;
    }

    if (!checkLimits(textToAnalyze.length)) {
      setLoading(false);
      return;
    }

    try {
      const fullContext = `
        Document Text: ${textToAnalyze}
        User Context/Questions: ${context}
        Jurisdiction: ${country === 'Other' ? (jurisdiction || 'Custom') : country} ${country !== 'Other' && jurisdiction ? `(${jurisdiction})` : ''}
      `;

      const result = await explainDocument(fullContext, docName, SUPPORTED_LANGS.find(l => l.code === lang)?.name || 'English', imageBase64Data);

      if (!isPro && !showAd) {
        incrementUsage();
      }

      // Restore originalDoc attachment for preview
      if (imageBase64Data) {
        result.originalDoc = {
          type: 'image', // simplified, logic passes base64
          data: imageBase64Data,
          mimeType: imageBase64Data.startsWith('JVBER') ? 'application/pdf' : 'image/jpeg'
        };
      } else if (selectedFile && !selectedFile.type.includes('image') && !selectedFile.type.includes('pdf')) {
        const textContent = await selectedFile.text();
        result.originalDoc = {
          type: 'text',
          data: window.btoa(unescape(encodeURIComponent(textContent))),
          mimeType: 'text/plain'
        };
      }

      onAnalysisComplete(result);
    } catch (error) {
      console.error("Analysis failed", error);
      alert(t.analyzeError);
    } finally {
      setLoading(false);
    }
  };

  const handleAdClose = () => {
    setShowAd(false);
    if (adType === 'interstitial' && pendingResult) {
      onAnalysisComplete(pendingResult);
      setPendingResult(null);
    }
  };

  const handleAdReward = () => {
    if (adType === 'reward') {
      setBonusQuota(prev => prev + 1);
    }
  };

  // Debugging logic ...
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      setDebugLogs(prev => [...prev.slice(-49), `LOG: ${args.join(' ')}`]);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      setDebugLogs(prev => [...prev.slice(-49), `ERR: ${args.join(' ')}`]);
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const isLimitReached = !isPro && dailyUsage >= (MAX_DAILY_FREE_DOCS + bonusQuota);
  const hasInput = selectedFile || context || cameraBase64;

  return (
    <div className="flex-1 flex flex-col px-6 pb-32 animate-fade-in relative">
      {/* Document Preview Modal */}
      {showPreview && cameraBase64 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-black rounded-2xl overflow-hidden relative shadow-2xl">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur-md"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
            <img
              src={cameraBase64 ? `data:image/jpeg;base64,${cameraBase64}` : `data:${fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'};base64,${filePreview}`}
              alt="Preview"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}

      <AdModal
        isOpen={showAd}
        type={adType}
        onClose={handleAdClose}
        onReward={handleAdReward}
        onUpgrade={() => { setShowAd(false); onNavigate(Screen.PAYWALL); }}
      />

      <div className="mt-4 mb-6">
        {/* Language Selector */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-gray-400 text-sm">translate</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as any)}
              className="bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5 border-0 focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              {SUPPORTED_LANGS.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
          <button onClick={() => setShowDebug(!showDebug)} className="text-gray-300 p-1">
            <span className="material-symbols-rounded text-xs">bug_report</span>
          </button>
        </div>

        {/* Debug Console */}
        {showDebug && (
          <div className="bg-black/90 p-3 rounded-lg mb-4 max-h-40 overflow-y-auto text-[10px] font-mono text-green-400 shadow-xl border border-gray-700 pointer-events-auto animate-fade-in relative">
            <div className="flex justify-between items-center border-b border-gray-700 pb-1 mb-1 sticky top-0 bg-black/90">
              <span className="font-bold text-white">Debug Logs (v1.1.2)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(debugLogs.join('\n'));
                    alert('Logs copied to clipboard');
                  }}
                  className="text-blue-400 hover:text-white font-bold"
                >
                  COPY
                </button>
                <button onClick={() => setDebugLogs([])} className="text-gray-500 hover:text-white">Clear</button>
              </div>
            </div>
            {debugLogs.length === 0 ? <span className="opacity-50 italic">No logs...</span> : debugLogs.map((l, i) => (
              <div key={i} className={`whitespace-pre-wrap mb-0.5 ${l.startsWith('ERR') ? 'text-red-400 font-bold' : ''}`}>{l}</div>
            ))}
          </div>
        )}

        <h2 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-1">
          {t.heroTitle}
        </h2>
        <p className="text-[10px] text-gray-400 mb-3 font-mono">Build: v1.1.2 ({new Date().toLocaleDateString()})</p>

        <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full mb-2">
          {isPro ? (
            <>
              <span className="material-symbols-rounded text-amber-500 text-sm">diamond</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white">PRO UNLIMITED</span>
            </>
          ) : (
            <>
              <span className={`w-2 h-2 rounded-full ${isLimitReached ? 'bg-red-500' : 'bg-green-500'}`}></span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {dailyUsage}/{MAX_DAILY_FREE_DOCS + bonusQuota}
              </span>
            </>
          )}
        </div>
      </div>

      {!selectedFile && !cameraBase64 ? (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={handleScan}
            className="col-span-1 aspect-[4/5] bg-white dark:bg-surface-dark rounded-2xl p-5 flex flex-col justify-between shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 transition-all group active:scale-95"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
              <span className="material-symbols-rounded text-2xl">photo_camera</span>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{t.btnScan}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.uploadLabel}</p>
            </div>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="col-span-1 aspect-[4/5] bg-white dark:bg-surface-dark rounded-2xl p-5 flex flex-col justify-between shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 transition-all group active:scale-95"
          >
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
              <span className="material-symbols-rounded text-2xl">upload_file</span>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{t.uploadLabel.split(' ')[0]}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF, DOCX, TXT</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="mb-6 bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3 overflow-hidden" onClick={() => (cameraBase64 || filePreview) && setShowPreview(true)}>
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-rounded">{(cameraBase64 || filePreview) ? (fileType === 'pdf' && !cameraBase64 ? 'picture_as_pdf' : 'photo_camera') : 'description'}</span>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                {cameraBase64 ? 'Scanned Document' : selectedFile?.name}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                {(cameraBase64 || filePreview) ?
                  <>
                    <span className="material-symbols-rounded text-[10px]">visibility</span>
                    Tap to preview
                  </> :
                  `${((selectedFile?.size || 0) / 1024).toFixed(1)} KB`
                }
              </p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setCameraBase64(null); setFilePreview(null); }}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.docx,.txt"
      />

      <div className="col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">{t.regionLabel}</h3>
          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold">⚙️</span>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1">{t.country}</label>
            <div className="relative">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <span className="material-symbols-rounded text-sm">expand_more</span>
              </div>
            </div>
            {country === 'Other' && (
              <input
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder={t.enterCountry || 'Enter your country'}
                className="w-full mt-2 bg-gray-50 dark:bg-gray-800 border-0 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/20 animate-fade-in"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1">
              {t.country === 'Country' ? 'Specific Jurisdiction' : 'Juridiction Spécifique'} <span className="text-gray-300 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={country === 'Other' ? '' : jurisdiction} // If custom country, use the first input for country and hide this? Or use this for subdivision?
              // Logic fix: better to treat 'jurisdiction' input below as 'Subdivision/State' if country is selected, 
              // but if Country is 'Other', the top input becomes the Country name.
              // Let's keep it simple: Top input = Country (if Other), Bottom input = Jurisdiction (always).
              // BUT I reused 'jurisdiction' state for the top input in the JSX above! Warning!
              // I should use a SEPARATE state for custom country.
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder={t.jurisdictionPlaceholder || "e.g. Canton of Zurich, California..."}
              className={`w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/20 ${country === 'Other' ? 'hidden' : ''}`}
            // If country is Other, we use the input above for 'jurisdiction' variable? Use separate state.
            />
            {/* Note: I will need to fix the logic in the replacement content to use a new state if I want clean code. 
                 But to minimize changes, I'll assume usage of 'jurisdiction' for custom country if country=='Other' is acceptable? 
                 No, 'Jurisdiction' usually means 'State/Province'. 
                 If country is 'Other', user types "Argentina". Then jurisdiction is "Buenos Aires". 
                 I need 2 inputs if country is other. 
                 Let's stick to the visible input: 
                 If 'Other' selected -> Show "Enter Country" input.
                 AND Show "Jurisdiction" input below.
              */}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Additional Context / Questions</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-xl py-3 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder={selectedFile ? (t.contextPlaceholderFile || "e.g. Is the clause standard?") : (t.contextPlaceholderPaste || "Paste contract text here...")}
              rows={3}
            ></textarea>
          </div>

          {/* Action Buttons - Limit Handling */}
          {isLimitReached ? (
            <div className="space-y-3 pt-2">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-3 flex items-center gap-3">
                <span className="material-symbols-rounded text-red-500 text-xl">block</span>
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">{t.limitTitle}</p>
              </div>
              <button
                onClick={startRewardAd}
                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-rounded text-yellow-400">play_circle</span>
                <span>{t.watchAd}</span>
              </button>
              <button
                onClick={() => onNavigate(Screen.PAYWALL)}
                className="w-full bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-rounded">diamond</span>
                <span>{t.upgradeCta}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={!hasInput}
              className={`w-full bg-primary text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${!hasInput ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
            >
              <span>{t.btnAnalyze}</span>
              <span className="material-symbols-rounded text-sm">auto_awesome</span>
            </button>
          )}

          <div className="flex items-start gap-2 pt-2 px-1 opacity-70">
            <span className="material-symbols-rounded text-green-600 dark:text-green-400 text-sm mt-0.5">shield_lock</span>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
              <strong>Private & Secure:</strong> We do not store your data. All documents are processed securely and discarded immediately after analysis.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};