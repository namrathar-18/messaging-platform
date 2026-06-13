import React, { useMemo, useState } from 'react';
import {
  Archive,
  Bell,
  Bot,
  BrainCircuit,
  Camera,
  CheckCircle2,
  FileImage,
  Hash,
  Lock,
  LogOut,
  MessageCircle,
  MoreVertical,
  Palette,
  Phone,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
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

export default function ChatArea({ channel, onChannelUpdate, onChannelDelete, onLeaveChannel }) {
  const { user, blockUser, unblockUser } = useAuth();
  const { isOnline } = useSocket();
  const { messages, loading, hasMore, loadMore, sendMessage, sendTyping, typingUsers } = useMessages(channel._id);

  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAISearch, setShowAISearch] = useState(false);
  const [showProfile, setShowProfile] = useState(true);
  const [callMode, setCallMode] = useState(null);
  const [smartReplyText, setSmartReplyText] = useState('');

  const isDM = channel.type === 'direct';
  const otherParticipant = isDM
    ? channel.participants?.find((p) => (p._id || p)?.toString() !== user._id?.toString())
    : null;

  const displayName = isDM ? otherParticipant?.username || 'Direct Message' : channel.name;
  const online = isDM ? isOnline(otherParticipant?._id) : true;
  const memberCount = channel.participants?.length || channel.memberCount || 1;
  const otherParticipantId = otherParticipant?._id || otherParticipant;
  const isBlocked = isDM && user?.blockedUsers?.some((id) => id?.toString() === otherParticipantId?.toString());

  const mediaCount = useMemo(
    () => messages.reduce((sum, msg) => sum + (msg.attachments?.length || 0), 0),
    [messages]
  );

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
              <IconButton title="Profile panel" onClick={() => setShowProfile((value) => !value)} icon={<MoreVertical className="h-4 w-4" />} />
            </div>
          </div>
        </header>

        <AISummarize channelId={channel._id} messageCount={messages.length} />

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
        />

        <MessageInput
          channelId={channel._id}
          channelName={displayName}
          onSend={sendMessage}
          onTyping={sendTyping}
          prefillText={smartReplyText}
          onPrefillConsumed={() => setSmartReplyText('')}
          disabled={isBlocked}
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
            onClose={() => setShowProfile(false)}
            onMembers={() => setShowMembers(true)}
            onSettings={() => setShowSettings(true)}
            onBlock={async () => {
              if (!otherParticipantId) return;
              if (isBlocked) await unblockUser(otherParticipantId);
              else await blockUser(otherParticipantId);
            }}
          />
        </aside>
      )}

      {callMode && (
        <CallOverlay
          mode={callMode}
          name={displayName}
          onClose={() => setCallMode(null)}
        />
      )}

      {showSettings && (
        <ChannelSettingsModal
          channel={channel}
          onClose={() => setShowSettings(false)}
          onUpdate={(updates) => {
            onChannelUpdate(channel._id, updates);
            setShowSettings(false);
          }}
          onDelete={() => {
            onChannelDelete();
            setShowSettings(false);
          }}
        />
      )}
      {showMembers && <MembersModal channel={channel} onClose={() => setShowMembers(false)} />}
      {showAISearch && <AISearchPanel channelId={channel._id} channelName={displayName} onClose={() => setShowAISearch(false)} />}
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

function ProfilePanel({ channel, displayName, isDM, online, mediaCount, messageCount, isBlocked, onClose, onMembers, onSettings, onBlock }) {
  const settings = [
    { icon: Bell, label: 'Smart notifications', value: 'Priority only' },
    { icon: Shield, label: 'Privacy mode', value: 'End-to-end style' },
    { icon: Palette, label: 'Chat theme', value: 'Aurora glass' },
    { icon: Archive, label: 'Auto archive', value: 'After 30 days' },
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
        <QuickAction icon={Camera} label="Media" />
        <QuickAction icon={Star} label="Starred" />
        <QuickAction icon={Lock} label="Lock" />
      </div>

      <div className="space-y-2">
        {settings.map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/35 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <item.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{item.label}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        {!isDM && (
          <button onClick={onMembers} className="rounded-2xl bg-cyan-500 px-3 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20">
            Members
          </button>
        )}
        {isDM && (
          <button onClick={onBlock} className={`rounded-2xl px-3 py-3 text-sm font-black text-white shadow-lg ${isBlocked ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}>
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

function QuickAction({ icon: Icon, label }) {
  return (
    <button className="rounded-2xl border border-white/30 bg-white/35 p-3 text-center text-xs font-black shadow-sm dark:border-white/10 dark:bg-white/5">
      <Icon className="mx-auto mb-1 h-4 w-4" />
      {label}
    </button>
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
