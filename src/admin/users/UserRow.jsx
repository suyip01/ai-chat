import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

const UserRow = ({ user, selected, onSelectChange, onDelete, onChangePwd, onEditNickname, onEditStatus, onEditExpire }) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target)) {
        // 如果点击的不是按钮本身
        // 且不是点击了 portal 里的菜单（虽然 portal 在 body，但 event.target 可以区分）
        // 为了简单，我们只检查是否点击了按钮。
        // 对于菜单内部的点击，我们在菜单的 onClick 中处理关闭。
        // 但如果点击了菜单外部（body），需要关闭。
        // 实际上，因为菜单在 Portal 中，contains 检查 buttonRef 并不包含菜单。
        // 所以我们需要一种方法判断点击是否在菜单内。
        // 最简单的做法是给菜单一个 ref，或者利用 .closest('.user-row-menu')
        if (!event.target.closest('.user-row-menu')) {
             setOpen(false);
        }
      }
    };
    
    const handleScroll = () => {
        if(open) setOpen(false); // 滚动时关闭，简单处理
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open) {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const menuHeight = 220; // Estimated
        
        let style = {
            position: 'fixed',
            width: '100px',
            zIndex: 9999,
        };

        if (spaceBelow < menuHeight) {
             // Drop up
             style.bottom = `${window.innerHeight - rect.top + 8}px`;
             style.right = `${window.innerWidth - rect.right}px`;
             style.transformOrigin = 'bottom right';
        } else {
             // Drop down
             style.top = `${rect.bottom + 8}px`;
             style.right = `${window.innerWidth - rect.right}px`;
             style.transformOrigin = 'top right';
        }
        setMenuStyle(style);
      }
    }
    setOpen(v => !v);
  };

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
        <div className="flex items-center gap-3 justify-end relative">
          <input type="checkbox" checked={!!selected} onChange={(e) => onSelectChange(user.id, e.target.checked)} />
          <button ref={buttonRef} className="p-1 rounded text-gray-500 hover:text-pink-600" onClick={handleToggle} aria-label="更多"><MoreVertical size={16} /></button>
          {open && createPortal(
            <div className="user-row-menu bg-white rounded-xl shadow-xl ring-1 ring-pink-200 overflow-hidden animate-fade-in-up" style={menuStyle}>
              <button className="w-full text-left px-2 py-2 text-xs text-gray-700 hover:bg-pink-50 first:rounded-t-xl" onClick={() => { setOpen(false); onEditNickname && onEditNickname(user); }}>修改昵称</button>
              <button className="w-full text-left px-2 py-2 text-xs text-gray-700 hover:bg-pink-50" onClick={() => { setOpen(false); onEditStatus && onEditStatus(user); }}>修改用户状态</button>
              <button className="w-full text-left px-2 py-2 text-xs text-gray-700 hover:bg-pink-50" onClick={() => { setOpen(false); onEditExpire && onEditExpire(user); }}>修改过期时间</button>
              <button className="w-full text-left px-2 py-2 text-xs text-gray-700 hover:bg-pink-50" onClick={() => { setOpen(false); onChangePwd && onChangePwd(); }}>修改密码</button>
              <button className="w-full text-left px-2 py-2 text-xs text-red-600 hover:bg-red-50 last:rounded-b-xl" onClick={() => { setOpen(false); onDelete && onDelete(); }}>删除</button>
            </div>,
            document.body
          )}
        </div>
      </td>
    </tr>
  );
};

export default UserRow;
