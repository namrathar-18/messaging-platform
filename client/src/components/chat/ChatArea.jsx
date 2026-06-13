import React, { useMemo, useState } from 'react';
import {
  Archive,
  Bell,
  Bot,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ChevronRight,
  FileImage,
  Hash,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  MoreVertical,
  Palette,
  Phone,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Sun,
  Trash2,
  UserX,
  UserRound,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useMessages } from '../../hooks/useMessages';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChannelSettingsModal from './ChannelSettingsModal';
import MembersModal from './MembersModal';
import AISearchPanel from './AISearchPanel';
import AISummarize from './AISummarize';
import WorkspacePanel from './WorkspacePanel';
import ThreadPanel from './ThreadPanel';
import CreatePollModal from './CreatePollModal';
import SmartNotificationsModal from './SmartNotificationsModal';
import api from '../../api/axios';
import { useEffect } from 'react';
import { format } from 'date-fns';

export default function ChatArea({ channel, onChannelUpdate, onChannelDelete, onLeaveChannel }) {
  const { user, blockUser, unblockUser } = useAuth();
  const { isOnline } = useSocket();
  const { messages, loading, hasMore, loadMore, sendMessage, sendTyping, typingUsers } = useMessages(channel._id);

  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAISearch, setShowAISearch] = useState(false);
  const [showProfile, setShowProfile] = useState(true);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [activeThreadMessageId, setActiveThreadMessageId] = useState(null);
  const [showCreatePoll, setShowCreatePoll] = useState(false);

  // Profile panel modals
  const [showSmartNotif, setShowSmartNotif] = useState(false);
  const [showChatTheme, setShowChatTheme] = useState(false);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [showAutoArchive, setShowAutoArchive] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [showLockInfo, setShowLockInfo] = useState(false);

  // Chat theme stored in localStorage per channel
  const [chatTheme, setChatTheme] = useState(() => {
    return localStorage.getItem(`chat_theme_${channel._id}`) || 'aurora';
  });
  const [notifMode, setNotifMode] = useState(() => {
    return localStorage.getItem(`notif_mode_${channel._id}`) || 'priority';
  });
  const [archiveDays, setArchiveDays] = useState(() => {
    return parseInt(localStorage.getItem(`archive_days_${channel._id}`) || '30');
  });

  const [recapText, setRecapText] = useState('');
  const [loadingRecap, setLoadingRecap] = useState(false);
  const [dismissedRecap, setDismissedRecap] = useState(false);
  const [callMode, setCallMode] = useState(null);
  const [smartReplyText, setSmartReplyText] = useState('');

  const isDM = channel.type === 'direct';
  const otherParticipant = isDM
    ? channel.participants?.find((p) => (p._id || p)?.toString() !== user._id?.toString())
    : null;

  useEffect(() => {
    setRecapText('');
    setDismissedRecap(false);
    setActiveThreadMessageId(null);
    setShowWorkspace(false);
    setChatTheme(localStorage.getItem(`chat_theme_${channel._id}`) || 'aurora');
    setNotifMode(localStorage.getItem(`notif_mode_${channel._id}`) || 'priority');
    setArchiveDays(parseInt(localStorage.getItem(`archive_days_${channel._id}`) || '30'));
  }, [channel._id]);

  const unreadMessagesCount = useMemo(() => {
    if (!channel.lastReadMessage || messages.length === 0) return 0;
    const lastReadId = typeof channel.lastReadMessage === 'object' ? channel.lastReadMessage._id : channel.lastReadMessage;
    const idx = messages.findIndex((m) => m._id === lastReadId);
    if (idx === -1) return 0;
    return messages.length - 1 - idx;
  }, [messages, channel.lastReadMessage]);

  const handleGetRecap = async () => {
    setLoadingRecap(true);
    try {
      const { data } = await api.post('/ai/recap', { channelId: channel._id });
      setRecapText(data.recap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRecap(false);
    }
  };

  const displayName = isDM ? otherParticipant?.username || 'Direct Message' : channel.name;
  const online = isDM ? isOnline(otherParticipant?._id) : true;
  const memberCount = channel.participants?.length || channel.memberCount || 1;
  const otherParticipantId = otherParticipant?._id || otherParticipant;
  const isBlocked = isDM && user?.blockedUsers?.some((id) => id?.toString() === otherParticipantId?.toString());

  const mediaMessages = useMemo(
    () => messages.filter((m) => m.attachments && m.attachments.length > 0),
    [messages]
  );
  const mediaCount = useMemo(
    () => messages.reduce((sum, msg) => sum + (msg.attachments?.length || 0), 0),
    [messages]
  );

  const themeLabels = { aurora: 'Aurora Glass', ocean: 'Ocean Blue', forest: 'Forest Dark', rose: 'Rose Pink' };
  const notifLabels = { priority: 'Priority only', all: 'All messages', mentions: 'Mentions only', none: 'Muted' };

  const handleSetTheme = (t) => {
    setChatTheme(t);
    localStorage.setItem(`chat_theme_${channel._id}`, t);
  };
  const handleSetNotif = (m) => {
    setNotifMode(m);
    localStorage.setItem(`notif_mode_${channel._id}`, m);
  };
  const handleSetArchive = (d) => {
    setArchiveDays(d);
    localStorage.setItem(`archive_days_${channel._id}`, String(d));
  };

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden rounded-[28px] border border-white/45 bg-white/30 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/45">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-white/35 bg-white/45 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProfile((value) => !value)}
              className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-500 to-fuchsia-500 text-lg font-black uppercase text-white shadow-lg shadow-cyan-500/20"
              title="Open profile"
            >
              {isDM ? otherParticipant?.username?.[0] || '?' : <Hash className="h-5 w-5" />}
              <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${online ? 'bg-emerald-400' : 'bg-slate-400'}`} />
            </button>

            <button onClick={() => setShowProfile(true)} className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-black tracking-tight">{displayName}</h2>
                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-200">
                  {isDM ? (online ? 'online' : 'offline') : `${memberCount} members`}
                </span>
              </div>
              <p className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                {isDM ? 'Encrypted personal chat with AI reply recommendations' : channel.description || 'Group hub with media, files, calls, and AI assistance'}
              </p>
            </button>

            <div className="flex items-center gap-1.5">
              <IconButton title="AI search" onClick={() => setShowAISearch(true)} icon={<Search className="h-4 w-4" />} />
              <IconButton title="Audio call" onClick={() => setCallMode('audio')} icon={<Phone className="h-4 w-4" />} accent="emerald" />
              <IconButton title="Video call" onClick={() => setCallMode('video')} icon={<Video className="h-4 w-4" />} accent="cyan" />
              {!isDM && <IconButton title="Members" onClick={() => setShowMembers(true)} icon={<Users className="h-4 w-4" />} />}
              {!isDM && (channel.role === 'owner' || channel.role === 'admin') && (
                <IconButton title="Channel settings" onClick={() => setShowSettings(true)} icon={<Settings className="h-4 w-4" />} />
              )}
              {!isDM && <IconButton title="Leave channel" onClick={onLeaveChannel} icon={<LogOut className="h-4 w-4" />} accent="rose" />}
              {!isDM && (
                <IconButton
                  title="Workspace"
                  onClick={() => {
                    setShowWorkspace((v) => !v);
                    setShowProfile(false);
                    setActiveThreadMessageId(null);
                  }}
                  icon={<Sparkles className="h-4 w-4" />}
                  accent={showWorkspace ? 'cyan' : 'slate'}
                />
              )}
              <IconButton
                title="Profile panel"
                onClick={() => {
                  setShowProfile((value) => !value);
                  setShowWorkspace(false);
                  setActiveThreadMessageId(null);
                }}
                icon={<MoreVertical className="h-4 w-4" />}
                accent={showProfile ? 'cyan' : 'slate'}
              />
            </div>
          </div>
        </header>

        <AISummarize channelId={channel._id} messageCount={messages.length} />

        {/* AI Chat Recap Banner */}
        {unreadMessagesCount > 2 && !recapText && !dismissedRecap && (
          <div className="mx-4 mt-2 flex items-center justify-between rounded-2xl border border-teal-200/50 bg-teal-500/10 px-4 py-2.5 backdrop-blur-xl dark:border-teal-900/30">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <p className="text-xs font-bold text-teal-800 dark:text-teal-200">
                You missed {unreadMessagesCount} messages.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGetRecap}
                disabled={loadingRecap}
                className="rounded-lg bg-teal-600 px-2.5 py-1 text-[11px] font-black text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 disabled:opacity-50"
              >
                {loadingRecap ? 'Summarizing...' : 'Get Quick Recap'}
              </button>
              <button onClick={() => setDismissedRecap(true)} className="text-slate-500 hover:text-slate-700" title="Dismiss">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {recapText && (
          <div className="mx-4 mt-2 rounded-2xl border border-white/45 bg-white/80 p-4 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wider">AI Catch-Up Recap</span>
              </div>
              <button onClick={() => setRecapText('')} className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-white/10">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs font-medium text-slate-500 mb-2">Summary of {unreadMessagesCount} missed messages:</p>
            <div className="text-xs whitespace-pre-line leading-relaxed text-slate-800 dark:text-slate-200">
              {recapText}
            </div>
          </div>
        )}

        {isBlocked && (
          <div className="border-b border-rose-200/70 bg-rose-500/10 px-4 py-2 text-center text-xs font-bold text-rose-700 dark:border-rose-400/20 dark:text-rose-200">
            You blocked this contact. Unblock them from the profile panel to resume messaging.
          </div>
        )}

        <MessageList
          messages={messages}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          currentUserId={user._id}
          typingUsers={typingUsers}
          isOnline={isOnline}
          channelId={channel._id}
          onSmartReply={(text) => setSmartReplyText(text)}
          onStartThread={(msgId) => {
            setActiveThreadMessageId(msgId);
            setShowProfile(false);
            setShowWorkspace(false);
          }}
        />

        <MessageInput
          channelId={channel._id}
          channelName={displayName}
          onSend={sendMessage}
          onTyping={sendTyping}
          prefillText={smartReplyText}
          onPrefillConsumed={() => setSmartReplyText('')}
          disabled={isBlocked}
          onCreatePollClick={() => setShowCreatePoll(true)}
        />
      </section>

      {showProfile && (
        <aside className="hidden w-80 shrink-0 border-l border-white/35 bg-white/35 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/45 xl:block">
          <ProfilePanel
            channel={channel}
            displayName={displayName}
            isDM={isDM}
            online={online}
            mediaCount={mediaCount}
            messageCount={messages.length}
            isBlocked={isBlocked}
            chatTheme={chatTheme}
            notifMode={notifMode}
            archiveDays={archiveDays}
            themeLabels={themeLabels}
            notifLabels={notifLabels}
            onClose={() => setShowProfile(false)}
            onMembers={() => setShowMembers(true)}
            onSettings={() => setShowSettings(true)}
            onSmartNotif={() => setShowSmartNotif(true)}
            onChatTheme={() => setShowChatTheme(true)}
            onPrivacyInfo={() => setShowPrivacyInfo(true)}
            onAutoArchive={() => setShowAutoArchive(true)}
            onMediaGallery={() => setShowMediaGallery(true)}
            onStarred={() => setShowStarred(true)}
            onLockInfo={() => setShowLockInfo(true)}
            onBlock={async () => {
              if (!otherParticipantId) return;
              if (isBlocked) await unblockUser(otherParticipantId);
              else await blockUser(otherParticipantId);
            }}
          />
        </aside>
      )}

      {showWorkspace && !isDM && (
        <aside className="hidden w-96 shrink-0 border-l border-white/35 bg-white/35 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/45 xl:block">
          <WorkspacePanel channel={channel} messages={messages} onClose={() => setShowWorkspace(false)} />
        </aside>
      )}

      {activeThreadMessageId && (
        <aside className="hidden w-96 shrink-0 border-l border-white/35 bg-white/35 p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/45 xl:block">
          <ThreadPanel channelId={channel._id} parentMessageId={activeThreadMessageId} onClose={() => setActiveThreadMessageId(null)} />
        </aside>
      )}

      {callMode && <CallOverlay mode={callMode} name={displayName} onClose={() => setCallMode(null)} />}

      {showSettings && (
        <ChannelSettingsModal
          channel={channel}
          onClose={() => setShowSettings(false)}
          onUpdate={(updates) => { onChannelUpdate(channel._id, updates); setShowSettings(false); }}
          onDelete={() => { onChannelDelete(); setShowSettings(false); }}
        />
      )}
      {showMembers && <MembersModal channel={channel} onClose={() => setShowMembers(false)} />}
      {showAISearch && <AISearchPanel channelId={channel._id} channelName={displayName} onClose={() => setShowAISearch(false)} />}
      {showCreatePoll && (
        <CreatePollModal
          onClose={() => setShowCreatePoll(false)}
          onCreate={async (poll) => {
            try { await sendMessage('', [], poll); setShowCreatePoll(false); }
            catch (err) { console.error('Failed to create poll', err); }
          }}
        />
      )}

      {/* Profile panel modals */}
      {showSmartNotif && <SmartNotificationsModal onClose={() => setShowSmartNotif(false)} />}

      {showChatTheme && (
        <OverlayModal title="Chat Theme" subtitle="Visual style for this conversation" icon={<Palette className="h-4 w-4 text-white" />} iconBg="from-fuchsia-500 to-cyan-500" onClose={() => setShowChatTheme(false)}>
          <div className="space-y-2">
            {Object.entries(themeLabels).map(([key, label]) => {
              const previews = {
                aurora: 'bg-gradient-to-br from-teal-400 via-cyan-500 to-fuchsia-500',
                ocean: 'bg-gradient-to-br from-blue-600 to-cyan-400',
                forest: 'bg-gradient-to-br from-emerald-700 to-teal-900',
                rose: 'bg-gradient-to-br from-rose-400 to-fuchsia-500',
              };
              return (
                <button
                  key={key}
                  onClick={() => { handleSetTheme(key); setShowChatTheme(false); }}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:scale-[1.01] ${chatTheme === key ? 'border-cyan-400 bg-cyan-500/10 dark:border-cyan-500' : 'border-white/30 bg-white/30 dark:border-white/10 dark:bg-white/5'}`}
                >
                  <div className={`h-8 w-8 rounded-xl ${previews[key]} shadow-md`} />
                  <span className="flex-1 text-sm font-bold">{label}</span>
                  {chatTheme === key && <CheckCircle2 className="h-4 w-4 text-cyan-500" />}
                </button>
              );
            })}
          </div>
        </OverlayModal>
      )}

      {showPrivacyInfo && (
        <OverlayModal title="Privacy Mode" subtitle="End-to-end style encryption" icon={<Shield className="h-4 w-4 text-white" />} iconBg="from-emerald-500 to-teal-600" onClose={() => setShowPrivacyInfo(false)}>
          <div className="space-y-3">
            <PrivacyRow icon="🔒" title="End-to-end style" desc="Messages are encrypted in transit and at rest using AES-256." />
            <PrivacyRow icon="🙈" title="No message logging" desc="AI processes context in-session only. Your chat history is not used for model training." />
            <PrivacyRow icon="🗑️" title="Auto-delete" desc={`Messages auto-archive after ${archiveDays} days per your archive setting.`} />
            <PrivacyRow icon="👁️" title="Read receipts" desc="Contacts see when you've read their messages. Toggle in Settings." />
            <div className="mt-2 rounded-xl bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-900/30 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              PingLink AI never sells your data. Your conversations are private.
            </div>
          </div>
        </OverlayModal>
      )}

      {showAutoArchive && (
        <OverlayModal title="Auto Archive" subtitle="Automatically clean old messages" icon={<Archive className="h-4 w-4 text-white" />} iconBg="from-amber-500 to-orange-500" onClose={() => setShowAutoArchive(false)}>
          <div className="space-y-2">
            {[7, 14, 30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => { handleSetArchive(days); setShowAutoArchive(false); }}
                className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition hover:scale-[1.01] ${archiveDays === days ? 'border-amber-400 bg-amber-500/10 dark:border-amber-500' : 'border-white/30 bg-white/30 dark:border-white/10 dark:bg-white/5'}`}
              >
                <span className="text-sm font-bold">After {days} days</span>
                {archiveDays === days && <CheckCircle2 className="h-4 w-4 text-amber-500" />}
              </button>
            ))}
            <button
              onClick={() => { handleSetArchive(0); setShowAutoArchive(false); }}
              className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition hover:scale-[1.01] ${archiveDays === 0 ? 'border-slate-400 bg-slate-500/10' : 'border-white/30 bg-white/30 dark:border-white/10 dark:bg-white/5'}`}
            >
              <span className="text-sm font-bold">Never archive</span>
              {archiveDays === 0 && <CheckCircle2 className="h-4 w-4 text-slate-500" />}
            </button>
          </div>
        </OverlayModal>
      )}

      {showMediaGallery && (
        <OverlayModal title="Media Gallery" subtitle={`${mediaCount} shared file${mediaCount !== 1 ? 's' : ''}`} icon={<Camera className="h-4 w-4 text-white" />} iconBg="from-cyan-500 to-teal-500" onClose={() => setShowMediaGallery(false)}>
          {mediaMessages.length === 0 ? (
            <div className="py-10 text-center">
              <FileImage className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm font-bold text-slate-500">No media shared yet</p>
              <p className="text-xs text-slate-400 mt-1">Images and files will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto">
              {mediaMessages.flatMap((m) =>
                m.attachments.map((att, i) => (
                  <a
                    key={`${m._id}-${i}`}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-xl border border-white/30 bg-slate-100 dark:bg-white/10"
                  >
                    {att.mimetype?.startsWith('image/') ? (
                      <img src={att.url} alt={att.originalName} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-1 p-2">
                        <FileImage className="h-6 w-6 text-cyan-500" />
                        <p className="text-[9px] font-bold text-center truncate w-full text-slate-600 dark:text-slate-300">{att.originalName}</p>
                      </div>
                    )}
                  </a>
                ))
              )}
            </div>
          )}
        </OverlayModal>
      )}

      {showStarred && (
        <OverlayModal title="Starred Messages" subtitle="Messages you've saved" icon={<Star className="h-4 w-4 text-white" />} iconBg="from-amber-400 to-yellow-500" onClose={() => setShowStarred(false)}>
          <div className="py-10 text-center">
            <Star className="mx-auto mb-2 h-8 w-8 text-amber-400" />
            <p className="text-sm font-bold text-slate-500">No starred messages yet</p>
            <p className="text-xs text-slate-400 mt-1">Long-press any message to star it.</p>
          </div>
        </OverlayModal>
      )}

      {showLockInfo && (
        <OverlayModal title="Chat Lock" subtitle="Access control & security" icon={<Lock className="h-4 w-4 text-white" />} iconBg="from-slate-700 to-slate-900" onClose={() => setShowLockInfo(false)}>
          <div className="space-y-3">
            <PrivacyRow icon="🔐" title="Biometric lock" desc="Lock this chat behind fingerprint or face recognition on supported devices." />
            <PrivacyRow icon="⏱️" title="Auto-lock" desc="Chat locks automatically after 5 minutes of inactivity." />
            <PrivacyRow icon="👻" title="Hide preview" desc="Message previews are hidden in notifications when chat is locked." />
            <div className="mt-3 rounded-2xl border border-slate-200/50 bg-slate-100/60 dark:border-white/10 dark:bg-white/5 p-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Chat lock is available on the mobile app. Desktop sessions use your account password.
            </div>
          </div>
        </OverlayModal>
      )}
    </div>
  );
}

function IconButton({ title, icon, onClick, accent = 'slate' }) {
  const accents = {
    slate: 'hover:bg-slate-900/10 text-slate-700 dark:text-slate-200 dark:hover:bg-white/10',
    emerald: 'hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    cyan: 'hover:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
    rose: 'hover:bg-rose-500/15 text-rose-700 dark:text-rose-300',
  };
  return (
    <button
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-2xl border border-white/30 bg-white/30 shadow-sm backdrop-blur ${accents[accent]}`}
      title={title}
    >
      {icon}
    </button>
  );
}

function ProfilePanel({
  channel, displayName, isDM, online, mediaCount, messageCount,
  isBlocked, chatTheme, notifMode, archiveDays, themeLabels, notifLabels,
  onClose, onMembers, onSettings, onSmartNotif, onChatTheme, onPrivacyInfo,
  onAutoArchive, onMediaGallery, onStarred, onLockInfo, onBlock,
}) {
  const settings = [
    { icon: Bell,    label: 'Smart notifications', value: notifLabels[notifMode] || 'Priority only', onClick: onSmartNotif },
    { icon: Shield,  label: 'Privacy mode',         value: 'End-to-end style',                        onClick: onPrivacyInfo },
    { icon: Palette, label: 'Chat theme',            value: themeLabels[chatTheme] || 'Aurora glass',  onClick: onChatTheme },
    { icon: Archive, label: 'Auto archive',          value: archiveDays > 0 ? `After ${archiveDays} days` : 'Disabled', onClick: onAutoArchive },
  ];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Profile</p>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/40 dark:hover:bg-white/10" title="Close profile">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-[24px] border border-white/40 bg-white/45 p-4 text-center shadow-xl shadow-slate-900/5 dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-teal-300 via-cyan-500 to-fuchsia-500 text-2xl font-black uppercase text-white shadow-lg">
          {isDM ? displayName[0] : <Users className="h-8 w-8" />}
        </div>
        <h3 className="text-lg font-black">{displayName}</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
          {isDM ? (online ? 'Available now' : 'Last seen recently') : channel.description || 'Secure collaborative group'}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat value={messageCount} label="Msgs" />
          <Stat value={mediaCount} label="Media" />
          <Stat value={isDM ? 1 : channel.participants?.length || 1} label="People" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <QuickAction icon={Camera} label="Media"   onClick={onMediaGallery} color="cyan" />
        <QuickAction icon={Star}   label="Starred" onClick={onStarred}      color="amber" />
        <QuickAction icon={Lock}   label="Lock"    onClick={onLockInfo}     color="slate" />
      </div>

      <div className="space-y-2">
        {settings.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/30 bg-white/35 p-3 text-left transition hover:bg-white/55 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 shrink-0">
              <item.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{item.label}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.value}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          </button>
        ))}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        {!isDM && (
          <button onClick={onMembers} className="rounded-2xl bg-cyan-500 px-3 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20">
            Members
          </button>
        )}
        {isDM && (
          <button
            onClick={onBlock}
            className={`rounded-2xl px-3 py-3 text-sm font-black text-white shadow-lg ${isBlocked ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}
          >
            <UserX className="mr-1 inline h-4 w-4" />
            {isBlocked ? 'Unblock' : 'Block'}
          </button>
        )}
        <button onClick={onSettings} className="rounded-2xl bg-slate-950 px-3 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
          Settings
        </button>
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl bg-white/45 px-2 py-3 dark:bg-white/10">
      <p className="text-sm font-black">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, color = 'slate' }) {
  const colors = {
    cyan:  'hover:bg-cyan-500/15  hover:text-cyan-700  dark:hover:text-cyan-300',
    amber: 'hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-300',
    slate: 'hover:bg-slate-900/10 hover:text-slate-700 dark:hover:text-slate-200',
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border border-white/30 bg-white/35 p-3 text-center text-xs font-black shadow-sm transition dark:border-white/10 dark:bg-white/5 ${colors[color]}`}
    >
      <Icon className="mx-auto mb-1 h-4 w-4" />
      {label}
    </button>
  );
}

function OverlayModal({ title, subtitle, icon, iconBg, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-[28px] border border-white/45 bg-white/90 p-5 text-slate-950 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/95 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${iconBg} shadow-md`}>{icon}</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{subtitle}</p>
              <h2 className="text-lg font-black leading-tight">{title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-900/10 dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PrivacyRow({ icon, title, desc }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/30 bg-white/40 p-3 dark:border-white/10 dark:bg-white/5">
      <span className="text-lg leading-none mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function CallOverlay({ mode, name, onClose }) {
  const isVideo = mode === 'video';
  return (
    <div className="absolute inset-4 z-40 grid place-items-center rounded-[28px] bg-slate-950/55 p-4 backdrop-blur-xl">
      <div className="w-full max-w-md rounded-[28px] border border-white/15 bg-white/15 p-6 text-center text-white shadow-2xl">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-[28px] bg-gradient-to-br from-emerald-300 via-cyan-400 to-fuchsia-400">
          {isVideo ? <Video className="h-9 w-9" /> : <Phone className="h-9 w-9" />}
        </div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100">{isVideo ? 'Video call' : 'Voice call'}</p>
        <h3 className="mt-2 text-2xl font-black">{name}</h3>
        <p className="mt-2 text-sm text-white/70">Calling interface preview with mute, camera, speaker, and AI notes controls.</p>
        <div className="mt-6 flex justify-center gap-3">
          <CallControl icon={<BrainCircuit className="h-5 w-5" />} title="AI notes" />
          <CallControl icon={<MessageCircle className="h-5 w-5" />} title="Chat" />
          <CallControl icon={<Bot className="h-5 w-5" />} title="Assistant" />
          <button onClick={onClose} className="grid h-12 w-12 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30" title="End call">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CallControl({ icon, title }) {
  return (
    <button className="grid h-12 w-12 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" title={title}>
      {icon}
    </button>
  );
}
