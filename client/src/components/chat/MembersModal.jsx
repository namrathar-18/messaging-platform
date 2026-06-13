import React, { useEffect, useState } from 'react';
import { X, UserPlus, Search, Shield, User, Crown, Loader2, UserMinus } from 'lucide-react';
import { getMembers, inviteMember, updateMemberRole, removeMember } from '../../api/channels';
import { searchUsers } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const ROLE_ICONS = { owner: Crown, admin: Shield, member: User };
const ROLE_COLORS = { owner: 'text-yellow-500', admin: 'text-blue-500', member: 'text-gray-400' };

export default function MembersModal({ channel, onClose }) {
  const { user } = useAuth();
  const { isOnline } = useSocket();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState('');

  const myRole = channel.role;
  const isOwner = myRole === 'owner';
  const isAdminOrOwner = myRole === 'owner' || myRole === 'admin';

  useEffect(() => {
    getMembers(channel._id)
      .then(({ data }) => setMembers(data.members))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [channel._id]);

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = await searchUsers(q);
      const memberIds = members.map((m) => m.user?._id?.toString());
      setSearchResults(data.users.filter((u) => !memberIds.includes(u._id)));
    } catch (_) {}
    finally { setSearching(false); }
  };

  const handleInvite = async (userId) => {
    try {
      const { data } = await inviteMember(channel._id, userId);
      setMembers((prev) => [...prev, data.membership]);
      setSearchResults((prev) => prev.filter((u) => u._id !== userId));
      setSearchQuery('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to invite member.');
    }
  };

  const handleRoleChange = async (memberId, userId, newRole) => {
    try {
      const { data } = await updateMemberRole(channel._id, userId, newRole);
      setMembers((prev) => prev.map((m) => m._id === memberId ? { ...m, role: data.membership.role } : m));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role.');
    }
  };

  const handleRemove = async (memberId, userId) => {
    try {
      await removeMember(channel._id, userId);
      setMembers((prev) => prev.filter((m) => m._id !== memberId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Members · {members.length}</h2>
          <div className="flex items-center gap-2">
            {isAdminOrOwner && (
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 transition"
              >
                <UserPlus className="w-3.5 h-3.5" /> Invite
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          {/* Invite search */}
          {showInvite && (
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search users to invite…"
                  className="w-full border border-gray-300 bg-white rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />}
              </div>
              {searchResults.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {searchResults.map((u) => (
                    <li key={u._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition">
                      <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                        {u.username[0]}
                      </div>
                      <span className="text-sm text-gray-800 flex-1 truncate">{u.username}</span>
                      <button
                        onClick={() => handleInvite(u._id)}
                        className="text-xs text-brand-600 font-medium hover:underline"
                      >Add</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            members.map((m) => {
              const memberUser = m.user;
              const RoleIcon = ROLE_ICONS[m.role] || User;
              const isSelf = memberUser?._id?.toString() === user._id?.toString();
              const canChangeRole = isOwner && !isSelf && m.role !== 'owner';
              const canRemove = isAdminOrOwner && !isSelf && m.role !== 'owner' && !(m.role === 'admin' && myRole === 'admin');

              return (
                <div key={m._id} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold text-white uppercase">
                      {memberUser?.username?.[0] || '?'}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline(memberUser?._id) ? 'bg-green-400' : 'bg-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {memberUser?.username || 'Unknown'} {isSelf && <span className="text-xs text-gray-400">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-500">{memberUser?.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <RoleIcon className={`w-3.5 h-3.5 ${ROLE_COLORS[m.role]}`} />
                    <span className="text-xs text-gray-500 capitalize">{m.role}</span>
                    {canChangeRole && (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m._id, memberUser._id, e.target.value)}
                        className="ml-1 text-xs border border-gray-200 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => handleRemove(m._id, memberUser._id)}
                        title="Remove member"
                        className="ml-1 p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
