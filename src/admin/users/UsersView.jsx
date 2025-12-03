import React, { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import UserRow from './UserRow.jsx';
import UserCreateView from './UserCreateView.jsx';
import { ToastProvider, useToast } from '../Toast.jsx';
import { usersAPI } from '../api.js';

const UsersViewContent = () => {
  const [users, setUsers] = useState([]);
  const [view, setView] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [pwdUser, setPwdUser] = useState(null);
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [deleteUser, setDeleteUser] = useState(null);
  const { showToast } = useToast();
  useEffect(() => { usersAPI.list().then(setUsers).catch(() => {}); }, []);
  const handleAddUser = async (newUser) => {
    try {
      const { id } = await usersAPI.create(newUser);
      setUsers((prev) => [...prev, { ...newUser, id, used: 0 }]);
      showToast(`用户 ${newUser.username} 创建成功`);
      setView('list');
    } catch { showToast('创建失败', 'error'); }
  };
  const handleLimitSave = async (id, newLimit) => {
    try {
      await usersAPI.update(id, { chatLimit: newLimit });
      setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, chatLimit: newLimit } : user)));
      const u = users.find((x) => x.id === id);
      showToast(`用户 ${u?.username ?? id} 限额已更新`);
    } catch { showToast('保存失败', 'error'); }
  };
  const handleDelete = async (id) => {
    try { await usersAPI.remove(id); setUsers((prev) => prev.filter(u => u.id !== id)); showToast('用户已删除'); }
    catch { showToast('删除失败', 'error'); }
  };
  const confirmDeleteModal = deleteUser && (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 w-80">
        <div className="font-bold mb-3">确认删除该用户？</div>
        <p className="text-sm text-gray-500 mb-5">此操作不可恢复。</p>
        <div className="flex gap-2 justify-end">
          <button className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600" onClick={() => setDeleteUser(null)}>取消</button>
          <button className="px-4 py-2 rounded-xl bg-red-500 text-white" onClick={() => { const id = deleteUser.id; setDeleteUser(null); handleDelete(id); }}>删除</button>
        </div>
      </div>
    </div>
  );
  const changePwdModal = pwdUser && (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 w-96">
        <div className="font-bold mb-3">为用户 {pwdUser.username} 修改密码</div>
        <div className="space-y-3">
          <input type="password" placeholder="输入新密码" className="dream-input w-full px-4 py-3 rounded-2xl text-sm font-bold text-gray-700" value={pwd1} onChange={e => setPwd1(e.target.value)} />
          <input type="password" placeholder="再次输入新密码" className="dream-input w-full px-4 py-3 rounded-2xl text-sm font-bold text-gray-700" value={pwd2} onChange={e => setPwd2(e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600" onClick={() => { setPwdUser(null); setPwd1(''); setPwd2(''); }}>取消</button>
          <button className="px-4 py-2 rounded-xl bg-pink-500 text-white" onClick={async () => {
            if (!pwd1 || pwd1 !== pwd2) { showToast('两次输入密码不一致', 'error'); return; }
            try { await usersAPI.changePassword(pwdUser.id, pwd1); showToast('密码已更新'); } catch { showToast('更新失败', 'error'); }
            setPwdUser(null); setPwd1(''); setPwd2('');
          }}>确认修改</button>
        </div>
      </div>
    </div>
  );
  const filteredUsers = users.filter((user) => user.username.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase()));
  if (view === 'create') return <UserCreateView onCancel={() => setView('list')} onSave={handleAddUser} notify={showToast} />;
  return (
    <div className="space-y-6 animate-fade-in">
      {confirmDeleteModal}
      {changePwdModal}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-cute text-pink-900 flex items-center gap-2"><span className="w-1.5 h-6 bg-yellow-400 rounded-full inline-block"></span> 用户管理</h2>
          <p className="text-gray-400 text-xs mt-1 ml-4">监控用户使用情况与限额</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <input type="text" placeholder="搜索用户名/邮箱..." className="dream-input pl-10 pr-4 py-2 rounded-xl text-sm w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-300" />
          </div>
          <button onClick={() => setView('create')} className="bg-pink-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-pink-200 hover:bg-pink-600 transition-colors flex items-center gap-2 text-sm"><Plus size={16} /> 添加用户</button>
        </div>
      </div>
      <div className="glass-card rounded-3xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-pink-50/50 text-pink-900 font-cute text-sm">
            <tr>
              <th className="p-5 pl-8">用户 ID</th>
              <th className="p-5">用户名 / 邮箱</th>
              <th className="p-5">已用次数</th>
              <th className="p-5">剩余额度</th>
              <th className="p-5 text-right pr-8">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-pink-50">
            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
              <UserRow key={user.id} user={user} onSaveLimit={handleLimitSave} onDelete={() => setDeleteUser(user)} onChangePwd={() => setPwdUser(user)} />
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
