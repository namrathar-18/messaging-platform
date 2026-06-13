import React, { useEffect, useState, useRef } from 'react';
import { X, MessageSquare, Send, Loader2, Bot, Sparkles } from 'lucide-react';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

export default function ThreadPanel({ channelId, parentMessageId, onClose }) {
  const { user } = useAuth();
  const { on, off, emit } = useSocket();
  
  const [parent, setParent] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  
  const repliesEndRef = useRef(null);

  // Fetch thread (parent message and current replies)
  useEffect(() => {
    const fetchThread = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/messages/${channelId}/threads/${parentMessageId}`);
        setParent(data.parent);
        setReplies(data.replies || []);
      } catch (err) {
        setError('Failed to load thread.');
      } finally {
        setLoading(false);
      }
    };
    fetchThread();
  }, [channelId, parentMessageId]);

  // Scroll to bottom when replies change
  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  // Listen for real-time replies
  useEffect(() => {
    const handleNewReply = (msg) => {
      const msgReplyToId = typeof msg.replyTo === 'object' ? msg.replyTo?._id : msg.replyTo;
      if (msgReplyToId?.toString() === parentMessageId?.toString()) {
        setReplies((prev) => {
          if (prev.find((r) => r._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };
    
    const unsub = on('message:new', handleNewReply);
    return () => off('message:new', handleNewReply);
  }, [parentMessageId, on, off]);

  const handleSendReply = async (e) => {
    e?.preventDefault();
    const content = replyContent.trim();
    if (!content || sending) return;
    
    setSending(true);
    try {
      emit('send:message', { channelId, content, replyTo: parentMessageId }, (response) => {
        if (response?.error) {
          setError(response.error);
        } else {
          setReplyContent('');
        }
      });
    } catch (err) {
      setError('Could not send reply.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 text-slate-950 dark:text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
          <MessageSquare className="h-4 w-4" />
          <p className="text-xs font-black uppercase tracking-[0.24em]">Threaded Discussion</p>
        </div>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/40 dark:hover:bg-white/10" title="Close thread">
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-500" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading discussion...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center p-4 text-center text-xs text-rose-600">
          {error}
        </div>
      ) : (
        <>
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Parent Message Card */}
            {parent && (
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-6 w-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                    {parent.sender?.username?.[0]}
                  </div>
                  <span className="text-xs font-bold">{parent.sender?.username}</span>
                  <span className="text-[10px] opacity-60 ml-auto">
                    {parent.createdAt ? format(new Date(parent.createdAt), 'MMM d, HH:mm') : ''}
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90 whitespace-pre-wrap">{parent.content}</p>
                {parent.attachments?.length > 0 && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">📎 {parent.attachments.length} attachment(s)</p>
                )}
              </div>
            )}

            {/* Replies Header */}
            <div className="flex items-center gap-2 px-1">
              <span className="h-[1px] flex-1 bg-white/20 dark:bg-white/10"></span>
              <span className="text-[10px] font-black uppercase tracking-wider opacity-55">
                {replies.length} repl{replies.length === 1 ? 'y' : 'ies'}
              </span>
              <span className="h-[1px] flex-1 bg-white/20 dark:bg-white/10"></span>
            </div>

            {/* Replies List */}
            <div className="space-y-3 pl-2">
              {replies.length === 0 ? (
                <p className="text-xs italic text-center py-4 text-slate-500 dark:text-slate-400">No replies yet. Start the conversation!</p>
              ) : (
                replies.map((reply) => {
                  const isBot = !!reply.sender?.isBot;
                  return (
                    <div key={reply._id} className="rounded-xl border border-white/20 bg-white/30 p-2.5 shadow-sm dark:border-white/5 dark:bg-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`h-5 w-5 rounded-full text-[9px] font-bold uppercase flex items-center justify-center shrink-0 ${isBot ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' : 'bg-slate-700 text-white'}`}>
                          {isBot ? <Bot className="h-3 w-3" /> : reply.sender?.username?.[0]}
                        </div>
                        <span className="text-xs font-bold flex items-center gap-1">
                          {reply.sender?.username}
                          {isBot && (
                            <span className="rounded-full bg-purple-500/15 px-1 py-0.5 text-[9px] font-black text-purple-700 dark:text-purple-200 inline-flex items-center gap-0.5">
                              <Sparkles className="h-2 w-2" /> AI
                            </span>
                          )}
                        </span>
                        <span className="text-[9px] opacity-60 ml-auto">
                          {reply.createdAt ? format(new Date(reply.createdAt), 'HH:mm') : ''}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed opacity-85 whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  );
                })
              )}
              <div ref={repliesEndRef} />
            </div>
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSendReply} className="mt-auto flex items-center gap-2">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Reply to this thread..."
              rows={1}
              className="min-h-[38px] flex-1 resize-none rounded-xl border border-white/45 bg-white/70 px-3 py-2 text-xs font-medium leading-normal text-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-400"
              style={{ maxHeight: '100px' }}
            />
            <button
              type="submit"
              disabled={sending || !replyContent.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-white shadow-lg disabled:opacity-40 dark:bg-white dark:text-slate-950 hover:bg-slate-800"
              title="Send reply"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
