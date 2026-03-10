import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  created_at: string;
  updated_at: string;
  otherUser?: { full_name: string; user_id: string };
  lastMessage?: { content: string; created_at: string };
  unreadCount: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    const { data: convos } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (!convos || convos.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Get other user IDs
    const otherIds = convos.map(c => c.participant_1 === userId ? c.participant_2 : c.participant_1);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', otherIds);

    const profileMap: Record<string, string> = {};
    profiles?.forEach(p => { profileMap[p.user_id] = p.full_name; });

    // Get last message and unread count for each conversation
    const enriched: Conversation[] = await Promise.all(convos.map(async (c) => {
      const otherId = c.participant_1 === userId ? c.participant_2 : c.participant_1;
      
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .eq('read', false)
        .neq('sender_id', userId);

      return {
        ...c,
        otherUser: { full_name: profileMap[otherId] || 'Unknown', user_id: otherId },
        lastMessage: lastMsg?.[0] || undefined,
        unreadCount: count || 0,
      };
    }));

    setConversations(enriched);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}

export function useMessages(conversationId: string | undefined, userId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);

  // Fetch initial messages
  useEffect(() => {
    if (!conversationId) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as Message[]);
    };
    fetch();
  }, [conversationId]);

  // Mark messages as read
  useEffect(() => {
    if (!conversationId || !userId) return;
    supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .eq('read', false)
      .neq('sender_id', userId)
      .then(() => {});
  }, [conversationId, userId, messages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !userId || !content.trim()) return;
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: content.trim(),
    });
    // Update conversation updated_at
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
  }, [conversationId, userId]);

  return { messages, sendMessage };
}

export async function findOrCreateConversation(userId1: string, userId2: string): Promise<string> {
  // Check both orderings
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(`and(participant_1.eq.${userId1},participant_2.eq.${userId2}),and(participant_1.eq.${userId2},participant_2.eq.${userId1})`)
    .limit(1);

  if (existing && existing.length > 0) return existing[0].id;

  const { data: created } = await supabase
    .from('conversations')
    .insert({ participant_1: userId1, participant_2: userId2 })
    .select('id')
    .single();

  return created!.id;
}
