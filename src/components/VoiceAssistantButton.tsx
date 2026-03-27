import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

const VoiceAssistantButton = () => {
  const { session, role } = useApp();
  const { toast } = useToast();
  const location = useLocation();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [agentText, setAgentText] = useState('');
  const [userText, setUserText] = useState('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastTranscriptRef = useRef('');

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const processWithAI = useCallback(async (transcript: string) => {
    setVoiceState('processing');
    setUserText(transcript);

    try {
      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: {
          transcript,
          role: role || 'consumer',
          language: 'en',
          currentPage: location.pathname,
        },
      });

      if (error) throw error;

      const reply = data?.reply || "Sorry, I couldn't process that.";
      setAgentText(reply);
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
  }, [role, location.pathname, speak, toast]);

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
    recognition.lang = 'en-US';
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

    recognition.onerror = (event) => {
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

  if (!session) return null;

  const isActive = voiceState !== 'idle';
  const isListening = voiceState === 'listening';
  const isProcessing = voiceState === 'processing';
  const isSpeaking = voiceState === 'speaking';

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-3">
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
  );
};

export default VoiceAssistantButton;
