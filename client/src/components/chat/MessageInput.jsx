import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart2, Bot, FileText, Image, Loader2, Mic, Paperclip, Send, Sparkles, Square, Wand2, X, Zap } from 'lucide-react';
import api from '../../api/axios';
import { uploadFileDirect } from '../../api/uploads';
import { getMembers } from '../../api/channels';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const BOT_ENTRY = { _id: 'bot', username: 'ai-assistant', isBot: true };

export default function MessageInput({ channelId, channelName, onSend, onTyping, prefillText, onPrefillConsumed, disabled = false, onCreatePollClick }) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState('');
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPos, setMentionPos] = useState(-1);
  const [members, setMembers] = useState([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);

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

  const mentionSuggestions = useMemo(() => {
    if (!mentionOpen) return [];
    return [
      ...(BOT_ENTRY.username.startsWith(mentionQuery.toLowerCase()) ? [BOT_ENTRY] : []),
      ...members
        .filter((m) => !m.isBot && m.username?.toLowerCase().startsWith(mentionQuery.toLowerCase()))
        .slice(0, 6),
    ];
  }, [mentionOpen, mentionQuery, members]);

  useEffect(() => {
    if (!prefillText) return;
    setContent(prefillText);
    onPrefillConsumed?.();
    setTimeout(() => resizeAndFocus(true), 0);
  }, [prefillText, onPrefillConsumed]);

  const resizeAndFocus = (moveCaret = false) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    ta.focus();
    if (moveCaret) ta.setSelectionRange(ta.value.length, ta.value.length);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setContent(val);
    onTyping?.();
    resizeAndFocus();

    const caret = e.target.selectionStart;
    const textBefore = val.slice(0, caret);
    const atIdx = textBefore.lastIndexOf('@');

    if (atIdx !== -1) {
      const afterAt = textBefore.slice(atIdx + 1);
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

  const insertMention = (member = BOT_ENTRY) => {
    const before = mentionPos >= 0 ? content.slice(0, mentionPos) : `${content}${content ? ' ' : ''}`;
    const after = mentionPos >= 0 ? content.slice(mentionPos + 1 + mentionQuery.length) : '';
    const inserted = `@${member.username} `;
    setContent(before + inserted + after);
    setMentionOpen(false);
    setTimeout(() => resizeAndFocus(true), 0);
  };

  const askAssistant = () => {
    if (content.toLowerCase().includes('@ai-assistant')) {
      resizeAndFocus(true);
      return;
    }
    setContent((value) => `${value}${value ? ' ' : ''}@ai-assistant `);
    setTimeout(() => resizeAndFocus(true), 0);
  };

  const smartCompose = async (action) => {
    const trimmed = content.trim();
    if (!trimmed) {
      setError('Type a message first, then use AI compose.');
      return;
    }

    setAiLoading(action);
    setError('');
    try {
      const { data } = await api.post('/ai/compose', { text: trimmed, action });
      setContent(data.text || trimmed);
      setTimeout(() => resizeAndFocus(true), 0);
    } catch (err) {
      setError(err.response?.data?.error || 'AI compose failed. Try @ai-assistant in the message instead.');
    } finally {
      setAiLoading('');
    }
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
    if (disabled) return;
    e.target.value = '';

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds the 25 MB limit.`);
        continue;
      }

      const id = `${Date.now()}-${file.name}`;
      const isImage = file.type.startsWith('image/');
      const preview = isImage ? URL.createObjectURL(file) : null;

      setAttachments((prev) => [...prev, { id, file, preview, uploading: true, progress: 0, attachment: null }]);

      try {
        const { data } = await uploadFileDirect(file, (progress) => {
          setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, progress } : a)));
        });
        setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, uploading: false, attachment: data.attachment } : a)));
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

  const addUploadedAttachment = async (file, idPrefix = Date.now().toString()) => {
    const id = `${idPrefix}-${file.name}`;
    const isImage = file.type.startsWith('image/');
    const preview = isImage ? URL.createObjectURL(file) : null;

    setAttachments((prev) => [...prev, { id, file, preview, uploading: true, progress: 0, attachment: null }]);

    try {
      const { data } = await uploadFileDirect(file, (progress) => {
        setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, progress } : a)));
      });
      setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, uploading: false, attachment: data.attachment } : a)));
    } catch {
      setError(`Failed to upload "${file.name}".`);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Voice notes are not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 0) {
          const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
          await addUploadedAttachment(file, 'voice');
        }
        audioChunksRef.current = [];
      };

      recorder.start();
      setRecording(true);
      setError('');
    } catch {
      setError('Microphone access was blocked. Allow microphone permission to record voice notes.');
    }
  };

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
    setRecording(false);
  };

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (disabled) return;
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
    <div className="shrink-0 border-t border-white/35 bg-white/45 px-4 py-3 text-slate-950 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55 dark:text-white">
      {disabled && (
        <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-xs font-bold text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
          This contact is blocked.
        </div>
      )}
      {error && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} title="Dismiss"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button disabled={disabled} onClick={askAssistant} className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-3 py-1.5 text-xs font-black text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50" title="Ask AI assistant">
          <Bot className="h-3.5 w-3.5" />
          Ask AI
        </button>
        <AiButton action="rewrite" label="Rewrite" icon={<Wand2 className="h-3.5 w-3.5" />} loading={aiLoading} onClick={smartCompose} disabled={disabled} />
        <AiButton action="shorten" label="Shorten" icon={<Zap className="h-3.5 w-3.5" />} loading={aiLoading} onClick={smartCompose} disabled={disabled} />
        <AiButton action="professional" label="Professional" icon={<Sparkles className="h-3.5 w-3.5" />} loading={aiLoading} onClick={smartCompose} disabled={disabled} />
        {onCreatePollClick && (
          <button
            onClick={onCreatePollClick}
            disabled={disabled}
            className="flex items-center gap-1.5 rounded-full border border-white/35 bg-white/35 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-white/60 disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
            title="Create Poll"
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Poll
          </button>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map(({ id, file, preview, uploading, progress }) => (
            <div key={id} className="group relative">
              {preview ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/40 dark:border-white/10">
                  <img src={preview} alt={file.name} className="h-full w-full object-cover" />
                  {uploading && <UploadCover progress={progress} />}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  {uploading && <span>{progress}%</span>}
                </div>
              )}
              {!uploading && (
                <button onClick={() => removeAttachment(id)} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-white opacity-0 transition group-hover:opacity-100" title="Remove file">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {mentionOpen && mentionSuggestions.length > 0 && (
        <div className="mb-2 overflow-hidden rounded-2xl border border-white/40 bg-white/85 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
          <div className="border-b border-slate-200 px-3 py-2 text-xs font-black text-slate-500 dark:border-white/10 dark:text-slate-400">Mention a member</div>
          {mentionSuggestions.map((m, i) => (
            <button
              key={m._id}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(m);
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition ${
                i === mentionIndex ? 'bg-cyan-500/15' : 'hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black text-white ${m.isBot ? 'bg-gradient-to-br from-cyan-500 to-fuchsia-500' : 'bg-slate-900'}`}>
                {m.isBot ? <Bot className="h-3.5 w-3.5" /> : m.username?.[0]}
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-white">@{m.username}</span>
              {m.isBot && <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[11px] font-black text-fuchsia-700 dark:text-fuchsia-200">AI</span>}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button type="button" disabled={disabled} onClick={() => fileInputRef.current?.click()} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-slate-600 hover:bg-white/45 hover:text-slate-950 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" title="Attach file">
          <Paperclip className="h-5 w-5" />
        </button>
        <button type="button" disabled={disabled} onClick={() => fileInputRef.current?.click()} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-slate-600 hover:bg-white/45 hover:text-slate-950 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" title="Attach image">
          <Image className="h-5 w-5" />
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.mp4,.mp3,.wav" />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={`Message ${channelName} - type @ or use Ask AI`}
          rows={1}
          className="min-h-[44px] flex-1 resize-none rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm font-medium leading-relaxed text-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-400"
          style={{ maxHeight: '160px' }}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={recording ? stopVoiceRecording : startVoiceRecording}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
            recording
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
              : 'text-slate-600 hover:bg-white/45 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
          }`}
          title={recording ? 'Stop voice note' : 'Record voice note'}
        >
          {recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
        </button>
        <button
          onClick={handleSend}
          disabled={disabled || sending || stillUploading || (!content.trim() && attachments.length === 0)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"
          title="Send message"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function AiButton({ action, label, icon, loading, onClick, disabled }) {
  const active = loading === action;
  return (
    <button
      onClick={() => onClick(action)}
      disabled={disabled || !!loading}
      className="flex items-center gap-1.5 rounded-full border border-white/35 bg-white/35 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-white/60 disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
      title={`AI ${label}`}
    >
      {active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function UploadCover({ progress }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/45">
      <span className="text-xs font-black text-white">{progress}%</span>
    </div>
  );
}
