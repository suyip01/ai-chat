import React, { useState } from 'react';
import { BASE_URL, userAuthAPI } from '../api.js';
import { Heart, LogIn, Eye, EyeOff, Check } from 'lucide-react';
import { useToast } from './Toast';

const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleLogin = async () => {
        if (!username || !password) {
            showToast('请输入账号和密码', 'error');
            return;
        }
        setLoading(true);
        try {
            const data = await userAuthAPI.login(username, password);

            if (data?.access_token) localStorage.setItem('user_access_token', data.access_token);
            if (data?.refresh_token) localStorage.setItem('user_refresh_token', data.refresh_token);

            showToast('登录成功', 'success');
            setTimeout(onLogin, 500);
        } catch (e) {
            console.error(e);
            showToast('登录失败，请检查账号密码', 'error');
        } finally {
            setLoading(false);
        }
    };

    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F3E5F5] relative overflow-hidden font-sans text-[#4A4060]">

            {/* Ambient Background */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(at_0%_0%,_hsla(270,60%,96%,1)_0,_transparent_50%)]"></div>
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(at_50%_100%,_hsla(260,60%,90%,1)_0,_transparent_50%)]"></div>
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(at_100%_0%,_hsla(290,60%,94%,1)_0,_transparent_50%)]"></div>
            </div>

            {/* Main Container */}
            <div className="relative z-10 w-full max-w-md p-6 sm:p-12 flex flex-col justify-center">

                {/* Header Section */}
                <div className="text-center mb-10 sm:mb-12 space-y-3">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#4C1D95]">
                        Welcome back
                    </h1>
                    <p className="text-[#5D5476] text-sm sm:text-base leading-relaxed max-w-xs mx-auto">
                        You can search course, apply course and find scholarship for abroad studies
                    </p>
                </div>

                {/* Form Section */}
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>

                    {/* Email Input */}
                    <div className="group relative transition-all duration-300">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-[#F0E6FA] bg-white/60 text-[#5D5476] placeholder-[#B3A4C8] focus:outline-none focus:ring-0 focus:border-[#C084FC] focus:bg-white focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)] transition-all pr-12"
                            placeholder="Username"
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-500 pointer-events-none transition-opacity duration-300">
                            {username.length > 0 && <Check size={20} strokeWidth={2.5} />}
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="group relative transition-all duration-300">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-[#F0E6FA] bg-white/60 text-[#5D5476] placeholder-[#B3A4C8] focus:outline-none focus:ring-0 focus:border-[#C084FC] focus:bg-white focus:shadow-[0_0_0_4px_rgba(192,132,252,0.15)] transition-all pr-12 tracking-widest"
                            placeholder="Password"
                        />
                        <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#B3A4C8] hover:text-[#8B5CF6] focus:outline-none transition-colors p-1"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:opacity-90 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200 active:scale-[0.98] transition-all duration-200 ease-out text-lg mt-4 tracking-wide disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            'Login'
                        )}
                    </button>

                    {/* Forgot Password */}
                    <div className="text-center pt-2">
                        <a href="#" className="text-purple-500 font-bold text-sm hover:underline hover:text-purple-700 transition-colors">
                            Forgot password
                        </a>
                    </div>

                </form>

                {/* Footer / Sign Up Link */}
                <div className="mt-16 sm:mt-12 text-center">
                    <p className="text-purple-600 font-bold text-sm sm:text-base cursor-pointer hover:text-purple-800 transition-colors">
                        Don't have an account? Join us
                    </p>
                </div>

            </div>

            {/* Decorative Blur Blobs */}
            <div className="fixed top-0 left-0 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none"></div>
            <div className="fixed top-0 right-0 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 pointer-events-none"></div>
            <div className="fixed -bottom-32 left-20 w-64 h-64 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000 pointer-events-none"></div>

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
        </div>
    );
};

export default LoginPage;
