
import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Minus, Plus } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
  outputWidth?: number;
  outputHeight?: number;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCrop, onCancel, aspectRatio, outputWidth, outputHeight }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [normalizedSrc, setNormalizedSrc] = useState(imageSrc);
  const [delayPassed, setDelayPassed] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [overlayMount, setOverlayMount] = useState(true);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);

  const ratio = aspectRatio && aspectRatio > 0 ? aspectRatio : 1; // width / height
  const [cropW, setCropW] = useState(Math.round(300 * ratio));
  const [cropH, setCropH] = useState(300);

  useEffect(() => {
    const recalc = () => {
      const cw = containerRef.current ? containerRef.current.clientWidth : window.innerWidth;
      const ch = containerRef.current ? containerRef.current.clientHeight : window.innerHeight;
      let w = Math.min(Math.floor(cw * 0.9), 700);
      let h = Math.round(w / ratio);
      const maxH = Math.max(180, Math.min(ch - 160, 380));
      if (h > maxH) { h = maxH; w = Math.round(h * ratio); }
      setCropW(w);
      setCropH(h);
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [ratio]);

  useEffect(() => {
    const t = setTimeout(() => setDelayPassed(true), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const show = !delayPassed || !imageReady;
    if (show) {
      setOverlayMount(true);
      return;
    }
    const t = setTimeout(() => setOverlayMount(false), 300);
    return () => clearTimeout(t);
  }, [delayPassed, imageReady]);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      if (!ctx) { if (!cancelled) setNormalizedSrc(imageSrc); return; }
      ctx.drawImage(img, 0, 0);
      try {
        const data = c.toDataURL('image/jpeg', 0.92);
        if (!cancelled) setNormalizedSrc(data);
      } catch (_) {
        if (!cancelled) setNormalizedSrc(imageSrc);
      }
    };
    img.onerror = () => { if (!cancelled) setNormalizedSrc(imageSrc); };
    img.src = imageSrc;
    return () => { cancelled = true; };
  }, [imageSrc]);

  // Handle Dragging
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault(); 
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const OUT_W = outputWidth && outputWidth > 0 ? outputWidth : 300;
    const OUT_H = outputHeight && outputHeight > 0 ? outputHeight : Math.round(OUT_W / ratio);
    canvas.width = OUT_W;
    canvas.height = OUT_H;

    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const fitScale = Math.max(cropW / nw, cropH / nh);
    const Rw = OUT_W / cropW;
    const Rh = OUT_H / cropH;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, OUT_W, OUT_H);

    ctx.translate(OUT_W / 2, OUT_H / 2);
    ctx.translate(offset.x * Rw, offset.y * Rh);
    ctx.scale(zoom * Rw, zoom * Rh);
    ctx.scale(fitScale, fitScale);
    ctx.drawImage(img, -nw / 2, -nh / 2);

    onCrop(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
      
      {/* Top Bar */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 text-white">
          <button onClick={onCancel} className="p-2 bg-white/10 rounded-full">
            <X size={24} />
          </button>
          <h3 className="font-bold text-lg tracking-wider">调整图片</h3>
          <button onClick={handleCrop} className="p-2 bg-purple-500 rounded-full text-white shadow-lg shadow-purple-500/30">
            <Check size={24} />
          </button>
      </div>

      {/* Cropping Area */}
      <div 
        ref={containerRef}
        className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center touch-none select-none"
        style={{ isolation: 'isolate' }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
          {/* The Image */}
          <img 
            ref={imgRef}
            src={normalizedSrc} 
            alt="Crop target" 
            className="absolute max-w-none transition-transform duration-75 ease-linear pointer-events-none"
            style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) translateZ(0)`,
                //height: cropH,
                height: 'auto',
                width: cropW,
                willChange: 'transform',
                backfaceVisibility: 'hidden'
                //width: 'auto'
            }}
            onLoad={() => setImageReady(true)}
            draggable={false}
          />

          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute top-0 left-0 right-0 bg-black/80" style={{ height: `calc(50% - ${cropH / 2}px)` }} />
            <div className="absolute bottom-0 left-0 right-0 bg-black/80" style={{ height: `calc(50% - ${cropH / 2}px)` }} />
            <div className="absolute left-0 bg-black/80" style={{ top: `calc(50% - ${cropH / 2}px)`, bottom: `calc(50% - ${cropH / 2}px)`, width: `calc(50% - ${cropW / 2}px)` }} />
            <div className="absolute right-0 bg-black/80" style={{ top: `calc(50% - ${cropH / 2}px)`, bottom: `calc(50% - ${cropH / 2}px)`, width: `calc(50% - ${cropW / 2}px)` }} />
            <div 
              ref={cropRef}
              className="absolute border-2 border-white box-content"
              style={{ width: cropW, height: cropH, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            >
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                <div className="border-r border-white"></div>
                <div className="border-r border-white"></div>
                <div className="border-b border-white col-span-3 row-start-1"></div>
                <div className="border-b border-white col-span-3 row-start-2"></div>
              </div>
            </div>
          </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 w-full bg-slate-900/80 p-6 pb-10 flex flex-col gap-4 z-20">
         <div className="flex items-center gap-4 text-white justify-center">
             <Minus size={20} className="text-slate-400" />
             <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.05" 
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-64 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
             />
             <Plus size={20} className="text-slate-400" />
         </div>
      </div>
      
      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />
      {overlayMount && (
        <div
          className={`fixed inset-0 z-[120] bg-black flex items-center justify-center transition-opacity duration-300 ${(!delayPassed || !imageReady) ? 'opacity-100' : 'opacity-0'}`}
          style={{ pointerEvents: (!delayPassed || !imageReady) ? 'auto' : 'none' }}
        >
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
            <div className="text-sm tracking-wide">正在处理图片...</div>
          </div>
        </div>
      )}
    </div>
  );
};
