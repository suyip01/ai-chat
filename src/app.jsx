import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminDashboard from './admin/AdminDashboard.jsx';
import UserApp from './user/UserApp.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/super-admin/*" element={<AdminDashboard />} />
      <Route path="/*" element={<UserApp />} />
    </Routes>
  );
}

