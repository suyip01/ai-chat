import React, { useState } from 'react';
import { ChevronLeft, Plus } from 'lucide-react';

const UserCreateView = ({ onCancel, onSave, notify }) => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', chatLimit: 0 });
  const handleChange = (e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: name === 'chatLimit' ? parseInt(value) || 0 : value })); };
  const handleSave = () => {
    if (!formData.username || !formData.password) { notify && notify('创建失败：请填写用户名和密码', 'error'); return; }
    const newUser = { username: formData.username, email: formData.email || `${formData.username.toLowerCase()}@example.com`, password: formData.password, chatLimit: formData.chatLimit };
    onSave(newUser);
  };
  return (
    <div className="animate-fade-in pb-10">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-500 hover:text-purple-600 transition-colors"><ChevronLeft size={20} /></button>
        <div>
          <h2 className="text-2xl font-cute text-purple-900">添加新用户</h2>
          <p className="text-gray-400 text-xs">分配后台登录权限和聊天额度</p>
        </div>
        <div className="ml-auto flex gap-3">
          <button onClick={onCancel} className="px-6 py-2.5 rounded-xl bg-white text-gray-500 font-bold text-sm shadow-sm hover:bg-gray-50">取消</button>
          <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-200 flex items-center gap-2"><Plus size={16} /> 创建用户</button>
        </div>
      </div>
      <div className="solid-card p-8 rounded-3xl space-y-6 max-w-2xl mx-auto">
        <h3 className="font-cute text-lg text-purple-900 flex items-center gap-2 mb-2"><span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span> 用户基础信息</h3>
        <div>
          <label className="block text-xs font-bold text-purple-800 mb-2">用户名</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} className="dream-input w-full px-4 py-3 rounded-xl text-sm font-bold text-gray-700" placeholder="为新用户设置一个用户名" />
        </div>
        <div>
          <label className="block text-xs font-bold text-purple-800 mb-2">邮箱</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} className="dream-input w-full px-4 py-3 rounded-xl text-sm font-bold text-gray-700" placeholder="用于联系与通知（可选）" />
        </div>
        <div>
          <label className="block text-xs font-bold text-purple-800 mb-2">密码 (初始密码)</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} className="dream-input w-full px-4 py-3 rounded-xl text-sm font-bold text-gray-700" placeholder="设置初始密码" />
        </div>
        <div>
          <label className="block text-xs font-bold text-purple-800 mb-2">聊天额度 (次数)</label>
          <input type="number" name="chatLimit" value={formData.chatLimit} onChange={handleChange} className="dream-input w-full px-4 py-3 rounded-xl text-sm font-bold text-gray-700" placeholder="0 表示默认无额度" min="0" />
          <p className="text-xs text-gray-400 mt-1">设置用户默认可用的聊天次数，0 次表示用户初始无额度。</p>
        </div>
      </div>
    </div>
  );
};

export default UserCreateView;
