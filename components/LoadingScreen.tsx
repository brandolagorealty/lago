import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-brand-white z-50 flex items-center justify-center animate-fade-in">
      <div className="flex flex-col items-center">
        {/* Animated Brand Logo/Initial */}
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-brand-green/20 rounded-full animate-ping"></div>
          <div className="absolute inset-2 bg-brand-white rounded-full flex items-center justify-center shadow-lg border-2 border-brand-green/30 z-10">
            <span className="font-serif text-3xl font-black text-brand-black tracking-tighter">
              LAGO
            </span>
          </div>
        </div>
        
        {/* Loading Text */}
        <div className="flex flex-col items-center">
          <p className="text-brand-black font-bold tracking-widest uppercase text-sm mb-2">
            Cargando
          </p>
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
