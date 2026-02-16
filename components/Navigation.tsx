import React from 'react';
import { Screen } from '../types';

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { screen: Screen.HOME, icon: 'home', label: 'Home' },
    { screen: Screen.HISTORY, icon: 'history', label: 'History' },
    { screen: Screen.FAQ, icon: 'help', label: 'Help' },
  ];

  if (currentScreen === Screen.PAYWALL) return null;

  return (
    <nav className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div className="bg-white/90 dark:bg-surface-dark/90 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-full px-6 py-3 shadow-lg flex items-center gap-8 pointer-events-auto">
        {navItems.map((item) => (
          <button
            key={item.screen}
            onClick={() => onNavigate(item.screen)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentScreen === item.screen
                ? 'text-primary'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-rounded text-2xl">
              {item.icon}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};