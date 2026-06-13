import React, { useState, useCallback } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import api from '../../api/axios';

export default function SmartReplies({ channelId, lastMessage, currentUserId, onSelectReply }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState('');

  // Only show for messages NOT sent by current user
  const senderId = lastMessage?.sender?._id || lastMessage?.sender;
  const isOwnMessage = senderId === currentUserId || senderId?.toString() === currentUserId?.toString();
  if (!lastMessage || isOwnMessage || !lastMessage.content) return null;

  const fetchSuggestions = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/ai/smart-replies', {
        channelId,
        messageContent: lastMessage.content,
        senderName: lastMessage.sender?.username || 'User',
      });
      setSuggestions(data.suggestions || []);
      setFetched(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load suggestions.');
    } finally {
      setLoading(false);
    }
  }, [channelId, lastMessage, fetched]);

  return (
    <div className="px-5 pb-2">
      {!fetched && !loading && (
        <button
          onClick={fetchSuggestions}
          className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Suggest replies
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Generating suggestions…
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {fetched && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1 animate-fade-in">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Sparkles className="w-3 h-3 text-brand-400" /> AI suggestions:
          </span>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                onSelectReply(s);
                setSuggestions([]);
                setFetched(false);
              }}
              className="px-3 py-1 text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-full transition"
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => { setSuggestions([]); setFetched(false); }}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
