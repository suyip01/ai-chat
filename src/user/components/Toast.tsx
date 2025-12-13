import React, { createContext, useContext, useRef, useState, useEffect } from 'react';

const ToastCtx = createContext<{ showToast: (text: string, type?: 'info' | 'success' | 'error' | 'role') => void; showCenter: (text: string, type?: 'info' | 'success' | 'error') => void; showIncoming: (opts: { sessionId?: string; avatar?: string; name: string; timeLabel: string; count: number; text: string }) => void }>({ showToast: () => { }, showCenter: () => { }, showIncoming: () => { } });

interface ToastItemProps {
  t: any;
  onRemove: (id: number) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ t, onRemove }) => {
  const [offset, setOffset] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    setOffset(diff);
    // Fade out as you swipe further
    setOpacity(Math.max(0.5, 1 - Math.abs(diff) / 200));
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (Math.abs(offset) > 100) {
      // Swiped far enough - dismiss
      setOffset(offset > 0 ? 500 : -500);
      setOpacity(0);
      setTimeout(() => onRemove(t.id), 200);
    } else {
      // Reset
      setOffset(0);
      setOpacity(1);
    }
  };

  const handleClick = () => {
    if (t.type === 'incoming' && t.payload?.sessionId) {
      window.dispatchEvent(new CustomEvent('open-chat-session', { detail: { sessionId: t.payload.sessionId } }));
      onRemove(t.id);
    }
  };

  return (
    <div
      className={`${t.type === 'incoming'
        ? 'text-slate-800 border border-slate-200 shadow-2xl rounded-[40px] px-4 py-3 w-full min-h-[64px]'
        : t.type === 'role'
          ? 'bg-white text-pink-600 border border-pink-200 shadow-md rounded-2xl px-4 py-2 w-fit'
          : t.type === 'error'
            ? 'bg-red-500 text-white rounded-2xl px-4 py-2 w-fit'
            : t.type === 'success'
              ? 'bg-green-500 text-white rounded-2xl px-4 py-2 w-fit'
              : 'bg-slate-800 text-white rounded-2xl px-4 py-2 w-fit'
        }`}
      style={{
        backgroundColor: t.type === 'incoming' ? 'rgba(255,255,255,0.95)' : undefined,
        backdropFilter: t.type === 'incoming' ? 'blur(8px)' : undefined,
        transform: `translateX(${offset}px)`,
        opacity: opacity,
        transition: isDragging.current ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
        touchAction: 'pan-y' // Allow vertical scroll but handle horizontal in JS
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {t.type === 'incoming' ? (
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-pink-200">
              {t.payload?.avatar ? (
                <img src={t.payload.avatar} alt={t.payload?.name || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-pink-50 text-pink-600 flex items-center justify-center font-bold">{String(t.payload?.name || '').slice(0, 1) || '?'}</div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 ml-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-bold text-base text-slate-900 truncate">{t.payload?.name || ''}</div>
              <div className="text-xs text-slate-500 font-medium whitespace-nowrap">{t.payload?.timeLabel || ''}</div>
            </div>
            <div className="font-bold text-xs text-slate-900 truncate">[{t.payload?.count || 0}条] {t.payload?.text || t.text}</div>
          </div>
        </div>
      ) : (
        t.text
      )}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<{ id: number; text: string; type: string; position: 'bottom' | 'center'; duration?: number; payload?: any }[]>([]);
  const timersRef = useRef<Map<number, number>>(new Map());

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const old = timersRef.current.get(id);
    if (old) clearTimeout(old);
    timersRef.current.delete(id);
  }

  const scheduleRemoval = (id: number, duration: number) => {
    const old = timersRef.current.get(id);
    if (old) clearTimeout(old);
    const h = window.setTimeout(() => {
      removeToast(id);
    }, duration);
    timersRef.current.set(id, h);
  };
  const showToast = (text: string, type: 'info' | 'success' | 'error' | 'role' = 'info') => {
    const id = Date.now();
    const duration = 2000;
    setToasts((prev) => [...prev, { id, text, type, position: 'bottom', duration }]);
    scheduleRemoval(id, duration);
  };
  const showCenter = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    const extendDuration = 3000;
    setToasts((prev) => {
      const existing = prev.find((t) => t.position === 'center' && t.text === text);
      if (existing) {
        scheduleRemoval(existing.id, extendDuration);
        return prev;
      }
      const id = Date.now();
      scheduleRemoval(id, 2000);
      return [...prev, { id, text, type, position: 'center', duration: 2000 }];
    });
  };
  const showIncoming = (opts: { sessionId?: string; avatar?: string; name: string; timeLabel: string; count: number; text: string }) => {
    const id = Date.now();
    const duration = 4000;
    setToasts((prev) => {
      const filtered = prev.filter((t) => !(t.position === 'bottom' && t.type === 'incoming'));
      const next = [...filtered, { id, text: opts.text, type: 'incoming', position: 'bottom', duration, payload: opts }];
      try { console.log('[TOAST] showIncoming', { name: opts.name, count: opts.count, text: opts.text }) } catch { }
      return next
    });
    scheduleRemoval(id, duration);
  };
  return (
    <ToastCtx.Provider value={{ showToast, showCenter, showIncoming }}>
      {children}
      <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none">
        <div className="w-full max-w-md px-3 space-y-2 flex flex-col items-center pointer-events-auto">
          {toasts.filter(t => t.position === 'bottom').map((t) => (
            <ToastItem key={t.id} t={t} onRemove={removeToast} />
          ))}
        </div>
      </div>
      <div className="fixed top-[25%] left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
        <div className="space-y-2 flex flex-col items-center">
          {toasts.filter(t => t.position === 'center').map((t) => (
            <div
              key={t.id}
              className={`${t.type === 'error' ? 'bg-white text-red-500 border-red-200' : 'bg-white text-slate-800 border-slate-200'} px-6 py-3 rounded-2xl shadow-2xl border whitespace-nowrap`}
            >
              {t.text}
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes toastFade {
          0% { opacity: 0; transform: translateY(-6px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
      `}</style>
    </ToastCtx.Provider>
  );
};

export const useToast = () => useContext(ToastCtx);
