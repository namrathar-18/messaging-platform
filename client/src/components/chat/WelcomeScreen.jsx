import React from 'react';
import { MessageSquare, Hash, Users } from 'lucide-react';

export default function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-center p-8">
      <div className="w-20 h-20 bg-brand-100 rounded-3xl flex items-center justify-center mb-5">
        <MessageSquare className="w-10 h-10 text-brand-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to MessengerApp</h2>
      <p className="text-gray-500 text-sm max-w-sm mb-8">
        Select a channel from the sidebar or start a new direct message to begin collaborating in real time.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 text-left shadow-sm">
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
            <Hash className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Group Channels</p>
            <p className="text-xs text-gray-500">Collaborate with your whole team</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 text-left shadow-sm">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Direct Messages</p>
            <p className="text-xs text-gray-500">Private 1:1 conversations</p>
          </div>
        </div>
      </div>
    </div>
  );
}
