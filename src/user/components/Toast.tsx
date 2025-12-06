import React, { createContext, useContext, useRef, useState } from 'react';

const ToastCtx = createContext<{ showToast: (text: string, type?: 'info' | 'success' | 'error' | 'role') => void; showCenter: (text: string, type?: 'info' | 'success' | 'error') => void }>({ showToast: () => {}, showCenter: () => {} });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<{ id: number; text: string; type: string; position: 'bottom' | 'center'; duration?: number }[]>([]);
  const timersRef = useRef<Map<number, number>>(new Map());
  const scheduleRemoval = (id: number, duration: number) => {
    const old = timersRef.current.get(id);
    if (old) clearTimeout(old);
    const h = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
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
  return (
    <ToastCtx.Provider value={{ showToast, showCenter }}>
      {children}
      <div className="fixed bottom-6 left-0 right-0 z-[100] flex justify-center pointer-events-none">
        <div className="space-y-2">
          {toasts.filter(t => t.position === 'bottom').map((t) => (
            <div
              key={t.id}
              className={`${
                t.type === 'role'
                  ? 'bg-white text-pink-600 border border-pink-200 shadow-md'
                  : t.type === 'error'
                  ? 'bg-red-500 text-white'
                  : t.type === 'success'
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-800 text-white'
              } px-4 py-2 rounded-2xl shadow-lg inline-block`}
            >
              {t.text}
            </div>
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
