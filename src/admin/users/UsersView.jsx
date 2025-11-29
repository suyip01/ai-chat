import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { MOCK_USERS_INITIAL } from '../data/mock.js';
import UserRow from './UserRow.jsx';
import UserCreateView from './UserCreateView.jsx';
import { ToastProvider, useToast } from '../Toast.jsx';

const UsersViewContent = () => {
  const [users, setUsers] = useState(MOCK_USERS_INITIAL);
  const [view, setView] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();
  const handleAddUser = (newUser) => { setUsers((prev) => [...prev, newUser]); showToast(`用户 ${newUser.username} 创建成功`); setView('list'); };
  const handleLimitSave = (id, newLimit) => { setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, chatLimit: newLimit } : user))); const u = users.find((x) => x.id === id); showToast(`用户 ${u?.username ?? id} 限额已更新`); };
  const filteredUsers = users.filter((user) => user.username.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase()));
  if (view === 'create') return <UserCreateView onCancel={() => setView('list')} onSave={handleAddUser} notify={showToast} />;
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-cute text-purple-900 flex items-center gap-2"><span className="w-1.5 h-6 bg-yellow-400 rounded-full inline-block"></span> 用户管理</h2>
          <p className="text-gray-400 text-xs mt-1 ml-4">监控用户使用情况与限额</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <input type="text" placeholder="搜索用户名/邮箱..." className="dream-input pl-10 pr-4 py-2 rounded-xl text-sm w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
          </div>
          <button onClick={() => setView('create')} className="bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-600 transition-colors flex items-center gap-2 text-sm"><Plus size={16} /> 添加用户</button>
        </div>
      </div>
      <div className="glass-card rounded-3xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-purple-50/50 text-purple-900 font-cute text-sm">
            <tr>
              <th className="p-5 pl-8">用户 ID</th>
              <th className="p-5">用户名 / 邮箱</th>
              <th className="p-5">已用次数</th>
              <th className="p-5">剩余额度</th>
              <th className="p-5 text-right pr-8">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-purple-50">
            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
              <UserRow key={user.id} user={user} onSaveLimit={handleLimitSave} />
            )) : (
              <tr>
                <td colSpan="5" className="p-10 text-center text-gray-400">未找到匹配的用户。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const UsersView = () => (
  <ToastProvider>
    <UsersViewContent />
  </ToastProvider>
);

export default UsersView;
