import React, { useEffect, useRef, useState } from 'react'

export const LazyImage: React.FC<{ src?: string; alt?: string; className?: string; root?: Element | null; placeholderChar?: string }> = ({ src, alt, className, root, placeholderChar }) => {
  const holderRef = useRef<HTMLDivElement>(null)
  const [loadedSrc, setLoadedSrc] = useState<string>('')
  const [err, setErr] = useState(false)

  useEffect(() => {
    if (!holderRef.current) return
    if (!src) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        setLoadedSrc(src || '')
        try { io.disconnect() } catch {}
      }
    }, { root: root || undefined, rootMargin: '0px 0px 240px 0px', threshold: 0 })
    io.observe(holderRef.current)
    return () => { try { io.disconnect() } catch {} }
  }, [src, root])

  return (
    <div ref={holderRef} className={className}>
      {(!err && loadedSrc) ? (
        <img src={loadedSrc} alt={alt} decoding="async" loading="lazy" className="w-full h-full object-cover" onError={() => setErr(true)} />
      ) : (
        placeholderChar ? <span className="text-2xl font-bold text-slate-500">{placeholderChar}</span> : null
      )}
    </div>
  )
}
