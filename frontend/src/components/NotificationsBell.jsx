import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function NotificationsBell({ buttonClassName = '', iconClassName = 'w-4 h-4' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    try {
      const res = await api.getNotifications();
      if (res.success) setNotifications(res.notifications || []);
    } catch (e) {}
  };

  useEffect(() => { load(); }, [user]);

  const unread = notifications.filter(n => !n.is_read).length;

  const handleClick = async (n) => {
    if (!n.is_read) {
      try { await api.markNotificationRead(n.id); } catch (e) {}
      setNotifications(prev => prev.map(x => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    setOpen(false);
    if (n.url) navigate(n.url);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); load(); }}
        className={buttonClassName}
        title="Notificaciones"
      >
        <Bell className={iconClassName} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm mt-14 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Notificaciones</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No tienes notificaciones.
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition ${
                      n.is_read ? '' : 'bg-indigo-50/60 dark:bg-indigo-950/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-slate-300 dark:bg-slate-600' : 'bg-indigo-500'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(n.created_at).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
