import React, { useState, useRef } from 'react';
import { X, Search, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import api from '../../api/axios';
import { format } from 'date-fns';

export default function AISearchPanel({ channelId, channelName, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const { data } = await api.post('/ai/search', { channelId, query: query.trim() });
      setResults(data.results || []);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[85vh] flex flex-col animate-slide-up mt-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-500 rounded-lg flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">AI Search</h2>
            <p className="text-xs text-gray-500 truncate">#{channelName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearch} className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages semantically…"
              className="w-full pl-9 pr-20 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-gray-50"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 ml-1">Ask anything naturally — "messages about the deadline" or "what did Alice say about the API?"</p>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{error}</div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Searching with AI…</p>
            </div>
          )}

          {searched && !loading && results.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
              <Search className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">No relevant messages found</p>
              <p className="text-xs text-gray-400">Try rephrasing your search query</p>
            </div>
          )}

          {!searched && !loading && (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
              <Sparkles className="w-10 h-10 text-brand-200" />
              <p className="text-sm text-gray-500">Enter a query to search this channel</p>
            </div>
          )}

          {results.length > 0 && !loading && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-xs text-gray-400 font-medium">{results.length} relevant message{results.length !== 1 ? 's' : ''} found</p>
              {results.map((r, i) => (
                <div key={r.messageId || i} className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50/30 transition">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                      {r.senderName?.[0]}
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{r.senderName}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {r.createdAt ? format(new Date(r.createdAt), 'MMM d, HH:mm') : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">{r.content}</p>
                  {r.attachments?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">📎 {r.attachments.length} attachment{r.attachments.length !== 1 ? 's' : ''}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
