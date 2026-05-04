import { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
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
import { FloatingCouncilWindow } from './components/FloatingCouncilWindow';
import { OnboardingFlow } from './components/OnboardingFlow';
import { MomentsFeed } from './components/MomentsFeed';
import {
  isOnboardingCompleteForSession,
  resetOnboarding,
} from './storage/onboardingPersistence';
import { cn } from '@/lib/utils';

type CouncilShellProps = {
  onOpenWelcomeSetup: () => void;
  /** When false, fills the parent (floating pane) instead of the viewport */
  fillViewport?: boolean;
};

function CouncilShell({ onOpenWelcomeSetup, fillViewport = true }: CouncilShellProps) {
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
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  /** WeChat-style ⋯ menu on a chat row in the sidebar */
  const [chatListMenuGroupId, setChatListMenuGroupId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    <div
      className={cn(
        fillViewport ? 'h-screen w-full' : 'h-full min-h-0 w-full council-chat-float',
        'bg-council-canvas flex overflow-hidden font-sans text-foreground',
      )}
    >
      <aside className="w-[64px] bg-gradient-to-b from-council-rail to-council-rail-deep flex flex-col items-center py-6 gap-5 shrink-0 shadow-[inset_-1px_0_0_oklch(0_0_0/0.12)]">
        <div
          className={cn(
            'w-10 h-10 rounded-xl bg-white/10 p-0.5 ring-2 ring-offset-2 ring-offset-council-rail overflow-hidden motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-105',
            fillViewport ? 'ring-council-accent/35' : 'ring-white/25',
          )}
        >
          <img src={userAvatarUrl} className="w-full h-full rounded-[10px]" alt="" />
        </div>
        <div className="flex flex-col gap-3 items-center text-council-rail-icon">
          <button
            type="button"
            title="Chats"
            className={cn(
              'rounded-xl p-2 motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-110 motion-safe:active:scale-95',
              currentView === 'chats'
                ? 'bg-white/12 text-council-accent shadow-md shadow-black/25 ring-1 ring-council-accent/35'
                : 'hover:bg-white/8 hover:text-white',
            )}
            onClick={() => {
              setChatListMenuGroupId(null);
              setCurrentView('chats');
            }}
          >
            <MessageSquare className="w-6 h-6" strokeWidth={currentView === 'chats' ? 2.25 : 1.75} />
          </button>
          <button
            type="button"
            title="Contacts"
            className={cn(
              'rounded-xl p-2 motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-110 motion-safe:active:scale-95',
              currentView === 'contacts'
                ? 'bg-white/12 text-council-accent shadow-md shadow-black/25 ring-1 ring-council-accent/35'
                : 'hover:bg-white/8 hover:text-white',
            )}
            onClick={() => {
              setChatListMenuGroupId(null);
              setCurrentView('contacts');
            }}
          >
            <Users className="w-6 h-6" strokeWidth={currentView === 'contacts' ? 2.25 : 1.75} />
          </button>
          <button
            type="button"
            title="Moments"
            className={cn(
              'rounded-xl p-2 motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-110 motion-safe:active:scale-95',
              currentView === 'moments'
                ? 'bg-white/12 text-council-accent shadow-md shadow-black/25 ring-1 ring-council-accent/35'
                : 'hover:bg-white/8 hover:text-white',
            )}
            onClick={() => {
              setChatListMenuGroupId(null);
              setCurrentView('moments');
            }}
          >
            <Circle className="w-6 h-6" strokeWidth={currentView === 'moments' ? 2.25 : 1.75} />
          </button>
          <button
            type="button"
            title="Settings"
            className="rounded-xl p-2 mb-auto hover:bg-white/8 hover:text-white motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-110"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </aside>

      <aside className="w-[300px] bg-council-list border-r border-council-list-border flex flex-col shrink-0">
        <div className="p-4 flex gap-2 border-b border-council-hairline/50">
          <div
            className={cn(
              'flex-1 bg-council-search-bg flex items-center px-3 h-9 shadow-inner shadow-black/[0.07] ring-1 ring-council-hairline/40',
              fillViewport ? 'rounded-xl' : 'rounded-full',
            )}
          >
            <Search className="w-4 h-4 text-council-text-soft mr-1.5 shrink-0 stroke-[2]" />
            <input placeholder="Search chats" className="bg-transparent border-none outline-none text-[13px] font-medium w-full placeholder:text-council-text-muted placeholder:font-normal" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'w-8 h-8 bg-council-search-bg hover:bg-council-row-hover text-council-text-soft shadow-inner shadow-black/5 motion-safe:transition-transform motion-safe:hover:scale-105',
              fillViewport ? 'rounded-lg' : 'rounded-full',
            )}
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
                    className={cn(
                      'flex items-stretch border-b border-council-hairline/40 w-full motion-safe:transition-colors',
                      g.id === activeGroupId
                        ? 'bg-council-row-active ring-2 ring-inset ring-council-accent/20'
                        : 'hover:bg-council-row-hover',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => selectGroup(g.id)}
                      className="flex-1 flex gap-3 p-3 text-left min-w-0 transition-colors"
                    >
                      <div className="w-10 h-10 bg-council-search-bg rounded-lg grid grid-cols-2 gap-0.5 p-0.5 shrink-0 overflow-hidden ring-1 ring-council-hairline/50 shadow-sm">
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
                          <span className="font-bold text-[15px] leading-tight tracking-tight truncate text-foreground">
                            {g.name}
                          </span>
                          {previewTime && (
                            <span className="text-[10px] text-council-text-muted shrink-0">{previewTime}</span>
                          )}
                        </div>
                        <p className="text-[12px] text-council-text-muted truncate">
                          {preview ? preview.content : 'No messages yet'}
                        </p>
                      </div>
                    </button>
                    <div className="relative flex items-center pr-1 shrink-0">
                      <button
                        type="button"
                        className="p-2 rounded-lg text-council-text-soft hover:bg-black/6 hover:text-foreground motion-safe:transition-colors"
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
                        <div className="absolute right-1 top-10 z-[200] w-[148px] rounded-lg border border-council-hairline bg-council-bubble-advisor py-1 shadow-xl shadow-black/10 text-[13px]">
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-council-canvas"
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
              <div className="px-4 py-2.5 text-[10px] uppercase text-council-text-soft font-extrabold tracking-[0.2em]">
                Historical Masters
              </div>
              {ADVISORS.map(a => (
                <div
                  key={a.id}
                  className={cn(
                    'px-4 py-3 flex items-center gap-3 cursor-pointer motion-safe:transition-colors border-b border-council-hairline/40',
                    selectedContact?.id === a.id ? 'bg-council-row-active' : 'hover:bg-council-row-hover',
                  )}
                  onClick={() => setSelectedContact(a)}
                >
                  <Avatar className="w-9 h-9 rounded">
                    <AvatarImage src={a.avatar} className="rounded object-top" />
                    <AvatarFallback className="rounded bg-zinc-300">{a.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-[15px] font-semibold">{a.name.split(' (')[0]}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      <main className="flex-1 flex flex-col bg-council-canvas relative">
        {currentView === 'chats' ? (
          <>
            <AnimatePresence>
              {showMentions && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-[200px] left-6 w-[200px] bg-council-bubble-advisor border border-council-list-border/70 rounded-xl z-[100] overflow-hidden shadow-[0_16px_40px_-8px_rgba(0,0,0,0.14)]"
                >
                  {ADVISORS.filter(a => activeAdvisorIds.includes(a.id)).map(a => (
                    <button
                      key={a.id}
                      onClick={() => insertMention(a.shortName)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-council-canvas motion-safe:transition-colors"
                    >
                      <Avatar className="w-6 h-6 rounded">
                        <AvatarImage src={a.avatar} className="rounded object-top" />
                      </Avatar>
                      <span className="text-sm font-medium">{a.shortName}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <header className="h-[72px] border-b border-council-list-border flex items-center justify-between px-6 md:px-8 bg-council-canvas shrink-0 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.07)]">
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-4">
                {editingGroupName ? (
                  <input
                    autoFocus
                    className="text-2xl font-semibold tracking-tight border-b-[3px] border-council-accent outline-none bg-transparent max-w-[min(100%,380px)] min-w-0"
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
                    className="min-w-0 truncate cursor-pointer motion-safe:transition-colors motion-safe:duration-200"
                    title="Click to rename"
                    onClick={() => setEditingGroupName(true)}
                  >
                    <span className="text-2xl md:text-[1.75rem] font-semibold tracking-tight text-foreground hover:text-council-accent">
                      {activeGroup?.name ?? 'Council'}
                    </span>
                    <span className="text-sm font-medium text-council-text-muted tabular-nums ml-2">
                      ({activeAdvisorIds.length + 1})
                    </span>
                  </h1>
                )}
              </div>
              <div className="flex items-center gap-7 text-council-text-soft relative">
                <Phone className="w-6 h-6 cursor-pointer stroke-[1.75] hover:text-foreground hover:stroke-2 motion-safe:transition-colors" />
                <Video className="w-6 h-6 cursor-pointer stroke-[1.75] hover:text-foreground hover:stroke-2 motion-safe:transition-colors" />
                <div className="relative">
                  <MoreHorizontal
                    className={cn(
                      'w-6 h-6 cursor-pointer stroke-[1.75] motion-safe:transition-colors',
                      showSettings ? 'text-council-accent stroke-2' : 'hover:text-foreground hover:stroke-2',
                    )}
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
                          className="absolute right-0 top-10 w-[288px] bg-council-bubble-advisor border border-council-list-border/80 rounded-2xl z-50 p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)]"
                        >
                          <h3 className="text-[11px] font-extrabold text-council-text-muted uppercase tracking-[0.16em] mb-4">My Profile</h3>
                          <div className="space-y-4 mb-6 pt-2">
                            <div className="flex items-center gap-4">
                              <Avatar className="w-12 h-12 rounded bg-zinc-100">
                                <AvatarImage src={userAvatarUrl} className="rounded" />
                              </Avatar>
                              <div className="flex-1 space-y-1">
                                  <label className="text-[10px] uppercase text-council-text-muted">Lord Name</label>
                                  <input
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className="w-full text-sm font-medium border-b border-council-hairline outline-none pb-1"
                                    placeholder="Enter name..."
                                  />
                              </div>
                            </div>
                          </div>

                          <h3 className="text-[11px] font-extrabold text-council-text-muted uppercase tracking-[0.16em] mb-4">Group Members</h3>
                          <div className="space-y-3">
                            {ADVISORS.map(a => (
                              <div key={a.id} className="flex items-center gap-3">
                                <Avatar className="w-8 h-8 rounded shrink-0">
                                  <AvatarImage src={a.avatar} className="rounded object-top" />
                                </Avatar>
                                <span className="text-sm font-medium flex-1">{a.name.split(' (')[0]}</span>
                                <button
                                  onClick={() => toggleAdvisor(a.id)}
                                  className={cn(
                                    'px-3 py-1 rounded-full text-[10px] border motion-safe:transition-all',
                                    activeAdvisorIds.includes(a.id)
                                      ? fillViewport
                                        ? 'bg-council-accent border-council-accent text-white shadow-sm shadow-council-accent/30'
                                        : 'border-white bg-white text-zinc-950 shadow-sm shadow-black/30'
                                      : 'bg-council-canvas border-council-hairline text-council-text-muted hover:border-council-text-muted/50',
                                  )}
                                >
                                  {activeAdvisorIds.includes(a.id) ? 'Added' : 'Add'}
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="mt-6 pt-4 border-t border-council-hairline space-y-1">
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-council-text-soft hover:text-foreground hover:bg-council-row-hover text-[12px] h-8 p-0 px-2"
                              onClick={() => {
                                onOpenWelcomeSetup();
                                setShowSettings(false);
                              }}
                            >
                              Open welcome setup
                            </Button>
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

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-7 md:space-y-8">
              {messages.length === 0 && (
                <div className="text-center py-16 px-4">
                  <span className="inline-flex items-center gap-3 bg-council-welcome text-white text-base font-semibold px-7 py-4 rounded-full shadow-[0_18px_48px_-10px_rgba(5,120,65,0.5)] max-w-[min(100%,42rem)] ring-2 ring-white/25">
                    <span className="text-xl leading-none shrink-0" aria-hidden>
                      ✦
                    </span>
                    <span className="text-left leading-snug">
                      Welcome to &quot;{activeGroup?.name ?? 'Council'}&quot;. Say hello to the council.
                    </span>
                  </span>
                </div>
              )}

              <AnimatePresence>
                {messages.map((msg) => {
                  const isUser = msg.senderId === 'user';
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 34, mass: 0.55 }}
                      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <Avatar className="w-10 h-10 rounded shrink-0">
                        <AvatarImage
                          src={isUser ? userAvatarUrl : msg.avatar}
                          className={cn('rounded', !isUser && 'object-top')}
                        />
                        <AvatarFallback className="rounded bg-zinc-300">{msg.senderName[0]}</AvatarFallback>
                      </Avatar>
                      <div className={`flex flex-col gap-1 max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
                        {!isUser && (
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-council-text-soft ml-1">
                            {msg.senderName}
                          </span>
                        )}
                        <div
                          className={cn(
                            'relative p-4 rounded-2xl text-[15px] leading-relaxed',
                            isUser
                              ? 'bg-council-bubble-user text-foreground rounded-tr-lg shadow-[0_12px_32px_-8px_rgba(25,130,55,0.28)] ring-1 ring-black/[0.07]'
                              : 'bg-council-bubble-advisor text-foreground rounded-tl-lg shadow-[0_14px_40px_-12px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.06]',
                          )}
                        >
                          <div
                            className={cn(
                              'absolute top-0 w-0 h-0 border-[7px] border-transparent',
                              isUser
                                ? 'border-t-council-bubble-user border-l-council-bubble-user right-[-12px]'
                                : 'border-t-council-bubble-advisor border-r-council-bubble-advisor left-[-12px]',
                            )}
                          />

                          <p className={cn(isUser && 'font-medium')}>{msg.content}</p>
                          {msg.translation && (
                            <div className="mt-3 text-[12px] font-medium text-council-text-soft border-t border-black/[0.07] pt-2.5">
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
                  <div className="bg-council-typing-bg px-3 py-2.5 rounded-2xl flex gap-1.5 items-center mt-4 shadow-inner shadow-black/5 ring-1 ring-council-hairline/60">
                    <div className="w-2 h-2 bg-council-typing-dot rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-council-typing-dot rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-council-accent rounded-full animate-bounce shadow-sm shadow-council-accent/40" />
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            <footer className="h-[200px] border-t-2 border-council-hairline bg-council-bubble-advisor flex flex-col relative shadow-[0_-14px_40px_-16px_rgba(0,0,0,0.09)]">
              <AnimatePresence>
                {showEmoji && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-12 left-6 bg-council-bubble-advisor border border-council-list-border/70 p-3 rounded-2xl z-50 w-[280px] max-h-[260px] overflow-y-auto shadow-[0_16px_44px_-10px_rgba(0,0,0,0.16)]"
                    >
                      <div className="space-y-3">
                        {EMOJI_CATEGORIES.map((cat) => (
                          <div key={cat.label}>
                            <div className="text-[10px] uppercase text-council-text-muted font-semibold mb-1.5 tracking-wide">
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

              <div className="h-11 flex items-center px-6 md:px-8 gap-7 text-council-text-soft">
                <Smile
                  className={cn(
                    'w-6 h-6 cursor-pointer stroke-[1.75] motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-110',
                    showEmoji ? 'text-council-accent stroke-2' : 'hover:text-foreground hover:stroke-2',
                  )}
                  onClick={() => setShowEmoji(!showEmoji)}
                />
                <ImageIcon className="w-6 h-6 cursor-pointer stroke-[1.75] hover:text-foreground hover:stroke-2 motion-safe:transition-all motion-safe:hover:scale-110" />
                <Search className="w-6 h-6 cursor-pointer stroke-[1.75] hover:text-foreground hover:stroke-2 motion-safe:transition-all motion-safe:hover:scale-110" />
                <Plus className="w-6 h-6 cursor-pointer stroke-[1.75] hover:text-foreground hover:stroke-2 motion-safe:transition-all motion-safe:hover:scale-110" />
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
                  className="w-full flex-1 min-h-[88px] resize-none border-none outline-none text-[16px] font-medium leading-relaxed placeholder:text-council-text-muted placeholder:font-normal"
                  placeholder="Type a message... (Use @ to mention)"
                />
              </div>
              <div className="h-12 px-6 flex justify-end items-start pb-4">
                <Button
                  variant="outline"
                  onClick={handleSendMessage}
                  disabled={!input.trim() || loading}
                  className={cn(
                    'h-10 min-w-[7.5rem] px-11 text-[15px] font-semibold rounded-full motion-safe:transition-all motion-safe:duration-200',
                    input.trim() && !loading
                      ? fillViewport
                        ? '!bg-council-accent !text-white !border-transparent shadow-xl shadow-council-accent/40 hover:!bg-council-accent-hover hover:!shadow-council-accent/50 motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.98]'
                        : '!bg-white !text-zinc-950 !border-transparent shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)] hover:!bg-zinc-100 motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.98]'
                      : '!bg-council-canvas !text-council-text-muted !border-council-hairline hover:!bg-council-row-hover',
                  )}
                >
                  Send
                </Button>
              </div>
            </footer>
          </>
        ) : currentView === 'moments' ? (
          <div className="flex-1 overflow-y-auto bg-council-bubble-advisor">
            <header className="h-[72px] border-b border-council-list-border flex items-center px-6 md:px-8 bg-council-canvas sticky top-0 z-10 shrink-0 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.07)]">
               <h1 className="text-2xl font-semibold tracking-tight">Moments</h1>
            </header>
            <div className="max-w-[600px] mx-auto py-10 px-6">
              <MomentsFeed />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {selectedContact ? (
              <motion.div
                key={selectedContact.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center pt-[100px] bg-council-canvas"
              >
                <div className="w-full max-w-[400px] flex flex-col items-center">
                  <div className="flex items-start w-full gap-5 border-b border-council-hairline pb-10 mb-8">
                     <Avatar className="w-[64px] h-[64px] rounded">
                        <AvatarImage src={selectedContact.avatar} className="rounded object-top" />
                        <AvatarFallback className="rounded bg-zinc-300">{selectedContact.name[0]}</AvatarFallback>
                     </Avatar>
                     <div className="flex-1">
                        <h2 className="text-2xl font-bold tracking-tight mb-1">{selectedContact.name}</h2>
                        <p className="text-sm text-council-text-muted mb-4">Master ID: {selectedContact.id}</p>
                        <div className="flex flex-col gap-2">
                           <div className="text-[13px]"><span className="text-council-text-muted mr-4">Title</span> {selectedContact.title}</div>
                           <div className="text-[13px]">
                             <span className="text-council-text-muted mr-4">Region</span>
                             {advisorRegionLabel(selectedContact.id)}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="w-full px-6 text-center mb-10 leading-relaxed">
                    <p className="font-heading text-lg md:text-xl italic text-foreground font-medium">
                      &ldquo;{selectedContact.bio}&rdquo;
                    </p>
                  </div>

                  <Button
                    className={
                      fillViewport
                        ? '!bg-council-accent hover:!bg-council-accent-hover !text-white px-12 py-6 h-auto text-base font-semibold rounded-full shadow-xl shadow-council-accent/40 motion-safe:transition-all motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]'
                        : '!bg-white hover:!bg-zinc-100 !text-zinc-950 px-12 py-6 h-auto text-base font-semibold rounded-full shadow-[0_20px_50px_-16px_rgba(0,0,0,0.45)] motion-safe:transition-all motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98]'
                    }
                    onClick={() => setCurrentView('chats')}
                  >
                    Messages
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-council-canvas">
                 <Users className="w-24 h-24 text-council-hairline motion-safe:animate-pulse" />
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

export default function App() {
  const [onboardingDone, setOnboardingDone] = useState(() => isOnboardingCompleteForSession());
  const reduceMotion = useReducedMotion();

  const shellTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <AnimatePresence mode="wait">
      {!onboardingDone ? (
        <motion.div
          key="onboarding"
          className="min-h-screen"
          exit={{ opacity: 0, scale: 0.98 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <OnboardingFlow onComplete={() => setOnboardingDone(true)} />
        </motion.div>
      ) : (
        <motion.div
          key="council-shell"
          className="fixed inset-0 z-[100] bg-zinc-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={shellTransition}
        >
          <FloatingCouncilWindow>
            <CouncilShell
              fillViewport={false}
              onOpenWelcomeSetup={() => {
                resetOnboarding();
                setOnboardingDone(false);
              }}
            />
          </FloatingCouncilWindow>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
