import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userCharactersAPI } from '../api.js';

const CharacterDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const run = async () => {
      setLoading(true); setError('');
      try { const d = await userCharactersAPI.get(id); setData(d); }
      catch { setError('加载失败'); }
      finally { setLoading(false); }
    };
    run();
  }, [id]);

  if (loading) return <div className="p-6">加载中...</div>;
  if (error || !data) return <div className="p-6">{error || '未找到角色'}</div>;

  return (
    <div className="h-full overflow-y-auto hide-scrollbar pb-32">
      <div className="p-4 md:p-8 max-w-md mx-auto">
        <div className="relative w-full aspect-[4/3] md:aspect-[21/9] rounded-3xl overflow-hidden shadow-xl">
          {data.avatar ? (
            <img src={data.avatar} alt={data.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 text-4xl font-bold">{data.name ? data.name[0] : '?'}</div>
          )}
          <button onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-sm font-bold shadow-sm hover:bg-white transition-colors">返回</button>
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
            <h1 className="text-2xl md:text-3xl font-bold drop-shadow-md">{data.name}</h1>
            <div className="mt-2 flex gap-2 overflow-hidden whitespace-nowrap flex-wrap">
              {(data.tags || []).map(t => (<span key={t} className="text-[10px] bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">#{t}</span>))}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 mt-4">
          {data.openingLine && (
            <div className="mb-6 text-slate-700 text-sm font-medium italic">“{data.openingLine}”</div>
          )}
          <div className="space-y-6">
            <div>
              <h3 className="text-slate-800 font-bold mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                简介
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed" style={{ whiteSpace: 'pre-line' }}>{data.intro || '暂无简介'}</p>
            </div>
            {data.identity && (
              <div>
                <h3 className="text-slate-800 font-bold mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                  身份
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">{data.identity}</p>
              </div>
            )}
            {data.tagline && (
              <div>
                <h3 className="text-slate-800 font-bold mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                  一句话人设
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">{data.tagline}</p>
              </div>
            )}
          </div>
          <div className="mt-8 flex gap-3">
            <button onClick={() => navigate(`/characters/${id}/chat`, { state: { fromCharacter: { id, name: data.name } } })} className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 transition-all active:scale-95">开始聊天</button>
            <button className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold border border-slate-200 shadow-sm transition-all active:scale-95">收藏</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterDetail;
