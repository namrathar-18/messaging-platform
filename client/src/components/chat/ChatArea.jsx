import React, { useState, useRef, useEffect } from 'react';
import { Hash, Settings, Users, LogOut, Trash2, MoreVertical, X, Search } from 'lucide-react';
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
  const { user } = useAuth();
  const { isOnline } = useSocket();
  const { messages, loading, hasMore, loadMore, sendMessage, sendTyping, typingUsers } = useMessages(channel._id);

  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAISearch, setShowAISearch] = useState(false);
  const [smartReplyText, setSmartReplyText] = useState('');

  const isDM = channel.type === 'direct';
  const otherParticipant = isDM
    ? channel.participants?.find((p) => (p._id || p) !== user._id && (p._id?.toString() || p?.toString()) !== user._id?.toString())
    : null;

  const displayName = isDM
    ? otherParticipant?.username || 'Direct Message'
    : channel.name;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isDM ? (
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold uppercase text-white">
                {otherParticipant?.username?.[0] || '?'}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline(otherParticipant?._id) ? 'bg-green-400' : 'bg-gray-400'}`} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
              <Hash className="w-4 h-4 text-brand-600" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900 text-sm truncate">{displayName}</h2>
            {isDM ? (
              <p className="text-xs text-gray-500">
                {isOnline(otherParticipant?._id) ? 'Online' : 'Offline'}
              </p>
            ) : channel.description ? (
              <p className="text-xs text-gray-500 truncate">{channel.description}</p>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* AI Search button — available in all channels */}
          <button
            onClick={() => setShowAISearch(true)}
            className="p-2 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition"
            title="AI Search"
          >
            <Search className="w-4 h-4" />
          </button>
          {!isDM && (
            <button
              onClick={() => setShowMembers(true)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
              title="Members"
            >
              <Users className="w-4 h-4" />
            </button>
          )}
          {!isDM && (channel.role === 'owner' || channel.role === 'admin') && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
              title="Channel settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          {!isDM && (
            <button
              onClick={onLeaveChannel}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition"
              title="Leave channel"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* AI Summarize banner (shown below header) */}
      <AISummarize channelId={channel._id} messageCount={messages.length} />

      {/* Messages */}
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

      {/* Input — prefill with smart reply text if selected */}
      <MessageInput
        channelId={channel._id}
        channelName={displayName}
        onSend={sendMessage}
        onTyping={sendTyping}
        prefillText={smartReplyText}
        onPrefillConsumed={() => setSmartReplyText('')}
      />

      {/* Modals */}
      {showSettings && (
        <ChannelSettingsModal
          channel={channel}
          onClose={() => setShowSettings(false)}
          onUpdate={(updates) => { onChannelUpdate(channel._id, updates); setShowSettings(false); }}
          onDelete={() => { onChannelDelete(); setShowSettings(false); }}
        />
      )}
      {showMembers && (
        <MembersModal
          channel={channel}
          onClose={() => setShowMembers(false)}
        />
      )}
      {showAISearch && (
        <AISearchPanel
          channelId={channel._id}
          channelName={displayName}
          onClose={() => setShowAISearch(false)}
        />
      )}
    </div>
  );
}
