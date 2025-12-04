
import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Minus, Plus } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCrop, onCancel }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Constants
  const CROP_SIZE = 300; // Visual size of the crop box in pixels

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

    // High resolution output
    const OUTPUT_SIZE = 800; 
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    // Source Image (Natural)
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    
    const minSide = Math.min(nw, nh);
    const fitScale = CROP_SIZE / minSide; // Scale to fit the crop box tightly
    
    // Ratio of Output / VisualCrop
    const R = OUTPUT_SIZE / CROP_SIZE;
    
    // Fill with black (just in case)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    
    // Move context to center
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
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
            src={imageSrc} 
            alt="Crop target" 
            className="absolute max-w-none transition-transform duration-75 ease-linear pointer-events-none"
            style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                height: CROP_SIZE, 
                width: 'auto'
            }}
            draggable={false}
          />

          {/* Overlay Mask - UPDATED: Removed the inner bg-black/60 so image is clear */}
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
             {/* The Cutout - Shadow does the dimming outside */}
             <div 
                className="absolute border-2 border-white box-content shadow-[0_0_0_9999px_rgba(0,0,0,0.8)]"
                style={{ width: CROP_SIZE, height: CROP_SIZE }}
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
                onChange={(e) => setZoom(parseFloat(e.target.value))}
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
