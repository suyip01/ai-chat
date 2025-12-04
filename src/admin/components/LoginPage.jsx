import React, { useState } from 'react';
import { BASE_URL } from '../api.js';
import { Sparkles, LogOut } from 'lucide-react';
import { useToast } from '../Toast.jsx';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { showToast } = useToast();
  const handleLogin = async () => {
    try {
      const r = await fetch(`${BASE_URL}/crypto/public-key`);
      const pem = await r.text();
      const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').replace(/\s+/g, '');
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const key = await window.crypto.subtle.importKey('spki', bin.buffer, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
      const enc = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode(password));
      const encB64 = btoa(String.fromCharCode(...new Uint8Array(enc)));
      const res = await fetch(`${BASE_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password_encrypted: encB64 }) });
      if (!res.ok) { showToast('登录失败', 'error'); return; }
      const data = await res.json();
      if (data?.access_token) localStorage.setItem('admin_access_token', data.access_token);
      if (data?.refresh_token) localStorage.setItem('admin_refresh_token', data.refresh_token);
      localStorage.setItem('admin_username', username);
      onLogin();
    } catch {
      showToast('登录失败', 'error');
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="ambient-bg"></div>
      <div className="glass-card p-10 rounded-3xl w-full max-w-md shadow-2xl transform transition-all hover:scale-[1.01]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 text-pink-600 mb-4 shadow-inner">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-cute text-pink-900 mb-2">Linkusrge</h1>
          <p className="text-pink-400 text-sm">运营管理平台</p>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-pink-800 mb-2 ml-1">管理员账号</label>
            <input type="text" placeholder="请输入管理员账号" value={username} onChange={e => setUsername(e.target.value)} className="dream-input w-full px-4 py-3 rounded-2xl" />
          </div>
          <div>
            <label className="block text-sm font-bold text-pink-800 mb-2 ml-1">密码</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="dream-input w-full px-4 py-3 rounded-2xl" />
          </div>
          <button onClick={handleLogin} className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-pink-200 transition-all transform active:scale-95 flex items-center justify-center gap-2">
            <LogOut size={18} className="rotate-180" /> 登录后台
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
