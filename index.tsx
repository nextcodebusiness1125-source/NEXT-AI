import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface User {
  username: string;
}

// --- Icons ---
const LogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
  </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

// --- UI Components ---
const AuthView = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [id, setId] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050506] p-6">
      <div className="w-full max-w-md glass p-12 rounded-[3rem] shadow-2xl space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex p-5 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-600/30">
            <LogoIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-white">NEXTCODEAI</h1>
          <p className="text-zinc-500 font-medium">Experience the next generation of AI</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if(id.trim()) onLogin({username: id}); }} className="space-y-4">
          <input 
            type="text" placeholder="Access ID" value={id} onChange={e => setId(e.target.value)} required
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500/50 transition-all text-white"
          />
          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-5 rounded-2xl transition-all active:scale-95">
            Initialize Session
          </button>
        </form>
      </div>
    </div>
  );
};

const ChatApp = ({ user }: { user: User }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', timestamp: new Date() };
    
    const currentInput = input;
    setInput('');
    setMessages(prev => [...prev, userMsg, botMsg]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: (window as any).process.env.API_KEY || "" });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: currentInput,
        config: { systemInstruction: "Your name is NEXTCODEAI. You are a highly advanced AI developed for coding and general assistance. Be concise, precise, and helpful." }
      });
      
      const resultText = response.text || "No response received.";
      setMessages(prev => prev.map(m => m.id === botMsg.id ? { ...m, content: resultText } : m));
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === botMsg.id ? { ...m, content: `Error: ${err.message}` } : m));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#050506] overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-80 border-r border-white/5 flex-col bg-[#09090b]">
        <div className="p-8 flex items-center gap-4">
          <div className="p-2 bg-indigo-600 rounded-lg"><LogoIcon className="w-6 h-6 text-white" /></div>
          <span className="font-extrabold text-xl tracking-tighter text-white">NEXTCODEAI</span>
        </div>
        <div className="flex-1 px-8 space-y-1">
          <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-6">Recent Activities</div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-sm text-zinc-400 font-medium italic">
            No history yet...
          </div>
        </div>
        <div className="p-8 border-t border-white/5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20 uppercase">
            {user.username.slice(0,1)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">{user.username}</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Pro Developer</span>
          </div>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 max-w-5xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-700">
              <div className="relative">
                <div className="absolute inset-0 blur-3xl bg-indigo-600/20 rounded-full animate-pulse"></div>
                <LogoIcon className="w-24 h-24 text-indigo-500 relative z-10" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-5xl font-black text-white tracking-tight">System Ready.</h2>
                <p className="text-zinc-500 font-medium">Hello {user.username}, what shall we build today?</p>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex gap-6 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-4`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl ${m.role === 'user' ? 'bg-zinc-800' : 'bg-indigo-600'}`}>
                  {m.role === 'user' ? <span className="text-[10px] font-black">USER</span> : <LogoIcon className="w-6 h-6 text-white" />}
                </div>
                <div className={`flex-1 p-6 rounded-[2rem] leading-relaxed text-sm md:text-base ${m.role === 'user' ? 'bg-indigo-600/10 border border-indigo-500/20' : 'bg-zinc-900/40 border border-white/5 shadow-sm'}`}>
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content || "● ● ●"}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} className="h-4" />
        </div>

        {/* Input area */}
        <div className="p-6 md:p-12 pt-0 max-w-5xl mx-auto w-full">
          <div className="glass p-2 rounded-[2.5rem] flex items-center gap-2 shadow-2xl focus-within:ring-2 ring-indigo-500/20 transition-all border border-white/10">
            <textarea 
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask NEXTCODEAI anything..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-white p-4 resize-none min-h-[50px] max-h-[200px] font-medium"
              rows={1}
            />
            <button 
              onClick={handleSend} disabled={!input.trim() || loading}
              className={`p-5 rounded-3xl transition-all ${input.trim() && !loading ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 active:scale-90' : 'bg-zinc-900 text-zinc-700'}`}
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4 flex justify-center gap-6 text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em]">
            <span>Advanced LLM Core</span>
            <span>Secure Interface</span>
            <span>Real-time Sync</span>
          </div>
        </div>
      </main>
    </div>
  );
};

const Root = () => {
  const [user, setUser] = useState<User | null>(null);
  
  // 초기화 완료 시 로딩 화면 제거
  useEffect(() => {
    const loadingScreen = document.querySelector('.loading-screen') as HTMLElement;
    if (loadingScreen) loadingScreen.style.display = 'none';
  }, []);

  return user ? <ChatApp user={user} /> : <AuthView onLogin={setUser} />;
};

// --- Initialization ---
const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<Root />);
}
