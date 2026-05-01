import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Plus,
  Smile,
  Image as ImageIcon,
  Phone,
  Video,
  MoreHorizontal,
  Search,
  MessageSquare,
  Users,
  Settings,
  Circle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

import { ADVISORS, AdvisorPersona, ChatMessage } from './types';
import { ChatService } from './services/chatService';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAdvisorIds, setActiveAdvisorIds] = useState<string[]>(ADVISORS.map(a => a.id));
  const [typingAdvisors, setTypingAdvisors] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [userName, setUserName] = useState('Lord');
  const [userAvatar, setUserAvatar] = useState('https://api.dicebear.com/7.x/initials/svg?seed=Salin');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [currentView, setCurrentView] = useState<'chats' | 'contacts' | 'moments'>('chats');
  const [selectedContact, setSelectedContact] = useState<AdvisorPersona | null>(null);
  const [moments, setMoments] = useState<{ id: string, authorId: string, content: string, timestamp: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMoments([
      { id: '1', authorId: 'zhuge-liang', content: '淡泊以明志，宁静以致远。 Strategy is the art of seeing what is invisible to others.', timestamp: Date.now() - 3600000 },
      { id: '2', authorId: 'marcus-aurelius', content: 'The happiness of your life depends upon the quality of your thoughts. Stay virtuous.', timestamp: Date.now() - 7200000 },
      { id: '3', authorId: 'cao-cao', content: '宁我负人，毋人负我。 Power is the only currency that never devalues.', timestamp: Date.now() - 10800000 },
    ]);
  }, []);

  const COMMON_EMOJIS = ["👍", "🙏", "😮", "🤔", "😅", "🔥", "💯", "🍵", "🏮", "⚔️", "🏛️", "📜"];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingAdvisors]);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    if (val.endsWith('@')) {
      setShowMentions(true);
    } else if (!val.includes('@') || val.endsWith(' ')) {
      setShowMentions(false);
    }
  };

  const insertMention = (name: string) => {
    setInput(prev => prev + name + ' ');
    setShowMentions(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      senderId: 'user',
      senderName: userName,
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const currentHistory = [...messages, userMessage];
      const responders = await ChatService.decideWhoResponds(currentHistory, activeAdvisorIds);

      for (const advisorId of responders) {
        setTypingAdvisors(prev => [...prev, advisorId]);
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));

        const response = await ChatService.getAdvisorResponse(advisorId, [...currentHistory]);
        setMessages(prev => [...prev, response]);
        currentHistory.push(response);
        setTypingAdvisors(prev => prev.filter(id => id !== advisorId));

        if (Math.random() > 0.6) {
          const othersInGroup = activeAdvisorIds.filter(id => id !== advisorId);
          if (othersInGroup.length > 0) {
            const nextResponder = othersInGroup[Math.floor(Math.random() * othersInGroup.length)];
            setTypingAdvisors(prev => [...prev, nextResponder]);
            await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
            const followUp = await ChatService.getAdvisorResponse(nextResponder, [...currentHistory]);
            setMessages(prev => [...prev, followUp]);
            currentHistory.push(followUp);
            setTypingAdvisors(prev => prev.filter(id => id !== nextResponder));
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdvisor = (id: string) => {
    setActiveAdvisorIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="h-screen w-full bg-[#f5f5f5] flex overflow-hidden font-sans text-black">
      <aside className="w-[64px] bg-[#2e2e2e] flex flex-col items-center py-6 gap-8 shrink-0">
        <div className="w-9 h-9 bg-zinc-600 rounded-md overflow-hidden p-0.5">
          <img src={userAvatar} className="w-full h-full rounded" />
        </div>
        <div className="flex flex-col gap-8 text-[#9b9b9b]">
          <MessageSquare
            className={`w-6 h-6 cursor-pointer transition-colors ${currentView === 'chats' ? 'text-[#07c160]' : 'hover:text-white'}`}
            onClick={() => setCurrentView('chats')}
          />
          <Users
            className={`w-6 h-6 cursor-pointer transition-colors ${currentView === 'contacts' ? 'text-[#07c160]' : 'hover:text-white'}`}
            onClick={() => setCurrentView('contacts')}
          />
          <Circle
            className={`w-6 h-6 cursor-pointer transition-colors ${currentView === 'moments' ? 'text-[#07c160]' : 'hover:text-white'}`}
            onClick={() => setCurrentView('moments')}
          />
          <Settings className="w-6 h-6 hover:text-white transition-colors cursor-pointer mb-auto" />
        </div>
      </aside>

      <aside className="w-[300px] bg-[#e6e5e4] border-r border-[#d6d6d6] flex flex-col shrink-0">
        <div className="p-4 flex gap-2">
          <div className="flex-1 bg-[#dbd9d8] flex items-center px-2 rounded-md h-7">
            <Search className="w-4 h-4 text-[#666] mr-1" />
            <input placeholder="Search" className="bg-transparent border-none outline-none text-[12px] w-full" />
          </div>
          <Button variant="ghost" size="icon" className="w-7 h-7 bg-[#dbd9d8]">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {currentView === 'chats' ? (
            <div
              className={`p-3 flex gap-3 cursor-pointer transition-colors border-b border-black/5 ${currentView === 'chats' ? 'bg-[#c6c5c4]' : 'hover:bg-[#d6d6d6]'}`}
              onClick={() => setCurrentView('chats')}
            >
              <div className="w-10 h-10 bg-zinc-300 rounded grid grid-cols-2 gap-0.5 p-0.5 shrink-0 overflow-hidden">
                {ADVISORS.map(a => (
                  <img key={a.id} src={a.avatar} className="w-full h-full object-cover" />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <span className="font-medium text-sm truncate">History Masterminds</span>
                  <span className="text-[10px] text-[#999]">14:24</span>
                </div>
                <p className="text-[12px] text-[#999] truncate">
                  {messages.length > 0 ? messages[messages.length - 1].content : "No messages yet"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="px-4 py-2 text-[10px] uppercase text-[#999] font-bold tracking-wider">Historical Masters</div>
              {ADVISORS.map(a => (
                <div
                  key={a.id}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors border-b border-black/5 ${selectedContact?.id === a.id ? 'bg-[#c6c5c4]' : 'hover:bg-[#d6d6d6]'}`}
                  onClick={() => setSelectedContact(a)}
                >
                  <Avatar className="w-9 h-9 rounded">
                    <AvatarImage src={a.avatar} className="rounded" />
                    <AvatarFallback className="rounded bg-zinc-300">{a.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{a.name.split(' (')[0]}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      <main className="flex-1 flex flex-col bg-[#f5f5f5] relative">
        {currentView === 'chats' ? (
          <>
            <AnimatePresence>
              {showMentions && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-[200px] left-6 w-[200px] bg-white border border-[#e1e1e1] shadow-xl rounded-md z-[100] overflow-hidden"
                >
                  {ADVISORS.filter(a => activeAdvisorIds.includes(a.id)).map(a => (
                    <button
                      key={a.id}
                      onClick={() => insertMention(a.shortName)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#f2f2f2] transition-colors"
                    >
                      <Avatar className="w-6 h-6 rounded">
                        <AvatarImage src={a.avatar} className="rounded" />
                      </Avatar>
                      <span className="text-sm font-medium">{a.shortName}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <header className="h-[60px] border-b border-[#e1e1e1] flex items-center justify-between px-6 bg-[#f5f5f5] shrink-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-medium">History Masterminds ({activeAdvisorIds.length + 1})</h1>
              </div>
              <div className="flex items-center gap-6 text-[#666] relative">
                <Phone className="w-5 h-5 cursor-pointer hover:text-black" />
                <Video className="w-5 h-5 cursor-pointer hover:text-black" />
                <div className="relative">
                  <MoreHorizontal
                    className={`w-6 h-6 cursor-pointer hover:text-black ${showSettings ? 'text-black' : ''}`}
                    onClick={() => setShowSettings(!showSettings)}
                  />

                  <AnimatePresence>
                    {showSettings && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowSettings(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 top-10 w-[280px] bg-white border border-[#e1e1e1] shadow-xl rounded-md z-50 p-4"
                        >
                          <h3 className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-4">My Profile</h3>
                          <div className="space-y-4 mb-6 pt-2">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-12 h-12 rounded bg-zinc-100">
                                <AvatarImage src={userAvatar} className="rounded" />
                              </Avatar>
                              <div className="flex-1 space-y-1">
                                  <label className="text-[10px] uppercase text-[#999]">Lord Name</label>
                                  <input
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className="w-full text-sm font-medium border-b border-[#f0f0f0] outline-none pb-1"
                                    placeholder="Enter name..."
                                  />
                              </div>
                            </div>
                            <div className="flex-1 space-y-1">
                              <label className="text-[10px] uppercase text-[#999]">Avatar URL</label>
                              <input
                                value={userAvatar}
                                onChange={(e) => setUserAvatar(e.target.value)}
                                className="w-full text-[10px] border-b border-[#f0f0f0] outline-none pb-1 font-mono"
                                placeholder="Image URL..."
                              />
                            </div>
                          </div>

                          <h3 className="text-[12px] font-bold text-[#999] uppercase tracking-wider mb-4">Group Members</h3>
                          <div className="space-y-3">
                            {ADVISORS.map(a => (
                              <div key={a.id} className="flex items-center gap-3">
                                <Avatar className="w-8 h-8 rounded shrink-0">
                                  <AvatarImage src={a.avatar} className="rounded" />
                                </Avatar>
                                <span className="text-sm flex-1">{a.name.split(' (')[0]}</span>
                                <button
                                  onClick={() => toggleAdvisor(a.id)}
                                  className={`px-3 py-1 rounded text-[10px] transition-all border ${
                                    activeAdvisorIds.includes(a.id)
                                    ? 'bg-[#07c160] border-[#07c160] text-white'
                                    : 'bg-[#f5f5f5] border-[#ddd] text-zinc-400 hover:border-zinc-400'
                                  }`}
                                >
                                  {activeAdvisorIds.includes(a.id) ? 'Added' : 'Add'}
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="mt-6 pt-4 border-t border-[#f0f0f0]">
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 text-[12px] h-8 p-0 px-2"
                              onClick={() => {
                                setMessages([]);
                                setShowSettings(false);
                              }}
                            >
                              Clear Chat History
                            </Button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-10">
                  <span className="bg-[#dadada] text-white text-[11px] px-2 py-1 rounded-sm">
                    Welcome to "History Masterminds". Start your quest.
                  </span>
                </div>
              )}

              <AnimatePresence>
                {messages.map((msg) => {
                  const isUser = msg.senderId === 'user';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <Avatar className="w-10 h-10 rounded shrink-0">
                        <AvatarImage src={isUser ? userAvatar : msg.avatar} className="rounded" />
                        <AvatarFallback className="rounded bg-zinc-300">{msg.senderName[0]}</AvatarFallback>
                      </Avatar>
                      <div className={`flex flex-col gap-1 max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
                        {!isUser && (
                          <span className="text-[11px] text-[#666] ml-1">{msg.senderName}</span>
                        )}
                        <div
                          className={`relative p-3 rounded-md text-[14px] leading-relaxed shadow-sm ${
                            isUser
                              ? 'bg-[#95ec69] text-black rounded-tr-none'
                              : 'bg-white text-black rounded-tl-none'
                          }`}
                        >
                          <div className={`absolute top-0 w-0 h-0 border-[6px] border-transparent ${
                            isUser
                              ? 'border-t-[#95ec69] right-[-11px] border-l-[#95ec69]'
                              : 'border-t-white left-[-11px] border-r-white'
                          }`} />

                          <p>{msg.content}</p>
                          {msg.translation && (
                            <div className="mt-2 text-[12px] opacity-60 border-t border-black/5 pt-2">
                              {msg.translation}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {typingAdvisors.length > 0 && (
                <div className="flex gap-3">
                  <Avatar className="w-10 h-10 rounded shrink-0 grayscale opacity-50">
                    <AvatarFallback className="rounded bg-zinc-200">...</AvatarFallback>
                  </Avatar>
                  <div className="bg-[#dbdbdb] px-3 py-2 rounded-md flex gap-1 items-center mt-4">
                    <div className="w-1.5 h-1.5 bg-[#888] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-[#888] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-[#888] rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            <footer className="h-[200px] border-t border-[#e1e1e1] bg-white flex flex-col relative">
              <AnimatePresence>
                {showEmoji && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-12 left-6 bg-white border border-[#e1e1e1] p-3 shadow-xl rounded-md z-50 w-[240px]"
                    >
                      <div className="grid grid-cols-4 gap-2">
                        {COMMON_EMOJIS.map(e => (
                          <button
                            key={e}
                            onClick={() => { setInput(prev => prev + e); setShowEmoji(false); }}
                            className="text-2xl hover:bg-zinc-100 p-2 rounded transition-colors"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div className="h-10 flex items-center px-6 gap-6 text-[#666]">
                <Smile className={`w-5 h-5 cursor-pointer hover:text-black ${showEmoji ? 'text-black' : ''}`} onClick={() => setShowEmoji(!showEmoji)} />
                <ImageIcon className="w-5 h-5 cursor-pointer hover:text-black" />
                <Search className="w-5 h-5 cursor-pointer hover:text-black" />
                <Plus className="w-5 h-5 cursor-pointer hover:text-black" />
              </div>
              <div className="flex-1 p-6 pt-0">
                <textarea
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="w-full h-full resize-none border-none outline-none text-[15px] placeholder:text-[#ccc]"
                  placeholder="Type a message... (Use @ to mention)"
                />
              </div>
              <div className="h-12 px-6 flex justify-end items-start pb-4">
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || loading}
                  className="bg-[#f5f5f5] hover:bg-[#e1e1e1] text-[#999] hover:text-[#07c160] h-8 px-8 border border-[#e1e1e1] font-normal rounded-sm"
                >
                  Send (S)
                </Button>
              </div>
            </footer>
          </>
        ) : currentView === 'moments' ? (
          <div className="flex-1 overflow-y-auto bg-white">
            <header className="h-[60px] border-b border-[#e1e1e1] flex items-center px-6 bg-[#f5f5f5] sticky top-0 z-10 shrink-0">
               <h1 className="text-lg font-medium">Moments</h1>
            </header>
            <div className="max-w-[600px] mx-auto py-10 px-6 space-y-12">
               {moments.map(moment => {
                 const advisor = ADVISORS.find(a => a.id === moment.authorId);
                 return (
                   <div key={moment.id} className="flex gap-4 border-b border-[#f0f0f0] pb-8">
                     <Avatar className="w-10 h-10 rounded shrink-0">
                       <AvatarImage src={advisor?.avatar} className="rounded" />
                     </Avatar>
                     <div className="flex-1 space-y-2">
                       <h3 className="text-[#576b95] font-bold text-[14px]">{advisor?.name}</h3>
                       <p className="text-[15px] leading-relaxed text-black">{moment.content}</p>
                       <div className="flex justify-between items-center pt-2">
                         <span className="text-[11px] text-[#999]">
                           {new Date(moment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                         <div className="bg-[#f7f7f7] p-1 rounded cursor-pointer hover:bg-[#e1e1e1]">
                           <MoreHorizontal className="w-4 h-4 text-[#576b95]" />
                         </div>
                       </div>
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {selectedContact ? (
              <motion.div
                key={selectedContact.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center pt-[100px] bg-[#f5f5f5]"
              >
                <div className="w-full max-w-[400px] flex flex-col items-center">
                  <div className="flex items-start w-full gap-5 border-b border-[#e1e1e1] pb-10 mb-8">
                     <Avatar className="w-[64px] h-[64px] rounded">
                        <AvatarImage src={selectedContact.avatar} className="rounded" />
                        <AvatarFallback className="rounded bg-zinc-300">{selectedContact.name[0]}</AvatarFallback>
                     </Avatar>
                     <div className="flex-1">
                        <h2 className="text-xl font-bold mb-1">{selectedContact.name}</h2>
                        <p className="text-sm text-[#999] mb-4">Master ID: {selectedContact.id}</p>
                        <div className="flex flex-col gap-2">
                           <div className="text-[13px]"><span className="text-[#999] mr-4">Title</span> {selectedContact.title}</div>
                           <div className="text-[13px]"><span className="text-[#999] mr-4">Region</span> {selectedContact.id === 'marcus-aurelius' ? 'Rome' : 'China'}</div>
                        </div>
                     </div>
                  </div>

                  <div className="w-full px-6 text-sm text-center italic text-[#666] mb-10 leading-relaxed">
                    "{selectedContact.bio}"
                  </div>

                  <Button
                    className="bg-[#07c160] hover:bg-[#06ae56] text-white px-10 py-5 h-auto text-[15px] font-medium rounded-sm"
                    onClick={() => setCurrentView('chats')}
                  >
                    Messages
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[#f5f5f5]">
                 <Users className="w-24 h-24 text-[#e1e1e1]" />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
