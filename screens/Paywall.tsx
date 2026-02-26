import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Purchases, PurchasesOffering, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

interface PaywallProps {
    onClose: () => void;
    onUpgrade: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onClose, onUpgrade }) => {
    const { t } = useLanguage();
    const [offering, setOffering] = useState<PurchasesOffering | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOfferings = async () => {
            if (Capacitor.getPlatform() === 'web') {
                setLoading(false);
                return;
            }
            try {
                const offerings = await Purchases.getOfferings();
                if (offerings.current) {
                    setOffering(offerings.current);
                }
            } catch (e) {
                console.error("Error fetching offerings:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchOfferings();
    }, []);

    const handlePurchase = async (pkg: PurchasesPackage) => {
        try {
            const result: any = await Purchases.purchasePackage({ aPackage: pkg });
            const customerInfo = result.customerInfo || result;
            if (customerInfo.entitlements?.active?.['premium'] !== undefined) {
                onUpgrade();
                onClose();
            }
        } catch (error: any) {
            if (!error.userCancelled) {
                alert(error.message || "Purchase failed");
            }
        }
    };

    const handleRestore = async () => {
        try {
            const result: any = await Purchases.restorePurchases();
            const customerInfo = result.customerInfo || result;
            if (customerInfo.entitlements?.active?.['DocExplain Premium'] !== undefined) {
                alert("Subscription restored!");
                onUpgrade();
                onClose();
            } else {
                alert("No active subscription found.");
            }
        } catch (error: any) {
            alert("Restore failed: " + error.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-gray-50 dark:bg-background-dark flex flex-col animate-slide-up">
            <header className="flex items-center justify-between p-4 bg-white/50 dark:bg-background-dark/50 backdrop-blur-sm">
                <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500">
                    <span className="material-symbols-rounded text-2xl">close</span>
                </button>
                <button onClick={handleRestore} className="text-sm font-semibold text-gray-500 hover:text-primary transition-colors">
                    {t.restorePurchases}
                </button>
            </header>

            <div className="flex-1 overflow-y-auto pb-8">
                <div className="px-6 pt-4 pb-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center shadow-lg mb-6 text-white transform rotate-3">
                        <span className="material-symbols-rounded text-3xl">diamond</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight mb-2 text-gray-900 dark:text-white">
                        {t.unlockPro}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto text-sm">
                        {t.proDesc}
                    </p>
                </div>

                <div className="px-6 space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary">
                            <span className="material-symbols-rounded">all_inclusive</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{t.unlimitedAnalysis}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t.unlimitedAnalysisSub}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                            <span className="material-symbols-rounded">bolt</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{t.priorityAI}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t.priorityAISub}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                            <span className="material-symbols-rounded">block</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{t.noAdsTitle}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t.noAdsSub}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            <span className="material-symbols-rounded">chat</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{t.smartFollowups}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t.smartFollowupsSub}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 px-6 grid grid-cols-1 gap-4">
                    {offering ? offering.availablePackages.map((pkg) => (
                        <button
                            key={pkg.identifier}
                            onClick={() => handlePurchase(pkg)}
                            className={`relative overflow-hidden rounded-xl border-2 p-4 text-center active:scale-[0.98] transition-transform ${pkg.packageType === 'ANNUAL' || pkg.packageType === 'MONTHLY'
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark'
                                }`}
                        >
                            {pkg.packageType === 'ANNUAL' && (
                                <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                                    {t.mostPopular}
                                </div>
                            )}
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                {pkg.product.title}
                            </p>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                                    {pkg.product.priceString}
                                </span>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    {pkg.packageType === 'ANNUAL' ? t.perYear : pkg.packageType === 'MONTHLY' ? t.perMonth : t.perWeek}
                                </span>
                            </div>
                        </button>
                    )) : (
                        <div className="text-center py-4">
                            <p className="text-sm text-gray-500">
                                {loading ? "Loading offers..." : "No offers available. Check Store configuration."}
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-6 px-8 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal mb-2">
                        {t.subRenew}
                    </p>
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => window.open('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/', '_system')}
                            className="text-[10px] text-gray-500 underline"
                        >
                            {t.terms}
                        </button>
                        <button
                            onClick={() => window.open('https://documate.work/privacy', '_system')}
                            className="text-[10px] text-gray-500 underline"
                        >
                            {t.privacy}
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-700">
                <button
                    onClick={() => offering?.current ? handlePurchase(offering.current) : null}
                    disabled={!offering}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold text-lg h-14 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98]"
                >
                    {t.startTrial}
                </button>
                <p className="text-center text-xs text-gray-400 mt-2">{t.cancelAnytime}</p>
            </div>
        </div>
    );
};