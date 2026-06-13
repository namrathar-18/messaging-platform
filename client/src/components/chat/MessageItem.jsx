import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { FileText, Download, CheckCheck, Check, Bot, Sparkles } from 'lucide-react';

export default function MessageItem({ message, isOwnMessage, isGrouped, currentUserId }) {
  const sender = message.sender;
  const senderName = sender?.username || 'Unknown';
  const isBot = !!sender?.isBot;
  const avatar = senderName[0]?.toUpperCase();
  const time = message.createdAt ? formatTime(message.createdAt) : '';

  const readCount = message.readBy?.filter(
    (r) => (r.user?._id || r.user) !== currentUserId && (r.user?._id || r.user)?.toString() !== currentUserId?.toString()
  ).length || 0;

  return (
    <div className={`flex items-end gap-2 group ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
      {/* Avatar — only show for first in group */}
      <div className="w-8 shrink-0">
        {!isGrouped && !isOwnMessage && (
          <div className="relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase ${
              isBot
                ? 'bg-gradient-to-br from-brand-500 to-purple-500'
                : 'bg-brand-600'
            }`}>
              {isBot ? <Bot className="w-4 h-4" /> : avatar}
            </div>
            {/* Bot badge */}
            {isBot && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-purple-500 border-2 border-white rounded-full flex items-center justify-center"
                title="AI Assistant Bot"
              >
                <Sparkles className="w-2 h-2 text-white" />
              </span>
            )}
          </div>
        )}
      </div>

      <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {/* Sender name + time + bot badge for first in group */}
        {!isGrouped && (
          <div className={`flex items-baseline gap-2 mb-0.5 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
            {!isOwnMessage && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-700">{senderName}</span>
                {isBot && (
                  <span className="inline-flex items-center gap-0.5 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-medium leading-none">
                    <Sparkles className="w-2.5 h-2.5" />
                    AI Bot
                  </span>
                )}
              </div>
            )}
            <span className="text-xs text-gray-400">{time}</span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
            isOwnMessage
              ? 'bg-brand-600 text-white rounded-br-sm'
              : isBot
              ? 'bg-gradient-to-br from-purple-50 to-brand-50 border border-purple-200 text-gray-900 rounded-bl-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          }`}
        >
          {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}

          {/* Attachments */}
          {message.attachments?.map((att, i) => (
            <AttachmentPreview key={i} attachment={att} isOwn={isOwnMessage} />
          ))}
        </div>

        {/* Read receipts — own messages only */}
        {isOwnMessage && (
          <div className="flex items-center gap-0.5 mt-0.5">
            {readCount > 0 ? (
              <CheckCheck className="w-3.5 h-3.5 text-brand-500" title={`Read by ${readCount}`} />
            ) : (
              <Check className="w-3.5 h-3.5 text-gray-400" />
            )}
            {readCount > 0 && <span className="text-xs text-gray-400">{readCount}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function AttachmentPreview({ attachment, isOwn }) {
  const isImage = attachment.mimeType?.startsWith('image/');

  if (isImage) {
    return (
      <div className="mt-1.5">
        <img
          src={attachment.url}
          alt={attachment.originalName}
          className="max-w-xs max-h-64 rounded-lg object-cover cursor-pointer hover:opacity-90 transition"
          onClick={() => window.open(attachment.url, '_blank')}
        />
        <p className={`text-xs mt-1 ${isOwn ? 'text-brand-100' : 'text-gray-500'}`}>{attachment.originalName}</p>
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 mt-1.5 px-3 py-2 rounded-lg transition ${
        isOwn ? 'bg-brand-700 hover:bg-brand-800 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
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
