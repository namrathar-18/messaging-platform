import React, { useState } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { searchUsers } from '../../api/auth';

export default function NewDirectMessageModal({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (q) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const { data } = await searchUsers(q);
      setResults(data.users);
    } catch (_) {}
    finally { setSearching(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">New Direct Message</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X className="w-4.5 h-4.5 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by username or email…"
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
          </div>

          <div className="mt-3 max-h-64 overflow-y-auto">
            {results.length === 0 && query && !searching && (
              <p className="text-sm text-gray-500 text-center py-4">No users found</p>
            )}
            {results.map((u) => (
              <button
                key={u._id}
                onClick={() => onSelect(u._id)}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-gray-50 transition text-left"
              >
                <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold text-white uppercase shrink-0">
                  {u.username[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.username}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                <span className={`ml-auto w-2 h-2 rounded-full shrink-0 ${u.status === 'online' ? 'bg-green-400' : 'bg-gray-300'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
