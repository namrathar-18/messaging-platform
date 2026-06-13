import React, { useState } from 'react';
import { X, Plus, Search, Loader2 } from 'lucide-react';
import { searchUsers } from '../../api/auth';

export default function CreateChannelModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await searchUsers(q);
      setSearchResults(data.users.filter((u) => !selectedUsers.find((s) => s._id === u._id)));
    } catch (_) {}
    finally { setSearching(false); }
  };

  const addUser = (user) => {
    setSelectedUsers((prev) => [...prev, user]);
    setSearchResults((prev) => prev.filter((u) => u._id !== user._id));
    setSearchQuery('');
  };

  const removeUser = (userId) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Channel name is required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onCreate(name.trim(), description.trim(), selectedUsers.map((u) => u._id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create channel.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md max-h-[90vh] flex flex-col animate-slide-up rounded-2xl border border-white/25 bg-white/85 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/70 dark:border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Group</h2>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-300">Invite teammates and start collaborating.</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition dark:hover:bg-white/10">
            <X className="w-5 h-5 text-gray-500 dark:text-slate-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm dark:bg-red-500/10 dark:border-red-400/30 dark:text-red-200">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Group Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product Updates"
              maxLength={80}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white/90 text-gray-900 placeholder:text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Purpose</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group for?"
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white/90 text-gray-900 placeholder:text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          {/* Invite members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Invite Members</label>
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedUsers.map((u) => (
                  <span key={u._id} className="flex items-center gap-1 px-2.5 py-1 bg-brand-100/80 text-brand-700 rounded-full text-xs font-medium dark:bg-brand-600/15 dark:text-brand-200">
                    {u.username}
                    <button type="button" onClick={() => removeUser(u._id)} className="rounded-md p-0.5 hover:bg-black/5 dark:hover:bg-white/10">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by username or email…"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white/90 text-gray-900 placeholder:text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
            </div>
            {searchResults.length > 0 && (
              <ul className="mt-1 border border-gray-200/80 rounded-lg overflow-hidden shadow-sm dark:border-white/10 dark:bg-white/5">
                {searchResults.map((u) => (
                  <li key={u._id}>
                    <button
                      type="button"
                      onClick={() => addUser(u)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition text-left dark:hover:bg-white/10"
                    >
                      <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                        {u.username[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">{u.username}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-300">{u.email}</p>
                      </div>
                      <Plus className="w-4 h-4 text-brand-600 ml-auto shrink-0 dark:text-brand-300" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200/70 dark:border-white/10 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}

