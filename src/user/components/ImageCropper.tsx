
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
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const [isPinching, setIsPinching] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);

  const ratio = aspectRatio && aspectRatio > 0 ? aspectRatio : 1;
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

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const applyZoomAtPoint = (cx: number, cy: number, newZoom: number) => {
    const zOld = zoom;
    const zNew = clamp(newZoom, 0.5, 3);
    const px = (cx - offset.x) / zOld;
    const py = (cy - offset.y) / zOld;
    setZoom(zNew);
    setOffset({ x: cx - zNew * px, y: cy - zNew * py });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const ne: any = (e as any).nativeEvent;
    if (ne && ne.cancelable) e.preventDefault();
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    if (activePointersRef.current.size === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    } else if (activePointersRef.current.size === 2) {
      setIsPinching(true);
      const pts = Array.from(activePointersRef.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      pinchStartRef.current = { distance: dist, zoom };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ne: any = (e as any).nativeEvent;
    if (ne && ne.cancelable) e.preventDefault();
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchStartRef.current.distance;
      const targetZoom = pinchStartRef.current.zoom * ratio;
      const rect = (cropRef.current?.getBoundingClientRect?.() || containerRef.current?.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0 }) as DOMRect;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      applyZoomAtPoint(centerX, centerY, targetZoom);
      return;
    }
    if (isDragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);
    try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch { }
    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null;
      setIsPinching(false);
    }
    if (activePointersRef.current.size === 0) setIsDragging(false);
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const OUT_W = outputWidth && outputWidth > 0 ? outputWidth : 400;
    const OUT_H = outputHeight && outputHeight > 0 ? outputHeight : Math.round(OUT_W / ratio);
    canvas.width = OUT_W;
    canvas.height = OUT_H;

    // Source Image (Natural)
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    const fitScale = Math.min(cropW / nw, cropH / nh);

    // Ratio of Output / VisualCrop
    const R = OUT_H / cropH;

    // Fill with black (just in case)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, OUT_W, OUT_H);

    // Move context to center
    ctx.translate(OUT_W / 2, OUT_H / 2);
    // Apply user transformations
    ctx.translate(offset.x * R, offset.y * R);
    ctx.scale(zoom * R, zoom * R);

    ctx.scale(fitScale, fitScale);
    ctx.drawImage(img, -nw / 2, -nh / 2);

    onCrop(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">

      {/* Top Bar */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 text-white">
        <button onClick={onCancel} className="p-2 bg-white/10 rounded-full backdrop-blur-md">
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* The Image */}
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Crop target"
          className={`absolute max-w-none pointer-events-none ${isDragging || isPinching ? 'will-change-transform' : 'transition-transform duration-75 ease-linear'}`}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            height: cropH,
            width: 'auto'
          }}
          draggable={false}
        />

        {/* Overlay Mask - UPDATED: Removed the inner bg-black/60 so image is clear */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          {/* The Cutout - Shadow does the dimming outside */}
          <div
            ref={cropRef}
            className="absolute border-2 border-white box-content shadow-[0_0_0_9999px_rgba(0,0,0,0.8)]"
            style={{ width: cropW, height: cropH }}
          >
            {/* Grid Lines */}
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
      <div className="absolute bottom-0 w-full bg-slate-900/80 backdrop-blur-md p-6 pb-10 flex flex-col gap-4 z-20">
        <div className="flex items-center gap-4 text-white justify-center">
          <Minus size={20} className="text-slate-400" />
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              const rect = (cropRef.current?.getBoundingClientRect?.() || containerRef.current?.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0 }) as DOMRect;
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              applyZoomAtPoint(cx, cy, v);
            }}
            className="w-64 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <Plus size={20} className="text-slate-400" />
        </div>
      </div>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
