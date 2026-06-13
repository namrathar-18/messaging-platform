import React from 'react';

export default function Logo({ size = 'md', showText = false, className = '' }) {
  const sizes = {
    sm: 'h-9 w-9',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src="/pinglink-logo.svg" alt="PingLink AI" className={`${sizes[size]} shrink-0 drop-shadow-lg`} />
      {showText && (
        <div className="min-w-0">
          <p className="truncate text-lg font-black tracking-tight text-slate-950 dark:text-white">PingLink AI</p>
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-300">AI messaging hub</p>
        </div>
      )}
    </div>
  );
}
