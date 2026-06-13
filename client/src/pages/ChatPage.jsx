import React, { useState } from 'react';
import { useChannels } from '../hooks/useChannels';
import Sidebar from '../components/layout/Sidebar';
import ChatArea from '../components/chat/ChatArea';
import WelcomeScreen from '../components/chat/WelcomeScreen';

export default function ChatPage() {
  const channelsData = useChannels();
  const [activeChannel, setActiveChannel] = useState(null);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar
        channelsData={channelsData}
        activeChannel={activeChannel}
        onSelectChannel={setActiveChannel}
      />
      <main className="flex-1 min-w-0 flex flex-col">
        {activeChannel ? (
          <ChatArea
            channel={activeChannel}
            onChannelUpdate={channelsData.updateChannelInList}
            onChannelDelete={() => {
              channelsData.removeChannel(activeChannel._id);
              setActiveChannel(null);
            }}
            onLeaveChannel={() => {
              channelsData.leave(activeChannel._id);
              setActiveChannel(null);
            }}
          />
        ) : (
          <WelcomeScreen />
        )}
      </main>
    </div>
  );
}
