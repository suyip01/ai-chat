import React, { useEffect, useState } from 'react';
import { ToastProvider, useToast } from '../Toast.jsx';
import { adminsAPI } from '../api.js';
import { Plus, X } from 'lucide-react';

const Content = () => {
  const { showToast } = useToast();
  const [admins, setAdmins] = useState([]);
  const [view, setView] = useState('list');
  const [newAdmin, setNewAdmin] = useState({ username: '', email: '', password: '' });
  const [pwdTarget, setPwdTarget] = useState(null);
  const [newPwd, setNewPwd] = useState('');

  const reload = async () => {
    try { const rows = await adminsAPI.list(); setAdmins(rows); }
    catch { showToast('加载失败', 'error'); }
  };
  useEffect(() => { reload(); }, []);

  const handleAdd = async () => {
    if (!newAdmin.username || !newAdmin.password) { showToast('请填写必填项', 'error'); return; }
    try {
      const { id } = await adminsAPI.create(newAdmin);
      setAdmins(prev => [...prev, { id, username: newAdmin.username, email: newAdmin.email || '', isActive: 1 }]);
      setView('list');
      setNewAdmin({ username: '', email: '', password: '' });
      showToast('管理员添加成功');
    } catch { showToast('添加失败', 'error'); }
  };

  const handleDisable = async (id, next) => {
    try {
      await adminsAPI.update(id, { isActive: next });
      setAdmins(prev => prev.map(a => a.id === id ? { ...a, isActive: next } : a));
      showToast(next ? '已启用' : '已禁用');
    } catch { showToast('更新失败', 'error'); }
  };

  const handleDelete = async (id) => {
    try { await adminsAPI.remove(id); setAdmins(prev => prev.filter(a => a.id !== id)); showToast('删除成功'); }
    catch { showToast('删除失败', 'error'); }
  };

  const handleChangePwd = async () => {
    if (!newPwd) { showToast('请输入新密码', 'error'); return; }
    try { await adminsAPI.changePassword(pwdTarget.id, newPwd); setPwdTarget(null); setNewPwd(''); showToast('密码已更新'); }
    catch { showToast('更新失败', 'error'); }
  };

  if (view === 'create') {
    return (
      <div className="animate-fade-in pb-10">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('list')} className="px-5 py-2.5 rounded-xl bg-white text-gray-600 font-bold text-sm shadow-sm hover:bg-gray-50">返回</button>
          <div>
            <h2 className="text-2xl font-cute text-pink-900">添加管理员</h2>
            <p className="text-gray-400 text-xs">创建新的后台管理员账号</p>
          </div>
          <div className="ml-auto flex gap-3">
            <button onClick={() => setView('list')} className="px-6 py-2.5 rounded-xl bg-white text-gray-500 font-bold text-sm shadow-sm hover:bg-gray-50">取消</button>
            <button onClick={handleAdd} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold text-sm shadow-lg shadow-pink-200 flex items-center gap-2"><Plus size={16} /> 创建管理员</button>
          </div>
        </div>
        <div className="solid-card p-8 rounded-3xl space-y-6 max-w-2xl mx-auto">
          <h3 className="font-cute text-lg text-pink-900 flex items-center gap-2 mb-2"><span className="w-1.5 h-4 bg-yellow-400 rounded-full"></span> 管理员信息</h3>
          <div>
            <label className="block text-xs font-bold text-pink-800 mb-2">用户名</label>
            <input type="text" value={newAdmin.username} onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })} className="dream-input w-full px-4 py-2.5 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-pink-800 mb-2">邮箱</label>
            <input type="email" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} className="dream-input w-full px-4 py-2.5 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-pink-800 mb-2">初始密码</label>
            <input type="password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} className="dream-input w-full px-4 py-2.5 rounded-xl text-sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-cute text-pink-900 flex items-center gap-2"><span className="w-1.5 h-6 bg-yellow-400 rounded-full inline-block"></span>管理员账号</h2>
          <p className="text-gray-400 text-xs mt-1 ml-4">管理后台管理员列表、禁用与密码修改</p>
        </div>
        <button onClick={() => setView('create')} className="bg-pink-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-pink-200 hover:bg-pink-600 transition-colors flex items-center gap-2 text-xs"><Plus size={14} /> 添加管理员</button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-pink-100">
        <table className="w-full text-left border-collapse">
          <thead className="bg-pink-100 text-pink-900 font-cute text-sm">
            <tr>
              <th className="p-3 pl-6 w-20">头像</th>
              <th className="p-3 w-20">ID</th>
              <th className="p-3">用户名</th>
              <th className="p-3">昵称</th>
              <th className="p-3">邮箱</th>
              <th className="p-3">状态</th>
              <th className="p-3 text-right pr-6">操作</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-pink-100">
            {admins.map(a => (
              <tr key={a.id} className="hover:bg-pink-50/30 transition-colors">
                <td className="p-3 pl-6"><img src={a.avatar || '/uploads/avatars/default_admin.jpg'} alt={a.username} className="w-8 h-8 rounded-full object-cover shadow-sm" /></td>
                <td className="p-3 text-gray-500 font-mono">{a.id.toString().padStart(4, '0')}</td>
                <td className="p-3 font-bold text-pink-700">{a.username}</td>
                <td className="p-3 text-gray-700">{a.nickname || '-'}</td>
                <td className="p-3 text-gray-600">{a.email || '-'}</td>
                <td className="p-3">{a.isActive === 1 ? '启用' : '禁用'}</td>
                <td className="p-3 text-right pr-6">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setPwdTarget(a)} className="px-3 py-1 rounded bg-white border border-gray-200 text-gray-600 text-xs hover:bg-gray-50">改密</button>
                    <button onClick={() => handleDisable(a.id, a.isActive === 1 ? 0 : 1)} className={`px-3 py-1 rounded text-xs font-bold ${a.isActive === 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{a.isActive === 1 ? '禁用' : '启用'}</button>
                    <button onClick={() => handleDelete(a.id)} className="px-3 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-600">删除</button>
                  </div>
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-400 text-sm">暂无管理员</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pwdTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setPwdTarget(null)}></div>
          <div className="fixed top-0 right-0 bottom-0 left-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-pink-100 p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-cute text-lg text-pink-900">修改密码</h3>
                <button onClick={() => setPwdTarget(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-pink-800 mb-1.5">新密码</label>
                  <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="dream-input w-full px-4 py-2.5 rounded-xl text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setPwdTarget(null)} className="px-5 py-2.5 rounded-xl bg-gray-50 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors">取消</button>
                <button onClick={handleChangePwd} className="px-6 py-2.5 rounded-xl bg-pink-500 text-white font-bold text-sm shadow-lg shadow-pink-200 hover:bg-pink-600 transition-all">确认修改</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const AdminAccountsView = () => (
  <ToastProvider>
    <Content />
  </ToastProvider>
);

export default AdminAccountsView;
