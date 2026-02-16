import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, SupportedLang, SUPPORTED_LANGS, TranslationStrings } from './translations';

interface LanguageContextType {
    lang: SupportedLang;
    setLang: (lang: SupportedLang) => void;
    t: TranslationStrings;
}

const LanguageContext = createContext<LanguageContextType>({
    lang: 'en',
    setLang: () => { },
    t: translations.en,
});

export const useLanguage = () => useContext(LanguageContext);

function detectDeviceLang(): SupportedLang {
    const stored = localStorage.getItem('documate_lang');
    if (stored && stored in translations) return stored as SupportedLang;
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (nav in translations) return nav as SupportedLang;
    return 'en';
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [lang, setLangState] = useState<SupportedLang>(detectDeviceLang());

    const setLang = (l: SupportedLang) => {
        setLangState(l);
        localStorage.setItem('documate_lang', l);
        document.documentElement.lang = l;
        document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    };

    useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }, []);

    return (
        <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
            {children}
        </LanguageContext.Provider>
    );
};

export { SUPPORTED_LANGS };
export type { SupportedLang };
