import React, { useState, useEffect } from 'react';

interface AdModalProps {
  isOpen: boolean;
  type: 'interstitial' | 'reward';
  onClose: () => void;
  onReward?: () => void;
}

export const AdModal: React.FC<AdModalProps> = ({ isOpen, type, onClose, onReward }) => {
  const [timeLeft, setTimeLeft] = useState(type === 'reward' ? 15 : 5);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (!isOpen) {
        setTimeLeft(type === 'reward' ? 15 : 5);
        setCanClose(false);
        return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClose(true);
          if (type === 'reward' && onReward) onReward();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, type, onReward]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-fade-in">
      {/* Ad Header */}
      <div className="absolute top-4 right-4 z-20">
        {canClose ? (
          <button 
            onClick={onClose}
            className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-white/30 transition-colors border border-white/20"
          >
            {type === 'reward' ? 'Claim Reward' : 'Skip Ad'} &times;
          </button>
        ) : (
          <div className="bg-black/50 text-white px-4 py-2 rounded-full text-xs font-medium border border-white/10">
            Reward in {timeLeft}s
          </div>
        )}
      </div>

      <div className="absolute top-4 left-4 z-20 bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded">
        ADVERTISEMENT
      </div>

      {/* Mock Ad Content */}
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8 text-center relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>

        <div className="relative z-10 bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 max-w-sm w-full shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-400 to-emerald-400 rounded-2xl mx-auto mb-6 shadow-lg flex items-center justify-center text-4xl transform -rotate-6">
                🎮
            </div>
            <h2 className="text-3xl font-black text-white mb-2 leading-tight">
                Super Game <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">3000</span>
            </h2>
            <p className="text-blue-100 mb-8 text-sm leading-relaxed">
                Play the most addictive game of the year. No Wifi needed! Download now for free.
            </p>
            <button className="w-full bg-white text-indigo-900 font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform hover:bg-blue-50">
                Install Now
            </button>
            <div className="flex justify-center gap-1 mt-4">
                {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-rounded text-yellow-400 text-sm">star</span>)}
            </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1.5 bg-gray-800 w-full">
        <div 
            className="h-full bg-white transition-all duration-1000 ease-linear" 
            style={{ width: `${((type === 'reward' ? 15 : 5) - timeLeft) / (type === 'reward' ? 15 : 5) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};