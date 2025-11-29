import React, { useState } from 'react';

const UserRow = ({ user, onSaveLimit }) => {
  const [currentLimit, setCurrentLimit] = useState(user.chatLimit);
  const isDirty = currentLimit !== user.chatLimit;
  const handleSave = () => { onSaveLimit(user.id, currentLimit); };
  return (
    <tr className="hover:bg-purple-50/30 transition-colors">
      <td className="p-5 pl-8 font-mono text-gray-500">#{user.id.toString().padStart(4, '0')}</td>
      <td className="p-5">
        <div className="font-bold text-gray-700">{user.username}</div>
        <div className="text-xs text-gray-400">{user.email}</div>
      </td>
      <td className="p-5"><span className="font-mono text-purple-600 font-bold">{user.used}</span> 次</td>
      <td className="p-5">
        <div className="flex items-center gap-2">
          <input type="number" value={currentLimit} onChange={(e) => setCurrentLimit(parseInt(e.target.value) || 0)} className="w-20 px-2 py-1 rounded border border-purple-100 text-center font-mono text-sm focus:border-purple-400 outline-none" min="0" />
        </div>
      </td>
      <td className="p-5 text-right pr-8">
        <button onClick={handleSave} disabled={!isDirty} className={`font-bold text-xs px-3 py-1.5 rounded-lg transition-colors ${isDirty ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>保存设置</button>
      </td>
    </tr>
  );
};

export default UserRow;

