import React, { useState, useRef, useEffect, useCallback } from 'react';
import { uploadAPI } from '../api.js';
import { ChevronLeft, X, RotateCw, ZoomIn, ZoomOut, UploadCloud } from 'lucide-react';

const readFile = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.addEventListener('load', () => resolve(reader.result), false);
  reader.readAsDataURL(file);
});

const createImage = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.addEventListener('load', () => resolve(image));
  image.addEventListener('error', (error) => reject(error));
  image.setAttribute('crossOrigin', 'anonymous');
  image.src = url;
});

export default function CoverEditor({ initialImage, onSave, onCancel }) {
  const [step, setStep] = useState(initialImage ? 'edit' : 'upload');
  const [tempImage, setTempImage] = useState(initialImage || null);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const dataUrl = await readFile(file);
      setTempImage(dataUrl);
      setStep('edit');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <Header step={step} onBack={() => setStep('upload')} onClose={onCancel} />
        <div className="flex-1 overflow-y-auto">
          {step === 'upload' && (
            <UploadView onFileChange={handleFileChange} />
          )}
          {step === 'edit' && tempImage && (
            <EditView imageSrc={tempImage} onSave={onSave} onCancel={() => setStep('upload')} />
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ step, onBack, onClose }) {
  const title = step === 'upload' ? '上传封面' : '裁剪封面';
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
      <div className="flex items-center gap-2">
        {step === 'edit' && (
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-pink-600 transition-colors">
            <ChevronLeft size={20} />
          </button>
        )}
        <h2 className="text-lg font-cute text-pink-900">{title}</h2>
      </div>
      <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors">
        <X size={20} />
      </button>
    </div>
  );
}

function UploadView({ onFileChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) onFileChange({ target: { files: e.dataTransfer.files } }); }}
          onClick={() => fileInputRef.current.click()}
          className={`w-full max-w-xl aspect-[2/1] rounded-3xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer border-2 border-dashed ${isDragging ? 'bg-pink-50 border-pink-400 scale-105' : 'bg-gray-50 border-gray-200 hover:border-pink-300 hover:bg-pink-50/30'}`}
        >
          <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 text-pink-500">
            <UploadCloud size={32} />
          </div>
          <p className="text-gray-600 font-bold mb-1">点击或拖拽上传封面</p>
          <p className="text-gray-400 text-xs">输出尺寸 800×400，比例 2:1</p>
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/*" />
    </div>
  );
}

function EditView({ imageSrc, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [imageObj, setImageObj] = useState(null);
  const [saving, setSaving] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);

  const CANVAS_SIZE = 800; // square working area
  const VIEWPORT_W = 800;
  const VIEWPORT_H = 400; // 2:1

  useEffect(() => {
    const init = async () => {
      try {
        const img = await createImage(imageSrc);
        setImageObj(img);
        const scaleX = CANVAS_SIZE / img.width;
        const scaleY = CANVAS_SIZE / img.height;
        const initScale = Math.max(scaleX, scaleY);
        setBaseScale(initScale);
        setZoom(1);
      } catch {}
    };
    init();
  }, [imageSrc]);

  const handleWheel = (e) => { e.preventDefault(); const delta = e.deltaY * -0.001; setZoom(prev => Math.max(0.5, Math.min(prev + delta, 3))); };

  const draw = useCallback(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();
    ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-CANVAS_SIZE / 2, -CANVAS_SIZE / 2);

    const rad = (rotation * Math.PI) / 180;
    const localX = offset.x * Math.cos(-rad) - offset.y * Math.sin(-rad);
    const localY = offset.x * Math.sin(-rad) + offset.y * Math.cos(-rad);

    const currentScale = baseScale * zoom;
    const imgWidth = imageObj.width * currentScale;
    const imgHeight = imageObj.height * currentScale;

    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;

    ctx.drawImage(imageObj, centerX - imgWidth / 2 + localX, centerY - imgHeight / 2 + localY, imgWidth, imgHeight);
    ctx.restore();

    // Overlay with 2:1 hole (full width)
    const topOffset = (CANVAS_SIZE - VIEWPORT_H) / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.rect(0, topOffset, VIEWPORT_W, VIEWPORT_H);
    ctx.fill('evenodd');
  }, [imageObj, rotation, offset, baseScale, zoom]);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX || e.touches?.[0]?.clientX;
    const y = e.clientY || e.touches?.[0]?.clientY;
    setDragStart({ x: x - rect.left, y: y - rect.top });
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x, y });
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleFinalSave = async () => {
    if (!canvasRef.current || saving) return;
    setSaving(true);
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = VIEWPORT_W;
      tempCanvas.height = VIEWPORT_H;
      const tCtx = tempCanvas.getContext('2d');
      const topOffset = (CANVAS_SIZE - VIEWPORT_H) / 2;
      tCtx.drawImage(canvasRef.current, 0, topOffset, VIEWPORT_W, VIEWPORT_H, 0, 0, VIEWPORT_W, VIEWPORT_H);
      const blob = await new Promise((resolve, reject) => {
        tempCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('blob_failed')), 'image/jpeg', 0.92);
      });
      const file = new File([blob], `cover_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const result = await uploadAPI.cover(file);
      onSave(result.url);
    } catch (e) {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 relative flex items-center justify-center bg-gray-900 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          onWheel={handleWheel}
          className="cursor-move max-w-full max-h-full"
          style={{ width: '100%', height: 'auto', maxHeight: '520px' }}
        />
      </div>
      <div className="p-4 bg-white flex items-center justify-between border-t border-gray-100 gap-4">
        <button onClick={handleRotate} className="px-2 py-2 rounded-xl text-pink-600 hover:text-pink-700 text-xs font-bold hover:bg-pink-50">
          <RotateCw size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1 max-w-[240px]">
          <ZoomOut size={16} className="text-gray-400" />
          <input type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500" />
          <ZoomIn size={16} className="text-gray-400" />
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-100">取消</button>
          <button onClick={handleFinalSave} disabled={saving} className={`px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold text-sm shadow-lg shadow-pink-200 ${saving ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}>{saving ? '上传中...' : '完成'}</button>
        </div>
      </div>
    </div>
  );
}

