import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { FileText, Download, CheckCheck, Check, Bot, Sparkles, Mic, MessageSquare } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import PollCard from './PollCard';

export default function MessageItem({ message, isOwnMessage, isGrouped, currentUserId, channelId, onStartThread }) {
  const { isDark } = useTheme();
  const sender = message.sender;
  const senderName = sender?.username || 'Unknown';
  const isBot = !!sender?.isBot;
  const avatar = senderName[0]?.toUpperCase();
  const time = message.createdAt ? formatTime(message.createdAt) : '';

  const readCount = message.readBy?.filter(
    (r) => (r.user?._id || r.user) !== currentUserId && (r.user?._id || r.user)?.toString() !== currentUserId?.toString()
  ).length || 0;

  return (
    <div className={`flex items-end gap-2 group ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-0.5' : 'mt-4'} animate-fade-in`}>
      {/* Avatar — only show for first in group */}
      <div className="w-9 shrink-0">
        {!isGrouped && !isOwnMessage && (
          <div className="relative">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shadow-md ${
              isBot
                ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                : 'bg-gradient-to-br from-blue-500 to-purple-600'
            }`}>
              {isBot ? <Bot className="w-4 h-4" /> : avatar}
            </div>
            {/* Bot badge */}
            {isBot && (
              <span
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-pink-500 border-2 border-current rounded-full flex items-center justify-center shadow-lg"
                title="AI Assistant Bot"
              >
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </span>
            )}
          </div>
        )}
      </div>

      <div className={`flex flex-col max-w-[65%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {/* Sender name + time + bot badge for first in group */}
        {!isGrouped && (
          <div className={`flex items-baseline gap-2 mb-1 px-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
            {!isOwnMessage && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold opacity-90">{senderName}</span>
                {isBot && (
                  <span className={`inline-flex items-center gap-0.5 text-xs px-2 py-1 rounded-full font-medium leading-none ${
                    isDark
                      ? 'bg-purple-900/40 text-purple-300'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    <Sparkles className="w-2.5 h-2.5" />
                    AI
                  </span>
                )}
              </div>
            )}
            <span className="text-xs opacity-60">{time}</span>
          </div>
        )}

        {message.poll ? (
          <PollCard message={message} currentUserId={currentUserId} channelId={channelId} />
        ) : (
          /* Message bubble */
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-md transition-all hover:shadow-lg ${
              isOwnMessage
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-none'
                : isBot
                ? isDark
                  ? 'bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-700/50 text-white rounded-bl-none'
                  : 'bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 text-gray-900 rounded-bl-none'
                : isDark
                ? 'bg-slate-700 text-white rounded-bl-none'
                : 'bg-slate-100 text-gray-900 rounded-bl-none'
            }`}
          >
            {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}

            {/* Attachments */}
            {message.attachments?.map((att, i) => (
              <AttachmentPreview key={i} attachment={att} isOwn={isOwnMessage} transcription={message.transcription} />
            ))}
          </div>
        )}

        {/* Read receipts — own messages only */}
        {isOwnMessage && (
          <div className="flex items-center gap-0.5 mt-1.5 px-2">
            {readCount > 0 ? (
              <>
                <CheckCheck className="w-4 h-4 text-blue-500" title={`Read by ${readCount}`} />
                <span className="text-xs opacity-60">{readCount}</span>
              </>
            ) : (
              <Check className="w-4 h-4 opacity-50" />
            )}
          </div>
        )}
      </div>

      {/* Actions bar — shown on hover */}
      {!isBot && !message.poll && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center shrink-0 self-center">
          <button
            onClick={() => onStartThread?.(message._id)}
            className="rounded-full bg-white/60 p-1.5 text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm dark:bg-slate-800/60 dark:hover:bg-slate-700 dark:hover:text-white"
            title="Reply in Thread"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function AttachmentPreview({ attachment, isOwn, transcription }) {
  const { isDark } = useTheme();
  const isImage = attachment.mimeType?.startsWith('image/');
  const isAudio = attachment.mimeType?.startsWith('audio/');

  if (isImage) {
    return (
      <div className="mt-2">
        <img
          src={attachment.url}
          alt={attachment.originalName}
          className="max-w-xs max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition shadow-md"
          onClick={() => window.open(attachment.url, '_blank')}
        />
        <p className={`text-xs mt-1.5 opacity-75`}>{attachment.originalName}</p>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className={`mt-2 rounded-xl px-3 py-2 ${isOwn ? 'bg-blue-700/70' : isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
        <div className="mb-1 flex items-center gap-2 text-xs font-bold">
          <Mic className="h-3.5 w-3.5" />
          Voice message
        </div>
        <audio controls src={attachment.url} className="h-9 w-64 max-w-full" />
        {transcription && (
          <p className="mt-2 text-xs opacity-80 italic leading-relaxed border-t border-current/20 pt-2">
            📝 {transcription}
          </p>
        )}
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg transition hover:shadow-md ${
        isOwn
          ? 'bg-blue-700 hover:bg-blue-800 text-white'
          : isDark
          ? 'bg-slate-600 hover:bg-slate-700 text-white'
          : 'bg-slate-200 hover:bg-slate-300 text-gray-800'
      }`}
    >
      <FileText className="w-4 h-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{attachment.originalName}</p>
        <p className="text-xs opacity-70">{formatBytes(attachment.size)}</p>
      </div>
      <Download className="w-3.5 h-3.5 shrink-0" />
    </a>
  );
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
  return format(date, 'MMM d, HH:mm');
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
