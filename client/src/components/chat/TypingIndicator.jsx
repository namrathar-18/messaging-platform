import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function TypingIndicator({ users }) {
  const { isDark } = useTheme();

  if (!users || users.length === 0) return null;

  const label =
    users.length === 1
      ? `${users[0]} is typing`
      : users.length === 2
      ? `${users[0]} and ${users[1]} are typing`
      : `${users[0]} and ${users.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-2 py-2 mt-2 animate-fade-in">
      <div className={`flex items-center gap-0.5 px-4 py-2.5 rounded-2xl rounded-bl-none shadow-md ${
        isDark
          ? 'bg-slate-700'
          : 'bg-slate-100'
      }`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full inline-block ${
              isDark ? 'bg-slate-400' : 'bg-slate-400'
            }`}
            style={{ animation: `bounce 1.4s infinite ease-in-out ${i * 0.16}s` }}
          />
        ))}
      </div>
      <span className="text-xs opacity-70 italic">{label}…</span>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% {
            opacity: 0.4;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
}
