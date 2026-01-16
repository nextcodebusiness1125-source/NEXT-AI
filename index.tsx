// 1. 전역 에러 핸들러 (디버깅용)
window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('Fatal Error: ', msg, error);
  const root = document.getElementById('root');
  if (root && root.innerText.includes('초기화')) {
    root.innerHTML = `<div style="padding: 20px; color: #f87171; font-family: sans-serif; font-size: 14px;">
      <b>애플리케이션 실행 오류가 발생했습니다.</b><br/>
      ${msg}<br/>
      <small style="color: #52525b;">개발자 도구(F12)의 Console 탭을 확인해주세요.</small>
    </div>`;
  }
  return false;
};

// 2. Browser Environment Polyfill (Gemini SDK 대응)
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = { env: { API_KEY: '' } };
}

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface User {
  username: string;
  createdAt: number;
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

const MessageIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const LogOutIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const ShareIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);

// --- Components ---
const CodeBlock = ({ children, className }: { children: any; className?: string }) => {
  const [copied, setCopied] = useState(false);
  const language = className ? className.replace('language-', '') : '';
  const code = String(children).replace(/\n$/, '');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!className) {
    return <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-[13px]">{children}</code>;
  }

  return (
    <div className="my-6 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden group">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/50 border-b border-zinc-800">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{language || 'code'}</span>
        <button onClick={copyToClipboard} className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors">
          {copied ? <span className="text-[10px] text-emerald-400 font-bold tracking-tight">COPIED!</span> : <CopyIcon className="w-3.5 h-3.5 text-zinc-500 hover:text-white" />}
        </button>
      </div>
      <pre className="p-5 overflow-x-auto text-[13px] leading-relaxed font-mono text-zinc-300 custom-scrollbar">
        <code>{children}</code>
      </pre>
    </div>
  );
};

const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed text-zinc-300">{children}</p>,
          h1: ({ children }) => <h1 className="text-2xl font-bold text-white mt-8 mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold text-white mt-6 mb-3">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold text-white mt-5 mb-2">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc ml-6 mb-4 space-y-2 text-zinc-300">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-6 mb-4 space-y-2 text-zinc-300">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-indigo-400">{children}</strong>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-500 bg-zinc-900/50 px-5 py-3 my-4 italic text-zinc-400 rounded-r-lg">{children}</blockquote>,
          hr: () => <hr className="border-zinc-800 my-8" />,
          a: ({ children, href }) => <a href={href} className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4" target="_blank" rel="noopener noreferrer">{children}</a>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const AuthView = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const users = JSON.parse(localStorage.getItem('nextai_users') || '[]');
    
    if (isLogin) {
      const user = users.find((u: any) => u.username === username && u.password === password);
      if (user) onLogin({ username: user.username, createdAt: user.createdAt });
      else setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    } else {
      if (username.length < 3) return setError('아이디는 3자 이상이어야 합니다.');
      if (password.length < 4) return setError('비밀번호는 4자 이상이어야 합니다.');
      if (users.some((u: any) => u.username === username)) return setError('이미 존재하는 아이디입니다.');
      
      const newUser = { username, password, createdAt: Date.now() };
      users.push(newUser);
      localStorage.setItem('nextai_users', JSON.stringify(users));
      alert('회원가입 완료! 이제 로그인하세요.');
      setIsLogin(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#09090b]">
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[150px] rounded-full"></div>
       </div>
       
       <div className="w-full max-w-sm glass p-10 rounded-[2.5rem] relative z-10 shadow-2xl">
          <div className="flex flex-col items-center mb-10">
             <div className="p-5 bg-indigo-600 rounded-3xl mb-5 shadow-2xl shadow-indigo-600/40">
                <LogoIcon className="w-8 h-8 text-white" />
             </div>
             <h1 className="text-3xl font-bold tracking-tighter text-white">NEXT AI</h1>
             <p className="text-zinc-500 text-sm mt-2">{isLogin ? '환영합니다! 다시 시작하세요' : '새로운 미래를 시작하세요'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
             <input 
               type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
               className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500/50 transition-all text-white placeholder-zinc-600"
               placeholder="아이디"
             />
             <input 
               type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
               className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500/50 transition-all text-white placeholder-zinc-600"
               placeholder="비밀번호"
             />
             {error && <p className="text-red-400 text-xs text-center font-medium">{error}</p>}
             <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 mt-4">
                {isLogin ? '로그인' : '계정 생성'}
             </button>
          </form>

          <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-8 text-xs font-semibold text-zinc-500 hover:text-indigo-400 transition-colors tracking-widest uppercase">
             {isLogin ? 'CREATE NEW ACCOUNT' : 'BACK TO LOGIN'}
          </button>
       </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('nextai_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`nextai_chats_${user.username}`);
      const initialSessions = saved ? JSON.parse(saved) : [{ id: 'default', title: '새로운 대화', messages: [], createdAt: Date.now() }];
      setSessions(initialSessions);
      setActiveSessionId(initialSessions[0]?.id || 'default');
      sessionStorage.setItem('nextai_session', JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    if (user && sessions.length > 0) {
      localStorage.setItem(`nextai_chats_${user.username}`, JSON.stringify(sessions));
    }
  }, [sessions, user]);

  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId) || sessions[0], [sessions, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const currentInput = inputValue;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: currentInput, timestamp: Date.now() };
    const assistantPlaceholder: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', timestamp: Date.now() };

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        let title = s.title === '새로운 대화' ? currentInput.slice(0, 30) + (currentInput.length > 30 ? '...' : '') : s.title;
        return { ...s, messages: [...s.messages, userMessage, assistantPlaceholder], title };
      }
      return s;
    }));

    setInputValue('');
    setIsTyping(true);

    try {
      // process.env.API_KEY는 환경 변수 주입 시에만 유효합니다.
      const apiKey = (window as any).process?.env?.API_KEY || (process?.env?.API_KEY);
      const ai = new GoogleGenAI({ apiKey: apiKey || '' });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: { systemInstruction: `당신은 NEXT AI입니다. 사용자의 질문에 전문적이고 친절하게 답변하세요.` }
      });

      const result = await chat.sendMessageStream({ message: currentInput });
      let fullText = "";
      for await (const chunk of result) {
        fullText += chunk.text;
        setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            const msgs = [...s.messages];
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: fullText };
            return { ...s, messages: msgs };
          }
          return s;
        }));
      }
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message?.includes('API_KEY') 
        ? "API 키 설정이 필요합니다. 환경 변수를 확인해주세요." 
        : "오류가 발생했습니다. 다시 시도해주세요.";
        
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          const msgs = [...s.messages];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: errorMsg };
          return { ...s, messages: msgs };
        }
        return s;
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSession = { id: newId, title: '새로운 대화', messages: [], createdAt: Date.now() };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newId);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    if (filtered.length === 0) {
      const defaultS = { id: 'default', title: '새로운 대화', messages: [], createdAt: Date.now() };
      setSessions([defaultS]);
      setActiveSessionId('default');
    } else {
      setSessions(filtered);
      if (activeSessionId === id) setActiveSessionId(filtered[0].id);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  if (!user) return <AuthView onLogin={setUser} />;

  return (
    <div className="flex h-screen w-full bg-[#0c0c0e] text-zinc-100 overflow-hidden relative">
      {showShareToast && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold animate-in fade-in slide-in-from-top-4 duration-300">
          URL 복사됨! 🚀
        </div>
      )}

      <aside className="hidden md:flex flex-col w-72 border-r border-zinc-800/50 bg-[#09090b] z-20">
        <div className="p-7 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl"><LogoIcon className="w-5 h-5 text-white" /></div>
          <h1 className="text-lg font-bold text-white">NEXT AI</h1>
        </div>

        <button onClick={createNewSession} className="mx-4 mb-6 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border border-zinc-800 hover:bg-zinc-900 transition-all">
          <PlusIcon className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-400">새로운 대화</span>
        </button>

        <div className="flex-1 overflow-y-auto px-3 space-y-1.5">
          {sessions.map(session => (
            <div key={session.id} onClick={() => setActiveSessionId(session.id)} className={`group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all ${activeSessionId === session.id ? 'bg-zinc-900 border border-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'}`}>
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageIcon className={`w-4 h-4 flex-shrink-0 ${activeSessionId === session.id ? 'text-indigo-400' : 'text-zinc-600'}`} />
                <span className="text-sm truncate font-medium">{session.title}</span>
              </div>
              <button onClick={(e) => deleteSession(e, session.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 rounded">
                <TrashIcon className="w-3.5 h-3.5 text-zinc-500 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-zinc-800/50 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-[11px] font-black text-white">
                  {user.username.slice(0, 2).toUpperCase()}
               </div>
               <span className="text-sm font-semibold truncate text-zinc-300">{user.username}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={handleShare} className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-600 hover:text-indigo-400"><ShareIcon className="w-4 h-4" /></button>
              <button onClick={() => { sessionStorage.clear(); window.location.reload(); }} className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-600 hover:text-red-400"><LogOutIcon className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-[#0c0c0e]">
        <div className="flex-1 overflow-y-auto px-4 py-8 md:p-12 space-y-10 max-w-4xl mx-auto w-full custom-scrollbar">
          {(!activeSession || activeSession.messages.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
              <div className="p-8 bg-indigo-600/5 rounded-[2.5rem] border border-indigo-500/10 animate-glow">
                <LogoIcon className="w-20 h-20 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-4xl font-black text-white mb-3">반갑습니다, {user.username}님.</h2>
                <p className="text-zinc-500 text-lg">무엇이든 물어보세요. NEXT AI가 답변해 드립니다.</p>
              </div>
            </div>
          ) : (
            activeSession.messages.map((msg) => (
              <div key={msg.id} className={`flex gap-5 md:gap-7 ${msg.role === 'user' ? 'flex-row-reverse' : ''} message-appear`}>
                <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${msg.role === 'user' ? 'bg-zinc-800 border border-zinc-700' : 'bg-indigo-600'}`}>
                  {msg.role === 'user' ? <span className="text-[9px] font-black text-zinc-400">YOU</span> : <LogoIcon className="w-5 h-5 text-white" />}
                </div>
                <div className={`max-w-[88%] space-y-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block w-full ${msg.role === 'user' ? 'bg-zinc-900/50 px-6 py-4 rounded-[1.5rem] border border-zinc-800 ml-auto w-auto' : ''}`}>
                    <MarkdownRenderer content={msg.content || '...'} />
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>

        <div className="p-5 md:p-10 pt-0 max-w-4xl mx-auto w-full">
          <div className="relative group flex items-end gap-3 p-3.5 bg-[#09090b] border border-zinc-800 rounded-[1.8rem] focus-within:border-zinc-600">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder="질문을 입력하세요..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-200 resize-none py-3 px-4 outline-none min-h-[56px]"
              rows={1}
            />
            <button onClick={handleSendMessage} disabled={!inputValue.trim() || isTyping} className={`p-4 rounded-2xl ${inputValue.trim() && !isTyping ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-600'}`}>
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-4 text-center text-[10px] text-zinc-700 font-bold uppercase tracking-widest">Next-Generation Intelligence</p>
        </div>
      </main>
    </div>
  );
};

// --- Initialization ---
const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
