import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
const AdminDashboard = lazy(() => import('./admin/AdminDashboard.jsx'));
import UserApp from './user/App.tsx'

export default function App() {
  const NoRecordWrapper = ({ children }) => {
    useEffect(() => {
      try { if (typeof window !== 'undefined' && typeof window.clarity === 'function') window.clarity('consent', false) } catch {}
      return () => { try { if (typeof window !== 'undefined' && typeof window.clarity === 'function') window.clarity('consent', true) } catch {} }
    }, [])
    return children
  }
  return (
    <Suspense fallback={<div className="text-center text-xs text-slate-400 p-6">加载中...</div>}>
      <Routes>
        <Route path="/super-admin/*" element={<NoRecordWrapper><AdminDashboard /></NoRecordWrapper>} />
        <Route path="/" element={<UserApp />} />
      </Routes>
    </Suspense>
  );
}
