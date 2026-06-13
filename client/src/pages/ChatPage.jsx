import React, { useState } from 'react';
import { useChannels } from '../hooks/useChannels';
import Sidebar from '../components/layout/Sidebar';
import ChatArea from '../components/chat/ChatArea';
import WelcomeScreen from '../components/chat/WelcomeScreen';
import { Menu } from 'lucide-react';

export default function ChatPage() {
  const channelsData = useChannels();
  const [activeChannel, setActiveChannel] = useState(null);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#eaf7f2] text-slate-950 dark:bg-[#071216] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(20,184,166,0.28),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(244,114,182,0.22),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(250,204,21,0.18),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.55),rgba(255,255,255,0.12)_44%,rgba(15,23,42,0.1))] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(15,23,42,0.28)_45%,rgba(8,47,73,0.26))]" />

      {/* Desktop sidebar */}
      <div className="hidden h-full lg:block">
        <Sidebar channelsData={channelsData} activeChannel={activeChannel} onSelectChannel={setActiveChannel} />
      </div>

      {/* Mobile hamburger + drawer sidebar */}
      <button
        type="button"
        onClick={() => setSidebarOpenMobile(true)}
        className="absolute left-3 top-3 z-30 grid h-11 w-11 place-items-center rounded-2xl border border-white/40 bg-white/35 text-slate-800 shadow-lg backdrop-blur-xl hover:bg-white/55 lg:hidden dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        aria-label="Open sidebar"
        title="Groups"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Drawer overlay */}
      {sidebarOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40" onClick={() => setSidebarOpenMobile(false)} />
          <div className="relative h-full w-[85vw] max-w-sm">
            <Sidebar
              channelsData={channelsData}
              activeChannel={activeChannel}
              onSelectChannel={(ch) => {
                setActiveChannel(ch);
                setSidebarOpenMobile(false);
              }}
            />
          </div>
        </div>
      )}

      <main className="relative z-10 flex min-w-0 flex-1 flex-col p-3 lg:pl-0">
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
