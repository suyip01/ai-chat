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
    <div className="p-4 md:p-8">
      <div className="max-w-md mx-auto">
        <div className="relative w-full aspect-[4/3] md:aspect-[21/9] rounded-b-3xl overflow-hidden shadow-xl">
          {data.avatar ? (
            <img src={data.avatar} alt={data.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 text-4xl font-bold">{data.name ? data.name[0] : '?'}</div>
          )}
          <button onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-white/80 px-3 py-1 rounded-xl text-sm font-bold">返回</button>
          <div className="absolute bottom-6 left-6 right-6 text白">
            <h1 className="text-2xl md:text-3xl font-bold drop-shadow">{data.name}</h1>
            <div className="mt-2 flex gap-2 overflow-hidden whitespace-nowrap">
              {(data.tags || []).map(t => (<span key={t} className="text-[10px] bg白/20 backdrop-blur px-2 py-1 rounded">#{t}</span>))}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-white/70 backdrop-blur-xl md:rounded-3xl md:shadow-[0_8px_30px_rgba(139,92,246,0.08)] md:border border-white/90 mt-4">
          {data.openingLine && (
            <div className="mb-6 text-slate-700 text-sm">“{data.openingLine}”</div>
          )}
          <div className="space-y-4">
            <div>
              <h3 className="text-slate-800 font-bold mb-2">简介</h3>
              <p className="text-slate-600 text-sm leading-relaxed" style={{ whiteSpace: 'pre-line' }}>{data.intro || '暂无简介'}</p>
            </div>
            {data.identity && (
              <div>
                <h3 className="text-slate-800 font-bold mb-2">身份</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{data.identity}</p>
              </div>
            )}
            {data.tagline && (
              <div>
                <h3 className="text-slate-800 font-bold mb-2">一句话人设</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{data.tagline}</p>
              </div>
            )}
          </div>
          <div className="mt-8 flex gap-3">
            <button className="px-6 py-3 bg紫-500 text白 rounded-2xl font-bold shadow-lg">聊天</button>
            <button className="px-6 py-3 bg-white text-slate-700 rounded-2xl font-bold border">收藏</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterDetail;
