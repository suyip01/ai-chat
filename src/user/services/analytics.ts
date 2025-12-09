// 防御式封装，统一中文事件/标签调用
declare global { interface Window { clarity?: (...args: any[]) => void } }

const safe = () => typeof window !== 'undefined' && typeof window.clarity === 'function'

export const identifyUser = (info: { userId?: string | number; sessionId?: string; pageId?: string; name?: string }) => {
  try {
    if (!safe()) return;
    if (info.userId === undefined || info.userId === null) return;
    window.clarity!('identify', String(info.userId))
  } catch {}
}

export const setTag = (key: string, value: any) => { try { if (!safe()) return; window.clarity!('set', key, value) } catch {} }

export const trackEvent = (name: string, props?: Record<string, any>) => {
  try {
    if (!safe()) return
    window.clarity!('event', name)
    if (props) Object.entries(props).forEach(([k, v]) => { try { window.clarity!('set', k, v) } catch {} })
  } catch {}
}

export default { identifyUser, setTag, trackEvent }
