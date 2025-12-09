import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';

const UserRow = ({ user, selected, onSelectChange, onDelete, onChangePwd }) => {
  return (
    <tr className="hover:bg-pink-50/30 transition-colors">
      <td className="p-5 pl-8">
        <img src={user.avatar || '/uploads/avatars/default_avatar.jpg'} alt={user.username} className="w-10 h-10 rounded-full object-cover shadow-sm" />
      </td>
      <td className="p-5 font-mono text-gray-500">{user.id.toString().padStart(4, '0')}</td>
      <td className="p-5">
        <div className="font-bold text-gray-700">{user.username}</div>
        <div className="text-xs text-gray-400">{user.email}</div>
      </td>
      <td className="p-5">
        <div className="text-xs text-gray-700">{user.nickname || '-'}</div>
      </td>
      <td className="p-5"><span className="font-mono text-pink-600 font-bold">{user.used}</span> 次</td>
      <td className="p-5"><span className="font-mono text-gray-600">{typeof user.expireMinutes === 'number' ? user.expireMinutes : '-'}</span></td>
      <td className="p-5">
        <span className={`px-2 py-1 rounded text-xs font-bold ${(user.isActive === 1 || user.isActive === true) ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{(user.isActive === 1 || user.isActive === true) ? 'Active' : 'Inactive'}</span>
      </td>
      <td className="p-5 text-right pr-8">
        <div className="flex items-center gap-3 justify-end">
          <input type="checkbox" checked={!!selected} onChange={(e) => onSelectChange(user.id, e.target.checked)} />
          <span className="relative inline-flex group">
            <button
              onClick={onChangePwd}
              className="p-1 rounded text-pink-400 hover:text-pink-600"
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
