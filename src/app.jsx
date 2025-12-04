import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
const AdminDashboard = lazy(() => import('./admin/AdminDashboard.jsx'));
const UserApp = lazy(() => import('./user/App.tsx'));

export default function App() {
  return (
    <Suspense fallback={<div className="text-center text-xs text-slate-400 p-6">加载中...</div>}>
      <Routes>
        <Route path="/super-admin/*" element={<AdminDashboard />} />
        <Route path="/" element={<UserApp />} />
      </Routes>
    </Suspense>
  );
}
