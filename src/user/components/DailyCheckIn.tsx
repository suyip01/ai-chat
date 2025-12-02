import React, { useState } from 'react';
import { Sparkles, Calendar, Check } from 'lucide-react';

export const DailyCheckIn: React.FC = () => {
  const [claimed, setClaimed] = useState(false);

  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClaimed(true);
  };

  return (
    <div className="mx-6 mb-6 relative group cursor-pointer">
        {/* Decorative blur behind */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-300 to-fuchsia-300 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"></div>
        
        <div className="relative bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-3xl p-5 text-white shadow-lg overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
            {/* Background Pattern Circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full"></div>
            <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-white opacity-10 rounded-full"></div>

            <div className="flex justify-between items-center relative z-10">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="bg-white/20 px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">每日活动</span>
                        <div className="flex text-yellow-200">
                           <Sparkles size={14} className="animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold">每日签到活动</h2>
                    <p className="text-white/80 text-sm mt-1">每天签到并获得10果酱</p>
                </div>

                <button 
                    onClick={handleClaim}
                    disabled={claimed}
                    className={`
                        h-10 px-5 rounded-full font-bold text-sm shadow-md transition-all duration-300 flex items-center gap-2
                        ${claimed 
                            ? 'bg-white/20 text-white cursor-default' 
                            : 'bg-white text-primary-600 hover:bg-white/90 active:scale-95'
                        }
                    `}
                >
                    {claimed ? (
                        <>
                            <Check size={16} />
                            <span>已领取</span>
                        </>
                    ) : (
                        <>
                            <Calendar size={16} />
                            <span>立即签到</span>
                        </>
                    )}
                </button>
            </div>
            
            <div className="mt-3 text-[10px] text-white/60">
                * 韩国标准时间00:00至23:59之间可领取一次
            </div>
        </div>
    </div>
  );
};