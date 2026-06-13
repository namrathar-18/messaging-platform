import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, X, FileText, Bot } from 'lucide-react';
import { uploadFileDirect } from '../../api/uploads';
import { getMembers } from '../../api/channels';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Bot always appears first in the mention list
const BOT_ENTRY = { _id: 'bot', username: 'ai-assistant', isBot: true };

export default function MessageInput({ channelId, channelName, onSend, onTyping, prefillText, onPrefillConsumed }) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // @mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState('');   // text after '@'
  const [mentionPos, setMentionPos] = useState(-1);       // caret index where '@' was typed
  const [members, setMembers] = useState([]);             // channel member list (fetched once)
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);   // highlighted row

  // Fetch channel members once when channelId changes
  useEffect(() => {
    if (!channelId) return;
    getMembers(channelId)
      .then(({ data }) => {
        const list = (data.members || []).map((m) => ({
          _id: m.user?._id || m._id,
          username: m.user?.username || m.username,
          isBot: m.user?.isBot || false,
        }));
        setMembers(list);
      })
      .catch(() => setMembers([]));
  }, [channelId]);

  // Filtered mention suggestions — bot always at top
  const mentionSuggestions = mentionOpen
    ? [
        ...(BOT_ENTRY.username.startsWith(mentionQuery.toLowerCase()) ? [BOT_ENTRY] : []),
        ...members
          .filter(
            (m) =>
              !m.isBot &&
              m.username?.toLowerCase().startsWith(mentionQuery.toLowerCase())
          )
          .slice(0, 6),
      ]
    : [];

  // Prefill from smart reply
  useEffect(() => {
    if (prefillText) {
      setContent(prefillText);
      onPrefillConsumed?.();
      setTimeout(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.style.height = 'auto';
          ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
          ta.focus();
          ta.setSelectionRange(ta.value.length, ta.value.length);
        }
      }, 0);
    }
  }, [prefillText, onPrefillConsumed]);

  const handleChange = (e) => {
    const val = e.target.value;
    setContent(val);
    onTyping?.();

    // Auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    }

    // @mention detection: find the last '@' before the cursor
    const caret = e.target.selectionStart;
    const textBefore = val.slice(0, caret);
    const atIdx = textBefore.lastIndexOf('@');

    if (atIdx !== -1) {
      const afterAt = textBefore.slice(atIdx + 1);
      // Only open if the text after '@' has no spaces (mid-word mention)
      if (!afterAt.includes(' ')) {
        setMentionPos(atIdx);
        setMentionQuery(afterAt.toLowerCase());
        setMentionOpen(true);
        setMentionIndex(0);
        return;
      }
    }
    setMentionOpen(false);
  };

  const insertMention = (member) => {
    const ta = textareaRef.current;
    const before = content.slice(0, mentionPos);
    const after = content.slice(mentionPos + 1 + mentionQuery.length);
    const inserted = `@${member.username} `;
    const newContent = before + inserted + after;
    setContent(newContent);
    setMentionOpen(false);
    setTimeout(() => {
      if (ta) {
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
        ta.focus();
        const pos = before.length + inserted.length;
        ta.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (mentionOpen && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionSuggestions.length) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionSuggestions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds the 10 MB limit.`);
        continue;
      }
      const id = `${Date.now()}-${file.name}`;
      const isImage = file.type.startsWith('image/');
      const preview = isImage ? URL.createObjectURL(file) : null;

      setAttachments((prev) => [
        ...prev,
        { id, file, preview, uploading: true, progress: 0, attachment: null },
      ]);

      try {
        const { data } = await uploadFileDirect(file, (progress) => {
          setAttachments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, progress } : a))
          );
        });
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, uploading: false, attachment: data.attachment } : a
          )
        );
      } catch {
        setError(`Failed to upload "${file.name}".`);
        setAttachments((prev) => prev.filter((a) => a.id !== id));
      }
    }
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    const readyAttachments = attachments.filter((a) => a.attachment).map((a) => a.attachment);

    if (!trimmed && readyAttachments.length === 0) return;
    if (attachments.some((a) => a.uploading)) {
      setError('Please wait for all files to finish uploading.');
      return;
    }

    setSending(true);
    setError('');
    setMentionOpen(false);

    try {
      await onSend(trimmed, readyAttachments);
      setContent('');
      setAttachments([]);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }, [content, attachments, onSend]);

  const stillUploading = attachments.some((a) => a.uploading);

  return (
    <div className="px-5 py-3 border-t border-gray-200 bg-white shrink-0">
      {error && (
        <div className="mb-2 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg flex items-center gap-2">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map(({ id, file, preview, uploading, progress }) => (
            <div key={id} className="relative group">
              {preview ? (
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                  <img src={preview} alt={file.name} className="w-full h-full object-cover" />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                      <span className="text-white text-xs font-bold">{progress}%</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 rounded-lg border border-gray-200 text-xs text-gray-700">
                  <FileText className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  {uploading && <span className="text-gray-500">{progress}%</span>}
                </div>
              )}
              {!uploading && (
                <button
                  onClick={() => removeAttachment(id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* @mention autocomplete dropdown */}
      {mentionOpen && mentionSuggestions.length > 0 && (
        <div className="mb-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="px-3 py-1.5 border-b border-gray-100 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500">Mention a member</span>
          </div>
          {mentionSuggestions.map((m, i) => (
            <button
              key={m._id}
              onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition ${
                i === mentionIndex ? 'bg-brand-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="relative shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase ${m.isBot ? 'bg-gradient-to-br from-brand-500 to-purple-500' : 'bg-brand-600'}`}>
                  {m.isBot ? <Bot className="w-3.5 h-3.5" /> : m.username[0]}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-gray-800">@{m.username}</span>
                {m.isBot && (
                  <span className="ml-1.5 text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">AI Bot</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition shrink-0"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.mp4,.mp3,.wav"
        />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${channelName} · type @ to mention`}
          rows={1}
          className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition placeholder-gray-400 bg-gray-50 leading-relaxed"
          style={{ maxHeight: '160px' }}
        />

        <button
          onClick={handleSend}
          disabled={sending || stillUploading || (!content.trim() && attachments.length === 0)}
          className="p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title="Send message (Enter)"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 ml-1">
        Enter to send · Shift+Enter for new line · @ to mention · Max 10 MB per file
      </p>
    </div>
  );
}
