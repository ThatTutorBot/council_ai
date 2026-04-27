import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  User, 
  MessageSquare, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  ChevronDown
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { ADVISORS, AdvisorPersona } from './types';
import { CouncilService, CouncilMessage, CouncilSession } from './services/councilService';

export default function App() {
  const [session, setSession] = useState<CouncilSession | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session?.messages]);

  const startNewSession = () => {
    if (!input.trim()) return;
    
    setSession({
      userQuestion: input,
      messages: [],
      clarifyingAnswers: {},
      currentRound: 'clarifying',
      currentAdvisorIndex: 0,
    });
    setInput('');
    processNextStep('clarifying', {
      userQuestion: input,
      messages: [],
      clarifyingAnswers: {},
      currentRound: 'clarifying',
      currentAdvisorIndex: 0,
    });
  };

  const processNextStep = async (round: string, currentSession: CouncilSession) => {
    setLoading(true);
    try {
      if (round === 'clarifying') {
        const advisor = ADVISORS[currentSession.currentAdvisorIndex];
        const question = await CouncilService.getClarifyingQuestion(advisor.id, currentSession.userQuestion);
        setSession(prev => prev ? ({
          ...prev,
          messages: [...prev.messages, question],
        }) : null);
      } else if (round === 'opening') {
        // Sequential opening statements
        for (const advisor of ADVISORS) {
          const opening = await CouncilService.getOpeningStatement(advisor.id, currentSession.userQuestion, currentSession.clarifyingAnswers);
          setSession(prev => prev ? ({
            ...prev,
            messages: [...prev.messages, opening],
          }) : null);
        }
        setSession(prev => prev ? ({ ...prev, currentRound: 'critique' }) : null);
        // Instant trigger critique after opening
        const updatedSession = { ...currentSession, currentRound: 'critique' as const };
        processNextStep('critique', updatedSession);
      } else if (round === 'critique') {
        const openingMessages = currentSession.messages.filter(m => m.round === 'opening');
        for (const advisor of ADVISORS) {
          const critique = await CouncilService.getCritique(advisor.id, currentSession.userQuestion, openingMessages);
          setSession(prev => prev ? ({
            ...prev,
            messages: [...prev.messages, critique],
          }) : null);
        }
        setSession(prev => prev ? ({ ...prev, currentRound: 'synthesis' }) : null);
        processNextStep('synthesis', { ...currentSession, currentRound: 'synthesis' });
      } else if (round === 'synthesis') {
        const synthesis = await CouncilService.getSynthesis(currentSession.userQuestion, currentSession.messages);
        setSession(prev => prev ? ({
          ...prev,
          messages: [...prev.messages, synthesis],
        }) : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitClarifyingAnswer = () => {
    if (!input.trim() || !session) return;
    
    const advisorId = ADVISORS[session.currentAdvisorIndex].id;
    const newAnswers = { ...session.clarifyingAnswers, [advisorId]: input };
    const isLastAdvisor = session.currentAdvisorIndex === ADVISORS.length - 1;
    
    const nextSession: CouncilSession = {
      ...session,
      clarifyingAnswers: newAnswers,
      currentAdvisorIndex: isLastAdvisor ? 0 : session.currentAdvisorIndex + 1,
      currentRound: isLastAdvisor ? 'opening' : 'clarifying',
    };
    
    setSession(nextSession);
    setInput('');
    
    if (isLastAdvisor) {
      processNextStep('opening', nextSession);
    } else {
      processNextStep('clarifying', nextSession);
    }
  };

  const getAdvisor = (id: string) => ADVISORS.find(a => a.id === id);

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-slate-200 font-sans selection:bg-amber-500/30 relative flex flex-col overflow-x-hidden">
      {/* Atmospheric Background Overlays */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_transparent_0%,_#0c0c0e_80%)]"></div>
      </div>

      {/* Header: The Inquiry */}
      <header className="relative z-20 p-6 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center mb-2">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-zinc-950" />
            </div>
            <span className="text-[10px] tracking-[0.2em] uppercase text-amber-500/70 font-semibold">Council AI / 议事厅</span>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
              <span className="text-[10px] uppercase tracking-widest opacity-60">Live Council Session</span>
            </div>
            {session && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSession(null)}
                className="h-7 text-[10px] uppercase tracking-widest text-zinc-400 hover:text-zinc-100 border border-white/5 bg-white/5"
              >
                <RotateCcw className="w-3 h-3 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>
        {session && (
          <div className="max-w-7xl mx-auto">
            <h1 className="text-xl md:text-2xl font-serif italic text-white leading-tight mt-2 max-w-4xl">
              &quot;{session.userQuestion}&quot;
            </h1>
          </div>
        )}
      </header>

      {/* Council Progress Stepper */}
      {session && (
        <nav className="relative z-20 flex border-b border-white/5 bg-white/[0.02] sticky top-[104px] md:top-[128px]">
          <div className={`flex-1 py-3 px-6 border-r border-white/5 flex items-center gap-3 transition-colors ${session.currentRound === 'clarifying' ? 'bg-amber-500/10' : 'opacity-40'}`}>
            <span className={`font-mono text-xs ${session.currentRound === 'clarifying' ? 'text-amber-500' : ''}`}>01</span>
            <span className={`text-[11px] uppercase tracking-tighter ${session.currentRound === 'clarifying' ? 'text-amber-200' : ''}`}>Clarification</span>
          </div>
          <div className={`flex-1 py-3 px-6 border-r border-white/5 flex items-center gap-3 transition-colors ${session.currentRound === 'opening' ? 'bg-amber-500/10' : 'opacity-40'}`}>
            <span className={`font-mono text-xs ${session.currentRound === 'opening' ? 'text-amber-500' : ''}`}>02</span>
            <span className={`text-[11px] uppercase tracking-tighter ${session.currentRound === 'opening' ? 'text-amber-200' : ''}`}>Opening Round</span>
          </div>
          <div className={`flex-1 py-3 px-6 border-r border-white/5 flex items-center gap-3 transition-colors ${session.currentRound === 'critique' ? 'bg-amber-500/10' : 'opacity-40'}`}>
            <span className={`font-mono text-xs ${session.currentRound === 'critique' ? 'text-amber-500' : ''}`}>03</span>
            <span className={`text-[11px] uppercase tracking-tighter ${session.currentRound === 'critique' ? 'text-amber-200' : ''}`}>Critique Round</span>
          </div>
          <div className={`flex-1 py-3 px-6 flex items-center gap-3 transition-colors ${session.currentRound === 'synthesis' ? 'bg-amber-500/10' : 'opacity-40'}`}>
            <span className={`font-mono text-xs ${session.currentRound === 'synthesis' ? 'text-amber-500' : ''}`}>04</span>
            <span className={`text-[11px] uppercase tracking-tighter ${session.currentRound === 'synthesis' ? 'text-amber-200' : ''}`}>Synthesis</span>
          </div>
        </nav>
      )}

      <main className="relative z-10 flex-1 flex flex-col">
        {!session ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl w-full space-y-12 text-center"
            >
              <div className="space-y-4">
                <h2 className="text-5xl md:text-7xl font-serif text-white tracking-tight leading-none italic">
                  Invoke the Council
                </h2>
                <p className="text-zinc-400 text-lg font-light tracking-wide">
                  Submit your inquiry to the assembly of historical masterminds.
                </p>
              </div>

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                <div className="relative bg-black/40 border border-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-2xl space-y-6">
                  <div className="flex flex-wrap gap-4 justify-center">
                    {ADVISORS.map(a => (
                      <div key={a.id} className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={a.avatar} />
                        </Avatar>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">{a.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="relative">
                    <Input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Present your inquiry to the ages..."
                      className="h-16 pl-6 pr-40 bg-white/5 border-white/10 text-lg font-light placeholder:text-zinc-600 focus-visible:ring-amber-500 focus-visible:bg-white/10 rounded-xl transition-all"
                    />
                    <Button 
                      onClick={startNewSession}
                      disabled={!input.trim() || loading}
                      className="absolute right-2 top-2 h-12 px-8 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold uppercase tracking-widest text-[10px] rounded-lg transition-all"
                    >
                      Begin Session
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-12 text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold">
                <span className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  Strategy
                </span>
                <span className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  Power
                </span>
                <span className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                  Virtue
                </span>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scroll-smooth">
            <div className="max-w-7xl mx-auto p-1 grid grid-cols-1 md:grid-cols-3 gap-1 bg-white/5">
              {/* Show advisor columns only for discussion phases */}
              {ADVISORS.map((advisor) => {
                const advisorMessages = session.messages.filter(m => m.advisorId === advisor.id);
                
                return (
                  <section key={advisor.id} className="bg-[#111116] flex flex-col p-8 relative group overflow-hidden border border-white/5 min-h-[600px]">
                    {/* Decorative Title Character */}
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                      <span className="text-[120px] font-serif leading-none italic">{advisor.name.match(/\((.*?)\)/)?.[1] || advisor.name[0]}</span>
                    </div>

                    <div className="mb-10 relative z-10">
                      <div className={`w-14 h-14 rounded-full mb-4 flex items-center justify-center border transition-all ${
                        advisor.id === 'zhuge-liang' ? 'bg-blue-500/10 border-blue-400/30 text-blue-200' :
                        advisor.id === 'cao-cao' ? 'bg-red-500/10 border-red-400/30 text-red-200' :
                        'bg-purple-500/10 border-purple-400/30 text-purple-200'
                      }`}>
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={advisor.avatar} />
                          <AvatarFallback className="text-lg font-serif">
                            {advisor.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <h2 className="text-xl font-serif text-white">{advisor.name}</h2>
                      <p className={`text-[10px] uppercase tracking-[0.2em] font-bold mt-1 ${
                        advisor.id === 'zhuge-liang' ? 'text-blue-400/80' :
                        advisor.id === 'cao-cao' ? 'text-red-400/80' :
                        'text-purple-400/80'
                      }`}>{advisor.title}</p>
                    </div>

                    <div className="flex-1 space-y-8 relative z-10">
                      <AnimatePresence>
                        {advisorMessages.map((msg, midx) => (
                          <motion.div 
                            key={midx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4 pb-8 border-b border-white/5 last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] uppercase tracking-widest font-bold text-amber-500/50">{msg.round} round</span>
                              <span className="text-[8px] font-mono text-zinc-600">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <div className="space-y-3">
                              <p className="text-base md:text-lg italic leading-relaxed text-slate-100 font-serif">
                                &quot;{msg.contentPrimary}&quot;
                              </p>
                              <p className="text-[12px] leading-relaxed text-slate-500 font-light tracking-wide">
                                {msg.contentSecondary}
                              </p>
                            </div>

                            {msg.round === 'clarifying' && session.clarifyingAnswers[advisor.id] && (
                              <div className="mt-4 bg-white/[0.02] border border-white/5 p-4 rounded-lg">
                                <span className="block text-[8px] uppercase tracking-widest text-zinc-500 mb-1 font-bold">Your Response</span>
                                <p className="text-xs text-zinc-300 font-light italic">&quot;{session.clarifyingAnswers[advisor.id]}&quot;</p>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Interaction Area (if current advisor) */}
                      {session.currentRound === 'clarifying' && session.currentAdvisorIndex === ADVISORS.findIndex(a => a.id === advisor.id) && !loading && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-6 space-y-4"
                        >
                          <div className="p-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent rounded-lg">
                            <div className="bg-[#1a1a20] p-4 rounded-[7px] space-y-3">
                              <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500">Provide Clarification</span>
                              <div className="flex gap-2">
                                <Input 
                                  value={input}
                                  onChange={(e) => setInput(e.target.value)}
                                  placeholder="Type your response..."
                                  className="h-10 bg-black/40 border-white/10 text-sm focus-visible:ring-amber-500"
                                  onKeyDown={(e) => e.key === 'Enter' && submitClarifyingAnswer()}
                                />
                                <Button onClick={submitClarifyingAnswer} className="h-10 px-4 bg-amber-600 text-zinc-950 hover:bg-amber-500 font-bold uppercase tracking-widest text-[9px]">
                                  Send
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {loading && session.currentRound !== 'clarifying' && (
                         <div className="flex items-center gap-2 py-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
                            <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold animate-pulse">Deliberating...</span>
                         </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Synthesis Section (Horizontal spanning) */}
            {session.messages.some(m => m.round === 'synthesis') && (
              <div className="max-w-7xl mx-auto p-1 bg-white/5 border-t border-white/5">
                {session.messages.filter(m => m.round === 'synthesis').map((msg, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0c0c0e] p-12 border border-white/5 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
                    
                    <div className="max-w-4xl mx-auto space-y-12">
                      <div className="text-center space-y-2">
                        <span className="text-[10px] uppercase tracking-[0.4em] text-amber-500 font-bold">The Great Synthesis / 总结</span>
                        <h2 className="text-4xl font-serif text-white italic">The Council&apos;s Final Verdict</h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                           <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-500 border-b border-white/10 pb-2">Collective Insight</h3>
                           <div className="prose prose-invert prose-amber max-w-none">
                              <p className="text-xl text-slate-100 font-serif leading-relaxed italic">
                                {msg.contentPrimary}
                              </p>
                           </div>
                        </div>
                        <div className="space-y-6">
                           <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-500 border-b border-white/10 pb-2">A Path Forward</h3>
                           <div className="bg-white/[0.02] border border-white/5 p-8 rounded-2xl relative">
                              <Sparkles className="absolute top-4 right-4 w-5 h-5 text-amber-500/30" />
                              <p className="text-lg text-slate-300 font-light leading-relaxed tracking-wide">
                                {msg.contentSecondary}
                              </p>
                           </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-center pt-8">
                        <Button 
                          variant="outline" 
                          onClick={() => setSession(null)}
                          className="px-12 h-14 bg-transparent border-white/10 text-white hover:bg-white/5 font-bold uppercase tracking-[0.2em] text-[10px]"
                        >
                          Address New Inquiry
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            
            <div ref={scrollRef} className="h-1" />
          </div>
        )}
      </main>

      {/* Floating Synthesis Trigger Footer */}
      {session && session.currentRound === 'synthesis' && !loading && !session.messages.some(m => m.round === 'synthesis') && (
         <footer className="fixed bottom-0 left-0 w-full z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 p-6 flex flex-col items-center">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            <div className="max-w-xl text-center space-y-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">All viewpoints have been explored.</p>
              <button 
                onClick={() => processNextStep('synthesis', session)}
                className="group relative px-12 py-4 bg-amber-600 text-zinc-950 font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-amber-500 transition-all hover:scale-105 rounded-full overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                <span className="relative flex items-center gap-3">
                  <Sparkles className="w-4 h-4" />
                  Generate Final Verdict
                </span>
              </button>
            </div>
         </footer>
      )}

      {/* Visual Accents */}
      <div className="fixed bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent pointer-events-none" />
    </div>
  );
}
