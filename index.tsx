// 1. Browser Environment Polyfill
// SDK가 내부적으로 process.env를 조회할 때 에러가 나지 않도록 최상단에 배치합니다.
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: { API_KEY: '' } };
}

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- 전역 에러 캡처 ---
window.addEventListener('error', (event) => {
  const errorDisplay = document.getElementById('error-log');
  const statusText = document.getElementById('status-text');
  if (errorDisplay) {
    errorDisplay.innerText = `Error: ${event.message}\n(${event.filename}:${event.lineno})`;
    if (statusText) statusText.innerText = "초기화 중 오류가 발생했습니다.";
  }
});

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

interface User {
  username: string;
}

// --- Icons ---
const LogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 8v4" /><path d="M12 16h.01" />
  </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// --- Components ---
const MarkdownRenderer = ({ content }: { content: string }) => (
  <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </div>
);

const AuthView = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) onLogin({ username });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#09090b]">
       <div className="w-full max-w-sm glass p-10 rounded-[2.5rem] shadow-2xl">
          <div className="flex flex-col items-center mb-10 text-center">
             <div className="p-5 bg-indigo-600 rounded-3xl mb-5 shadow-xl shadow-indigo-600/30">
                <LogoIcon className="w-8 h-8 text-white" />
             </div>
             <h1 className="text-3xl font-bold tracking-tighter text-white">NEXT AI</h1>
             <p className="text-zinc-500 text-sm mt-2">Intelligence Beyond Limits</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
             <input 
               type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
               className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500/50 text-white transition-all"
               placeholder="아이디"
             />
             <input 
               type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
               className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500/50 text-white transition-all"
               placeholder="비밀번호"
             />
             <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95 mt-4">
                시작하기
             </button>
          </form>
       </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue };
    const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' };
    
    const currentInput = inputValue;
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const apiKey = (window as any).process?.env?.API_KEY;
      const ai = new GoogleGenAI({ apiKey: apiKey || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: currentInput,
        config: { systemInstruction: "당신은 NEXT AI입니다. 친절하고 전문적으로 답변하세요." }
      });

      const text = response.text || "답변을 가져오지 못했습니다.";
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1].content = text;
        return next;
      });
    } catch (err: any) {
      console.error(err);
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1].content = `오류: ${err.message || "연결에 실패했습니다."}`;
        return next;
      });
    } finally {
      setIsTyping(false);
    }
  };

  if (!user) return <AuthView onLogin={setUser} />;

  return (
    <div className="flex h-screen w-full bg-[#0c0c0e] text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-r border-zinc-800/50 bg-[#09090b]">
        <div className="p-7 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl"><LogoIcon className="w-5 h-5 text-white" /></div>
          <h1 className="text-lg font-bold text-white">NEXT AI</h1>
        </div>
        <div className="flex-1 px-4 text-zinc-600 text-xs font-bold uppercase tracking-widest mt-4">History</div>
        <div className="p-5 border-t border-zinc-800/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-medium">{user.username}</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto px-4 py-8 md:p-12 space-y-8 max-w-4xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-6 bg-indigo-600/5 rounded-3xl border border-indigo-500/10">
                <LogoIcon className="w-16 h-16 text-indigo-500" />
              </div>
              <h2 className="text-3xl font-bold text-white">무엇을 도와드릴까요?</h2>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-zinc-800' : 'bg-indigo-600'}`}>
                  {msg.role === 'user' ? <span className="text-[8px] font-bold">YOU</span> : <LogoIcon className="w-4 h-4 text-white" />}
                </div>
                <div className={`p-4 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-indigo-600/10 border border-indigo-500/20' : 'bg-zinc-900/50 border border-zinc-800'}`}>
                  <MarkdownRenderer content={msg.content || (isTyping && messages[messages.length-1].id === msg.id ? "..." : "")} />
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 md:p-10 pt-0 max-w-4xl mx-auto w-full">
          <div className="relative flex items-end gap-3 p-3 bg-[#09090b] border border-zinc-800 rounded-[1.5rem] shadow-xl focus-within:border-zinc-600 transition-all">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder="질문을 입력하세요..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-200 resize-none py-3 px-4 outline-none min-h-[50px] max-h-[200px]"
              rows={1}
            />
            <button onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping} className={`p-3.5 rounded-xl transition-all ${inputValue.trim() && !isTyping ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-600'}`}>
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Initialization ---
const init = () => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<App />);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
