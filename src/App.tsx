import { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
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

import { ADVISORS, AdvisorPersona, ChatMessage, ChatGroup, advisorRegionLabel } from './types';
import { ChatService } from './services/chatService';
import { loadPersistedGroupsState, savePersistedGroupsState, newId } from './storage/groupsPersistence';
import { EMOJI_CATEGORIES } from './constants/emojiCategories';
import { CreateGroupModal } from './components/CreateGroupModal';

export default function App() {
  const [persistedBundle] = useState(() => loadPersistedGroupsState());
  const [groups, setGroups] = useState<ChatGroup[]>(() => persistedBundle.groups);
  const [activeGroupId, setActiveGroupId] = useState(() => persistedBundle.activeGroupId);
  const [editingGroupName, setEditingGroupName] = useState(false);

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) ?? groups[0],
    [groups, activeGroupId],
  );

  const messages = activeGroup?.messages ?? [];
  const activeAdvisorIds = activeGroup?.activeAdvisorIds ?? [];

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingAdvisors, setTypingAdvisors] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [userName, setUserName] = useState('Lord');
  /** Dicebear “notionists” style (not initials); avatar updates when you change your name. */
  const userAvatarUrl = useMemo(
    () =>
      `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(userName.trim() || 'Lord')}`,
    [userName],
  );
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'chats' | 'contacts' | 'moments'>('chats');
  const [selectedContact, setSelectedContact] = useState<AdvisorPersona | null>(null);
  const [moments, setMoments] = useState<{ id: string, authorId: string, content: string, timestamp: number }[]>([]);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  /** WeChat-style ⋯ menu on a chat row in the sidebar */
  const [chatListMenuGroupId, setChatListMenuGroupId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMoments([
      { id: '1', authorId: 'zhuge-liang', content: '淡泊以明志，宁静以致远。 Strategy is the art of seeing what is invisible to others.', timestamp: Date.now() - 3600000 },
      { id: '2', authorId: 'marcus-aurelius', content: 'The happiness of your life depends upon the quality of your thoughts. Stay virtuous.', timestamp: Date.now() - 7200000 },
      { id: '3', authorId: 'cao-cao', content: '宁我负人，毋人负我。 Power is the only currency that never devalues.', timestamp: Date.now() - 10800000 },
    ]);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      savePersistedGroupsState({ version: 1, activeGroupId, groups });
    }, 400);
    return () => window.clearTimeout(t);
  }, [groups, activeGroupId]);

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

  const patchActiveGroup = (patch: Partial<ChatGroup>) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === activeGroupId ? { ...g, ...patch } : g)),
    );
  };

  const selectGroup = (id: string) => {
    setActiveGroupId(id);
    setTypingAdvisors([]);
    setChatError(null);
    setEditingGroupName(false);
    setChatListMenuGroupId(null);
  };

  const handleOpenCreateGroup = () => {
    setChatListMenuGroupId(null);
    setCreateGroupOpen(true);
  };

  const handleRenameGroupFromList = (g: ChatGroup) => {
    setChatListMenuGroupId(null);
    const raw = window.prompt('Chat name', g.name);
    if (raw === null) return;
    const name = raw.trim();
    if (!name) return;
    setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, name } : x)));
  };

  const handleDeleteGroupFromList = (groupId: string) => {
    if (groups.length <= 1) {
      window.alert('Keep at least one chat. Create another before deleting this one.');
      return;
    }
    if (
      !window.confirm(
        'Delete this chat and all messages in it? This cannot be undone.',
      )
    ) {
      return;
    }
    setChatListMenuGroupId(null);
    setGroups((prev) => {
      const filtered = prev.filter((g) => g.id !== groupId);
      setActiveGroupId((cur) =>
        cur === groupId && filtered.length > 0 ? filtered[0].id : cur,
      );
      return filtered;
    });
    setTypingAdvisors([]);
    setChatError(null);
    setEditingGroupName(false);
  };

  const handleConfirmCreateGroup = (name: string, memberIds: string[]) => {
    const id = newId();
    const g: ChatGroup = {
      id,
      name,
      messages: [],
      activeAdvisorIds: [...memberIds],
    };
    setGroups((prev) => [...prev, g]);
    setActiveGroupId(id);
    setTypingAdvisors([]);
    setChatError(null);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!activeGroup) return;
    if (activeAdvisorIds.length === 0) {
      setChatError('Turn on at least one advisor in the group settings so someone can reply.');
      return;
    }

    const gid = activeGroupId;
    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      senderId: 'user',
      senderName: userName,
      content: input,
      timestamp: Date.now(),
    };

    const rolling: ChatMessage[] = [...activeGroup.messages, userMessage];
    setGroups((prev) =>
      prev.map((g) => (g.id === gid ? { ...g, messages: [...g.messages, userMessage] } : g)),
    );
    setInput('');
    setLoading(true);
    setChatError(null);

    let sessionId = activeGroup.sessionId;

    try {
      const responders = await ChatService.decideWhoResponds(rolling, activeAdvisorIds, sessionId);
      if (responders.length === 0) {
        setChatError('No advisor was chosen to reply. Check the API /decide step or try again.');
        return;
      }

      for (const advisorId of responders) {
        setTypingAdvisors((prev) => [...prev, advisorId]);
        await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2000));

        const { message: response, sessionId: nextSid } = await ChatService.getAdvisorResponse(
          advisorId,
          rolling,
          sessionId,
        );
        if (nextSid) sessionId = nextSid;
        rolling.push(response);
        setGroups((prev) =>
          prev.map((g) =>
            g.id === gid
              ? {
                  ...g,
                  messages: [...g.messages, response],
                  ...(nextSid ? { sessionId: nextSid } : {}),
                }
              : g,
          ),
        );
        setTypingAdvisors((prev) => prev.filter((id) => id !== advisorId));

        if (Math.random() > 0.6) {
          const othersInGroup = activeAdvisorIds.filter((id) => id !== advisorId);
          if (othersInGroup.length > 0) {
            const nextResponder = othersInGroup[Math.floor(Math.random() * othersInGroup.length)];
            setTypingAdvisors((prev) => [...prev, nextResponder]);
            await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2000));
            const follow = await ChatService.getAdvisorResponse(nextResponder, rolling, sessionId);
            if (follow.sessionId) sessionId = follow.sessionId;
            rolling.push(follow.message);
            setGroups((prev) =>
              prev.map((g) =>
                g.id === gid
                  ? {
                      ...g,
                      messages: [...g.messages, follow.message],
                      ...(follow.sessionId ? { sessionId: follow.sessionId } : {}),
                    }
                  : g,
              ),
            );
            setTypingAdvisors((prev) => prev.filter((id) => id !== nextResponder));
          }
        }
      }
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Chat request failed. Is the API running? Try: npm run dev (needs server on port 3001).';
      setChatError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdvisor = (id: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === activeGroupId
          ? {
              ...g,
              activeAdvisorIds: g.activeAdvisorIds.includes(id)
                ? g.activeAdvisorIds.filter((i) => i !== id)
                : [...g.activeAdvisorIds, id],
            }
          : g,
      ),
    );
  };

  return (
    <div className="h-screen w-full bg-[#f5f5f5] flex overflow-hidden font-sans text-black">
      <aside className="w-[64px] bg-[#2e2e2e] flex flex-col items-center py-6 gap-8 shrink-0">
        <div className="w-9 h-9 bg-zinc-600 rounded-md overflow-hidden p-0.5">
          <img src={userAvatarUrl} className="w-full h-full rounded" alt="" />
        </div>
        <div className="flex flex-col gap-8 text-[#9b9b9b]">
          <MessageSquare
            className={`w-6 h-6 cursor-pointer transition-colors ${currentView === 'chats' ? 'text-[#07c160]' : 'hover:text-white'}`}
            onClick={() => {
              setChatListMenuGroupId(null);
              setCurrentView('chats');
            }}
          />
          <Users
            className={`w-6 h-6 cursor-pointer transition-colors ${currentView === 'contacts' ? 'text-[#07c160]' : 'hover:text-white'}`}
            onClick={() => {
              setChatListMenuGroupId(null);
              setCurrentView('contacts');
            }}
          />
          <Circle
            className={`w-6 h-6 cursor-pointer transition-colors ${currentView === 'moments' ? 'text-[#07c160]' : 'hover:text-white'}`}
            onClick={() => {
              setChatListMenuGroupId(null);
              setCurrentView('moments');
            }}
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
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 bg-[#dbd9d8]"
            type="button"
            onClick={handleOpenCreateGroup}
            title="New group"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {currentView === 'chats' ? (
            <div className="flex flex-col">
              {groups.map((g) => {
                const preview = g.messages[g.messages.length - 1];
                const previewTime = preview
                  ? new Date(preview.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                const thumbIds = g.activeAdvisorIds.slice(0, 4);
                const thumbs = thumbIds
                  .map((id) => ADVISORS.find((a) => a.id === id))
                  .filter(Boolean) as AdvisorPersona[];
                return (
                  <div
                    key={g.id}
                    className={`flex items-stretch border-b border-black/5 w-full ${
                      g.id === activeGroupId ? 'bg-[#c6c5c4]' : 'hover:bg-[#d6d6d6]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectGroup(g.id)}
                      className="flex-1 flex gap-3 p-3 text-left min-w-0 transition-colors"
                    >
                      <div className="w-10 h-10 bg-zinc-300 rounded grid grid-cols-2 gap-0.5 p-0.5 shrink-0 overflow-hidden">
                        {thumbs.length > 0 ? (
                          thumbs.map((a) => (
                            <img key={a.id} src={a.avatar} alt="" className="w-full h-full object-cover" />
                          ))
                        ) : (
                          <span className="col-span-2 row-span-2 text-[10px] text-zinc-500 flex items-center justify-center">
                            —
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-medium text-sm truncate">{g.name}</span>
                          {previewTime && (
                            <span className="text-[10px] text-[#999] shrink-0">{previewTime}</span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#999] truncate">
                          {preview ? preview.content : 'No messages yet'}
                        </p>
                      </div>
                    </button>
                    <div className="relative flex items-center pr-1 shrink-0">
                      <button
                        type="button"
                        className="p-2 rounded-md text-[#888] hover:bg-black/5 hover:text-black"
                        aria-label="Chat options"
                        title="Rename or delete"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setChatListMenuGroupId((openId) =>
                            openId === g.id ? null : g.id,
                          );
                        }}
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      {chatListMenuGroupId === g.id && (
                        <div className="absolute right-1 top-10 z-[200] w-[148px] rounded-md border border-[#e5e5e5] bg-white py-1 shadow-lg text-[13px]">
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-[#f5f5f5]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameGroupFromList(g);
                            }}
                          >
                            Rename chat
                          </button>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroupFromList(g.id);
                            }}
                          >
                            Delete chat
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-4">
                {editingGroupName ? (
                  <input
                    autoFocus
                    className="text-lg font-medium border-b border-[#07c160] outline-none bg-transparent max-w-[280px] min-w-0"
                    value={activeGroup?.name ?? ''}
                    onChange={(e) =>
                      patchActiveGroup({ name: e.target.value.slice(0, 80) })
                    }
                    onBlur={() => setEditingGroupName(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingGroupName(false);
                    }}
                  />
                ) : (
                  <h1
                    className="text-lg font-medium truncate cursor-pointer hover:text-[#07c160]"
                    title="Click to rename"
                    onClick={() => setEditingGroupName(true)}
                  >
                    {activeGroup?.name ?? 'Council'} ({activeAdvisorIds.length + 1})
                  </h1>
                )}
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
                                <AvatarImage src={userAvatarUrl} className="rounded" />
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
                                patchActiveGroup({ messages: [] });
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
                    Welcome to &quot;{activeGroup?.name ?? 'Council'}&quot;. Start your quest.
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
                        <AvatarImage src={isUser ? userAvatarUrl : msg.avatar} className="rounded" />
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
                      className="absolute bottom-12 left-6 bg-white border border-[#e1e1e1] p-3 shadow-xl rounded-md z-50 w-[280px] max-h-[260px] overflow-y-auto"
                    >
                      <div className="space-y-3">
                        {EMOJI_CATEGORIES.map((cat) => (
                          <div key={cat.label}>
                            <div className="text-[10px] uppercase text-[#999] font-semibold mb-1.5 tracking-wide">
                              {cat.label}
                            </div>
                            <div className="grid grid-cols-6 gap-1">
                              {cat.emojis.map((e) => (
                                <button
                                  key={`${cat.label}-${e}`}
                                  type="button"
                                  onClick={() => {
                                    setInput((prev) => prev + e);
                                    setShowEmoji(false);
                                  }}
                                  className="text-xl hover:bg-zinc-100 p-1.5 rounded transition-colors"
                                >
                                  {e}
                                </button>
                              ))}
                            </div>
                          </div>
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
              <div className="flex-1 p-6 pt-0 flex flex-col gap-2 min-h-0">
                {chatError && (
                  <div className="shrink-0 text-[13px] text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2 flex justify-between gap-2 items-start">
                    <span>{chatError}</span>
                    <button
                      type="button"
                      className="text-red-800 shrink-0 underline"
                      onClick={() => setChatError(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                <textarea
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="w-full flex-1 min-h-[80px] resize-none border-none outline-none text-[15px] placeholder:text-[#ccc]"
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
                           <div className="text-[13px]">
                             <span className="text-[#999] mr-4">Region</span>
                             {advisorRegionLabel(selectedContact.id)}
                           </div>
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

      <CreateGroupModal
        advisors={ADVISORS}
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onConfirm={handleConfirmCreateGroup}
      />

      {chatListMenuGroupId && (
        <button
          type="button"
          className="fixed left-[364px] top-0 right-0 bottom-0 z-[140] cursor-default bg-black/10"
          aria-label="Dismiss chat menu"
          onClick={() => setChatListMenuGroupId(null)}
        />
      )}
    </div>
  );
}
