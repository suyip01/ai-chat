import React, { useState } from 'react';
import { CheckCircle, Edit3, Trash2 } from 'lucide-react';

const UserRow = ({ user, onSaveLimit, onDelete, onChangePwd }) => {
  const [currentLimit, setCurrentLimit] = useState(user.chatLimit);
  const isDirty = currentLimit !== user.chatLimit;
  const handleSave = () => { onSaveLimit(user.id, currentLimit); };
  return (
    <tr className="hover:bg-purple-50/30 transition-colors">
      <td className="p-5 pl-8 font-mono text-gray-500">{user.id.toString().padStart(4, '0')}</td>
      <td className="p-5">
        <div className="font-bold text-gray-700">{user.username}</div>
        <div className="text-xs text-gray-400">{user.email}</div>
      </td>
      <td className="p-5"><span className="font-mono text-purple-600 font-bold">{user.used}</span> 次</td>
      <td className="p-5">
        <div className="flex items-center gap-2">
          <input type="number" value={currentLimit} onChange={(e) => setCurrentLimit(parseInt(e.target.value) || 0)} className="dream-input w-24 px-4 py-2 rounded-2xl text-sm text-center" min="0" />
        </div>
      </td>
      <td className="p-5 text-right pr-8">
        <div className="space-x-2">
          <span className="relative inline-flex group">
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className={`p-1 rounded ${isDirty ? 'text-green-600 hover:text-green-700' : 'text-gray-300 cursor-not-allowed'}`}
              aria-label="保存设置"
            >
              <CheckCircle size={16} />
            </button>
            <span className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-xs bg-gray-800 text-white whitespace-nowrap transition-opacity ${isDirty ? 'opacity-0 group-hover:opacity-100' : 'hidden'}`}>保存设置</span>
          </span>
          <span className="relative inline-flex group">
            <button
              onClick={onChangePwd}
              className="p-1 rounded text-purple-400 hover:text-purple-600"
              aria-label="修改密码"
            >
              <Edit3 size={16} />
            </button>
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-xs bg-gray-800 text-white whitespace-nowrap opacity-0 group-hover:opacity-100">修改密码</span>
          </span>
          <span className="relative inline-flex group">
            <button
              onClick={onDelete}
              className="p-1 rounded text-red-400 hover:text-red-600"
              aria-label="删除"
            >
              <Trash2 size={16} />
            </button>
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-xs bg-gray-800 text-white whitespace-nowrap opacity-0 group-hover:opacity-100">删除</span>
          </span>
        </div>
      </td>
    </tr>
  );
};

export default UserRow;
