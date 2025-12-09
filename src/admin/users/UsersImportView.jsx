import React, { useState, useRef, useMemo, useEffect } from 'react';
import { CloudUpload, FileText, X, Download, Loader2, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { usersAPI } from '../api.js';

const UsersImportView = ({ onCancel, notify }) => {
  const [step, setStep] = useState('upload');
  const [dragActive, setDragActive] = useState(false);
  const [fileMeta, setFileMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const inputRef = useRef(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(rows.length / pageSize)), [rows.length, pageSize]);
  const pagedRows = useMemo(() => rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize), [rows, pageIndex, pageSize]);
  useEffect(() => { setPageIndex(0) }, [rows, pageSize]);
  const [stats, setStats] = useState({ ok: 0, bad: 0 });
  const [result, setResult] = useState(null);
  const triggerRefresh = () => { try { window.dispatchEvent(new CustomEvent('admin.users.refresh', { detail: { at: Date.now() } })) } catch {} };

  const downloadTemplate = () => {
    const header = ['用户名','昵称','邮箱','密码','聊天额度(次数)','登录后禁用时间(分钟)'].map(s => `"${s}"`).join(',');
    const sample = ['test_user','测试','example@test.com','Pass@123','0','60'].map(s => `"${s}"`).join(',');
    const bom = '\ufeff';
    const content = `${bom}${header}\r\n${sample}\r\n`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '用户批量导入模板.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const parseCsvText = (text) => {
    const out = [];
    let i = 0, cur = '';
    const pushCell = (row) => { row.push(cur); cur = '' };
    const pushRow = (row) => { out.push(row); cur = '' };
    let row = [];
    let inQuotes = false;
    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') { if (text[i+1] === '"') { cur += '"'; i += 2; } else { inQuotes = false; i++; } }
        else { cur += ch; i++; }
      } else {
        if (ch === '"') { inQuotes = true; i++; continue }
        if (ch === ',') { pushCell(row); i++; continue }
        if (ch === '\r') { i++; continue }
        if (ch === '\n') { pushCell(row); pushRow(row); row = []; i++; continue }
        cur += ch; i++;
      }
    }
    pushCell(row); if (row.length) pushRow(row);
    return out.filter(r => r.length && r.some(c => String(c).trim().length));
  };

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };
  const handleFileInput = (e) => { const f = e.target.files?.[0]; if (f) processFile(f); };

  const processFile = (fileObj) => {
    const sizeMB = (fileObj.size / 1024 / 1024).toFixed(2);
    setFileMeta({ name: fileObj.name, size: `${sizeMB} MB`, status: 'uploading' });
    setStep('analyzing');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const matrix = parseCsvText(text);
        const header = matrix[0]?.map(s => String(s).trim()) || [];
        const need = ['用户名','昵称','邮箱','密码','聊天额度(次数)','登录后禁用时间(分钟)'];
        const idx = Object.fromEntries(need.map(c => [c, header.indexOf(c)]));
        const rowsRaw = matrix.slice(1).map((r, n) => {
          const pick = (k) => { const j = idx[k]; return j >= 0 ? String(r[j] ?? '').trim() : '' };
          const obj = {
            username: pick('用户名'),
            nickname: pick('昵称') || null,
            email: pick('邮箱') || null,
            password: pick('密码'),
            chatLimit: (() => { const v = pick('聊天额度(次数)'); const n2 = parseInt(v || ''); return isNaN(n2) ? 0 : Math.max(0, n2) })(),
            expireAfterMinutes: (() => { const v = pick('登录后禁用时间(分钟)'); const n2 = parseInt(v || ''); return isNaN(n2) ? 60 : Math.max(0, n2) })()
          };
          const errs = [];
          if (!obj.username) errs.push('用户名必填');
          if (!obj.password) errs.push('密码必填');
          if (obj.chatLimit < 0) errs.push('聊天额度需为非负整数');
          if (obj.expireAfterMinutes < 0) errs.push('禁用时间需为非负整数');
          return { idx: n+1, data: obj, errors: errs, status: 'pending' };
        });
        const seen = new Set();
        const dup = new Set();
        rowsRaw.forEach(rr => { const u = rr.data.username; if (!u) return; if (seen.has(u)) dup.add(u); else seen.add(u) });
        const seenEmail = new Set();
        const dupEmail = new Set();
        rowsRaw.forEach(rr => { const em = rr.data.email; if (!em) return; if (seenEmail.has(em)) dupEmail.add(em); else seenEmail.add(em) });
        const rowsValid = rowsRaw.map(rr => {
          const e = [...rr.errors];
          const u = rr.data.username;
          if (u && dup.has(u)) e.push('文件内用户名重复');
          const em = rr.data.email;
          if (em && dupEmail.has(em)) e.push('文件内邮箱重复');
          return { ...rr, errors: e };
        });
        setRows(rowsValid);
        setFileMeta(prev => prev ? { ...prev, status: 'success' } : null);
        setStep('preview');
      } catch {
        setRows([]);
        setFileMeta(prev => prev ? { ...prev, status: 'idle' } : null);
        setStep('upload');
        notify && notify('解析失败', 'error');
      }
    };
    reader.readAsText(fileObj, 'utf-8');
  };

  const removeFile = () => { setFileMeta(null); setRows([]); setStep('upload'); if (inputRef.current) inputRef.current.value = ''; };

  const handleFinalImport = async () => {
    setStep('importing');
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let ok = 0, bad = 0;
    const next = [...rows];
    for (let i = 0; i < next.length; i++) {
      const row = next[i];
      if (row.errors && row.errors.length) { next[i] = { ...row, status: 'fail' }; bad++; continue; }
      try {
        const payload = { username: row.data.username, nickname: row.data.nickname, email: row.data.email, password: row.data.password, chatLimit: row.data.chatLimit, expireAfterMinutes: row.data.expireAfterMinutes };
        await usersAPI.create(payload);
        next[i] = { ...row, status: 'success' };
        ok++;
      } catch (e) {
        next[i] = { ...row, status: 'fail', errors: [...(row.errors||[]), String(e?.message || '导入失败')] };
        bad++;
      }
      setRows([...next]);
      await sleep(3);
    }
    setStats({ ok, bad });
    const res = bad === 0 ? 'success' : ok > 0 ? 'partial' : 'fail';
    setResult(res);
    setStep('completed');
  };

  const exportFailedCsv = () => {
    const failed = rows.filter(r => r.status === 'fail');
    if (!failed.length) return;
    const header = ['用户名','昵称','邮箱','密码','聊天额度(次数)','登录后禁用时间(分钟)','错误信息'].map(s => `"${s}"`).join(',');
    const lines = failed.map(r => {
      const vals = [
        r.data.username || '',
        r.data.nickname || '',
        r.data.email || '',
        r.data.password || '',
        String(r.data.chatLimit ?? ''),
        String(r.data.expireAfterMinutes ?? ''),
        (r.errors && r.errors.length ? r.errors.join('；') : '导入失败')
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      return vals.join(',');
    });
    const bom = '\ufeff';
    const content = `${bom}${header}\r\n${lines.join('\r\n')}\r\n`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `导入失败列表_${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {step !== 'upload' && step !== 'completed' && (
            <button onClick={removeFile} className="p-1 -ml-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"><ArrowLeft size={20} /></button>
          )}
          <h2 className="text-2xl font-cute text-pink-900">{step === 'upload' ? '批量导入用户' : step === 'preview' ? '预览并确认' : step === 'importing' ? '正在导入' : '导入完成'}</h2>
        </div>
        <button onClick={() => { triggerRefresh(); onCancel && onCancel(); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X size={20} /></button>
      </div>

      <div className="flex-1 min-h-0 relative">
        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center h-full">
            <div
              className={`w-full max-w-2xl h-80 rounded-3xl border-3 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group relative z-10 bg-white ${dragActive ? 'border-pink-500 bg-pink-50/30' : 'border-slate-200 hover:border-pink-300 hover:bg-slate-50'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" className="hidden" accept=".csv" onChange={handleFileInput} />
              <div className={`p-6 rounded-full bg-slate-50 mb-6 transition-transform group-hover:scale-110 group-hover:bg-pink-100 shadow-sm ${dragActive ? 'scale-110 bg-pink-100' : ''}`}>
                <CloudUpload size={48} className={`transition-colors ${dragActive || 'group-hover:text-pink-500'} ${dragActive ? 'text-pink-600' : 'text-slate-400'}`} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">点击或拖拽文件上传</h3>
              <p className="text-slate-500 text-sm">仅支持 .CSV，单次最大 50MB。</p>
              <p className="text-rose-600 text-sm mt-1">用户名和邮箱必须唯一，不能重复，并且必须填写。</p>
              <div className="mt-6">
                <button onClick={(e) => { e.stopPropagation(); downloadTemplate(); }} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-pink-600 hover:border-pink-200 transition-colors flex items-center gap-2 shadow-sm"><Download size={14} /> 下载模板</button>
              </div>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <Loader2 size={32} className="text-pink-500 animate-spin" />
                <div className="absolute inset-0 rounded-full border-4 border-pink-100 opacity-50"></div>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">正在解析数据...</h3>
              <p className="text-slate-500 text-sm mb-6">正在校验文件格式并预览数据。</p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 w-2/3 animate-loading-bar"></div></div>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400"><FileText size={12} />{fileMeta?.name}</div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col h-full">
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><FileText size={24} /></div>
                <div>
                  <h4 className="font-bold text-slate-800">{fileMeta?.name}</h4>
                  <div className="flex gap-3 text-xs mt-1"><span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{fileMeta?.size}</span><span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded">共 {rows.length} 条记录</span></div>
                </div>
              </div>
              <button onClick={removeFile} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="重新上传"><X size={18} /></button>
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">数据预览</h3>
                <div className="text-xs text-slate-400">
                  共 {rows.length} 行；每页 {pageSize} 行；第 {pageIndex+1}/{totalPages} 页
                </div>
              </div>
              <div className="flex-1 overflow-auto max-h-[50vh] overflow-x-auto scroll-gray">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-slate-500 w-16">#</th>
                      <th className="px-6 py-3 font-semibold text-slate-500">用户名</th>
                      <th className="px-6 py-3 font-semibold text-slate-500">昵称</th>
                      <th className="px-6 py-3 font-semibold text-slate-500">邮箱</th>
                      <th className="px-6 py-3 font-semibold text-slate-500">聊天额度(次数)</th>
                      <th className="px-6 py-3 font-semibold text-slate-500">登录后禁用时间(分钟)</th>
                      <th className="px-6 py-3 font-semibold text-slate-500">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedRows.map((row, index) => (
                      <tr key={pageIndex * pageSize + index} className={`${row.status === 'fail' ? 'bg-rose-50/30' : ''}`}>
                        <td className="px-6 py-3 text-slate-400 font-mono">{pageIndex * pageSize + index + 1}</td>
                        <td className="px-6 py-3 font-medium text-slate-700">{row.data.username}</td>
                        <td className="px-6 py-3 text-slate-600">{row.data.nickname || ''}</td>
                        <td className="px-6 py-3 text-slate-600">{row.data.email || ''}</td>
                        <td className="px-6 py-3 text-slate-600">{row.data.chatLimit}</td>
                        <td className="px-6 py-3 text-slate-600">{row.data.expireAfterMinutes}</td>
                        <td className="px-6 py-3">
                          {row.errors && row.errors.length ? (
                            <div className="flex items-center gap-1.5 text-rose-600 text-xs font-medium"><AlertCircle size={14} /> {row.errors.join('；')}</div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium"><CheckCircle2 size={14} /> 正常</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between">
                <div className="text-sm text-slate-500">第 {pageIndex+1} 页 / 共 {totalPages} 页</div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-500">每页</label>
                  <select value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value) || 20)} className="dream-input px-3 py-1.5 rounded-lg text-sm">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <button onClick={() => setPageIndex(Math.max(0, pageIndex-1))} disabled={pageIndex===0} className={`w-8 h-8 rounded-full ${pageIndex===0 ? 'bg-slate-200 text-slate-400' : 'bg-white text-slate-600 hover:bg-slate-50'} flex items-center justify-center border border-slate-200`}><ArrowLeft size={16} /></button>
                  <button onClick={() => setPageIndex(Math.min(totalPages-1, pageIndex+1))} disabled={pageIndex>=totalPages-1} className={`w-8 h-8 rounded-full ${pageIndex>=totalPages-1 ? 'bg-slate-200 text-slate-400' : 'bg-white text-slate-600 hover:bg-slate-50'} flex items-center justify-center border border-slate-200`}><ArrowRight size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6 relative"><Loader2 size={32} className="text-pink-500 animate-spin" /><div className="absolute inset-0 rounded-full border-4 border-pink-100 border-t-pink-500 animate-spin"></div></div>
              <h2 className="text-2xl font-bold text-slate-800">正在写入数据...</h2>
              <p className="text-slate-500 mt-2">请勿关闭窗口，这可能需要几秒钟。</p>
            </div>
          </div>
        )}

        {step === 'completed' && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-sm ${result === 'success' ? 'bg-emerald-50' : result === 'partial' ? 'bg-amber-50' : 'bg-rose-50'}`}>
              <CheckCircle2 size={48} className={`${result === 'success' ? 'text-emerald-500' : result === 'partial' ? 'text-amber-500' : 'text-rose-500'}`} />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">{result === 'success' ? '导入成功!' : result === 'partial' ? '部分导入成功' : '导入失败'}</h2>
            <p className="text-slate-500 mb-8 text-center max-w-sm">{result === 'success' ? `已成功导入 ${stats.ok} 条数据。` : result === 'partial' ? `成功 ${stats.ok} 条，失败 ${stats.bad} 条。可返回修复后继续导入。` : `未成功导入数据。失败 ${stats.bad} 条，请返回修复后重试。`}</p>
            <div className="flex gap-4">
              <button onClick={() => { triggerRefresh(); onCancel && onCancel(); }} className="px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-medium transition-all shadow-lg shadow-slate-200">返回列表</button>
              <button onClick={() => { setFileMeta(null); setRows([]); setStats({ ok: 0, bad: 0 }); setResult(null); setStep('upload'); }} className="px-8 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 font-medium transition-colors">继续导入</button>
              {stats.bad > 0 && (
                <button onClick={exportFailedCsv} className="px-8 py-3 bg-white text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 font-medium transition-colors flex items-center gap-2"><Download size={16} /> 导出失败列表</button>
              )}
            </div>
          </div>
        )}
      </div>

      {step === 'preview' && (
        <div className="mt-6 flex items-center justify-end gap-4 pt-4 border-t border-slate-100">
          <div className="mr-auto text-sm text-slate-500"><span className="font-medium text-slate-700">{rows.filter(r => !r.errors || r.errors.length === 0).length}</span> 条数据准备就绪</div>
          <button onClick={onCancel} className="px-6 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors">取消</button>
          <button onClick={handleFinalImport} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text白 font-medium shadow-lg shadow-pink-200 flex items-center gap-2 hover:shadow-pink-300 hover:-translate-y-0.5 transition-all">确认导入<ArrowRight size={18} /></button>
        </div>
      )}
    </div>
  );
};

export default UsersImportView;
