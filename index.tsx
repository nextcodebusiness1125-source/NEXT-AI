import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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

// --- Components ---
const AuthView = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [name, setName] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#050506]">
      <div className="w-full max-w-sm glass p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="p-4 bg-indigo-600 rounded-2xl mb-6 shadow-xl shadow-indigo-600/20">
            <LogoIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase">NextCodeAI</h1>
          <p className="text-zinc-500 text-xs mt-2 font-mono uppercase tracking-widest">Neural Link v1.0</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); if(name.trim()) onLogin({username: name}); }} className="space-y-4">
          <input 
            type="text" required placeholder="IDENTIFIER" value={name} onChange={e => setName(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-5 py-4 focus:outline-none focus:border-indigo-500/50 text-white transition-all font-mono text-sm placeholder-zinc-700"
          />
          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 text-sm uppercase tracking-widest">
            Enter System
          </button>
        </form>
      </div>
    </div>
  );
};

const ChatApp = ({ user }: { user: User }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: currentInput };
    const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' };
    setMessages(prev => [...prev, userMsg, botMsg]);

    try {
      const ai = new GoogleGenAI({ apiKey: (window as any).process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: currentInput,
        config: { systemInstruction: "You are NEXTCODEAI, a terminal-based advanced intelligence. Be precise, technical, and clean." }
      });
      const text = response.text || "SYSTEM ERROR: NO RESPONSE";
      setMessages(prev => prev.map(m => m.id === botMsg.id ? { ...m, content: text } : m));
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === botMsg.id ? { ...m, content: `CRITICAL ERROR: ${err.message}` } : m));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#050506] font-sans">
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800/50 bg-[#09090b]">
        <div className="p-8 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg"><LogoIcon className="w-4 h-4 text-white" /></div>
          <span className="font-black text-sm tracking-tighter text-white uppercase">NextCodeAI</span>
        </div>
        <div className="flex-1 px-8 py-4 space-y-2">
          <div className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Core Files</div>
          <div className="text-xs text-zinc-500 font-mono hover:text-indigo-400 cursor-pointer transition-colors">/root/main.sh</div>
          <div className="text-xs text-zinc-500 font-mono hover:text-indigo-400 cursor-pointer transition-colors">/logs/session.log</div>
        </div>
        <div className="p-8 border-t border-zinc-800/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white">{user.username[0].toUpperCase()}</div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-bold text-zinc-300 truncate">{user.username}</span>
            <span className="text-[9px] text-green-500 font-mono">STATUS: ONLINE</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-y-auto px-6 py-10 md:px-12 space-y-8 max-w-4xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-indigo-600/10 rounded-3xl flex items-center justify-center mb-6 animate-pulse border border-indigo-500/20">
                <LogoIcon className="w-8 h-8 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">System Online.</h2>
              <p className="text-zinc-600 text-xs font-mono mt-2 uppercase tracking-widest">Waiting for input...</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex gap-5 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-zinc-800' : 'bg-indigo-600 shadow-lg shadow-indigo-600/20'}`}>
                  {m.role === 'user' ? <span className="text-[8px] font-black text-zinc-500">USR</span> : <LogoIcon className="w-4 h-4 text-white" />}
                </div>
                <div className={`flex-1 p-5 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600/10 border border-indigo-500/10 text-right' : 'bg-zinc-900/50 border border-zinc-800/50 shadow-sm'}`}>
                  <div className="prose prose-invert max-w-none font-mono text-zinc-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "..."}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} className="h-2" />
        </div>

        <div className="p-6 md:p-12 pt-0 max-w-4xl mx-auto w-full">
          <div className="relative glass p-2 rounded-2xl flex items-center gap-2 border border-zinc-800/50 focus-within:border-indigo-500/30 transition-all">
            <input 
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter') handleSend(); }}
              placeholder="Execute command..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-white p-4 font-mono text-xs uppercase tracking-wider"
            />
            <button 
              onClick={handleSend} disabled={!input.trim() || isTyping}
              className={`p-4 rounded-xl transition-all ${input.trim() && !isTyping ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 active:scale-95' : 'bg-zinc-900 text-zinc-700'}`}
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center mt-6 text-[8px] text-zinc-700 font-mono uppercase tracking-[0.5em]">Neural Processing Interface Ready</p>
        </div>
      </main>
    </div>
  );
};

const Root = () => {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const loading = document.querySelector('.loading-screen') as HTMLElement;
    if (loading) loading.style.display = 'none';
  }, []);
  return user ? <ChatApp user={user} /> : <AuthView onLogin={setUser} />;
};

const container = document.getElementById('root');
if (container) createRoot(container).render(<Root />);
