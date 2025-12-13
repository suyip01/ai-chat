import { useState, useEffect, useRef } from 'react';
import { Message } from '../../types';

/**
 * 聊天 UI 交互 Hook
 * 管理滚动、输入框自适应、视口高度调整（软键盘适配）以及背景亮度检测
 */
export const useChatUI = (messages: Message[], isTyping: boolean, input: string) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 视口样式，用于移动端软键盘弹起时的页面高度适配
    const [viewportStyle, setViewportStyle] = useState<{ height: string | number; top: string | number }>({ height: '100%', top: 0 });

    // 背景是否为深色，用于调整文字颜色
    const [isBgDark, setIsBgDark] = useState<boolean | null>(null);

    // 滚动到底部
    const scrollToBottom = () => {
        if (contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // 自动调整输入框高度
    const resizeTextarea = () => {
        const ta = textareaRef.current
        if (!ta) return
        try {
            const styles = window.getComputedStyle(ta)
            const lineHeight = parseFloat(styles.lineHeight || '22') || 22
            const maxH = parseFloat(styles.maxHeight || '0') || (lineHeight * 4)
            ta.style.height = 'auto'
            const sc = ta.scrollHeight
            const next = Math.min(sc, maxH)
            ta.style.height = `${Math.max(next, 22)}px`
        } catch {
            ta.style.height = 'auto'
            const sc = ta.scrollHeight
            ta.style.height = `${Math.max(Math.min(sc, 96), 22)}px`
        }
    }

    // 当消息列表或正在输入状态变化时，滚动到底部并调整输入框
    useEffect(() => {
        scrollToBottom();
        resizeTextarea();
    }, [messages, isTyping]);

    // 当输入内容变化时，使用 RAF 调整输入框高度，确保流畅
    useEffect(() => {
        const raf = requestAnimationFrame(() => resizeTextarea())
        return () => cancelAnimationFrame(raf)
    }, [input])

    // 监听 VisualViewport 变化（主要针对移动端软键盘）
    useEffect(() => {
        const handleVisualViewport = () => {
            if (window.visualViewport) {
                setViewportStyle({
                    height: `${window.visualViewport.height}px`,
                    top: `${window.visualViewport.offsetTop}px`
                });

                if (contentRef.current) {
                    contentRef.current.scrollTop = contentRef.current.scrollHeight;
                }
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleVisualViewport);
            window.visualViewport.addEventListener('scroll', handleVisualViewport);
            handleVisualViewport();
        }

        const onResize = () => {
            if (!window.visualViewport) {
                if (contentRef.current) {
                    contentRef.current.scrollTop = contentRef.current.scrollHeight;
                } else {
                    scrollToBottom();
                }
            }
        }
        window.addEventListener('resize', onResize)

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleVisualViewport);
                window.visualViewport.removeEventListener('scroll', handleVisualViewport);
            }
            window.removeEventListener('resize', onResize)
        }
    }, [])

    // 分析背景图亮度，src 为图片 URL/Base64
    const analyzeBgBrightness = (src?: string) => {
        if (!src) return;
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = src;
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const w = 32, h = 32;
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    ctx.drawImage(img, 0, 0, w, h);
                    const data = ctx.getImageData(0, 0, w, h).data;
                    let sum = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i], g = data[i + 1], b = data[i + 2];
                        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                        sum += lum;
                    }
                    const avg = sum / (w * h);
                    setIsBgDark(avg < 128); // 平均亮度小于 128 认为是深色背景
                } catch { }
            };
        } catch { }
    };

    return {
        messagesEndRef,
        contentRef,
        textareaRef,
        viewportStyle,
        isBgDark,
        setIsBgDark,
        scrollToBottom,
        resizeTextarea,
        analyzeBgBrightness
    };
};
