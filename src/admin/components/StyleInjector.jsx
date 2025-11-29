import React from 'react';

const StyleInjector = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&family=Varela+Round&display=swap');
    body { font-family: 'Varela Round', 'PingFang SC', sans-serif; background-color: #F3E5F5; color: #4A4060; }
    .font-cute { font-family: 'ZCOOL KuaiLe', cursive; }
    .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.9); box-shadow: 0 8px 30px rgba(139, 92, 246, 0.08); }
    .solid-card { background: #FFFFFF; border: 1px solid #F3E8FF; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.05); }
    .glass-nav { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border-right: 1px solid rgba(255, 255, 255, 0.5); }
    .dream-input { background: rgba(255, 255, 255, 0.6); border: 2px solid #F0E6FA; transition: all 0.3s ease; color: #5D5476; }
    .dream-input:focus { background: #FFFFFF; border-color: #C084FC; outline: none; box-shadow: 0 0 0 4px rgba(192, 132, 252, 0.15); }
    .tag-pill { background: linear-gradient(135deg, #E9D5FF 0%, #DDD6FE 100%); color: #5B21B6; font-weight: 700; font-size: 0.75rem; border-radius: 8px; }
    .tag-select-btn { background: #F3E8FF; color: #6B21A8; border: 1px solid transparent; border-radius: 20px; font-weight: bold; font-size: 0.85rem; padding: 8px 10px; transition: all 0.2s; white-space: nowrap; }
    .tag-select-btn.active { background: #8B5CF6; color: white; border-color: #7C3AED; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); }
    .ambient-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; background: radial-gradient(at 0% 0%, hsla(270, 60%, 96%, 1) 0, transparent 50%), radial-gradient(at 50% 100%, hsla(260, 60%, 90%, 1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(290, 60%, 94%, 1) 0, transparent 50%); background-size: 200% 200%; animation: gradientMove 15s ease infinite; }
    @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(0,0,0,0.02); }
    ::-webkit-scrollbar-thumb { background: #E9D5FF; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #C084FC; }
    .glass-card p, .glass-card h4, .glass-card li, .glass-card ul { color: #4A4060; }
    .solid-card p, .solid-card h4, .solid-card li, .solid-card ul { color: #4A4060; }
  `}</style>
);

export default StyleInjector;
