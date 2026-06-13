import React, { useState } from 'react';
import { X, Trash2, Save } from 'lucide-react';
import { updateChannel, deleteChannel } from '../../api/channels';

export default function ChannelSettingsModal({ channel, onClose, onUpdate, onDelete }) {
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Channel name is required.'); return; }
    setSaving(true); setError('');
    try {
      const { data } = await updateChannel(channel._id, { name: name.trim(), description: description.trim() });
      onUpdate({ name: data.channel.name, description: data.channel.description });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update channel.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await deleteChannel(channel._id);
      onDelete();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete channel.');
    } finally { setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Channel Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Channel Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Danger zone */}
          {channel.role === 'owner' && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <p className="text-sm font-medium text-red-800 mb-1">Danger Zone</p>
              <p className="text-xs text-red-600 mb-3">
                {confirmDelete ? 'Are you sure? This cannot be undone.' : 'Permanently delete this channel and all messages.'}
              </p>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
              >
                {deleting ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {confirmDelete ? 'Confirm Delete' : 'Delete Channel'}
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
