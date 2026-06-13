import React from 'react';

export default function StatusBadge({ online = false, size = 3 }) {
  const color = online ? 'bg-green-400' : 'bg-gray-500';
  const cls = `inline-block rounded-full ${color} w-${size} h-${size}`;
  // Use a simple span; callers expect a small status indicator.
  return <span className={`inline-block rounded-full ${color} w-${size} h-${size}`} />;
}
