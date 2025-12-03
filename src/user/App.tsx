import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { ChatList } from './components/ChatList';
import { ChatDetail } from './components/ChatDetail';
import { CharacterProfile } from './components/CharacterProfile';
import { CharacterProfileAwait } from './components/CharacterProfileAwait';
import { UserCharacterSettings } from './components/UserCharacterSettings';
import { CreateCharacter } from './components/CreateCharacter';
import LoginPage from './components/LoginPage.jsx';
import { ToastProvider } from './components/Toast';
import { ChatPreview, NavTab, CharacterStatus, MessageType, Message, Character, UserPersona, UserProfile } from './types';
import { MePage } from './components/MePage';
import { listCharacters } from './services/charactersService';
import { listUserCharacters as listMine } from './services/userCharactersService';
import { authFetch } from './services/http';
import { createChatSession } from './services/chatService';

// Mock Data
const MOCK_CHATS: ChatPreview[] = [];

// Mock Stories Data
const MOCK_STORIES = [
  {
    id: 1,
    title: "命运的邂逅",
    description: "在樱花盛开的坂道上，你撞到了那个改变你一生的人...",
    image: "https://image.pollinations.ai/prompt/anime%20scenery%20cherry%20blossom%20school%20romantic%20soft%20pastel?width=600&height=300&seed=10",
    tags: ["浪漫", "校园"]
  },
  {
    id: 2,
    title: "当你被阴湿男鬼盯上",
    description: "我搬到了她家对面，每天躲在窗帘后面看着她在阳台上......",
    image: "https://image.pollinations.ai/prompt/anime%20scenery%20magic%20library%20night%20mysterious%20glowing%20books?width=600&height=300&seed=20",
    tags: ["阴湿男鬼", "暗恋", "bg", "甜文"]
  },
  {
    id: 3,
    title: "追到高岭之花后，我跑路了（2）",
    description: "原来我的每一次自持，都是下意识地相信你不会离开",
    image: "https://image.pollinations.ai/prompt/anime%20stage%20lights%20concert%20colorful%20sparkles?width=600&height=300&seed=30",
    tags: ["高岭之花", "高冷", "傲娇", "追妻火葬场", "bg"]
  }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>(NavTab.HOME);
  const [chats, setChats] = useState<ChatPreview[]>(MOCK_CHATS);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null);
  const [viewingProfile, setViewingProfile] = useState<Character | null>(null);
  const [homeTab, setHomeTab] = useState<'stories' | 'characters'>('stories');
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [userPersona, setUserPersona] = useState<UserPersona | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [createInitial, setCreateInitial] = useState<{ initial?: Character; id?: string | number; isEdit?: boolean } | null>(null)
  const [awaitProfile, setAwaitProfile] = useState<{ character: Character; id: string } | null>(null);
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
    if (!isLoggedIn) return;
    (async () => {
      try {
        const res = await authFetch('/user/profile')
        if (res && res.ok) {
          const data = await res.json()
          const nick = data?.nickname || '我'
          const email = data?.email || 'me@example.com'
          const avatar = data?.avatar || ''
          const usedCount = typeof data?.used_count === 'number' ? data.used_count : 0
          setUserProfile({ nickname: nick, email, avatar, usedCount })
          try {
            localStorage.setItem('user_nickname', nick)
            localStorage.setItem('user_email', email)
            if (avatar) localStorage.setItem('user_avatar', avatar)
          } catch {}
        }
      } catch {}
    })()
    setLoadingCharacters(true);
    listCharacters({ limit: 24 })
      .then(items => {
        const mapped: Character[] = items.map(it => ({
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
        // build chats from localStorage histories
        try {
          const previews: ChatPreview[] = []
          const keys = Object.keys(localStorage).filter(k => k.startsWith('chat_history_'))
          keys.forEach(k => {
            const cid = k.replace('chat_history_', '')
            const char = mapped.find(c => String(c.id) === String(cid))
            if (!char) return
            const raw = localStorage.getItem(k)
            if (!raw) return
            const arr = JSON.parse(raw) as Array<{ id:string; senderId:string; text:string; ts:number; type:string }>
            if (!arr.length) return
            const last = arr[arr.length - 1]
            const lastMsg: Message = { id: last.id, senderId: last.senderId, text: last.text, timestamp: new Date(last.ts), type: last.type as MessageType }
            previews.push({ characterId: String(cid), character: char, lastMessage: lastMsg, unreadCount: 0 })
          })
          if (previews.length) setChats(previews)
        } catch {}
      })
      .catch(() => setCharacters([]))
      .finally(() => setLoadingCharacters(false));

    (async () => {
      try {
        const items = await listMine()
        const mapped: Character[] = items.map((it: any) => ({
          id: String(it.id),
          name: it.name || '未知',
          avatar: it.avatar || '',
          profileImage: '',
          status: CharacterStatus.ONLINE,
          bio: it.plot_summary || '',
          tags: Array.isArray(it.tags) ? it.tags : [],
          creator: userProfile.nickname || '我',
          oneLinePersona: it.tagline || '',
          personality: it.personality || '',
          profession: it.occupation || '',
          age: it.age ? String(it.age) : '',
          roleType: '',
          gender: it.gender || '',
          currentRelationship: it.relationship || '',
          plotTheme: it.plot_theme || '',
          plotDescription: '',
          openingLine: it.opening_line || '',
          styleExamples: Array.isArray(it.styleExamples) ? it.styleExamples : [],
          hobbies: it.hobbies || '',
          experiences: it.experiences || '',
          visibility: it.visibility,
          isPublic: it.visibility ? it.visibility === 'public' : false
        }))
        setMyUserCharacters(mapped)
      } catch {
        setMyUserCharacters([])
      }
    })()
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab !== NavTab.ME) return;
    (async () => {
      try {
        const items = await listMine();
        const mapped: Character[] = items.map((it: any) => ({
          id: String(it.id),
          name: it.name || '未知',
          avatar: it.avatar || '',
          profileImage: '',
          status: CharacterStatus.ONLINE,
          bio: it.plot_summary || '',
          tags: Array.isArray(it.tags) ? it.tags : [],
          creator: userProfile.nickname || '我',
          oneLinePersona: it.tagline || '',
          personality: it.personality || '',
          profession: it.occupation || '',
          age: it.age ? String(it.age) : '',
          roleType: '',
          gender: it.gender || '',
          currentRelationship: it.relationship || '',
          plotTheme: it.plot_theme || '',
          plotDescription: '',
          openingLine: it.opening_line || '',
          styleExamples: Array.isArray(it.styleExamples) ? it.styleExamples : [],
          hobbies: it.hobbies || '',
          experiences: it.experiences || '',
          visibility: it.visibility,
          isPublic: it.visibility ? it.visibility === 'public' : false
        }));
        setMyUserCharacters(mapped);
      } catch {
        setMyUserCharacters([]);
      }
    })();
  }, [activeTab, isLoggedIn, userProfile.nickname]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!myUserCharacters.length) return;
    if (!myUserCharacters.some(c => c.visibility === undefined)) return;
    (async () => {
      try {
        const items = await listMine();
        const mapped: Character[] = items.map((it: any) => ({
          id: String(it.id),
          name: it.name || '未知',
          avatar: it.avatar || '',
          profileImage: '',
          status: CharacterStatus.ONLINE,
          bio: it.plot_summary || '',
          tags: Array.isArray(it.tags) ? it.tags : [],
          creator: userProfile.nickname || '我',
          oneLinePersona: it.tagline || '',
          personality: it.personality || '',
          profession: it.occupation || '',
          age: it.age ? String(it.age) : '',
          roleType: '',
          gender: it.gender || '',
          currentRelationship: it.relationship || '',
          plotTheme: it.plot_theme || '',
          plotDescription: '',
          openingLine: it.opening_line || '',
          styleExamples: Array.isArray(it.styleExamples) ? it.styleExamples : [],
          hobbies: it.hobbies || '',
          experiences: it.experiences || '',
          visibility: it.visibility,
          isPublic: it.visibility ? it.visibility === 'public' : false
        }));
        setMyUserCharacters(mapped);
      } catch {}
    })();
  }, [myUserCharacters, isLoggedIn, userProfile.nickname]);

  useEffect(() => {
    const isTouch = (navigator as any)?.maxTouchPoints > 0
    if (!isTouch) return
    const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null
    const original = meta?.getAttribute('content') || ''
    const newContent = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
    if (meta) meta.setAttribute('content', newContent)
    let lastTouch = 0
    const onTouchEnd = (e: TouchEvent) => {
      const now = Date.now()
      if (now - lastTouch <= 300) {
        e.preventDefault()
      }
      lastTouch = now
    }
    document.addEventListener('touchend', onTouchEnd, { passive: false })
    document.body.style.touchAction = 'manipulation'
    return () => {
      if (meta) meta.setAttribute('content', original)
      document.removeEventListener('touchend', onTouchEnd as any)
      document.body.style.touchAction = ''
    }
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

  if (!isLoggedIn) {
    return (
      <ToastProvider>
        <div className="fixed inset-0 w-full bg-primary-50 overflow-hidden" style={{ height: 'calc(var(--vh) * 100)', overscrollBehavior: 'none' }}>
          <div className="h-full w-full max-w-md mx-auto bg白 relative shadow-2xl rounded-none md:rounded-3xl md:overflow-hidden flex">
              <LoginPage onLogin={() => setIsLoggedIn(true)} />
          </div>
        </div>
      </ToastProvider>
    );
  }

  // When opening a chat, we could fetch full history. For now, we mock history based on the last message.
  const getInitialMessages = (chat: ChatPreview): Message[] => {
    try {
      const raw = localStorage.getItem(`chat_history_${chat.characterId}`);
      if (raw) {
        const arr = JSON.parse(raw) as Array<{ id:string; senderId:string; text:string; ts:number; type:string; quote?:string; read?:boolean }>;
        const msgs: Message[] = arr.map(m => ({ id: m.id, senderId: m.senderId, text: m.text, timestamp: new Date(m.ts), type: m.type as MessageType, quote: m.quote, read: m.read }));
        if (msgs.length) return msgs;
      }
    } catch {}
    // No special mock conversation

    // For newly created characters, use the Opening Line if available
    if (chat.character.openingLine) {
      return [{
        id: `m_${Date.now()}`,
        senderId: chat.characterId,
        text: chat.character.openingLine.replace(/^['"“]|['"”]$/g, ''), // Strip quotes
        timestamp: new Date(),
        type: MessageType.TEXT
      }];
    }

    // Default Fallback
    return [
      {
        id: 'm0',
        senderId: chat.characterId,
        text: "很高兴认识你！",
        timestamp: new Date(new Date().setDate(new Date().getDate() - 2)),
        type: MessageType.TEXT
      },
      chat.lastMessage
    ];
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
      setSelectedChat(existingChat);
      setActiveTab(NavTab.CHAT);
      return;
    }
    try {
      const sid = await createChatSession(character.id);
      localStorage.setItem(`chat_session_${character.id}`, sid);
      const last: Message = {
        id: `msg_${Date.now()}`,
        senderId: character.id,
        text: character.openingLine ? character.openingLine.replace(/^['"“]|['"”]$/g, '') : '你好...',
        timestamp: new Date(),
        type: MessageType.TEXT
      };
      const newChat: ChatPreview = {
        characterId: character.id,
        character,
        lastMessage: last,
        unreadCount: 0
      };
      setChats(prev => [newChat, ...prev]);
      setViewingProfile(null);
      setSelectedChat(newChat);
      setActiveTab(NavTab.CHAT);
    } catch {
      const fallback: ChatPreview = {
        characterId: character.id,
        character,
        lastMessage: {
          id: `msg_${Date.now()}`,
          senderId: character.id,
          text: character.openingLine ? character.openingLine.replace(/^['"“]|['"”]$/g, '') : '你好...',
          timestamp: new Date(),
          type: MessageType.TEXT
        },
        unreadCount: 0
      };
      setChats(prev => [fallback, ...prev]);
      setViewingProfile(null);
      setSelectedChat(fallback);
      setActiveTab(NavTab.CHAT);
    }
  };

  const handleCreateCharacter = (newCharacter: Character) => {
    setIsCreating(false);
    setAwaitProfile({ character: newCharacter, id: String(newCharacter.id) })
  };

  const renderHomeHeader = () => (
    <div className="flex items-center gap-5">
      <button
        onClick={() => setHomeTab('stories')}
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
        onClick={() => setHomeTab('characters')}
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
                {MOCK_STORIES.map(story => (
                  <div key={story.id} className="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer">
                    <div className="h-40 overflow-hidden relative">
                      <img src={story.image} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 text-white">
                        <h3 className="text-xl font-bold">{story.title}</h3>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">
                        {story.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2 flex-wrap">
                          {story.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-2">
                {loadingCharacters && (
                  <div className="text-center text-xs text-slate-400">加载中...</div>
                )}
                {!loadingCharacters && characters.map(char => (
                  <div
                    key={char.id}
                    className="bg-white rounded-2xl p-4 shadow-sm flex gap-4 hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-primary-100"
                    onClick={() => {
                      setIsProfileFromChat(false);
                      setIsProfileFromMe(false);
                      setViewingProfile(char);
                    }}
                  >
                    <div className="w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 relative group">
                      <img src={char.avatar} alt={char.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    </div>

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
            myStories={[]}
            onUpdateProfile={(p) => {
              setUserProfile(p);
              try {
                localStorage.setItem('user_nickname', p.nickname || '我');
                localStorage.setItem('user_email', p.email || 'me@example.com');
                if (p.avatar) localStorage.setItem('user_avatar', p.avatar);
              } catch {}
            }}
            onCharacterClick={(char) => {
              setIsProfileFromChat(false);
              setIsProfileFromMe(true);
              setViewingProfile(char);
            }}
            onLogout={handleLogout}
          />
        );
      case NavTab.CHAT:
      default:
        return (
          <>
            <ChatList
              chats={chats}
              onChatClick={(chat) => setSelectedChat(chat)}
              onTogglePin={handleTogglePin}
              onDeleteChat={(characterId) => {
                setChats(prev => prev.filter(c => c.characterId !== characterId));
                localStorage.removeItem(`chat_session_${characterId}`);
                localStorage.removeItem(`chat_history_${characterId}`);
                if (selectedChat?.characterId === characterId) setSelectedChat(null);
              }}
            />
          </>
        );
    }
  };

  return (
    <ToastProvider>
      <div className="fixed inset-0 w-full bg-primary-50 overflow-hidden" style={{ height: 'calc(var(--vh) * 100)', overscrollBehavior: 'none' }}>
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

        {/* 2. Chat Detail View Overlay - Render FIRST so it stays mounted behind profile */}
        {selectedChat && !isUserSettingsOpen && !isCreating && (
          <ChatDetail
            character={selectedChat.character}
            initialMessages={getInitialMessages(selectedChat)}
            userPersona={userPersona}
            onBack={() => setSelectedChat(null)}
            onUpdateLastMessage={handleUpdateLastMessage}
            onOpenUserSettings={() => setIsUserSettingsOpen(true)}
            onUpdateUserPersona={(persona) => setUserPersona(persona)}
            onShowProfile={() => {
              setIsProfileFromChat(true);
              setViewingProfile(selectedChat.character);
            }}
          />
        )}

        {/* 1. Profile View Overlay - Render SECOND so it covers ChatDetail */}
        {viewingProfile && !isUserSettingsOpen && !isCreating && !awaitProfile && (
          isProfileFromMe ? (
            <CharacterProfileAwait
              character={viewingProfile}
              createdId={viewingProfile.id}
              onBack={() => setViewingProfile(null)}
              onStartChat={(char) => startChatFromProfile(char)}
              onEdit={(char) => {
                setCreateInitial({ initial: char, id: char.id, isEdit: true })
                setIsCreating(true)
              }}
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

        {awaitProfile && !isUserSettingsOpen && !isCreating && (
          <CharacterProfileAwait
            character={awaitProfile.character}
            createdId={awaitProfile.id}
            onBack={() => setAwaitProfile(null)}
            onStartChat={(char) => { setAwaitProfile(null); startChatFromProfile(char) }}
          />
        )}

        {/* 3. Main Tab Navigation View */}
        {!viewingProfile && !selectedChat && !isUserSettingsOpen && !isCreating && (
          <>
            <TopBar
              title={activeTab === NavTab.HOME ? renderHomeHeader() : (activeTab === NavTab.CHAT ? '聊天' : '我的')}
              onFilterClick={() => {
                if (activeTab === NavTab.HOME && homeTab === 'characters') {
                  setIsCreating(true);
                }
              }}
              showAdd={activeTab === NavTab.HOME && homeTab === 'characters'}
            />
            <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth min-h-0">
              {renderContent()}
            </div>
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
          </>
        )}
        </div>
      </div>
    </ToastProvider>
  );
};

export default App;
