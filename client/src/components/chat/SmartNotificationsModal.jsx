import React, { useEffect, useState } from 'react';
import { X, Bell, AlertCircle, MessageCircle, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import { format } from 'date-fns';

export default function SmartNotificationsModal({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/users/me/notifications');
        setNotifications(data.notifications || []);
      } catch (err) {
        setError('Failed to fetch alerts.');
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[28px] border border-white/45 bg-white/85 p-5 text-slate-950 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90 dark:text-white animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-fuchsia-500 shadow-md">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-600 dark:text-rose-400">AI Priority Filtering</p>
              <h2 className="text-lg font-black">Smart Notifications</h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-900/10 dark:hover:bg-white/10" title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Filtering noise...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center text-slate-500 dark:text-slate-400">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-sm font-bold">All clear!</p>
              <p className="text-xs">No alerts matching your priority rules.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              // Priority styling
              const colors = {
                red: {
                  bg: 'bg-rose-500/10 border-rose-200 dark:border-rose-900/40',
                  iconBg: 'bg-rose-500 text-white',
                  icon: AlertCircle,
                  badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                  label: 'Urgent',
                },
                yellow: {
                  bg: 'bg-amber-500/10 border-amber-200 dark:border-amber-900/40',
                  iconBg: 'bg-amber-500 text-white',
                  icon: MessageCircle,
                  badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                  label: 'Mention',
                },
                green: {
                  bg: 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/40',
                  iconBg: 'bg-emerald-500 text-white',
                  icon: CheckCircle,
                  badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                  label: 'Update',
                },
              };

              const style = colors[notif.color] || colors.green;
              const IconComp = style.icon;

              return (
                <div
                  key={notif.id}
                  className={`flex gap-3 rounded-2xl border p-3 transition hover:shadow-md ${style.bg}`}
                >
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl shadow-sm ${style.iconBg}`}>
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${style.badge}`}>
                        {style.label}
                      </span>
                      <span className="text-[10px] opacity-60">
                        {notif.time ? format(new Date(notif.time), 'HH:mm') : ''}
                      </span>
                    </div>
                    <h4 className="mt-1 text-xs font-black truncate">{notif.title}</h4>
                    <p className="mt-1 text-xs leading-relaxed opacity-75 break-words line-clamp-3">
                      {notif.text}
                    </p>
                    {notif.channelName && (
                      <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        In #{notif.channelName}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200/50 pt-3 dark:border-white/10">
          <p className="flex items-center gap-1 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-rose-500" />
            AI filters 98% noise
          </p>
          <button onClick={onClose} className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            Dismiss all
          </button>
        </div>
      </div>
    </div>
  );
}
