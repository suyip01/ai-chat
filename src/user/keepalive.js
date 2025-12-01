import React, { useEffect } from 'react';

const KeepAlive = ({ children, saveScrollPosition = 'screen', cacheKey = 'root', targetId = 'content-scroll' }) => {
  useEffect(() => {
    if (saveScrollPosition === 'screen') {
      const key = `scroll:${cacheKey}`;
      const el = document.getElementById(targetId);
      const y = Number(sessionStorage.getItem(key) || 0);
      // restore after paint to avoid jank during route transition
      requestAnimationFrame(() => {
        if (el) el.scrollTop = y; else window.scrollTo(0, y);
      });
      return () => {
        const cur = el ? el.scrollTop : window.scrollY;
        sessionStorage.setItem(key, String(cur));
      };
    }
  }, [saveScrollPosition, cacheKey]);
  return children;
};

export default KeepAlive;
