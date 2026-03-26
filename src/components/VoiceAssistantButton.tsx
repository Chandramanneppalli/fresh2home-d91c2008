import { useState, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type VoiceState = 'idle' | 'connecting' | 'connected';

const VoiceAssistantButton = () => {
  const { session } = useApp();
  const { toast } = useToast();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [agentText, setAgentText] = useState('');
  const [userText, setUserText] = useState('');

  const conversation = useConversation({
    onConnect: () => {
      setVoiceState('connected');
    },
    onDisconnect: () => {
      setVoiceState('idle');
      setAgentText('');
      setUserText('');
    },
    onMessage: (message) => {
      if (message.type === 'agent_response') {
        setAgentText((message as any).agent_response_event?.agent_response || '');
      }
      if (message.type === 'user_transcript') {
        setUserText((message as any).user_transcription_event?.user_transcript || '');
      }
    },
    onError: (error) => {
      console.error('Voice agent error:', error);
      setVoiceState('idle');
      toast({
        title: 'Voice Assistant Error',
        description: 'Connection failed. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const startConversation = useCallback(async () => {
    setVoiceState('connecting');
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation-token');

      if (error || !data?.signed_url) {
        throw new Error(error?.message || 'Failed to get conversation token');
      }

      await conversation.startSession({
        signedUrl: data.signed_url,
      });
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setVoiceState('idle');
      toast({
        title: 'Connection Failed',
        description: err instanceof Error ? err.message : 'Could not start voice assistant.',
        variant: 'destructive',
      });
    }
  }, [conversation, toast]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const handleMainAction = useCallback(() => {
    if (voiceState === 'idle') {
      startConversation();
    } else if (voiceState === 'connected') {
      stopConversation();
    }
  }, [voiceState, startConversation, stopConversation]);

  if (!session) return null;

  const isConnected = voiceState === 'connected';
  const isConnecting = voiceState === 'connecting';
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-3">
      {/* Transcript bubble */}
      <AnimatePresence>
        {isConnected && (userText || agentText) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="bg-card border border-border rounded-2xl shadow-lg p-4 max-w-[280px] mr-1"
          >
            {userText && (
              <div className="mb-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">You said</p>
                <p className="text-sm text-foreground">{userText}</p>
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
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5 shadow-md mr-1"
          >
            <span className={`h-2 w-2 rounded-full ${isSpeaking ? 'bg-primary animate-pulse' : 'bg-green-500'}`} />
            <span className="text-xs font-medium text-muted-foreground">
              {isSpeaking ? 'Speaking...' : 'Listening...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.div whileTap={{ scale: 0.9 }} className="relative">
        {isConnected && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ backgroundColor: 'hsl(var(--primary))' }} />
        )}
        <Button
          onClick={handleMainAction}
          size="icon"
          className={`h-14 w-14 rounded-full shadow-lg transition-all ${
            isConnected ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
          }`}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <Loader2 className="h-6 w-6 text-primary-foreground animate-spin" />
          ) : isConnected ? (
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
