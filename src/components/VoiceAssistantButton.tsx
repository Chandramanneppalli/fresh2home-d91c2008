import { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

const LANGUAGE_TO_CODE: Record<string, string> = {
  en: 'eng', hi: 'hin', ta: 'tam', te: 'tel', kn: 'kan',
  ml: 'mal', mr: 'mar', bn: 'ben', gu: 'guj', pa: 'pan',
};

const VoiceAssistantButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, session } = useApp();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setState('processing');
    setTranscript('Transcribing...');

    try {
      // Step 1: Speech-to-Text
      const sttFormData = new FormData();
      sttFormData.append('audio', audioBlob, 'recording.webm');
      const langCode = LANGUAGE_TO_CODE[language] || 'eng';
      sttFormData.append('language', langCode);

      const sttRes = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-stt`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: sttFormData,
      });

      if (!sttRes.ok) throw new Error('Speech recognition failed');
      const { text: spokenText } = await sttRes.json();

      if (!spokenText?.trim()) {
        setState('idle');
        setTranscript('');
        toast({ title: 'No speech detected', description: 'Please try speaking again.', variant: 'destructive' });
        return;
      }

      setTranscript(spokenText);

      // Step 2: AI Intent Parsing
      const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/voice-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          transcript: spokenText,
          role,
          language,
          currentPage: location.pathname,
        }),
      });

      if (!aiRes.ok) {
        const err = await aiRes.json();
        throw new Error(err.error || 'AI processing failed');
      }

      const { reply: aiReply, action } = await aiRes.json();
      setReply(aiReply);

      // Step 3: Text-to-Speech
      setState('speaking');
      const ttsRes = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ text: aiReply }),
      });

      if (!ttsRes.ok) throw new Error('Text-to-speech failed');
      const { audioContent } = await ttsRes.json();

      // Play audio
      const audioUrl = `data:audio/mpeg;base64,${audioContent}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setState('idle');
        // Execute action after speaking
        if (action?.type === 'navigate' && action.path) {
          navigate(action.path);
        }
      };

      await audio.play();
    } catch (err) {
      console.error('Voice assistant error:', err);
      setState('idle');
      setTranscript('');
      setReply('');
      toast({
        title: 'Voice Assistant Error',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      });
    }
  }, [SUPABASE_URL, SUPABASE_KEY, language, role, location.pathname, navigate, toast]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          processAudio(audioBlob);
        }
      };

      mediaRecorder.start();
      setState('listening');
      setTranscript('');
      setReply('');
    } catch (err) {
      toast({
        title: 'Microphone Access Required',
        description: 'Please allow microphone access to use the voice assistant.',
        variant: 'destructive',
      });
    }
  }, [processAudio, toast]);

  const handleMainAction = useCallback(() => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'listening') {
      stopRecording();
    } else if (state === 'speaking') {
      audioRef.current?.pause();
      setState('idle');
    }
  }, [state, startRecording, stopRecording]);

  const handleCancel = useCallback(() => {
    if (state === 'listening') {
      mediaRecorderRef.current?.stop();
    }
    if (state === 'speaking') {
      audioRef.current?.pause();
    }
    setState('idle');
    setTranscript('');
    setReply('');
  }, [state]);

  if (!session) return null;

  const stateConfig = {
    idle: { icon: Mic, color: 'bg-primary', pulse: false, label: 'Ask FarmLink AI' },
    listening: { icon: MicOff, color: 'bg-destructive', pulse: true, label: 'Listening...' },
    processing: { icon: Loader2, color: 'bg-amber-500', pulse: false, label: 'Thinking...' },
    speaking: { icon: Volume2, color: 'bg-primary', pulse: true, label: 'Speaking...' },
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-3">
      {/* Transcript/Reply bubble */}
      <AnimatePresence>
        {(transcript || reply) && state !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="bg-card border border-border rounded-2xl shadow-lg p-4 max-w-[280px] mr-1"
          >
            {transcript && (
              <div className="mb-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">You said</p>
                <p className="text-sm text-foreground">{transcript}</p>
              </div>
            )}
            {reply && (
              <div>
                <p className="text-[10px] font-medium text-primary uppercase tracking-wider mb-1">FarmLink AI</p>
                <p className="text-sm text-foreground">{reply}</p>
              </div>
            )}
            <button
              onClick={handleCancel}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.div whileTap={{ scale: 0.9 }} className="relative">
        {config.pulse && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: 'hsl(var(--primary))' }} />
        )}
        <Button
          onClick={handleMainAction}
          size="icon"
          className={`h-14 w-14 rounded-full shadow-lg ${config.color} hover:opacity-90 transition-all`}
          disabled={state === 'processing'}
        >
          <Icon className={`h-6 w-6 text-primary-foreground ${state === 'processing' ? 'animate-spin' : ''}`} />
        </Button>
      </motion.div>
    </div>
  );
};

export default VoiceAssistantButton;
