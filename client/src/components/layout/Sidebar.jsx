import React, { useState } from 'react';
import {
  MessageSquare, Hash, Plus, LogOut, ChevronDown, ChevronRight,
  User, Settings, Wifi, WifiOff, Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import CreateChannelModal from '../chat/CreateChannelModal';
import NewDirectMessageModal from '../chat/NewDirectMessageModal';
import StatusBadge from '../ui/StatusBadge';
import { format } from 'date-fns';

export default function Sidebar({ channelsData, activeChannel, onSelectChannel }) {
  const { user, logout } = useAuth();
  const { connected, isOnline } = useSocket();
  const { channels, loading, addGroupChannel, addDirectChannel } = channelsData;

  const [showGroups, setShowGroups] = useState(true);
  const [showDMs, setShowDMs] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [search, setSearch] = useState('');

  const groupChannels = channels.filter((c) => c.type === 'group');
  const dmChannels = channels.filter((c) => c.type === 'direct');

  const filterChannels = (list) =>
    search ? list.filter((c) => getChannelDisplayName(c).toLowerCase().includes(search.toLowerCase())) : list;

  const getChannelDisplayName = (ch) => {
    if (ch.type === 'group') return ch.name;
    const other = ch.participants?.find((p) => p._id !== user._id && p._id?.toString() !== user._id?.toString());
    return other?.username || ch.name;
  };

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

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <aside className="w-64 bg-gray-900 text-gray-100 flex flex-col h-full shrink-0">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-700/60">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm truncate">MessengerApp</span>
            <span className={`ml-auto shrink-0 w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} title={connected ? 'Connected' : 'Disconnected'} />
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels…"
              className="w-full bg-gray-800 text-gray-200 placeholder-gray-500 text-xs rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1">
          {/* Group Channels */}
          <div>
            <button
              onClick={() => setShowGroups(!showGroups)}
              className="w-full flex items-center px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition"
            >
              {showGroups ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
              Channels
              <button
                onClick={(e) => { e.stopPropagation(); setShowCreateGroup(true); }}
                className="ml-auto p-0.5 hover:bg-gray-700 rounded"
                title="New channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </button>

            {showGroups && (
              <div className="mt-0.5 space-y-0.5">
                {loading ? (
                  <div className="px-4 py-2 text-xs text-gray-500">Loading…</div>
                ) : filterChannels(groupChannels).length === 0 ? (
                  <p className="px-4 py-1 text-xs text-gray-600 italic">No channels yet</p>
                ) : (
                  filterChannels(groupChannels).map((ch) => (
                    <ChannelItem
                      key={ch._id}
                      channel={ch}
                      isActive={activeChannel?._id === ch._id}
                      onClick={() => onSelectChannel(ch)}
                      icon={<Hash className="w-3.5 h-3.5 shrink-0" />}
                      name={ch.name}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Direct Messages */}
          <div className="mt-2">
            <button
              onClick={() => setShowDMs(!showDMs)}
              className="w-full flex items-center px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition"
            >
              {showDMs ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
              Direct Messages
              <button
                onClick={(e) => { e.stopPropagation(); setShowNewDM(true); }}
                className="ml-auto p-0.5 hover:bg-gray-700 rounded"
                title="New DM"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </button>

            {showDMs && (
              <div className="mt-0.5 space-y-0.5">
                {filterChannels(dmChannels).length === 0 ? (
                  <p className="px-4 py-1 text-xs text-gray-600 italic">No messages yet</p>
                ) : (
                  filterChannels(dmChannels).map((ch) => {
                    const other = getOtherParticipant(ch);
                    return (
                      <ChannelItem
                        key={ch._id}
                        channel={ch}
                        isActive={activeChannel?._id === ch._id}
                        onClick={() => onSelectChannel(ch)}
                        icon={
                          <div className="relative shrink-0">
                            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold uppercase">
                              {other?.username?.[0] || '?'}
                            </div>
                            {other && (
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${isOnline(other._id) ? 'bg-green-400' : 'bg-gray-500'}`} />
                            )}
                          </div>
                        }
                        name={other?.username || ch.name}
                      />
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* User profile footer */}
        <div className="px-3 py-3 border-t border-gray-700/60 flex items-center gap-2">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold uppercase text-white">
              {user?.username?.[0]}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 bg-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.username}</p>
            <p className="text-xs text-gray-400 truncate">{user?.status || 'online'}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {showCreateGroup && (
        <CreateChannelModal
          onClose={() => setShowCreateGroup(false)}
          onCreate={handleCreateGroup}
        />
      )}
      {showNewDM && (
        <NewDirectMessageModal
          onClose={() => setShowNewDM(false)}
          onSelect={handleNewDM}
        />
      )}
    </>
  );
}

function ChannelItem({ channel, isActive, onClick, icon, name }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md mx-1 text-left transition text-sm ${
        isActive
          ? 'bg-brand-600 text-white'
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
      }`}
    >
      {icon}
      <span className="truncate flex-1">{name}</span>
    </button>
  );
}
