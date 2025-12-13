import { clearAll } from './chatDb'
import { sharedChatWs } from './sharedChatWs'

export const clearLocalSessions = async (): Promise<void> => {
  try {
    await clearAll()
  } catch { }
  try {
    const uid = localStorage.getItem('user_id') || '0'
    const prefix = `chat_session_${uid}_`
    const keys = Object.keys(localStorage)
    keys.forEach(k => { if (k.startsWith(prefix)) { try { localStorage.removeItem(k) } catch { } } })
    try { localStorage.removeItem(`ws_active_sessions_${uid}`) } catch { }
    try { localStorage.removeItem('current_chat_sid') } catch { }
  } catch { }
  try { sharedChatWs.close() } catch { }
}

;(window as any).clearLocalSessions = clearLocalSessions

