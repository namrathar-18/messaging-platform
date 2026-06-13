import React from 'react';

export default function TypingIndicator({ users }) {
  if (!users || users.length === 0) return null;

  const label =
    users.length === 1
      ? `${users[0]} is typing`
      : users.length === 2
      ? `${users[0]} and ${users[1]} are typing`
      : `${users[0]} and ${users.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-2 py-1 animate-fade-in">
      <div className="flex items-center gap-0.5 px-3 py-2 bg-gray-100 rounded-2xl rounded-bl-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"
            style={{ animation: `bounceDots 1.4s infinite ease-in-out ${i * 0.16}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500 italic">{label}…</span>
    </div>
  );
}
