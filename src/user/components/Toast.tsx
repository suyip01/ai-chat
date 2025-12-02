import React, { createContext, useContext, useState } from 'react';

const ToastCtx = createContext<{ showToast: (text: string, type?: 'info' | 'success' | 'error') => void }>({ showToast: () => {} });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<{ id: number; text: string; type: string }[]>([]);
  const showToast = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  };
  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-0 right-0 z-[100] flex justify-center pointer-events-none">
        <div className="space-y-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`${t.type === 'error' ? 'bg-red-500' : t.type === 'success' ? 'bg-green-500' : 'bg-slate-800'} text-white px-4 py-2 rounded-xl shadow-lg inline-block`}
            >
              {t.text}
            </div>
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  );
};

export const useToast = () => useContext(ToastCtx);

