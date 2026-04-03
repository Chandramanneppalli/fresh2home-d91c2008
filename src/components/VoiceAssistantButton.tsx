import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, History, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { useLanguage, LanguageCode } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

const LANG_TO_BCP47: Record<LanguageCode, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  ml: 'ml-IN',
};

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface HistoryEntry {
  id: string;
  userText: string;
  agentText: string;
  timestamp: Date;
  language: LanguageCode;
}

const VoiceAssistantButton = () => {
  const { session, role } = useApp();
  const { language } = useLanguage();
  const { toast } = useToast();
  const location = useLocation();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [agentText, setAgentText] = useState('');
  const [userText, setUserText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastTranscriptRef = useRef('');
  const languageRef = useRef(language);
  const pathnameRef = useRef(location.pathname);
  const voicesLoadedRef = useRef(false);
  const cachedVoicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    languageRef.current = language;
    pathnameRef.current = location.pathname;
  }, [language, location.pathname]);

  // Preload voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        cachedVoicesRef.current = voices;
        voicesLoadedRef.current = true;
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Load history from localStorage
  useEffect(() => {
    if (!session?.user?.id) return;
    try {
      const stored = localStorage.getItem(`voice-history-${session.user.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed.map((h: any) => ({ ...h, timestamp: new Date(h.timestamp) })));
      }
    } catch {}
  }, [session?.user?.id]);

  const saveHistory = useCallback((entries: HistoryEntry[]) => {
    if (!session?.user?.id) return;
    // Keep last 50 entries
    const toSave = entries.slice(-50);
    setHistory(toSave);
    try {
      localStorage.setItem(`voice-history-${session.user.id}`, JSON.stringify(toSave));
    } catch {}
  }, [session?.user?.id]);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const currentLanguage = languageRef.current;
      const targetLang = LANG_TO_BCP47[currentLanguage] || 'en-IN';
      const utterance = new SpeechSynthesisUtterance(text);

      // Use cached voices
      const voices = cachedVoicesRef.current.length > 0
        ? cachedVoicesRef.current
        : window.speechSynthesis.getVoices();

      // Try exact match, then prefix match, then any match with the language code
      const matchedVoice = voices.find((v) => v.lang.toLowerCase() === targetLang.toLowerCase())
        || voices.find((v) => v.lang.toLowerCase().startsWith(currentLanguage))
        || voices.find((v) => v.lang.toLowerCase().includes(currentLanguage));

      utterance.lang = matchedVoice?.lang || targetLang;
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.warn('TTS error:', e);
        resolve();
      };
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);

      // Fallback timeout - some browsers don't fire onend for unsupported languages
      setTimeout(() => resolve(), Math.max(text.length * 100, 5000));
    });
  }, []);

  const processWithAI = useCallback(async (transcript: string) => {
    setVoiceState('processing');
    setUserText(transcript);

    try {
      // Build conversation context from recent history (last 5 exchanges)
      const recentHistory = history.slice(-5).flatMap(h => [
        { role: 'user' as const, content: h.userText },
        { role: 'assistant' as const, content: h.agentText },
      ]);

      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: {
          transcript,
          role: role || 'consumer',
          language: languageRef.current,
          currentPage: pathnameRef.current,
          conversationHistory: recentHistory,
        },
      });

      if (error) throw error;

      const reply = data?.reply || "Sorry, I couldn't process that.";
      setAgentText(reply);

      // Save to history
      const newEntry: HistoryEntry = {
        id: crypto.randomUUID(),
        userText: transcript,
        agentText: reply,
        timestamp: new Date(),
        language: languageRef.current,
      };
      saveHistory([...history, newEntry]);

      setVoiceState('speaking');
      await speak(reply);

      if (data?.action?.type === 'navigate' && data.action.path) {
        window.location.href = data.action.path;
      }

      setVoiceState('idle');
    } catch (err) {
      console.error('AI processing error:', err);
      setVoiceState('idle');
      toast({
        title: 'Processing Error',
        description: 'Could not get a response. Please try again.',
        variant: 'destructive',
      });
    }
  }, [role, speak, toast, history, saveHistory]);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast({
        title: 'Not Supported',
        description: 'Speech recognition is not supported in this browser. Try Chrome or Edge.',
        variant: 'destructive',
      });
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = LANG_TO_BCP47[languageRef.current] || 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setVoiceState('listening');
      setUserText('');
      setAgentText('');
    };

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript;
      lastTranscriptRef.current = transcript;
      setUserText(transcript);
    };

    recognition.onend = () => {
      const text = lastTranscriptRef.current.trim();
      if (text) {
        processWithAI(text);
      } else {
        setVoiceState('idle');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setVoiceState('idle');
      if (event.error !== 'no-speech') {
        toast({
          title: 'Microphone Error',
          description: event.error === 'not-allowed'
            ? 'Please allow microphone access.'
            : 'Could not capture audio. Please try again.',
          variant: 'destructive',
        });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [toast, processWithAI]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
    setVoiceState('idle');
  }, []);

  const handleMainAction = useCallback(() => {
    if (voiceState === 'idle') {
      startListening();
    } else {
      stopListening();
    }
  }, [voiceState, startListening, stopListening]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (session?.user?.id) {
      localStorage.removeItem(`voice-history-${session.user.id}`);
    }
  }, [session?.user?.id]);

  if (!session) return null;

  const isActive = voiceState !== 'idle';
  const isListening = voiceState === 'listening';
  const isProcessing = voiceState === 'processing';

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-3">
      {/* History panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="bg-card border border-border rounded-2xl shadow-lg w-[300px] max-h-[400px] mr-1 flex flex-col"
          >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Conversation History</h3>
              <div className="flex gap-1">
                {history.length > 0 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearHistory}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistory(false)}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 max-h-[340px]">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
              ) : (
                <div className="p-2 space-y-3">
                  {history.map((entry) => (
                    <div key={entry.id} className="space-y-1">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">You</p>
                        <p className="text-xs text-foreground">{entry.userText}</p>
                      </div>
                      <div className="bg-primary/5 rounded-lg p-2">
                        <p className="text-[10px] font-medium text-primary uppercase tracking-wider">FarmLink AI</p>
                        <p className="text-xs text-foreground">{entry.agentText}</p>
                      </div>
                      <p className="text-[9px] text-muted-foreground text-right">
                        {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript bubble */}
      <AnimatePresence>
        {(userText || agentText) && isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="bg-card border border-border rounded-2xl shadow-lg p-4 max-w-[280px] mr-1"
          >
            {userText && (
              <div className="mb-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">You said</p>
                <p id="voice-user-text" className="text-sm text-foreground">{userText}</p>
              </div>
            )}
            {agentText && (
              <div>
                <p className="text-[10px] font-medium text-primary uppercase tracking-wider mb-1">FarmLink AI</p>
                <p className="text-sm text-foreground">{agentText}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 shadow-md mr-1"
          >
            <span className={`h-2 w-2 rounded-full ${
              isListening ? 'bg-green-500 animate-pulse' :
              isProcessing ? 'bg-yellow-500 animate-pulse' :
              'bg-primary animate-pulse'
            }`} />
            <span className="text-xs font-medium text-muted-foreground">
              {isListening ? 'Listening...' : isProcessing ? 'Thinking...' : 'Speaking...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buttons row */}
      <div className="flex items-center gap-2">
        {/* History button */}
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            onClick={() => setShowHistory(!showHistory)}
            size="icon"
            variant="outline"
            className={`h-10 w-10 rounded-full shadow-md ${showHistory ? 'bg-primary text-primary-foreground' : ''}`}
          >
            <History className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Main FAB */}
        <motion.div whileTap={{ scale: 0.9 }} className="relative">
          {isActive && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: 'hsl(var(--primary))' }} />
          )}
          <Button
            onClick={handleMainAction}
            size="icon"
            className={`h-14 w-14 rounded-full shadow-lg transition-all ${
              isActive ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
            }`}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-6 w-6 text-primary-foreground animate-spin" />
            ) : isActive ? (
              <MicOff className="h-6 w-6 text-destructive-foreground" />
            ) : (
              <Mic className="h-6 w-6 text-primary-foreground" />
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default VoiceAssistantButton;
