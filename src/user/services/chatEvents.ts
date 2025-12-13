class ChatEvents extends EventTarget {
  emitMessageCommitted(detail: { sessionId: string; message: any }) {
    this.dispatchEvent(new CustomEvent('messageCommitted', { detail }))
  }
  onMessageCommitted(handler: (detail: { sessionId: string; message: any }) => void) {
    const listener = (e: Event) => handler((e as CustomEvent).detail)
    this.addEventListener('messageCommitted', listener)
    return () => this.removeEventListener('messageCommitted', listener)
  }
  emitConfigUpdated(detail: { sessionId: string; config: any }) {
    this.dispatchEvent(new CustomEvent('configUpdated', { detail }))
  }
  onConfigUpdated(handler: (detail: { sessionId: string; config: any }) => void) {
    const listener = (e: Event) => handler((e as CustomEvent).detail)
    this.addEventListener('configUpdated', listener)
    return () => this.removeEventListener('configUpdated', listener)
  }
  emitSessionDeleted(detail: { sessionId: string }) {
    this.dispatchEvent(new CustomEvent('sessionDeleted', { detail }))
  }
  onSessionDeleted(handler: (detail: { sessionId: string }) => void) {
    const listener = (e: Event) => handler((e as CustomEvent).detail)
    this.addEventListener('sessionDeleted', listener)
    return () => this.removeEventListener('sessionDeleted', listener)
  }
  emitIncoming(detail: { sessionId: string; name: string; avatar?: string; timeLabel: string; count: number; text: string }) {
    this.dispatchEvent(new CustomEvent('incomingToast', { detail }))
  }
  onIncoming(handler: (detail: { sessionId: string; name: string; avatar?: string; timeLabel: string; count: number; text: string }) => void) {
    const listener = (e: Event) => handler((e as CustomEvent).detail)
    this.addEventListener('incomingToast', listener)
    return () => this.removeEventListener('incomingToast', listener)
  }
}

export const chatEvents = new ChatEvents()
