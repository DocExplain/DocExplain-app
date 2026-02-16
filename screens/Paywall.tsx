import React from 'react';

interface PaywallProps {
    onClose: () => void;
    onUpgrade: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onClose, onUpgrade }) => {
  const handlePurchase = () => {
    // In a real app, trigger IAP here.
    alert("Purchase successful! You are now a Pro member.");
    onUpgrade();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 dark:bg-background-dark flex flex-col animate-slide-up">
      <header className="flex items-center justify-between p-4 bg-white/50 dark:bg-background-dark/50 backdrop-blur-sm">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500">
          <span className="material-symbols-rounded text-2xl">close</span>
        </button>
        <button className="text-sm font-semibold text-gray-500 hover:text-primary transition-colors">
            Restore Purchases
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="px-6 pt-4 pb-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center shadow-lg mb-6 text-white transform rotate-3">
                <span className="material-symbols-rounded text-3xl">diamond</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2 text-gray-900 dark:text-white">
                Unlock DocuMate <span className="text-primary">Pro</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto text-sm">
                Remove ads, remove limits, and translate complex legal jargon instantly.
            </p>
        </div>

        <div className="px-6 space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary">
                    <span className="material-symbols-rounded">block</span>
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">No Ads & No Limits</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Enjoy a completely uninterrupted experience.</p>
                </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                    <span className="material-symbols-rounded">description</span>
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Longer Documents</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Analyze documents over 5 pages long.</p>
                </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    <span className="material-symbols-rounded">all_inclusive</span>
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Detailed Analysis</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Get deeper insights and specialized drafting.</p>
                </div>
            </div>
        </div>

        <div className="mt-8 px-6 grid grid-cols-1 gap-4">
            {/* Weekly */}
            <button onClick={handlePurchase} className="relative overflow-hidden rounded-xl border-2 border-primary bg-primary/5 dark:bg-primary/10 p-4 text-center active:scale-[0.98] transition-transform">
                <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">Most Popular</div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Weekly</p>
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">$2.00</span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">/ week</span>
                </div>
            </button>

            {/* Monthly */}
            <button onClick={handlePurchase} className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark p-4 text-center active:scale-[0.98] transition-transform">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Monthly</p>
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">$9.00</span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">/ month</span>
                </div>
            </button>
            
            {/* Yearly */}
            <button onClick={handlePurchase} className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark p-4 text-center active:scale-[0.98] transition-transform">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Yearly</p>
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">$100.00</span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">/ year</span>
                </div>
            </button>
        </div>

        <div className="mt-6 px-8 text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal mb-2">
                Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.
            </p>
            <div className="flex justify-center gap-4">
                <button className="text-[10px] text-gray-500 underline">Terms of Service</button>
                <button className="text-[10px] text-gray-500 underline">Privacy Policy</button>
            </div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-700">
        <button onClick={handlePurchase} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold text-lg h-14 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98]">
            Start Free Trial
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">Cancel anytime.</p>
      </div>
    </div>
  );
};