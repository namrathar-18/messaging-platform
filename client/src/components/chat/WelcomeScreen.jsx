import React from 'react';
import { MessageSquare, Hash, Users } from 'lucide-react';

export default function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[#eaf7f2] dark:bg-[#071216]">
      <div className="w-20 h-20 bg-brand-100 rounded-3xl flex items-center justify-center mb-5">
        <MessageSquare className="w-10 h-10 text-brand-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Welcome to MessengerApp</h2>
      <p className="text-gray-500 dark:text-slate-300 text-sm max-w-sm mb-8">
        Select a group from the sidebar or start a new direct message to collaborate in real time.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <div className="flex items-center gap-3 p-4 bg-white/75 dark:bg-white/5 rounded-xl border border-gray-200/70 dark:border-white/10 text-left shadow-sm">
          <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-500/15 rounded-lg flex items-center justify-center shrink-0">
            <Hash className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">Group Spaces</p>
            <p className="text-xs text-gray-500 dark:text-slate-300">Organize work by team topics</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-white/75 dark:bg-white/5 rounded-xl border border-gray-200/70 dark:border-white/10 text-left shadow-sm">
          <div className="w-9 h-9 bg-green-100 dark:bg-emerald-500/15 rounded-lg flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-green-600 dark:text-emerald-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">Direct Messages</p>
            <p className="text-xs text-gray-500 dark:text-slate-300">Private 1:1 conversations</p>
          </div>
        </div>
      </div>
    </div>
  );
}

