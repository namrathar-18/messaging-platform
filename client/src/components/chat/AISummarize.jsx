import React, { useState } from 'react';
import { Sparkles, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/axios';

export default function AISummarize({ channelId, messageCount }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const MIN_MESSAGES = 3;
  if (messageCount < MIN_MESSAGES) return null;

  const handleSummarize = async () => {
    if (summary) { setCollapsed(false); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/ai/summarize', { channelId });
      setSummary(data.summary);
      setCollapsed(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Summarization failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSummary('');
    setError('');
  };

  return (
    <div className="px-4 py-2 border-b border-gray-100 bg-gradient-to-r from-brand-50 to-purple-50">
      {!summary && !loading && !error && (
        <button
          onClick={handleSummarize}
          className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition py-0.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Summarize conversation
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
          <span>AI is summarizing the conversation…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between text-xs text-red-600 py-0.5">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-2 hover:text-red-800"><X className="w-3 h-3" /></button>
        </div>
      )}

      {summary && !collapsed && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span className="text-xs font-semibold text-brand-700">AI Summary</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCollapsed(true)} className="p-0.5 hover:bg-brand-100 rounded text-gray-400 hover:text-gray-600 transition" title="Collapse">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleClose} className="p-0.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition" title="Dismiss">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">{summary}</p>
          <button
            onClick={handleSummarize}
            className="mt-1.5 text-xs text-brand-500 hover:text-brand-700 transition"
          >
            Refresh summary
          </button>
        </div>
      )}

      {summary && collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition py-0.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Show AI summary
          <ChevronDown className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
