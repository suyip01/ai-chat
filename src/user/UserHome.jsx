import React, { useState } from 'react';
import NavBar from './components/NavBar.jsx';
import HomePage from './pages/HomePage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import CharacterDetail from './pages/CharacterDetail.jsx';
import ChatWindowsPage from './pages/ChatWindowsPage.jsx';
import { Routes, Route } from 'react-router-dom';
import KeepAlive from './keepalive.js';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

const UserHome = () => {
    const [activeTab, setActiveTab] = useState('home');
    const location = useLocation();
    const hideNav = /^\/characters\/[^/]+\/chat$/.test(location.pathname);
    React.useEffect(() => { if (location.state && location.state.tab) { setActiveTab(location.state.tab); } }, [location]);

    // 内容区域根据 Tab 切换
    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <HomePage />;
            case 'chat': return <ChatPage />;
            case 'my': return <ProfilePage />;
            default: return <HomePage />;
        }
    };

    return (
        <div className="flex flex-col h-screen supports-[height:100dvh]:h-[100dvh] bg-white overflow-hidden font-sans text-slate-800 relative">

            {/* Ambient Background (from LoginPage) */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(at_0%_0%,_hsla(270,60%,96%,1)_0,_transparent_50%)]"></div>
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(at_50%_100%,_hsla(260,60%,90%,1)_0,_transparent_50%)]"></div>
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(at_100%_0%,_hsla(290,60%,94%,1)_0,_transparent_50%)]"></div>
            </div>

            {/* Decorative Blur Blobs (from LoginPage) */}
            <div className="fixed top-0 left-0 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none z-0"></div>
            <div className="fixed top-0 right-0 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 pointer-events-none z-0"></div>
            <div className="fixed -bottom-32 left-20 w-64 h-64 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000 pointer-events-none z-0"></div>

            <style>{`
                @keyframes blob {
                  0% { transform: translate(0px, 0px) scale(1); }
                  33% { transform: translate(30px, -50px) scale(1.1); }
                  66% { transform: translate(-20px, 20px) scale(0.9); }
                  100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                  animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                  animation-delay: 2s;
                }
                .animation-delay-4000 {
                  animation-delay: 4s;
                }
            `}</style>

            {/* 导航栏逻辑：
                order-2 md:order-1 -> 移动端在下(Flex中排第2)，PC端在左(Flex中排第1)
            */}
            <div className="order-2 flex-shrink-0 z-50">
                {!hideNav && <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />}
            </div>

            {/* 主内容区域：
                order-1 md:order-2 -> 移动端在上，PC端在右
            */}
            <main className="order-1 flex-1 h-full overflow-y-auto relative w-full scroll-smooth z-10 hide-scrollbar">
                <div className="h-full min-h-full">
                    <div id="content-scroll" className="app-shell mx-auto max-w-[430px] w-full h-full overflow-y-auto hide-scrollbar relative">
                        {
                            <AnimatePresence initial={false} mode="sync">
                                <Routes location={location} key={location.key}>
                                    <Route
                                        path="/"
                                        element={
                                            <motion.div initial={{ x: 0, opacity: 1 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '-8%', opacity: 0 }} transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }} className="absolute inset-0 will-change-transform">
                                                <KeepAlive saveScrollPosition="screen" cacheKey="home" targetId="content-scroll">
                                                    <motion.div
                                                        key={activeTab}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
                                                        className={`absolute inset-0 will-change-opacity bg-[#F3E5F5] hide-scrollbar ${hideNav ? 'overflow-hidden' : 'overflow-y-auto pb-24'}`}
                                                    >
                                                        {renderContent()}
                                                    </motion.div>
                                                </KeepAlive>
                                            </motion.div>
                                        }
                                    />
                                    <Route
                                        path="/characters/:id"
                                        element={
                                            <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: '0%', opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }} className="absolute inset-0 will-change-transform">
                                                <CharacterDetail />
                                            </motion.div>
                                        }
                                    />
                                    <Route
                                        path="/characters/:id/chat"
                                        element={
                                            <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: '0%', opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }} className="absolute inset-0 will-change-transform">
                                                <ChatWindowsPage />
                                            </motion.div>
                                        }
                                    />
                                </Routes>
                            </AnimatePresence>
                        }
                    </div>
                </div>
            </main>

        </div>
    );
};

export default UserHome;
