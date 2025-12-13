import React, { useEffect } from 'react'
import { useToast } from './Toast'
import { chatEvents } from '../services/chatEvents'

export const ToastIncomingBridge: React.FC = () => {
  const { showIncoming } = useToast()
  useEffect(() => {
    const unsub = chatEvents.onIncoming(({ sessionId, name, avatar, timeLabel, count, text }) => {
      try { console.log('[TOAST] incoming event', { name, timeLabel, count, text }) } catch { }
      showIncoming({ sessionId, name, avatar, timeLabel, count, text })
    })
    return () => { try { unsub() } catch { } }
  }, [showIncoming])
  return null
}
