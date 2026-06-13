import React, { useEffect, useMemo, useState } from 'react';
import { Image, Loader2, Plus, Send, Video, X } from 'lucide-react';
import { createStory, getStories, markStoryViewed } from '../../api/stories';
import { uploadFileDirect } from '../../api/uploads';
import { useAuth } from '../../context/AuthContext';

export default function StoriesTray() {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeStory, setActiveStory] = useState(null);

  const loadStories = async () => {
    setLoading(true);
    try {
      const { data } = await getStories();
      setStories(data.stories || []);
    } catch {
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    stories.forEach((story) => {
      const id = story.author?._id || story.author;
      if (!map.has(id)) map.set(id, { author: story.author, stories: [] });
      map.get(id).stories.push(story);
    });
    return [...map.values()];
  }, [stories]);

  const openStory = async (story) => {
    setActiveStory(story);
    try {
      await markStoryViewed(story._id);
    } catch {
      // Viewing is best effort.
    }
  };

  return (
    <>
      <div className="border-b border-white/35 px-3 py-3 dark:border-white/10">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Stories</p>
          <button
            onClick={() => setShowCreate(true)}
            className="grid h-7 w-7 place-items-center rounded-xl bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
            title="Add story"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setShowCreate(true)} className="w-16 shrink-0 text-center" title="Add story">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-dashed border-cyan-400 bg-white/35 dark:bg-white/10">
              <Plus className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
            </div>
            <p className="mt-1 truncate text-[11px] font-bold text-slate-600 dark:text-slate-300">You</p>
          </button>

          {loading ? (
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/30 dark:bg-white/10">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            grouped.map((group) => {
              const story = group.stories[0];
              const isOwn = group.author?._id === user?._id;
              return (
                <button key={group.author?._id || story._id} onClick={() => openStory(story)} className="w-16 shrink-0 text-center" title={group.author?.username}>
                  <div className="mx-auto rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-500 to-fuchsia-500 p-0.5">
                    <div className="h-12 w-12 overflow-hidden rounded-[14px] bg-slate-950">
                      {story.media?.mimeType?.startsWith('image/') ? (
                        <img src={story.media.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-white/20 text-white">
                          {story.media?.mimeType?.startsWith('video/') ? <Video className="h-5 w-5" /> : <Image className="h-5 w-5" />}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 truncate text-[11px] font-bold text-slate-600 dark:text-slate-300">{isOwn ? 'You' : group.author?.username}</p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {showCreate && (
        <CreateStoryModal
          onClose={() => setShowCreate(false)}
          onCreated={(story) => {
            setStories((prev) => [story, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
      {activeStory && <StoryViewer story={activeStory} onClose={() => setActiveStory(null)} />}
    </>
  );
}

function CreateStoryModal({ onClose, onCreated }) {
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleMedia = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const { data } = await uploadFileDirect(file);
      setMedia(data.attachment);
    } catch {
      setError('Could not upload story media.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await createStory({ caption, media, background: 'aurora' });
      onCreated(data.story);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not post story.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-md rounded-[28px] border border-white/25 bg-white/90 p-5 text-slate-950 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90 dark:text-white">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">New story</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-900/10 dark:hover:bg-white/10" title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</div>}
        <textarea
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="What's happening?"
          rows={4}
          className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-white/10 dark:bg-white/10 dark:text-white"
        />
        {media && (
          <div className="mt-3 rounded-2xl border border-white/30 bg-white/45 p-3 text-sm dark:border-white/10 dark:bg-white/5">
            <p className="truncate font-bold">{media.originalName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-300">{media.mimeType}</p>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/45 px-3 py-3 text-sm font-black dark:border-white/10 dark:bg-white/10">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
            {uploading ? 'Uploading...' : 'Media'}
            <input type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleMedia} disabled={uploading} />
          </label>
          <button type="submit" disabled={saving || uploading || (!caption.trim() && !media)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
            <Send className="h-4 w-4" />
            {saving ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}

function StoryViewer({ story, onClose }) {
  const media = story.media;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 text-white backdrop-blur">
      <div className="relative flex h-[78vh] w-full max-w-sm flex-col overflow-hidden rounded-[28px] border border-white/15 bg-gradient-to-br from-slate-950 via-cyan-950 to-fuchsia-950 shadow-2xl">
        <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-black/30 p-2" title="Close story">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 p-4">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-teal-400 to-fuchsia-500">
            {story.author?.avatar ? <img src={story.author.avatar} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <div>
            <p className="text-sm font-black">{story.author?.username}</p>
            <p className="text-xs text-white/60">Status update</p>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 place-items-center p-4">
          {media?.mimeType?.startsWith('image/') && <img src={media.url} alt="" className="max-h-full rounded-2xl object-contain" />}
          {media?.mimeType?.startsWith('video/') && <video src={media.url} controls autoPlay className="max-h-full rounded-2xl" />}
          {media?.mimeType?.startsWith('audio/') && <audio src={media.url} controls className="w-full" />}
          {!media?.url && <div className="text-center text-3xl font-black leading-tight">{story.caption}</div>}
        </div>
        {media?.url && story.caption && <p className="p-4 text-center text-sm font-semibold text-white/90">{story.caption}</p>}
      </div>
    </div>
  );
}
