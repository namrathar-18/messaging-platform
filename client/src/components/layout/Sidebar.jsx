import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Hash,
  LogOut,
  Moon,
  Phone,
  Plus,
  Save,
  Search,
  Sun,
  Users,
  X,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import { uploadFileDirect } from '../../api/uploads';
import CreateChannelModal from '../chat/CreateChannelModal';
import NewDirectMessageModal from '../chat/NewDirectMessageModal';
import StoriesTray from './StoriesTray';
import SmartNotificationsModal from '../chat/SmartNotificationsModal';

export default function Sidebar({ channelsData, activeChannel, onSelectChannel }) {
  const { user, logout, updateProfile } = useAuth();
  const { connected, isOnline } = useSocket();
  const { isDark, toggleTheme } = useTheme();
  const { channels, loading, addGroupChannel, addDirectChannel } = channelsData;

  const [showGroups, setShowGroups] = useState(true);
  const [showDMs, setShowDMs] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSmartNotifications, setShowSmartNotifications] = useState(false);
  const [search, setSearch] = useState('');

  const groupChannels = channels.filter((c) => c.type === 'group');
  const dmChannels = channels.filter((c) => c.type === 'direct');

  const getChannelDisplayName = (ch) => {
    if (ch.type === 'group') return ch.name;
    const other = ch.participants?.find((p) => p._id !== user._id && p._id?.toString() !== user._id?.toString());
    return other?.username || ch.name;
  };

  const filterChannels = (list) =>
    search ? list.filter((c) => getChannelDisplayName(c).toLowerCase().includes(search.toLowerCase())) : list;

  const getOtherParticipant = (ch) =>
    ch.participants?.find((p) => p._id !== user._id && p._id?.toString() !== user._id?.toString());

  const handleCreateGroup = async (name, description, memberIds) => {
    const ch = await addGroupChannel(name, description, memberIds);
    onSelectChannel(ch);
    setShowCreateGroup(false);
  };

  const handleNewDM = async (targetUserId) => {
    const ch = await addDirectChannel(targetUserId);
    onSelectChannel(ch);
    setShowNewDM(false);
  };

  return (
    <>
      <aside className="relative z-10 flex h-full w-72 shrink-0 flex-col border-r border-white/40 bg-white/45 text-slate-950 shadow-2xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/45 dark:text-white">
        <div className="border-b border-white/35 px-5 py-4 dark:border-white/10">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/pinglink-logo.svg" alt="PingLink AI" className="h-10 w-10 shrink-0 drop-shadow-md" />
              <div>
                <h1 className="text-lg font-black">PingLink AI</h1>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">AI messaging hub</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowSmartNotifications(true)}
                className="relative rounded-xl border border-white/30 bg-white/35 p-2 text-slate-800 hover:bg-white/55 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                title="Smart Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              </button>
              <button
                onClick={toggleTheme}
                className="rounded-xl border border-white/30 bg-white/35 p-2 text-slate-800 hover:bg-white/55 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels & people..."
              className="w-full rounded-xl border border-white/30 bg-white/45 py-2.5 pl-10 pr-3 text-sm font-medium text-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-400"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/25 bg-white/25 px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <div className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-400 pulse-ring' : 'bg-red-500'}`} />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {connected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>

        <StoriesTray />

        <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
          <ChannelSection
            title="Groups"
            icon={<Hash className="h-3.5 w-3.5" />}
            open={showGroups}
            onToggle={() => setShowGroups((value) => !value)}
            onAdd={() => setShowCreateGroup(true)}
          >
            {loading ? (
              <p className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">Loading...</p>
            ) : filterChannels(groupChannels).length === 0 ? (
              <p className="px-4 py-2 text-xs italic text-slate-500 dark:text-slate-400">No groups yet. Create one.</p>
            ) : (
              filterChannels(groupChannels).map((ch) => (
                <ChannelItem
                  key={ch._id}
                  isActive={activeChannel?._id === ch._id}
                  onClick={() => onSelectChannel(ch)}
                  icon={<Hash className="h-4 w-4 shrink-0" />}
                  name={ch.name}
                />
              ))
            )}
          </ChannelSection>

          <ChannelSection
            title="Direct Messages"
            icon={<Users className="h-3.5 w-3.5" />}
            open={showDMs}
            onToggle={() => setShowDMs((value) => !value)}
            onAdd={() => setShowNewDM(true)}
          >
            {filterChannels(dmChannels).length === 0 ? (
              <p className="px-4 py-2 text-xs italic text-slate-500 dark:text-slate-400">No conversations yet</p>
            ) : (
              filterChannels(dmChannels).map((ch) => {
                const other = getOtherParticipant(ch);
                return (
                  <ChannelItem
                    key={ch._id}
                    isActive={activeChannel?._id === ch._id}
                    onClick={() => onSelectChannel(ch)}
                    icon={<Avatar user={other} online={other ? isOnline(other._id) : false} size="sm" />}
                    name={other?.username || ch.name}
                    isOnline={other ? isOnline(other._id) : false}
                  />
                );
              })
            )}
          </ChannelSection>
        </div>

        <div className="flex items-center gap-3 border-t border-white/35 px-4 py-3 dark:border-white/10">
          <Avatar user={user} online size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user?.username}</p>
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-300">{user?.email}</p>
          </div>
          <button
            onClick={() => setShowProfile(true)}
            title="Edit profile"
            className="rounded-xl p-2 text-slate-600 hover:bg-white/40 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={logout}
            title="Sign out"
            className="rounded-xl p-2 text-red-600 hover:bg-red-500/20 dark:text-red-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {showCreateGroup && <CreateChannelModal onClose={() => setShowCreateGroup(false)} onCreate={handleCreateGroup} />}
      {showNewDM && <NewDirectMessageModal onClose={() => setShowNewDM(false)} onSelect={handleNewDM} />}
      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} onSave={updateProfile} />}
      {showSmartNotifications && <SmartNotificationsModal onClose={() => setShowSmartNotifications(false)} />}
    </>
  );
}

function ChannelSection({ title, icon, open, onToggle, onAdd, children }) {
  return (
    <section>
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {icon}
          {title}
        </button>
        <button onClick={onAdd} className="rounded-lg p-1 text-slate-500 hover:bg-white/40 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white" title={`New ${title}`}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {open && <div className="mt-1 space-y-1">{children}</div>}
    </section>
  );
}

function ChannelItem({ isActive, onClick, icon, name, isOnline }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-white/35 dark:hover:bg-white/10 ${
        isActive ? 'bg-cyan-500/15 font-black text-cyan-800 dark:text-cyan-200' : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
      }`}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
      {isOnline !== undefined && <span className={`h-2 w-2 shrink-0 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-400'}`} />}
    </button>
  );
}

function Avatar({ user, online, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';

  return (
    <div className="relative shrink-0">
      <div className={`${sizeClass} flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-teal-400 via-cyan-500 to-fuchsia-500 font-black uppercase text-white`}>
        {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : user?.username?.[0] || '?'}
      </div>
      {online !== undefined && <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-950 ${online ? 'bg-emerald-400' : 'bg-slate-400'}`} />}
    </div>
  );
}

function ProfileModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
    status: user?.status || 'online',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for your profile photo.');
      return;
    }

    setUploadingPhoto(true);
    setError('');
    try {
      const { data } = await uploadFileDirect(file);
      updateField('avatar', data.attachment.url);
    } catch {
      setError('Could not upload profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[28px] border border-white/45 bg-white/85 p-5 text-slate-950 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90 dark:text-white">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">Profile</p>
            <h2 className="text-xl font-black">Update your account</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-900/10 dark:hover:bg-white/10" title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</div>}

        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-2xl border border-white/40 bg-white/45 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-500 to-fuchsia-500">
              {form.avatar ? <img src={form.avatar} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">Profile photo</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-300">{form.avatar || 'No photo selected'}</p>
            </div>
            <label className="cursor-pointer rounded-xl bg-cyan-500 px-3 py-2 text-xs font-black text-white shadow-lg shadow-cyan-500/20">
              {uploadingPhoto ? 'Uploading...' : 'Upload'}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
            </label>
          </div>
          <ProfileField label="Username" value={form.username} onChange={(value) => updateField('username', value)} />
          <ProfileField label="Email" type="email" value={form.email} onChange={(value) => updateField('email', value)} />
          <ProfileField label="Phone number" type="tel" value={form.phone} onChange={(value) => updateField('phone', value)} placeholder="+91 98765 43210" />
          <ProfileField label="Avatar URL" value={form.avatar} onChange={(value) => updateField('avatar', value)} placeholder="https://..." />
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">Status</span>
            <select
              value={form.status}
              onChange={(event) => updateField('status', event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            >
              <option value="online">Online</option>
              <option value="away">Away</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 font-black text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}

function ProfileField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500"
      />
    </label>
  );
}
