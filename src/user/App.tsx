import React, { useState, useEffect, useRef } from 'react';
import { identifyUser, setTag } from './services/analytics'
import { AnimatePresence } from 'framer-motion';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { ChatList } from './pages/ChatList';
import { ChatDetail } from './pages/ChatDetail';
import './services/sessionCleanup'
import { CharacterProfile } from './pages/CharacterProfile';
import { CharacterProfileAwait } from './pages/CharacterProfileAwait';
import { UserCharacterSettings } from './components/UserCharacterSettings';
import { CreateCharacter } from './pages/CreateCharacter';
import { CreateStory } from './pages/CreateStory';
import { Login } from './pages/Login';
import { ToastProvider } from './components/Toast';
import { ToastIncomingBridge } from './components/ToastIncomingBridge';
import { ChatPreview, NavTab, CharacterStatus, MessageType, Message, Character, UserPersona, UserProfile, Story, StoryRole } from './types';
import { MePage } from './pages/MePage';
import { listStories as listStoriesClient, StoryPreview, getStory as getStoryClient } from './services/storiesService';
import { LazyImage } from './components/LazyImage'
import { listUserStories as listMyStories, getUserStory as getMyStory } from './services/userStoriesService';
import { StoryReader } from './pages/StoryReader';
import { listCharacters, getCharacter } from './services/charactersService';
import { listUserCharacters as listMine, getUserCharacter } from './services/userCharactersService';
import { createChatSession, closeSession } from './services/chatService';
import { clearLocalSessions } from './services/sessionCleanup';
import { sharedChatWs } from './services/sharedChatWs'
import { listSessions as dbListSessions, getLastMessage as dbGetLastMessage, putSession as dbPutSession, deleteSession as dbDeleteSession, listMessages as dbListMessages, addMessage as dbAddMessage, incrementUnread as dbIncrementUnread, resetUnread as dbResetUnread } from './services/chatDb'
import { chatEvents } from './services/chatEvents'

// Mock Data
const MOCK_CHATS: ChatPreview[] = [];

const CharacterThumb: React.FC<{ char: Character; root?: Element | null }> = ({ char, root }) => {
  return (
    <LazyImage src={char.avatar} alt={char.name} root={root} placeholderChar={char.name?.[0] || '?'} className="w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 relative group flex items-center justify-center" />
  )
}


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>(NavTab.HOME);
  const [chats, setChats] = useState<ChatPreview[]>(MOCK_CHATS);
  const chatsRef = useRef<ChatPreview[]>(MOCK_CHATS)
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Character | null>(null);
  const [homeTab, setHomeTab] = useState<'stories' | 'characters'>('stories');
  const [storySearchQuery, setStorySearchQuery] = useState('');
  const [charSearchQuery, setCharSearchQuery] = useState('');
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [userPersona, setUserPersona] = useState<UserPersona | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [createInitial, setCreateInitial] = useState<{ initial?: Character; id?: string | number; isEdit?: boolean } | null>(null)
  const [awaitProfile, setAwaitProfile] = useState<{ character: Character; id: string } | null>(null);
  const [stories, setStories] = useState<StoryPreview[]>([])
  const [readingStory, setReadingStory] = useState<Story | null>(null)
  const [myStories, setMyStories] = useState<Story[]>([])
  const [editStoryInitial, setEditStoryInitial] = useState<Story | null>(null)
  const [importableRoles, setImportableRoles] = useState<Array<{ id: string; name: string; avatar: string; desc: string; isPrivate: boolean; isMine: boolean }>>([])
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!localStorage.getItem('user_access_token'));
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const nick = localStorage.getItem('user_nickname') || '我';
    const email = localStorage.getItem('user_email') || 'me@example.com';
    const avatar = localStorage.getItem('user_avatar') || '';
    return { nickname: nick, email, avatar };
  });

  // Track where the profile was opened from to adjust the button text/behavior
  const [isProfileFromChat, setIsProfileFromChat] = useState(false);
  const [isProfileFromMe, setIsProfileFromMe] = useState(false);
  const [myUserCharacters, setMyUserCharacters] = useState<Character[]>([]);
  const [chatFromList, setChatFromList] = useState(false);
  const [viewportStyle, setViewportStyle] = useState<{ height: string | number; top: string | number }>({ height: '100%', top: 0 });
  const [charOffset, setCharOffset] = useState(0);
  const [hasMoreChars, setHasMoreChars] = useState(true);
  const [isLoadingMoreChars, setIsLoadingMoreChars] = useState(false);
  const charSentinelRef = useRef<HTMLDivElement | null>(null);
  const charIoRef = useRef<IntersectionObserver | null>(null);
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const [storyOffset, setStoryOffset] = useState(0);
  const [hasMoreStories, setHasMoreStories] = useState(true);
  const [isLoadingMoreStories, setIsLoadingMoreStories] = useState(false);
  const storySentinelRef = useRef<HTMLDivElement | null>(null);
  const storyIoRef = useRef<IntersectionObserver | null>(null);
  const rebuildOnceRef = useRef<boolean>(false);
  const selectedChatRef = useRef<ChatPreview | null>(null)
  const wsHandlersRef = useRef<Map<string, (text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => void>>(new Map())

  // Snapshot refs for search restoration
  const charSnapshotRef = useRef<{ items: Character[]; offset: number; hasMore: boolean; scrollTop: number; chats: ChatPreview[] } | null>(null)
  const isRestoringCharRef = useRef(false)
  const storySnapshotRef = useRef<{ items: StoryPreview[]; offset: number; hasMore: boolean; scrollTop: number } | null>(null)
  const isRestoringStoryRef = useRef(false)
  const fetchingMissingChars = useRef<Set<string>>(new Set())

  // Scroll & Refresh Logic
  const storiesScrollPosRef = useRef(0)
  const charsScrollPosRef = useRef(0)
  const homeTabClickRef = useRef({ time: 0, tab: '' })
  const extraCharactersRef = useRef<Map<string, Character>>(new Map())
  const [refreshStoryKey, setRefreshStoryKey] = useState(0)
  const [refreshCharKey, setRefreshCharKey] = useState(0)

  // Scroll Restoration
  useEffect(() => {
    if (activeTab === NavTab.HOME) {
      // Restore without animation
      const target = homeTab === 'stories' ? storiesScrollPosRef.current : charsScrollPosRef.current
      if (scrollRootRef.current) scrollRootRef.current.scrollTop = target
    }
  }, [activeTab, homeTab])

  const handleHomeTabClick = (tab: 'stories' | 'characters') => {
    const now = Date.now()
    if (homeTab === tab) {
      if (now - (homeTabClickRef.current.time || 0) < 400) {
        // Double click -> Refresh
        if (scrollRootRef.current) scrollRootRef.current.scrollTop = 0
        if (tab === 'stories') {
          setStories([])
          setRefreshStoryKey(p => p + 1)
          storiesScrollPosRef.current = 0
        } else {
          setCharacters([])
          setRefreshCharKey(p => p + 1)
          charsScrollPosRef.current = 0
        }
      } else {
        // Single click -> Scroll top (Animated)
        scrollRootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }
      homeTabClickRef.current = { time: now, tab }
    } else {
      // Switch tab: save old, set new
      if (homeTab === 'stories') storiesScrollPosRef.current = scrollRootRef.current?.scrollTop || 0
      else charsScrollPosRef.current = scrollRootRef.current?.scrollTop || 0
      setHomeTab(tab)
    }
  }

  const handleBottomNavChange = (tab: NavTab) => {
    if (activeTab === tab) return
    if (activeTab === NavTab.HOME) {
      if (homeTab === 'stories') storiesScrollPosRef.current = scrollRootRef.current?.scrollTop || 0
      else charsScrollPosRef.current = scrollRootRef.current?.scrollTop || 0
    }
    setActiveTab(tab)
  }

  const handleLogout = () => {
    localStorage.removeItem('user_access_token');
    localStorage.removeItem('user_refresh_token');
    localStorage.removeItem('user_nickname');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_avatar');
    setUserPersona(undefined);
    setSelectedChat(null);
    setViewingProfile(null);
    setActiveTab(NavTab.HOME);
    setIsLoggedIn(false);
  };
  useEffect(() => {
    chatsRef.current = chats
  }, [chats])

  useEffect(() => {
    if (!selectedChat) return
    try {
      ; (async () => {
        try {
          const uid = localStorage.getItem('user_id') || '0'
          const sid = localStorage.getItem(`chat_session_${uid}_${selectedChat.character.id}`) || ''
          if (sid) {
            const cfg: any = await (await import('./services/chatDb')).getConfig(sid)
            if (cfg?.mode) setTag('聊天模式', cfg.mode === 'scene' ? '场景' : '日常')
          }
        } catch { }
      })()
      const uid = localStorage.getItem('user_id') || '0'
      const uname = localStorage.getItem('user_username') || uid
      const nickname = localStorage.getItem('user_nickname') || '我'
      identifyUser({ userId: uname, sessionId: localStorage.getItem(`chat_session_${uid}_${selectedChat.character.id}`) || undefined, pageId: 'CHAT', name: nickname })
      setTag('页面', '聊天')
      setTag('角色ID', String(selectedChat.character.id))
    } catch { }
  }, [selectedChat])

  useEffect(() => { selectedChatRef.current = selectedChat }, [selectedChat])
  // 1. User Profile & Mine Data
  useEffect(() => {
    if (!isLoggedIn) return;
    let ignore = false;

    (async () => {
      try {
        const { authFetch } = await import('./services/http')
        const res = await authFetch('/user/profile')
        if (ignore) return
        if (res && res.ok) {
          const data = await res.json()
          if (ignore) return
          const nick = data?.nickname || '我'
          const email = data?.email || 'me@example.com'
          const avatar = data?.avatar || ''
          const usedCount = typeof data?.used_count === 'number' ? data.used_count : 0
          setUserProfile({ nickname: nick, email, avatar, usedCount })
          try {
            localStorage.setItem('user_nickname', nick)
            localStorage.setItem('user_email', email)
            if (avatar) localStorage.setItem('user_avatar', avatar)
            const uidFromApi = (data?.id ?? data?.user_id ?? data?.uid)
            if (uidFromApi !== undefined && uidFromApi !== null) localStorage.setItem('user_id', String(uidFromApi))
            const uname = localStorage.getItem('user_username') || String((data as any)?.username || '')
            identifyUser({ userId: uname || (localStorage.getItem('user_id') || String(uidFromApi || '')), name: nick })
          } catch { }
        }
      } catch { }
    })();

    (async () => {
      try {
        const items = await listMine()
        if (ignore) return
        const filtered = Array.isArray(items) ? items.filter((it: any) => (
          typeof it?.mypage_id !== 'undefined' &&
          typeof it?.mypage_name === 'string' &&
          typeof it?.mypage_visibility === 'string' &&
          typeof it?.mypage_status === 'string'
        )) : []
        const mapped: Character[] = filtered.map((it: any) => ({
          id: String(it.mypage_id),
          name: it.mypage_name || '未知',
          avatar: it.mypage_avatar || '',
          profileImage: '',
          status: CharacterStatus.ONLINE,
          bio: '',
          tags: [],
          creator: userProfile.nickname || '我',
          oneLinePersona: it.mypage_tagline || '',
          personality: '',
          profession: '',
          age: '',
          roleType: '',
          gender: '',
          currentRelationship: '',
          plotTheme: '',
          plotDescription: '',
          openingLine: '',
          styleExamples: [],
          hobbies: '',
          experiences: '',
          isPublic: it.mypage_visibility ? it.mypage_visibility === 'public' : false,
          isPublished: it.mypage_status === 'published'
        } as any))
        setMyUserCharacters(mapped)
      } catch {
        if (!ignore) setMyUserCharacters([])
      }
    })();

    (async () => {
      try {
        const items = await listMyStories({ includeDrafts: true })
        if (ignore) return
        const mapped: Story[] = items.map((it: any) => ({
          id: typeof it.id === 'number' ? it.id : Number(Date.now()),
          title: it.title || '',
          description: it.description || '',
          image: it.image || '/uploads/covers/default_storyimg.jpg',
          tags: Array.isArray(it.tags) ? it.tags : [],
          author: userProfile.nickname || '我',
          likes: '0',
          content: '',
          status: it.status
        }))
        setMyStories(mapped)
      } catch {
        if (!ignore) setMyStories([])
      }
    })()

    return () => { ignore = true }
  }, [isLoggedIn]);

  // 2. Stories List
  useEffect(() => {
    if (!isLoggedIn) return;
    if (isRestoringStoryRef.current && storySearchQuery === '') {
      isRestoringStoryRef.current = false
      return
    }
    let ignore = false
      ; (async () => {
        try {
          const items = await listStoriesClient({ limit: 10, offset: 0, search: storySearchQuery })
          if (ignore) return
          items.sort((a: any, b: any) => Number(b?.created_at || 0) - Number(a?.created_at || 0))
          setStories(items)
          setStoryOffset(items.length)
          setHasMoreStories(items.length === 10)
        } catch {
          if (!ignore) {
            setStories([])
            setStoryOffset(0)
            setHasMoreStories(false)
          }
        }
      })()
    return () => { ignore = true }
  }, [isLoggedIn, storySearchQuery, refreshStoryKey]);

  // 3a. Characters List Fetch (Directory)
  useEffect(() => {
    if (!isLoggedIn) return;
    if (isRestoringCharRef.current && charSearchQuery === '') {
      isRestoringCharRef.current = false
      return
    }

    let ignore = false
    setLoadingCharacters(true);
    listCharacters({ limit: 10, offset: 0, search: charSearchQuery })
      .then(items => {
        if (ignore) return
        const sorted = [...items].sort((a: any, b: any) => Number(b?.created_at || 0) - Number(a?.created_at || 0))
        const mapped: Character[] = sorted.map(it => ({
          id: String(it.id),
          name: it.name || '未知',
          avatar: it.avatar || '',
          profileImage: it.profileImage || '',
          status: CharacterStatus.ONLINE,
          bio: it.bio || '',
          tags: Array.isArray(it.tags) ? it.tags : [],
          creator: it.creator || '',
          oneLinePersona: it.oneLinePersona || '',
          personality: it.personality || '',
          profession: it.profession || '',
          age: it.age || '',
          roleType: it.roleType || '',
          currentRelationship: it.currentRelationship || '',
          plotTheme: it.plotTheme || '',
          plotDescription: it.plotDescription || '',
          openingLine: it.openingLine || ''
        }));
        setCharacters(mapped);
        setCharOffset(items.length);
        setHasMoreChars(items.length === 10);
      })
      .catch(() => { if (!ignore) setCharacters([]) })
      .finally(() => { if (!ignore) setLoadingCharacters(false) });

    return () => { ignore = true }
  }, [isLoggedIn, charSearchQuery, refreshCharKey]);

  // 3b. Build Chat Previews (Dependent on Characters & MyChars)
  useEffect(() => {
    if (!isLoggedIn) return;

    let ignore = false
      ; (async () => {
        try {
          const uid = localStorage.getItem('user_id') || '0'
          const sess = await dbListSessions(uid)
          if (ignore) return

          const previews: ChatPreview[] = []
          const missingCharIds = new Set<string>()

          for (const s of sess) {
            // Try to find in Directory or MyChars or Cache
            let char = characters.find(c => String(c.id) === String(s.characterId)) || myUserCharacters.find(c => String(c.id) === String(s.characterId)) || extraCharactersRef.current.get(String(s.characterId))

            if (!char) {
              // Temporary placeholder for missing character
              char = {
                id: String(s.characterId),
                name: '加载中...',
                avatar: '',
                profileImage: '',
                status: CharacterStatus.ONLINE,
                bio: '',
                tags: [],
                creator: '',
                oneLinePersona: '',
                personality: '',
                profession: '',
                age: '',
                roleType: '',
                currentRelationship: '',
                plotTheme: '',
                plotDescription: '',
                openingLine: ''
              }
              missingCharIds.add(String(s.characterId))
            }

            const last = await dbGetLastMessage(s.sessionId)
            const lastMsg: Message = last ? { id: last.id || `msg_${last.timestamp}`, senderId: last.senderId, text: last.text, timestamp: new Date(last.timestamp), type: MessageType.TEXT } : { id: `msg_${Date.now()}`, senderId: String(char.id), text: char.openingLine || char.oneLinePersona || '', timestamp: new Date(), type: MessageType.TEXT }
            previews.push({ sessionId: s.sessionId, characterId: String(s.characterId), character: char, lastMessage: lastMsg, unreadCount: s.unreadCount || 0 })
          }


          if (ignore) return
          if (previews.length) setChats(previews)

          // Fetch missing characters
          if (missingCharIds.size > 0) {
            (async () => {
              try {
                const idsToFetch = Array.from(missingCharIds).filter(id => !fetchingMissingChars.current.has(id))
                idsToFetch.forEach(id => fetchingMissingChars.current.add(id))

                for (let i = 0; i < idsToFetch.length; i++) {
                  const cid = idsToFetch[i]
                  if (ignore) {
                    // Release locks for all remaining items including current
                    for (let j = i; j < idsToFetch.length; j++) {
                      fetchingMissingChars.current.delete(idsToFetch[j])
                    }
                    break
                  }
                  try {
                    let full = await getCharacter(cid).catch(() => null)
                    if (!full) full = await getUserCharacter(cid).catch(() => null)

                    if (full && !ignore) {
                      const resolved: Character = {
                        id: String(full.id || full.mypage_id),
                        name: full.name || full.mypage_name || '未知',
                        avatar: full.avatar || full.mypage_avatar || '',
                        profileImage: full.profileImage || '',
                        status: CharacterStatus.ONLINE,
                        bio: full.bio || full.mypage_tagline || '',
                        tags: Array.isArray(full.tags) ? full.tags : [],
                        creator: full.creator || '',
                        oneLinePersona: full.oneLinePersona || full.mypage_tagline || '',
                        personality: full.personality || '',
                        profession: full.profession || '',
                        age: full.age || '',
                        roleType: full.roleType || '',
                        currentRelationship: full.currentRelationship || '',
                        plotTheme: full.plotTheme || '',
                        plotDescription: full.plotDescription || '',
                        openingLine: full.openingLine || ''
                      }

                      extraCharactersRef.current.set(String(resolved.id), resolved)

                      setChats(prev => prev.map(c => {
                        if (String(c.characterId) === String(cid)) {
                          return { ...c, character: resolved }
                        }
                        return c
                      }))
                    }
                  } catch { } finally {
                    fetchingMissingChars.current.delete(cid)
                  }
                }
              } catch { }
            })()
          }

          chatEvents.onMessageCommitted(({ sessionId }) => {
            if (ignore) return
            setChats(prev => prev.map(c => {
              if (c.sessionId === sessionId) {
                return { ...c, unreadCount: c.unreadCount + 1 }
              }
              return c
            }))
          })
        } catch { }
      })()

    return () => { ignore = true }
  }, [isLoggedIn, characters, myUserCharacters]);

  // 已移除：基于 localStorage 的历史预览重建逻辑（改用 IndexedDB）

  useEffect(() => {
    if (activeTab !== NavTab.HOME || homeTab !== 'stories') return;
    if (!hasMoreStories || isLoadingMoreStories) return;
    if (storyIoRef.current) { storyIoRef.current.disconnect(); storyIoRef.current = null; }
    const el = storySentinelRef.current;
    if (!el || stories.length < 7) return;
    const io = new IntersectionObserver((entries) => {
      const hit = entries.some(e => e.isIntersecting);
      if (!hit) return;
      if (isLoadingMoreStories) return;
      setIsLoadingMoreStories(true);
      (async () => {
        try {
          const items = await listStoriesClient({ limit: 10, offset: storyOffset, search: storySearchQuery })
          items.sort((a: any, b: any) => Number(b?.created_at || 0) - Number(a?.created_at || 0))
          if (items.length) setStories(prev => [...prev, ...items])
          setStoryOffset(prev => prev + items.length)
          setHasMoreStories(items.length === 10)
        } catch {
        } finally {
          setIsLoadingMoreStories(false)
        }
      })()
    }, { threshold: 0.1, root: scrollRootRef.current || undefined });
    storyIoRef.current = io;
    io.observe(el);
    return () => { try { io.disconnect(); } catch { } };
  }, [stories, hasMoreStories, isLoadingMoreStories, storyOffset, activeTab, homeTab, storySearchQuery])

  useEffect(() => {
    if (activeTab !== NavTab.HOME || homeTab !== 'characters') return;
    if (!hasMoreChars || isLoadingMoreChars) return;
    if (charIoRef.current) { charIoRef.current.disconnect(); charIoRef.current = null; }
    const el = charSentinelRef.current;
    if (!el || characters.length < 7) return;
    const io = new IntersectionObserver((entries) => {
      const hit = entries.some(e => e.isIntersecting);
      if (!hit) return;
      if (isLoadingMoreChars) return;
      setIsLoadingMoreChars(true);
      (async () => {
        try {
          const items = await listCharacters({ limit: 10, offset: charOffset, search: charSearchQuery });
          const sorted = [...items].sort((a: any, b: any) => Number(b?.created_at || 0) - Number(a?.created_at || 0))
          const mapped: Character[] = sorted.map(it => ({
            id: String(it.id),
            name: it.name || '未知',
            avatar: it.avatar || '',
            profileImage: it.profileImage || '',
            status: CharacterStatus.ONLINE,
            bio: it.bio || '',
            tags: Array.isArray(it.tags) ? it.tags : [],
            creator: it.creator || '',
            oneLinePersona: it.oneLinePersona || '',
            personality: it.personality || '',
            profession: it.profession || '',
            age: it.age || '',
            roleType: it.roleType || '',
            currentRelationship: it.currentRelationship || '',
            plotTheme: it.plotTheme || '',
            plotDescription: it.plotDescription || '',
            openingLine: it.openingLine || ''
          }));
          if (mapped.length) setCharacters(prev => [...prev, ...mapped]);
          setCharOffset(prev => prev + mapped.length);
          setHasMoreChars(mapped.length === 10);
        } catch {
        } finally {
          setIsLoadingMoreChars(false);
        }
      })();
    }, { threshold: 0.1, root: scrollRootRef.current || undefined });
    charIoRef.current = io;
    io.observe(el);
    return () => { try { io.disconnect(); } catch { } };
  }, [characters, hasMoreChars, isLoadingMoreChars, charOffset, activeTab, homeTab, charSearchQuery]);

  useEffect(() => {
    if (activeTab !== NavTab.ME) return
    try {
      const uid = localStorage.getItem('user_id') || '0'
      const uname = localStorage.getItem('user_username') || uid
      const nickname = localStorage.getItem('user_nickname') || '我'
      identifyUser({ userId: uname, pageId: 'ME', name: nickname })
      setTag('页面', '我的')
    } catch { }
  }, [activeTab])



  useEffect(() => {
    const isTouch = (navigator as any)?.maxTouchPoints > 0
    if (!isTouch) return
    const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null
    const original = meta?.getAttribute('content') || ''
    const newContent = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
    if (meta) meta.setAttribute('content', newContent)
    /* Double-tap zoom prevention removed to allow double-click events */
    document.body.style.touchAction = 'manipulation'
    return () => {
      if (meta) meta.setAttribute('content', original)
      /* document.removeEventListener('touchend', ...) removed */
      document.body.style.touchAction = ''
    }
  }, [])

  useEffect(() => {
    const handleVisualViewport = () => {
      if (window.visualViewport) {
        setViewportStyle({
          height: `${window.visualViewport.height}px`,
          top: `${window.visualViewport.offsetTop}px`
        });
      }
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewport);
      window.visualViewport.addEventListener('scroll', handleVisualViewport);
      handleVisualViewport();
    }
    const onResize = () => {
      if (!window.visualViewport) {
        setViewportStyle({ height: window.innerHeight, top: 0 });
      }
    };
    window.addEventListener('resize', onResize)
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewport);
        window.visualViewport.removeEventListener('scroll', handleVisualViewport);
      }
      window.removeEventListener('resize', onResize)
    };
  }, [])

  useEffect(() => {
    const setVh = () => {
      const h = (window.visualViewport && window.visualViewport.height) ? window.visualViewport.height : window.innerHeight
      document.documentElement.style.setProperty('--vh', `${h * 0.01}px`)
    }
    setVh()
    const onResize = () => setVh()
    window.addEventListener('resize', onResize)
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize as any)
    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize as any)
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    sharedChatWs.ensureConnected()
    sharedChatWs.addControlListener((payload) => {
      if (payload && payload.type === 'force_logout') {
        try { localStorage.removeItem('user_access_token'); localStorage.removeItem('user_refresh_token') } catch { }
        try { window.location.reload() } catch { }
      }
    })
      ; (async () => {
        const uid = localStorage.getItem('user_id') || '0'
        const key = `ws_active_sessions_${uid}`
        let sids: string[] = []
        try { const raw = localStorage.getItem(key); sids = raw ? (JSON.parse(raw) as string[]) : [] } catch { }
        try {
          const rows = await dbListSessions(uid)
          rows.forEach(r => { if (!sids.includes(r.sessionId)) sids.push(r.sessionId) })
        } catch { }
        const activeSid = (() => { try { return localStorage.getItem('current_chat_sid') || '' } catch { return '' } })()
        const selectedSid = selectedChatRef.current?.sessionId || ''
        const isDetailOpen = !!selectedChatRef.current && chatFromList
        sids.forEach(sid => {
          if ((activeSid && activeSid === sid) || (isDetailOpen && selectedSid && selectedSid === sid)) { try { console.log('[WS-BG] skip subscribe current chat sid', sid) } catch { }; return }
          if (wsHandlersRef.current.has(sid)) return
          const h = (text: string, quote?: string, meta?: { chunkIndex?: number; chunkTotal?: number }) => {
            const curSid = (() => { try { return localStorage.getItem('current_chat_sid') || '' } catch { return '' } })()
            const isDetailOpenNow = !!selectedChatRef.current && chatFromList
            if ((curSid && curSid === sid) || (isDetailOpenNow && selectedChatRef.current?.sessionId === sid)) return
            const cid = findCharacterIdBySessionId(sid)
            if (!cid) return
            const current = selectedChatRef.current
            const isSelected = current && String(current.characterId) === String(cid)
            if (isSelected) return
            const ts = Date.now()
            const mid = `msg_${ts}_${Math.random().toString(36).slice(2)}`
            try { console.log('[WS-BG] append preview + write', { sid, cid, mid, ts, text, quote, meta }) } catch { }
            const isFinal = !meta || typeof meta.chunkIndex !== 'number' || typeof meta.chunkTotal !== 'number' || (meta.chunkIndex >= meta.chunkTotal)
            let matched: any = null
            setChats(prev => prev.map(c => {
              if (String(c.characterId) === String(cid)) {
                const delta = 1
                const nextCount = (c.unreadCount || 0) + delta
                const next = { ...c, lastMessage: { id: mid, senderId: String(cid), text, timestamp: new Date(ts), type: 'TEXT' as any }, unreadCount: nextCount }
                matched = next
                return next
              }
              return c
            }))
            if (isFinal) {
              const timeLabel = new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
              let name = matched?.character?.name
              let avatar = matched?.character?.avatar
              let count = matched?.unreadCount
              if (!matched) {
                const existing = chatsRef.current.find(c => String(c.characterId) === String(cid))
                name = existing?.character?.name || name
                avatar = existing?.character?.avatar || avatar
                const delta = (meta && typeof meta.chunkTotal === 'number') ? meta.chunkTotal : 1
                count = (existing?.unreadCount || 0) + delta
              }
              try { console.log('[WS-BG] emit incoming toast', { sid, name, count, inChat: !!selectedChatRef.current }) } catch { }
              if (name && selectedChatRef.current) chatEvents.emitIncoming({ sessionId: sid, avatar, name, timeLabel, count: count || 1, text })

              // Persist unread count
              try {
                const delta = (meta && typeof meta.chunkTotal === 'number') ? meta.chunkTotal : 1
                dbIncrementUnread(sid, delta)
              } catch { }
            }
            try { /* DB write centralized in sharedChatWs; no write here */ } catch { }
          }
          sharedChatWs.subscribe(sid, h)
          try { console.log('[WS-BG] subscribe sid', sid) } catch { }
          wsHandlersRef.current.set(sid, h)
        })
      })()
    return () => {
      wsHandlersRef.current.forEach((h, sid) => { try { console.log('[WS-BG] unsubscribe sid', sid); sharedChatWs.unsubscribe(sid, h) } catch { } })
      wsHandlersRef.current.clear()
    }
  }, [isLoggedIn, selectedChat, chatFromList])

  useEffect(() => {
    if (!selectedChat) {
      try { localStorage.removeItem('current_chat_sid') } catch { }
    }
  }, [selectedChat])

  if (!isLoggedIn) {
    return (
      <ToastProvider>
        <div className="fixed inset-0 w-full bg-primary-50 overflow-hidden" style={{ height: 'calc(var(--vh) * 100)', overscrollBehavior: 'none' }}>
          <div className="h-full w-full max-w-md mx-auto bg白 relative shadow-2xl rounded-none md:rounded-3xl md:overflow-hidden flex">
            <Login onLogin={() => setIsLoggedIn(true)} />
          </div>
        </div>
      </ToastProvider>
    );
  }

  const getInitialMessages = (chat: ChatPreview): Message[] => {
    const rows: any[] = (window as any).__last_msgs_cache || []
    return rows.map(r => ({ id: r.id, senderId: r.senderId, text: r.text, timestamp: new Date(r.timestamp), type: MessageType.TEXT }))
  };

  const handleUpdateLastMessage = (msg: Message) => {
    if (!selectedChat) return;

    setChats(prev => prev.map(c => {
      if (c.characterId === selectedChat.characterId) {
        return {
          ...c,
          lastMessage: msg,
          unreadCount: 0 // Reset unread count when chatting
        };
      }
      return c;
    }));
  };

  const findCharacterIdBySessionId = (sid: string): string | null => {
    try {
      const uid = localStorage.getItem('user_id') || '0'
      const prefix = `chat_session_${uid}_`
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix))
      for (const k of keys) {
        const v = localStorage.getItem(k)
        if (v === sid) return k.replace(prefix, '')
      }
    } catch { }
    return null
  }

  // 删除：不再写入 localStorage 历史


  const handleTogglePin = (characterId: string) => {
    setChats(prev => prev.map(c => {
      if (c.characterId === characterId) {
        return {
          ...c,
          character: {
            ...c.character,
            isPinned: !c.character.isPinned
          }
        };
      }
      return c;
    }));
  };

  const startChatFromProfile = async (character: Character) => {
    const existingChat = chats.find(c => c.characterId === character.id);
    if (existingChat) {
      setViewingProfile(null);
      setChatFromList(false);
      setSelectedChat(existingChat);
      setActiveTab(NavTab.CHAT);
      return;
    }
    try {
      const uid = localStorage.getItem('user_id') || '0'
      const key = `chat_session_${uid}_${character.id}`
      let sid = localStorage.getItem(key) || ''
      if (!sid) {
        const created = await createChatSession(character.id);
        sid = created.sessionId;
        localStorage.setItem(key, sid);
      }
      try { const uid = localStorage.getItem('user_id') || '0'; await dbPutSession({ sessionId: sid, userId: uid, characterId: String(character.id) }) } catch { }
      const opener = character.openingLine || character.oneLinePersona || ''
      const mid = `msg_${Date.now()}`
      const last: Message = { id: mid, senderId: character.id, text: opener, timestamp: new Date(), type: MessageType.TEXT };
      try { const uidPersist = localStorage.getItem('user_id') || '0'; await dbAddMessage({ id: mid, sessionId: sid, userId: uidPersist, senderId: String(character.id), text: opener, timestamp: last.timestamp.getTime(), type: 'TEXT' }) } catch { }
      // 移除 localStorage 历史写入
      const newChat: ChatPreview = { sessionId: sid, characterId: character.id, character, lastMessage: last, unreadCount: 0 };
      setChats(prev => [newChat, ...prev]);
      setViewingProfile(null);
      setChatFromList(false);
      setSelectedChat(newChat);
      setActiveTab(NavTab.CHAT);
    } catch {
      const opener = character.openingLine || character.oneLinePersona || ''
      const mid = `msg_${Date.now()}`
      const record = { id: mid, senderId: character.id, text: opener, ts: Date.now(), type: MessageType.TEXT }
      // 移除 localStorage 历史写入（错误回退）
      const fallback: ChatPreview = { sessionId: '', characterId: character.id, character, lastMessage: { id: mid, senderId: character.id, text: opener, timestamp: new Date(), type: MessageType.TEXT }, unreadCount: 0 };
      setChats(prev => [fallback, ...prev]);
      setViewingProfile(null);
      setChatFromList(false);
      setSelectedChat(fallback);
      setActiveTab(NavTab.CHAT);
    }
  };

  const handleCreateCharacter = (newCharacter: Character) => {
    setIsCreating(false);
    setAwaitProfile({ character: newCharacter, id: String(newCharacter.id) })
  };

  const handleDeleteAllSessions = async () => {
    setChats([]);
    setSelectedChat(null);
    try {
      await clearLocalSessions();
      try { /* window.location.reload() */ } catch { }
    } catch { }
  };

  const renderHomeHeader = () => (
    <div className="flex items-center gap-5">
      <button
        onClick={() => handleHomeTabClick('stories')}
        className={`relative transition-all duration-300 ${homeTab === 'stories'
          ? 'text-slate-800 font-extrabold text-2xl scale-105'
          : 'text-slate-400 font-semibold text-lg hover:text-slate-600'
          }`}
      >
        故事
        {homeTab === 'stories' && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-primary-500 rounded-full"></span>
        )}
      </button>
      <div className="h-5 w-[1px] bg-slate-300/50 rounded-full"></div>
      <button
        onClick={() => handleHomeTabClick('characters')}
        className={`relative transition-all duration-300 ${homeTab === 'characters'
          ? 'text-slate-800 font-extrabold text-2xl scale-105'
          : 'text-slate-400 font-semibold text-lg hover:text-slate-600'
          }`}
      >
        角色
        {homeTab === 'characters' && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-primary-500 rounded-full"></span>
        )}
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case NavTab.HOME:
        return (
          <div className="px-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {homeTab === 'stories' ? (
              <div className="space-y-6 mt-2">
                {stories.map((story, idx) => (
                  <div
                    key={story.id}
                    ref={idx === stories.length - 3 ? (el) => { storySentinelRef.current = el } : undefined}
                    className="group relative bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-primary-100 hover:-translate-y-0.5 duration-200"
                    onClick={async () => {
                      try {
                        const anyItem: any = story as any
                        if (typeof anyItem?.content === 'string' && anyItem.content.length) {
                          const mapped: Story = {
                            id: typeof story.id === 'number' ? story.id : Number(Date.now()),
                            title: story.title,
                            description: story.description || '',
                            image: story.image || '/uploads/covers/default_storyimg.jpg',
                            tags: Array.isArray(story.tags) ? (story.tags as string[]) : [],
                            author: story.author || userProfile.nickname || '我',
                            likes: '0',
                            content: anyItem.content,
                            publishDate: anyItem.publishDate || undefined,
                            status: anyItem.status,
                            availableRoles: Array.isArray(anyItem.availableRoles) ? anyItem.availableRoles : []
                          }
                          setReadingStory(mapped)
                        } else {
                          const full = await getStoryClient(story.id)
                          const mapped: Story = {
                            id: Number(full.id),
                            title: full.title,
                            description: full.description || '',
                            image: full.image || '/uploads/covers/default_storyimg.jpg',
                            tags: Array.isArray(full.tags) ? full.tags : [],
                            author: full.author || '',
                            user_avatar: (full as any)?.user_avatar || '',
                            likes: '',
                            content: full.content || '',
                            publishDate: full.publish_date || undefined,
                            availableRoles: Array.isArray((full as any)?.roles) ? (full as any).roles.map((r: any) => ({ id: r.id, name: r.name, avatar: '', description: '' })) : []
                          }
                          setReadingStory(mapped)
                        }
                      } catch { }
                    }}
                  >
                    <div className="h-40 overflow-hidden relative">
                      <LazyImage src={story.image || '/uploads/covers/default_storyimg.jpg'} alt={story.title} root={scrollRootRef.current} className="w-full h-full" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-4 left-4">
                        <h3 className="text-xl font-bold text-white">{story.title}</h3>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">
                        {story.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2 flex-wrap">
                          {(story.tags || []).map(tag => (
                            <span key={tag} className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!stories.length && (
                  <div className="text-center text-xs text-slate-400">暂无故事</div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-2">
                {loadingCharacters && (
                  <div className="text-center text-xs text-slate-400">加载中...</div>
                )}
                {!loadingCharacters && characters.map((char, idx) => (
                  <div
                    key={char.id}
                    ref={idx === characters.length - 3 ? (el) => { charSentinelRef.current = el } : undefined}
                    className="bg白 rounded-2xl p-4 shadow-sm flex gap-4 hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-primary-100"
                    onClick={() => {
                      setIsProfileFromChat(false);
                      setIsProfileFromMe(false);
                      setViewingProfile(char);
                    }}
                  >
                    <CharacterThumb char={char} root={scrollRootRef.current} />

                    <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-slate-800 text-lg leading-tight">{char.name}</h3>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                          {char.tags?.slice(0, 4).map((tag) => (
                            <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-pink-50 text-pink-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">
                          {char.oneLinePersona || char.bio}
                        </p>
                      </div>

                      <div className="flex items-center justify-end mt-1 border-t border-slate-50 pt-2">
                        <div className="text-[10px] text-slate-400">
                          by {char.creator || '未知'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!loadingCharacters && characters.length === 0 && (
                  <div className="mt-2 text-center">
                    <p className="text-xs text-slate-300">没有更多了 ~</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case NavTab.ME:
        return (
          <MePage
            userProfile={userProfile}
            myCharacters={characters}
            myUserCharacters={myUserCharacters}
            myStories={myStories}
            onUpdateProfile={(p) => {
              setUserProfile(p);
              try {
                localStorage.setItem('user_nickname', p.nickname || '我');
                localStorage.setItem('user_email', p.email || 'me@example.com');
                if (p.avatar) localStorage.setItem('user_avatar', p.avatar);
              } catch { }
            }}
            onCharacterClick={(char) => {
              setIsProfileFromChat(false);
              setIsProfileFromMe(true);
              setViewingProfile(char);
            }}
            onReadStory={async (st) => {
              try {
                const anyItem: any = st as any
                if (typeof anyItem?.content === 'string' && anyItem.content.length) {
                  const mapped: Story = {
                    id: typeof st.id === 'number' ? st.id : Number(Date.now()),
                    title: st.title,
                    description: st.description || '',
                    image: st.image || '/uploads/covers/default_storyimg.jpg',
                    tags: Array.isArray(st.tags) ? st.tags : [],
                    author: userProfile.nickname || '我',
                    likes: '0',
                    content: anyItem.content,
                    publishDate: anyItem.publishDate || undefined,
                    status: anyItem.status
                  }
                  setReadingStory(mapped)
                } else {
                  const full = await getMyStory(st.id)
                  const ids: Array<number | string> = Array.isArray((full as any)?.characterIds) ? (full as any).characterIds : []
                  let roles: StoryRole[] = []
                  if (ids.length) {
                    const findById = (cid: any) => characters.find(c => String(c.id) === String(cid)) || myUserCharacters.find(c => String(c.id) === String(cid))
                    roles = ids.map((cid) => {
                      const c = findById(cid)
                      if (!c) return null
                      return { id: cid, name: c.name, avatar: c.avatar, description: c.oneLinePersona || c.bio || '' }
                    }).filter(Boolean) as StoryRole[]
                  }
                  const mapped: Story = {
                    id: Number(full.id),
                    title: full.title,
                    description: full.description || '',
                    image: full.image || '/uploads/covers/default_storyimg.jpg',
                    tags: Array.isArray(full.tags) ? full.tags : [],
                    author: userProfile.nickname || '我',
                    user_avatar: (full as any)?.user_avatar || '',
                    likes: '0',
                    content: full.content || '',
                    publishDate: (full as any)?.publishDate ?? undefined,
                    status: (st as any).status || undefined,
                    availableRoles: roles
                  }
                  setReadingStory(mapped)
                }
              } catch { }
            }}
            onEditStory={(st) => {
              const immediate: Story = {
                id: typeof st.id === 'number' ? st.id : Number(Date.now()),
                title: st.title,
                description: st.description || '',
                image: st.image || '/uploads/covers/default_storyimg.jpg',
                tags: Array.isArray(st.tags) ? st.tags : [],
                author: userProfile.nickname || '我',
                likes: '0',
                content: '',
                status: (st as any).status || undefined,
                availableRoles: []
              }
              setEditStoryInitial(immediate)
              setIsCreatingStory(true)

                ; (async () => {
                  try {
                    const full = await getMyStory(st.id)
                    const ids: Array<number | string> = Array.isArray((full as any)?.characterIds) ? (full as any).characterIds : []
                    let combinedItems: Array<any> = []
                    try {
                      const { authFetch } = await import('./services/http')
                      const res = await authFetch('/stories/combine')
                      if (res && res.ok) {
                        const data = await res.json()
                        combinedItems = Array.isArray(data?.items) ? data.items : []
                      }
                    } catch { }
                    setImportableRoles(combinedItems.map((it: any) => ({ id: String(it.character_id), name: it.character_name, avatar: it.character_avatar || '', desc: it.desc || '', isPrivate: !!it.isPrivate, isMine: !!it.isMine })))
                    const byCombine = (cid: any) => {
                      const it = combinedItems.find(x => String(x.character_id) === String(cid))
                      return it ? { id: cid, name: it.character_name, avatar: it.character_avatar || '', description: it.desc || '' } : null
                    }
                    let roles = ids.map(byCombine).filter(Boolean) as StoryRole[]
                    if (!roles.length) {
                      const findById = (cid: any) => characters.find(c => String(c.id) === String(cid)) || myUserCharacters.find(c => String(c.id) === String(cid))
                      roles = ids.map((cid) => {
                        const c = findById(cid)
                        if (!c) return null
                        return { id: cid, name: c.name, avatar: c.avatar, description: c.oneLinePersona || c.bio || '' }
                      }).filter(Boolean) as StoryRole[]
                    }
                    const mapped: Story = {
                      id: Number(full.id),
                      title: full.title,
                      description: full.description || '',
                      image: full.image || '/uploads/covers/default_storyimg.jpg',
                      tags: Array.isArray(full.tags) ? full.tags : [],
                      author: userProfile.nickname || '我',
                      likes: '0',
                      content: full.content || '',
                      publishDate: (full as any)?.publishDate ?? undefined,
                      status: (st as any).status || undefined,
                      availableRoles: roles,
                      ...(ids && { characterIds: ids } as any)
                    }
                    setEditStoryInitial(mapped)
                  } catch { }
                })()
            }}
            onEditCharacter={(char) => {
              setCreateInitial({ initial: char, id: char.id, isEdit: true })
              setIsCreating(true)
            }}
            onDeleteCharacter={(char) => {
              setMyUserCharacters(prev => prev.filter(c => c.id !== char.id))
              setCharacters(prev => prev.filter(c => c.id !== char.id))
            }}
            onAddCharacter={() => {
              setCreateInitial(null)
              setIsCreating(true)
            }}
            onAddStory={() => {
              setEditStoryInitial(null)
              setIsCreatingStory(true)
              setImportableRoles([])
            }}
            onLogout={handleLogout}
          />
        );
      case NavTab.CHAT:
      default:
        return (
          <>
            {(!selectedChat || chatFromList) && (
              <ChatList
                chats={chats}
                onChatClick={(chat) => {
                  setChatFromList(true);
                  setSelectedChat(chat);
                  setChats(prev => prev.map(c => c.characterId === chat.characterId ? { ...c, unreadCount: 0 } : c));
                  try { dbResetUnread(chat.sessionId) } catch { }
                }}
                onTogglePin={handleTogglePin}
                onDeleteChat={async (characterId) => {
                  setChats(prev => prev.filter(c => c.characterId !== characterId));
                  const uid = localStorage.getItem('user_id') || '0'
                  const keyNew = `chat_session_${uid}_${characterId}`
                  const keyLegacy = `chat_session_${characterId}`
                  const sidNew = localStorage.getItem(keyNew) || ''
                  const sidLegacy = localStorage.getItem(keyLegacy) || ''
                  let sid = sidNew || sidLegacy
                  try {
                    const rows = await dbListSessions(uid)
                    const targets = rows.filter(r => String(r.characterId) === String(characterId))
                    const sids = [sid].filter(Boolean) as string[]
                    targets.forEach(t => { if (!sids.includes(t.sessionId)) sids.push(t.sessionId) })
                    for (const one of sids) {
                      try { await dbDeleteSession(one) } catch { }
                      try { await closeSession(one) } catch { }
                      try {
                        const wsKey = `ws_active_sessions_${uid}`
                        const raw = localStorage.getItem(wsKey)
                        const arr = raw ? (JSON.parse(raw) as string[]) : []
                        const next = arr.filter(x => x !== one)
                        localStorage.setItem(wsKey, JSON.stringify(next))
                      } catch { }
                      try {
                        const h = wsHandlersRef.current.get(one)
                        if (h) { sharedChatWs.unsubscribe(one, h); wsHandlersRef.current.delete(one) }
                      } catch { }
                    }
                  } catch { }
                  try { localStorage.removeItem(keyNew) } catch { }
                  try { localStorage.removeItem(keyLegacy) } catch { }
                  if (selectedChat?.characterId === characterId) setSelectedChat(null);
                }}
                isDetailOpen={chatFromList && !!selectedChat}
              />
            )}
          </>
        );
    }
  };

  return (
    <ToastProvider>
      <div
        className="fixed inset-0 w-full bg-primary-50 overflow-hidden"
        style={{ ...viewportStyle, overscrollBehavior: 'none', position: 'fixed' }}
      >
        <div className="h-full w-full max-w-md mx-auto bg白 relative shadow-2xl rounded-none md:rounded-3xl md:overflow-hidden flex flex-col">

          {/* 0. Create Character Overlay */}
          {isCreating && (
            <CreateCharacter
              onBack={() => { setIsCreating(false); setCreateInitial(null) }}
              onCreate={handleCreateCharacter}
              isEdit={!!createInitial?.isEdit}
              characterId={createInitial?.id}
              initial={createInitial?.initial}
              onUpdated={(updated) => {
                setIsCreating(false)
                setCreateInitial(null)
                setViewingProfile(updated)
                setAwaitProfile({ character: updated, id: String(updated.id) })
              }}
              onSaveDraft={(draft) => {
                setIsCreating(false)
                setCreateInitial(null)
                setMyUserCharacters(prev => upsertById(prev, draft as any))
                setActiveTab(NavTab.ME)
              }}
            />
          )}

          {/* 0.5 User Settings Overlay */}
          {isUserSettingsOpen && (
            <UserCharacterSettings
              currentPersona={userPersona}
              onBack={() => setIsUserSettingsOpen(false)}
              onSave={(persona) => setUserPersona(persona)}
            />
          )}

          {/* 0.75 Create Story Overlay */}
          {isCreatingStory && (
            <CreateStory
              onBack={() => { setIsCreatingStory(false); setEditStoryInitial(null) }}
              onPublish={(newStory) => {
                setStories(prev => upsertById(prev as any[], newStory as any))
                setMyStories(prev => upsertById(prev, newStory as any))
                setIsCreatingStory(false)
                setEditStoryInitial(null)
              }}
              onSaveDraft={(draft) => {
                setMyStories(prev => upsertById(prev, draft as any))
                setIsCreatingStory(false)
                setEditStoryInitial(null)
              }}
              availableCharacters={characters}
              myUserCharacters={myUserCharacters}
              initialStory={editStoryInitial || undefined}
              importableRoles={importableRoles}
            />
          )}

          {/* 2. Chat Detail View Overlay - Render FIRST so it stays mounted behind profile */}
          <AnimatePresence initial={false}>
            {selectedChat && !isUserSettingsOpen && !isCreating && (
              <ChatDetail
                character={selectedChat.character}
                initialMessages={getInitialMessages(selectedChat)}
                sessionId={selectedChat.sessionId}
                userPersona={userPersona}
                onBack={() => { setSelectedChat(null); setChatFromList(false); }}
                onUpdateLastMessage={handleUpdateLastMessage}
                onOpenUserSettings={() => setIsUserSettingsOpen(true)}
                onUpdateUserPersona={(persona) => setUserPersona(persona)}
                onShowProfile={() => {
                  setIsProfileFromChat(true);
                  setIsProfileFromMe(false);
                  setAwaitProfile(null);
                  setViewingProfile(selectedChat.character);
                }}
              />
            )}
          </AnimatePresence>

          {/* 1. Profile View Overlay - Render SECOND so it covers ChatDetail */}
          <AnimatePresence initial={false}>
            {viewingProfile && !isUserSettingsOpen && !isCreating && !awaitProfile && (
              isProfileFromMe ? (
                <CharacterProfileAwait
                  character={viewingProfile}
                  createdId={viewingProfile.id}
                  onBack={() => setViewingProfile(null)}
                  onStartChat={(char) => startChatFromProfile(char)}
                />
              ) : (
                <CharacterProfile
                  character={viewingProfile}
                  onBack={() => setViewingProfile(null)}
                  onStartChat={() => startChatFromProfile(viewingProfile)}
                  isFromChat={isProfileFromChat}
                  isExistingChat={!!chats.find(c => c.characterId === viewingProfile.id)}
                />
              )
            )}
          </AnimatePresence>

          {awaitProfile && !isUserSettingsOpen && !isCreating && (
            <CharacterProfileAwait
              character={awaitProfile.character}
              createdId={awaitProfile.id}
              onBack={() => setAwaitProfile(null)}
              onStartChat={(char) => { setAwaitProfile(null); startChatFromProfile(char) }}
            />
          )}

          {/* 阅读故事 Overlay */}
          {readingStory && (
            <StoryReader
              story={readingStory}
              onBack={() => setReadingStory(null)}
              connectedRoleNames={chats.map(c => c.character.name)}
              validRoleNames={(readingStory.availableRoles || []).map(r => r.name)}
              onStartRoleplay={(role: StoryRole) => {
                setReadingStory(null)
                const rid = role?.id
                let candidate = undefined as Character | undefined
                if (rid !== undefined && rid !== null) {
                  candidate = characters.find(c => String(c.id) === String(rid)) || myUserCharacters.find(c => String(c.id) === String(rid))
                }
                if (!candidate) {
                  const name = role?.name || ''
                  candidate = characters.find(c => c.name === name) || myUserCharacters.find(c => c.name === name)
                }
                if (candidate) {
                  setViewingProfile(candidate)
                  setIsProfileFromChat(false)
                  setIsProfileFromMe(false)
                    ; (async () => {
                      try {
                        const isMine = !!myUserCharacters.find(c => String(c.id) === String(candidate!.id))
                        if (isMine) {
                          const data = await getUserCharacter(candidate!.id)
                          const mapped: Character = {
                            id: String(candidate!.id),
                            name: data?.name || candidate!.name,
                            avatar: data?.avatar || candidate!.avatar || '',
                            profileImage: candidate!.profileImage || '',
                            status: CharacterStatus.ONLINE,
                            bio: data?.tagline || '',
                            tags: Array.isArray(data?.tags) ? data.tags : [],
                            creator: userProfile.nickname || '我',
                            oneLinePersona: data?.tagline || '',
                            personality: data?.personality || '',
                            profession: data?.occupation || '',
                            age: data?.age ? String(data.age) : '',
                            roleType: '',
                            gender: data?.gender || '',
                            currentRelationship: data?.relationship || '',
                            plotTheme: data?.plot_theme || '',
                            plotDescription: data?.plot_summary || '',
                            openingLine: data?.opening_line || '',
                            styleExamples: Array.isArray(data?.styleExamples) ? data.styleExamples : [],
                            hobbies: data?.hobbies || '',
                            experiences: data?.experiences || '',
                            isPublic: String(data?.visibility || '') === 'public',
                            isPublished: String(data?.status || '') === 'published'
                          } as any
                          setViewingProfile(mapped)
                        } else {
                          const full = await getCharacter(candidate!.id)
                          const mapped: Character = {
                            id: String(full.id),
                            name: full.name || candidate!.name,
                            avatar: full.avatar || candidate!.avatar || '',
                            profileImage: full.profileImage || candidate!.profileImage || '',
                            status: CharacterStatus.ONLINE,
                            bio: full.bio || '',
                            tags: Array.isArray(full.tags) ? full.tags : [],
                            creator: full.creator || '',
                            oneLinePersona: full.oneLinePersona || '',
                            personality: full.personality || '',
                            profession: full.profession || (full as any).occupation || '',
                            age: full.age || '',
                            roleType: full.roleType || '',
                            currentRelationship: full.currentRelationship || (full as any).relationship || '',
                            plotTheme: (full as any).plotTheme || (full as any).plot_theme || '',
                            plotDescription: (full as any).plotDescription || (full as any).plot_summary || '',
                            openingLine: full.openingLine || ''
                          } as any
                          setViewingProfile(mapped)
                        }
                      } catch { }
                    })()
                }
                if (!candidate && (rid !== undefined && rid !== null)) {
                  ; (async () => {
                    try {
                      const full = await getCharacter(rid)
                      const mapped: Character = {
                        id: String(full.id),
                        name: full.name || '',
                        avatar: full.avatar || '',
                        profileImage: full.profileImage || '',
                        status: CharacterStatus.ONLINE,
                        bio: full.bio || '',
                        tags: Array.isArray(full.tags) ? full.tags : [],
                        creator: full.creator || '',
                        oneLinePersona: full.oneLinePersona || '',
                        personality: full.personality || '',
                        profession: full.profession || (full as any).occupation || '',
                        age: full.age || '',
                        roleType: full.roleType || '',
                        currentRelationship: full.currentRelationship || (full as any).relationship || '',
                        plotTheme: (full as any).plotTheme || (full as any).plot_theme || '',
                        plotDescription: (full as any).plotDescription || (full as any).plot_summary || '',
                        openingLine: full.openingLine || ''
                      } as any
                      setViewingProfile(mapped)
                      setIsProfileFromChat(false)
                      setIsProfileFromMe(false)
                      return
                    } catch { }
                    try {
                      const data = await getUserCharacter(rid)
                      const mapped: Character = {
                        id: String(rid),
                        name: data?.name || '',
                        avatar: data?.avatar || '',
                        profileImage: '',
                        status: CharacterStatus.ONLINE,
                        bio: data?.tagline || '',
                        tags: Array.isArray(data?.tags) ? data.tags : [],
                        creator: userProfile.nickname || '我',
                        oneLinePersona: data?.tagline || '',
                        personality: data?.personality || '',
                        profession: data?.occupation || '',
                        age: data?.age ? String(data.age) : '',
                        roleType: '',
                        gender: data?.gender || '',
                        currentRelationship: data?.relationship || '',
                        plotTheme: data?.plot_theme || '',
                        plotDescription: data?.plot_summary || '',
                        openingLine: data?.opening_line || '',
                        styleExamples: Array.isArray(data?.styleExamples) ? data.styleExamples : [],
                        hobbies: data?.hobbies || '',
                        experiences: data?.experiences || '',
                        isPublic: String(data?.visibility || '') === 'public',
                        isPublished: String(data?.status || '') === 'published'
                      } as any
                      setViewingProfile(mapped)
                      setIsProfileFromChat(false)
                      setIsProfileFromMe(false)
                    } catch { }
                  })()
                }
              }}
            />
          )}

          {/* 3. Main Tab Navigation View */}
          {!isUserSettingsOpen && !isCreating && (
            <>
              <TopBar
                key={activeTab}
                title={activeTab === NavTab.HOME ? renderHomeHeader() : (activeTab === NavTab.CHAT ? '聊天' : '')}
                variant={activeTab === NavTab.ME ? 'overlay' : 'default'}
                onDeleteAll={activeTab === NavTab.CHAT ? handleDeleteAllSessions : undefined}
                onFilterClick={() => {
                  if (activeTab === NavTab.HOME) {
                    if (homeTab === 'characters') {
                      setIsCreating(true)
                    } else if (homeTab === 'stories') {
                      setEditStoryInitial(null)
                      setImportableRoles([])
                      setIsCreatingStory(true)
                    }
                  }
                }}
                showAdd={activeTab === NavTab.HOME}
                searchPlaceholder={homeTab === 'stories' ? '搜索故事...' : '搜索角色...'}
                onSearch={activeTab === NavTab.HOME ? ((q) => {
                  if (homeTab === 'stories') {
                    if (q) {
                      if (!storySnapshotRef.current && storySearchQuery === '') {
                        storySnapshotRef.current = {
                          items: stories,
                          offset: storyOffset,
                          hasMore: hasMoreStories,
                          scrollTop: scrollRootRef.current?.scrollTop || 0
                        }
                      }
                      setStorySearchQuery(q)
                    } else {
                      if (storySnapshotRef.current) {
                        isRestoringStoryRef.current = true
                        setStories(storySnapshotRef.current.items)
                        setStoryOffset(storySnapshotRef.current.offset)
                        setHasMoreStories(storySnapshotRef.current.hasMore)
                        const top = storySnapshotRef.current.scrollTop
                        setTimeout(() => { if (scrollRootRef.current) scrollRootRef.current.scrollTop = top }, 0)
                        storySnapshotRef.current = null
                      }
                      setStorySearchQuery('')
                    }
                  } else {
                    if (q) {
                      if (!charSnapshotRef.current && charSearchQuery === '') {
                        charSnapshotRef.current = {
                          items: characters,
                          offset: charOffset,
                          hasMore: hasMoreChars,
                          scrollTop: scrollRootRef.current?.scrollTop || 0,
                          chats: chats
                        }
                      }
                      setCharSearchQuery(q)
                    } else {
                      if (charSnapshotRef.current) {
                        isRestoringCharRef.current = true
                        setCharacters(charSnapshotRef.current.items)
                        setCharOffset(charSnapshotRef.current.offset)
                        setHasMoreChars(charSnapshotRef.current.hasMore)
                        setChats(charSnapshotRef.current.chats)
                        const top = charSnapshotRef.current.scrollTop
                        setTimeout(() => { if (scrollRootRef.current) scrollRootRef.current.scrollTop = top }, 0)
                        charSnapshotRef.current = null
                      }
                      setCharSearchQuery('')
                    }
                  }
                }) : undefined}
              />
              <AnimatePresence initial={false}>
                <div className="flex-1 overflow-y-auto no-scrollbar min-h-0" ref={scrollRootRef}>
                  {renderContent()}
                </div>
              </AnimatePresence>
              <BottomNav activeTab={activeTab} onTabChange={handleBottomNavChange} />
            </>
          )}
        </div>
      </div>
      <ToastIncomingBridge />
    </ToastProvider>
  );
};

export default App;
const upsertById = <T extends { id: any }>(list: T[], item: T): T[] => {
  return [item, ...list.filter(it => String(it.id) !== String(item.id))]
}
// 已移除：localStorage 历史/配置调试
