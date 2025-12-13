const DB_NAME = 'ai_chat'
const DB_VERSION = 1

type MessageRow = { id?: string; sessionId: string; userId: string; senderId: string; text: string; quote?: string; timestamp: number; type: string; failed?: boolean }
type SessionRow = { sessionId: string; userId: string; characterId: string; createdAt?: number; unreadCount?: number }
type ConfigRow = { sessionId: string; mode?: 'daily' | 'scene'; persona?: any; modelId?: string; temperature?: number; background?: string; misc?: any }

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION)
  req.onupgradeneeded = () => {
    const db = req.result
    if (!db.objectStoreNames.contains('sessions')) {
      const store = db.createObjectStore('sessions', { keyPath: 'sessionId' })
      store.createIndex('byUserId', 'userId')
    }
    if (!db.objectStoreNames.contains('messages')) {
      const store = db.createObjectStore('messages', { keyPath: 'id' })
      store.createIndex('bySessionId', 'sessionId')
      store.createIndex('bySessionTime', ['sessionId', 'timestamp'])
    }
    if (!db.objectStoreNames.contains('configs')) {
      db.createObjectStore('configs', { keyPath: 'sessionId' })
    }
  }
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
})

const withTx = async <T>(stores: string[], mode: IDBTransactionMode, run: (tx: IDBTransaction) => Promise<T>): Promise<T> => {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(stores, mode)
    run(tx).then(resolve).catch(reject)
  })
}

export const putSession = async (row: SessionRow): Promise<void> => {
  await withTx(['sessions'], 'readwrite', async (tx) => {
    tx.objectStore('sessions').put({ ...row, createdAt: row.createdAt || Date.now() })
    return
  })
}

export const listSessions = async (userId: string): Promise<SessionRow[]> => {
  return withTx(['sessions'], 'readonly', async (tx) => {
    const store = tx.objectStore('sessions')
    const idx = store.index('byUserId')
    return new Promise<SessionRow[]>((resolve, reject) => {
      const req = idx.getAll(IDBKeyRange.only(userId))
      req.onsuccess = () => resolve(req.result as any)
      req.onerror = () => reject(req.error)
    })
  })
}

export const deleteSession = async (sessionId: string): Promise<void> => {
  await withTx(['sessions', 'messages', 'configs'], 'readwrite', async (tx) => {
    tx.objectStore('sessions').delete(sessionId)
    // delete messages by sessionId
    await new Promise<void>((resolve, reject) => {
      const store = tx.objectStore('messages')
      const idx = store.index('bySessionId')
      const req = idx.openCursor(IDBKeyRange.only(sessionId))
      req.onsuccess = (e: any) => {
        const cursor = e.target.result
        if (cursor) { store.delete(cursor.primaryKey); cursor.continue() } else resolve()
      }
      req.onerror = () => reject(req.error)
    })
    tx.objectStore('configs').delete(sessionId)
  })
}

export const clearAll = async (): Promise<void> => {
  await withTx(['sessions', 'messages', 'configs'], 'readwrite', async (tx) => {
    tx.objectStore('sessions').clear()
    tx.objectStore('messages').clear()
    tx.objectStore('configs').clear()
    return
  })
}

export const addMessage = async (row: MessageRow): Promise<void> => {
  await withTx(['messages'], 'readwrite', async (tx) => {
    const id = row.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`
    tx.objectStore('messages').put({ ...row, id })
    return
  })
}

export const listMessages = async (sessionId: string, limit = 200): Promise<MessageRow[]> => {
  return withTx(['messages'], 'readonly', async (tx) => {
    const idx = tx.objectStore('messages').index('bySessionTime')
    return new Promise<MessageRow[]>((resolve, reject) => {
      const res: MessageRow[] = []
      const range = IDBKeyRange.bound([sessionId, 0], [sessionId, Number.MAX_SAFE_INTEGER])
      const req = idx.openCursor(range, 'next')
      req.onsuccess = (e: any) => {
        const cursor = e.target.result
        if (cursor) { res.push(cursor.value as any); if (res.length >= limit) resolve(res); else cursor.continue() } else resolve(res)
      }
      req.onerror = () => reject(req.error)
    })
  })
}

export const getLastMessage = async (sessionId: string): Promise<MessageRow | null> => {
  const rows = await listMessages(sessionId, 1000)
  return rows.length ? rows[rows.length - 1] : null
}

export const putConfig = async (sessionId: string, cfg: ConfigRow): Promise<void> => {
  await withTx(['configs'], 'readwrite', async (tx) => { tx.objectStore('configs').put({ ...cfg, sessionId }) })
}
export const getSession = async (sessionId: string): Promise<SessionRow | null> => {
  return withTx(['sessions'], 'readonly', async (tx) => {
    return new Promise<SessionRow | null>((resolve, reject) => {
      const req = tx.objectStore('sessions').get(sessionId)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  })
}

export const incrementUnread = async (sessionId: string, amount = 1): Promise<void> => {
  await withTx(['sessions'], 'readwrite', async (tx) => {
    const store = tx.objectStore('sessions')
    const req = store.get(sessionId)
    req.onsuccess = () => {
      const session = req.result
      if (session) {
        session.unreadCount = (session.unreadCount || 0) + amount
        store.put(session)
      }
    }
  })
}

export const resetUnread = async (sessionId: string): Promise<void> => {
  await withTx(['sessions'], 'readwrite', async (tx) => {
    const store = tx.objectStore('sessions')
    const req = store.get(sessionId)
    req.onsuccess = () => {
      const session = req.result
      if (session) {
        session.unreadCount = 0
        store.put(session)
      }
    }
  })
}

export const getConfig = async (sessionId: string): Promise<ConfigRow | null> => {
  return withTx(['configs'], 'readonly', async (tx) => {
    return new Promise<ConfigRow | null>((resolve, reject) => {
      const req = tx.objectStore('configs').get(sessionId)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  })
}

export type { MessageRow, SessionRow, ConfigRow }
