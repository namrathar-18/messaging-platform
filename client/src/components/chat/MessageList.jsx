import React, { useEffect, useRef, useCallback } from 'react';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';
import SmartReplies from './SmartReplies';

export default function MessageList({ messages, loading, hasMore, onLoadMore, currentUserId, typingUsers, isOnline, channelId, onSmartReply, onStartThread }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const isInitialLoad = useRef(true);

  // Scroll to bottom on initial load and new messages from current user
  useEffect(() => {
    if (isInitialLoad.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      isInitialLoad.current = false;
      return;
    }
    // If the last message is from current user → scroll to bottom
    const last = messages[messages.length - 1];
    if (last && (last.sender?._id === currentUserId || last.sender === currentUserId)) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentUserId]);

  // Restore scroll position after loading older messages
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (prevScrollHeightRef.current > 0) {
      container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [messages]);

  // Infinite scroll trigger (scroll to top)
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (container.scrollTop < 80 && hasMore && !loading) {
      prevScrollHeightRef.current = container.scrollHeight;
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // Group messages: consecutive messages from same sender within 5 min are grouped
  const groupedMessages = groupMessages(messages);

  const typingList = Object.values(typingUsers);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-5 py-4 space-y-1"
    >
      {/* Load more indicator */}
      {loading && (
        <div className="flex justify-center py-3">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!hasMore && messages.length > 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-gray-400 italic">Beginning of conversation</p>
        </div>
      )}

      {messages.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <p className="text-gray-400 text-sm">No messages yet. Say hello!</p>
        </div>
      )}

      {groupedMessages.map(({ message, isGrouped }) => (
        <MessageItem
          key={message._id}
          message={message}
          isOwnMessage={(message.sender?._id || message.sender) === currentUserId}
          isGrouped={isGrouped}
          currentUserId={currentUserId}
          channelId={channelId}
          onStartThread={onStartThread}
        />
      ))}

      {/* Smart Replies — shown below the last message that is NOT from current user */}
      {messages.length > 0 && channelId && onSmartReply && (
        <SmartReplies
          channelId={channelId}
          lastMessage={messages[messages.length - 1]}
          currentUserId={currentUserId}
          onSelectReply={onSmartReply}
        />
      )}

      {/* Typing indicator */}
      {typingList.length > 0 && <TypingIndicator users={typingList} />}

      <div ref={bottomRef} />
    </div>
  );
}

function groupMessages(messages) {
  return messages.map((msg, i) => {
    if (i === 0) return { message: msg, isGrouped: false };
    const prev = messages[i - 1];
    const prevSenderId = prev.sender?._id || prev.sender;
    const currSenderId = msg.sender?._id || msg.sender;
    const timeDiff = new Date(msg.createdAt) - new Date(prev.createdAt);
    const sameUser = prevSenderId === currSenderId || prevSenderId?.toString() === currSenderId?.toString();
    const within5Min = timeDiff < 5 * 60 * 1000;
    return { message: msg, isGrouped: sameUser && within5Min };
  });
}
