import React, { useState } from 'react';
import { BarChart2, Check, Lock, Loader2, Sparkles } from 'lucide-react';
import api from '../../api/axios';

export default function PollCard({ message, currentUserId, channelId }) {
  const poll = message.poll;
  const isCreator = (message.sender?._id || message.sender)?.toString() === currentUserId?.toString();
  const [votingIdx, setVotingIdx] = useState(null);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  if (!poll) return null;

  // Calculate vote metrics
  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
  
  const handleVote = async (optionIndex) => {
    if (poll.closed || votingIdx !== null) return;
    setVotingIdx(optionIndex);
    setError('');
    try {
      await api.post(`/messages/${channelId}/${message._id}/vote`, { optionIndex });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to vote.');
    } finally {
      setVotingIdx(null);
    }
  };

  const handleClosePoll = async () => {
    if (closing) return;
    setClosing(true);
    setError('');
    try {
      await api.post(`/messages/${channelId}/${message._id}/close-poll`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to close poll.');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="w-80 max-w-full rounded-2xl border border-white/40 bg-white/50 p-4 shadow-md text-slate-950 dark:border-white/10 dark:bg-slate-900/50 dark:text-white animate-fade-in">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
          <BarChart2 className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">Group Poll</span>
        </div>
        {poll.closed ? (
          <span className="flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            <Lock className="h-3 w-3" /> Closed
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
            Active
          </span>
        )}
      </div>

      <h3 className="text-sm font-black mb-3 break-words">{poll.question}</h3>

      {error && <p className="mb-2 text-[10px] text-red-500 font-semibold">{error}</p>}

      {/* Options List */}
      <div className="space-y-3">
        {poll.options.map((opt, idx) => {
          const votesCount = opt.votes?.length || 0;
          const pct = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
          
          // Check if current user voted for this option
          const hasVoted = opt.votes?.some((vId) => (vId._id || vId)?.toString() === currentUserId?.toString());

          return (
            <div
              key={idx}
              onClick={() => handleVote(idx)}
              className={`relative overflow-hidden rounded-xl border p-3 transition cursor-pointer select-none ${
                poll.closed
                  ? 'border-white/20 dark:border-white/5 cursor-default'
                  : hasVoted
                  ? 'border-cyan-500 bg-cyan-500/5'
                  : 'border-white/40 hover:border-cyan-500 dark:border-white/10 dark:hover:border-cyan-500/50'
              }`}
            >
              {/* Progress bar background */}
              <div
                className={`absolute bottom-0 left-0 top-0 transition-all duration-500 ease-out ${
                  hasVoted ? 'bg-cyan-500/15' : 'bg-slate-500/10'
                }`}
                style={{ width: `${pct}%`, zIndex: 0 }}
              />

              <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
                <span className="font-bold flex-1 break-words">{opt.text}</span>
                <div className="flex items-center gap-1.5 shrink-0 font-black">
                  {votingIdx === idx ? (
                    <Loader2 className="h-3 w-3 animate-spin text-cyan-500" />
                  ) : (
                    hasVoted && <Check className="h-3.5 w-3.5 text-cyan-500" />
                  )}
                  <span>{votesCount} ({pct}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
        <span>{totalVotes} total vote(s)</span>
        {!poll.closed && isCreator && (
          <button
            onClick={handleClosePoll}
            disabled={closing}
            className="rounded bg-rose-500/10 px-2 py-1 text-[10px] font-black text-rose-500 hover:bg-rose-500/20 disabled:opacity-50 transition"
          >
            {closing ? 'Closing...' : 'Close Poll'}
          </button>
        )}
      </div>

      {/* Decision Summary */}
      {poll.closed && poll.decisionSummary && (
        <div className="mt-3.5 rounded-xl border border-amber-200/50 bg-amber-500/10 p-3 text-xs leading-relaxed dark:border-amber-900/30">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider mb-1 text-[10px]">
            <Sparkles className="h-3.5 w-3.5" />
            AI Decision Summary
          </div>
          <p className="font-medium text-slate-800 dark:text-slate-200">{poll.decisionSummary}</p>
        </div>
      )}
    </div>
  );
}
