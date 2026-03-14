import React from 'react';
import { Search, Home, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'find' | 'home' | 'profile';
  onTabChange: (tab: 'find' | 'home' | 'profile') => void;
  isDarkMode: boolean;
}

export default function BottomNav({ activeTab, onTabChange, isDarkMode }: BottomNavProps) {
  return (
    <div className={`fixed bottom-0 left-0 right-0 ${isDarkMode ? 'bg-black border-t border-gray-800' : 'bg-white border-t border-gray-100'} grid grid-cols-3 z-50 transition-colors`}>
      <button
        onClick={() => onTabChange('find')}
        className={`flex flex-col items-center justify-center py-3 transition-colors ${isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-blue-50'} ${
          activeTab === 'find' ? (isDarkMode ? 'text-blue-400 bg-blue-900/40' : 'text-blue-600 bg-blue-50/50') : 'text-gray-400'
        }`}
      >
        <Search size={24} />
        <span className="text-xs font-medium">Find</span>
      </button>
      
      <button
        onClick={() => onTabChange('home')}
        className={`flex flex-col items-center justify-center py-3 transition-colors ${isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-blue-50'} ${
          activeTab === 'home' ? (isDarkMode ? 'text-blue-400 bg-blue-900/40' : 'text-blue-600 bg-blue-50/50') : 'text-gray-400'
        }`}
      >
        <Home size={24} />
        <span className="text-xs font-medium">Home</span>
      </button>
      
      <button
        onClick={() => onTabChange('profile')}
        className={`flex flex-col items-center justify-center py-3 transition-colors ${isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-blue-50'} ${
          activeTab === 'profile' ? (isDarkMode ? 'text-blue-400 bg-blue-900/40' : 'text-blue-600 bg-blue-50/50') : 'text-gray-400'
        }`}
      >
        <User size={24} />
        <span className="text-xs font-medium">Profile</span>
      </button>
    </div>
  );
}
