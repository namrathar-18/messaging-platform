import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Folder, BarChart2, ShieldAlert, FileText, Link2, Clock, CheckSquare, RefreshCw, MessageSquare } from 'lucide-react';
import api from '../../api/axios';
import { format } from 'date-fns';

export default function WorkspacePanel({ channel, messages, onClose }) {
  const [activeTab, setActiveTab] = useState('knowledge'); // 'knowledge' | 'shared' | 'insights'

  // Tab 1: AI Knowledge Workspace
  const [knowledge, setKnowledge] = useState(null);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);

  const fetchKnowledge = async (force = false) => {
    if (knowledge && !force) return;
    setLoadingKnowledge(true);
    try {
      const { data } = await api.post('/ai/knowledge', { channelId: channel._id });
      setKnowledge(data);
    } catch (err) {
      console.error('Failed to fetch AI knowledge', err);
    } finally {
      setLoadingKnowledge(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'knowledge') {
      fetchKnowledge();
    }
  }, [activeTab, channel._id]);

  // Tab 2: Shared Files & Links
  const { files, links } = useMemo(() => {
    const extractedFiles = [];
    const extractedLinks = [];
    
    messages.forEach((m) => {
      // Collect attachments
      if (m.attachments && m.attachments.length > 0) {
        m.attachments.forEach((att) => {
          extractedFiles.push({
            name: att.originalName,
            url: att.url,
            size: att.size,
            sender: m.sender?.username || 'System',
            time: m.createdAt,
          });
        });
      }

      // Collect links
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const content = m.content || '';
      const matches = content.match(urlRegex);
      if (matches) {
        matches.forEach((url) => {
          extractedLinks.push({
            url,
            sender: m.sender?.username || 'User',
            time: m.createdAt,
          });
        });
      }
    });

    return { files: extractedFiles, links: extractedLinks };
  }, [messages]);

  // Tab 3: Insights & Timeline
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const { data } = await api.post('/ai/insights', { channelId: channel._id });
      setInsights(data);
    } catch (err) {
      console.error('Failed to fetch analytics insights', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'insights') {
      fetchInsights();
    }
  }, [activeTab, channel._id]);

  return (
    <div className="flex h-full flex-col gap-4 text-slate-950 dark:text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
          <Sparkles className="h-4 w-4" />
          <p className="text-xs font-black uppercase tracking-[0.24em]">Workspace</p>
        </div>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/40 dark:hover:bg-white/10" title="Close Workspace">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-white/20 dark:border-white/10">
        <TabButton active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')} label="Knowledge" icon={<CheckSquare className="h-3.5 w-3.5" />} />
        <TabButton active={activeTab === 'shared'} onClick={() => setActiveTab('shared')} label="Files & Links" icon={<Folder className="h-3.5 w-3.5" />} />
        <TabButton active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} label="Insights" icon={<BarChart2 className="h-3.5 w-3.5" />} />
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* TAB 1: AI KNOWLEDGE PANEL */}
        {activeTab === 'knowledge' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider opacity-60">AI Knowledge Panel</h3>
              <button
                onClick={() => fetchKnowledge(true)}
                disabled={loadingKnowledge}
                className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loadingKnowledge ? 'animate-spin' : ''}`} />
                Sync Knowledge
              </button>
            </div>

            {loadingKnowledge ? (
              <div className="py-20 text-center text-xs text-slate-500 dark:text-slate-400">
                <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-cyan-500" />
                Updating project knowledge...
              </div>
            ) : (
              <div className="space-y-3">
                <KnowledgeCard
                  title="Important Decisions"
                  items={knowledge?.decisions || ["No key decisions recognized in recent conversations."]}
                  color="rose"
                />
                <KnowledgeCard
                  title="Frequently Discussed Topics"
                  items={knowledge?.topics || ["General coordination"]}
                  color="cyan"
                />
                <KnowledgeCard
                  title="Shared Documents & Deliverables"
                  items={knowledge?.documents || ["No shared files extracted yet."]}
                  color="fuchsia"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SHARED FILES & LINKS */}
        {activeTab === 'shared' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider opacity-60 mb-2">Shared Files ({files.length})</h3>
              {files.length === 0 ? (
                <p className="text-xs italic text-slate-500 dark:text-slate-400 pl-2">No files shared in this channel yet.</p>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {files.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-xl border border-white/30 bg-white/40 p-2.5 hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 transition"
                    >
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500 text-white">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold">{file.name}</p>
                        <p className="text-[10px] opacity-65 truncate">Shared by {file.sender} • {format(new Date(file.time), 'MMM d')}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-wider opacity-60 mb-2">Shared Links ({links.length})</h3>
              {links.length === 0 ? (
                <p className="text-xs italic text-slate-500 dark:text-slate-400 pl-2">No links shared in this channel yet.</p>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-xl border border-white/30 bg-white/40 p-2.5 hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 transition"
                    >
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-teal-500 text-white">
                        <Link2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-cyan-600 dark:text-cyan-400 underline">{link.url}</p>
                        <p className="text-[10px] opacity-65 truncate">Posted by {link.sender} • {format(new Date(link.time), 'MMM d')}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: INSIGHTS & TIMELINE */}
        {activeTab === 'insights' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider opacity-60">AI Channel Insights</h3>
              <button
                onClick={fetchInsights}
                disabled={loadingInsights}
                className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loadingInsights ? 'animate-spin' : ''}`} />
                Refresh Insights
              </button>
            </div>

            {loadingInsights ? (
              <div className="py-20 text-center text-xs text-slate-500 dark:text-slate-400">
                <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-cyan-500" />
                Calculating analytics...
              </div>
            ) : insights ? (
              <div className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard title="Total Messages" value={insights.messagesCount} />
                  <StatCard title="Most Active" value={insights.activeUser} />
                  <StatCard title="Files Shared" value={insights.filesCount} />
                  <StatCard title="Response Time" value={insights.responseTime} icon={<Clock className="h-3.5 w-3.5 inline mr-1 text-cyan-500" />} />
                </div>

                {/* Activity Timeline */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider opacity-60 mb-2">Activity Timeline</h4>
                  <div className="relative border-l-2 border-cyan-500/20 ml-2 pl-4 space-y-4">
                    {insights.timeline?.length === 0 ? (
                      <p className="text-xs italic text-slate-500 dark:text-slate-400">No events logged yet.</p>
                    ) : (
                      insights.timeline.map((event, idx) => (
                        <div key={idx} className="relative">
                          <span className="absolute -left-[21px] top-1.5 flex h-2 w-2 rounded-full bg-cyan-500"></span>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{event.time}</span>
                          <p className="text-xs font-medium mt-0.5">
                            <span className="font-bold text-slate-800 dark:text-white mr-1">{event.user}</span>
                            {event.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                Failed to load insights.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2 text-xs font-black transition-all ${
        active
          ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
          : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function KnowledgeCard({ title, items, color }) {
  const colors = {
    rose: 'border-rose-200/60 bg-rose-500/5 text-rose-800 dark:border-rose-950/45 dark:text-rose-200',
    cyan: 'border-cyan-200/60 bg-cyan-500/5 text-cyan-800 dark:border-cyan-950/45 dark:text-cyan-200',
    fuchsia: 'border-fuchsia-200/60 bg-fuchsia-500/5 text-fuchsia-800 dark:border-fuchsia-950/45 dark:text-fuchsia-200',
  };

  return (
    <div className={`rounded-2xl border p-3.5 shadow-sm ${colors[color] || colors.cyan}`}>
      <h4 className="text-xs font-black uppercase tracking-wider mb-2">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-1.5 text-xs font-medium">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current"></span>
            <span className="flex-1 opacity-90">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl border border-white/35 bg-white/45 p-3 dark:border-white/10 dark:bg-white/5">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-1 text-sm font-black truncate">
        {icon}
        {value}
      </p>
    </div>
  );
}
