
import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { userAuthAPI } from '../api';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userInputRef = useRef<HTMLInputElement>(null);
  const passInputRef = useRef<HTMLInputElement>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  useEffect(() => {
    const setVh = () => {
      const h = (window.visualViewport && window.visualViewport.height) ? window.visualViewport.height : window.innerHeight
      document.documentElement.style.setProperty('--vh', `${h * 0.01}px`)
    }
    setVh()
    const onResize = () => setVh()
    window.addEventListener('resize', onResize)
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize as any)
    const detectKeyboard = () => {
      const base = window.innerHeight
      const vh = (window.visualViewport && window.visualViewport.height) ? window.visualViewport.height : base
      setKeyboardOpen(vh < base - 160)
    }
    detectKeyboard()
    const onVVResize = () => { setVh(); detectKeyboard() }
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onVVResize as any)
    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', onResize as any)
        window.visualViewport.removeEventListener('resize', onVVResize as any)
      }
    }
  }, [])

  const onFocusAny = () => setKeyboardOpen(true)
  const onBlurAny = () => setKeyboardOpen(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) { setError('请输入账号和密码'); return; }
    setLoading(true);
    try {
      const data = await userAuthAPI.login(username.trim(), password.trim());
      if (data?.access_token) try { localStorage.setItem('user_access_token', data.access_token) } catch {}
      if (data?.refresh_token) try { localStorage.setItem('user_refresh_token', data.refresh_token) } catch {}
      onLogin();
    } catch {
      setError('登录失败，请检查账号或密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className={`h-full w-full bg-primary-50 flex flex-col items-center ${keyboardOpen ? 'justify-start' : 'justify-center'} px-8 font-sans overflow-hidden animate-in fade-in duration-700`} style={{ paddingTop: keyboardOpen ? '10vh' : undefined }}>
      
      <div className="w-full flex flex-col items-center z-10">
        
        {/* Title Group */}
        <div className="text-center mb-12">
            <h1 className="text-[40px] font-extrabold text-[#A855F7] mb-0 tracking-tight font-sans">
                YumeCrush
            </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-5">
            {/* Username/Email Input */}
            <input 
                type="text" 
                placeholder="用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={onFocusAny}
                onBlur={onBlurAny}
                ref={userInputRef}
                className="w-full h-[60px] px-6 rounded-2xl bg-white border border-[#F3F4F6] text-[#374151] placeholder:text-[#D1D5DB] outline-none focus:border-[#C084FC] focus:bg-white focus:ring-4 focus:ring-[#F3E8FF] transition-all text-[15px] font-medium shadow-sm"
            />
            
            {/* Password */}
            <div className="relative">
                <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={onFocusAny}
                    onBlur={onBlurAny}
                    ref={passInputRef}
                    className="w-full h-[60px] px-6 rounded-2xl bg-white border border-[#F3F4F6] text-[#374151] placeholder:text-[#D1D5DB] outline-none focus:border-[#C084FC] focus:bg-white focus:ring-4 focus:ring-[#F3E8FF] transition-all text-[15px] font-medium shadow-sm"
                />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#C084FC] transition-colors"
                >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>

            {/* Login Button */}
            {error && (
              <div className="text-red-500 text-xs font-bold">{error}</div>
            )}
            <button 
                type="submit"
                disabled={loading}
                className={`w-full h-[60px] ${loading ? 'bg-[#A855F7]/70' : 'bg-[#A855F7] hover:bg-[#9333EA]'} text-white font-bold text-[16px] rounded-2xl shadow-[0_10px_30px_rgba(168,85,247,0.3)] active:scale-[0.98] transition-all mt-4`}
            >
                {loading ? '登录中...' : '登录'}
            </button>
        </form>
      </div>
    </div>
  );
};
