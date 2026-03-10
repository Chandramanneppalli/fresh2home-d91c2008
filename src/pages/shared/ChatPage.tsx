import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Phone, MoreVertical, ArrowLeft, MessageSquarePlus, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useConversations, useMessages, findOrCreateConversation, type Conversation } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const NewChatDialog = ({ userId, onCreated }: { userId: string; onCreated: (convId: string) => void }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ user_id: string; full_name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .ilike('full_name', `%${q}%`)
      .neq('user_id', userId)
      .limit(10);
    setResults(data || []);
    setSearching(false);
  };

  const startChat = async (otherId: string) => {
    const convId = await findOrCreateConversation(userId, otherId);
    setOpen(false);
    setSearch('');
    setResults([]);
    onCreated(convId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><MessageSquarePlus className="h-5 w-5" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Search by name..." className="pl-9" />
          </div>
          {searching && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
          <div className="max-h-60 overflow-auto space-y-1">
            {results.map(u => (
              <button key={u.user_id} onClick={() => startChat(u.user_id)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left">
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-foreground">{u.full_name}</span>
              </button>
            ))}
            {search.length >= 2 && !searching && results.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ChatPage = () => {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ? { id: data.user.id } : null));
  }, []);

  const { conversations, loading, refetch } = useConversations(user?.id);
  const { messages, sendMessage } = useMessages(selectedConvo?.id, user?.id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Refetch conversations when messages change (for last message updates)
  useEffect(() => {
    if (messages.length > 0) {
      const timeout = setTimeout(refetch, 500);
      return () => clearTimeout(timeout);
    }
  }, [messages.length, refetch]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    await sendMessage(newMessage);
    setNewMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectConversation = (convo: Conversation) => {
    setSelectedConvo(convo);
    setShowMobileChat(true);
  };

  const handleNewChat = (convId: string) => {
    refetch().then(() => {
      const convo = conversations.find(c => c.id === convId);
      if (convo) selectConversation(convo);
    });
    // Also try after refetch completes
    setTimeout(() => {
      refetch();
    }, 300);
  };

  if (!user) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const ContactsList = () => (
    <div className={`w-full md:w-80 border-r border-border bg-card flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-bold font-display text-card-foreground">Messages</h2>
        <NewChatDialog userId={user.id} onCreated={handleNewChat} />
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-muted-foreground text-sm">No conversations yet</p>
            <p className="text-muted-foreground text-xs mt-1">Start a new chat using the + button above</p>
          </div>
        ) : (
          conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => selectConversation(convo)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border transition-colors text-left ${
                selectedConvo?.id === convo.id ? 'bg-accent' : 'hover:bg-muted/50'
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                {convo.otherUser?.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm text-card-foreground truncate">{convo.otherUser?.full_name || 'Unknown'}</p>
                  {convo.lastMessage && (
                    <span className="text-xs text-muted-foreground shrink-0">{formatTime(convo.lastMessage.created_at)}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{convo.lastMessage?.content || 'No messages yet'}</p>
              </div>
              {convo.unreadCount > 0 && (
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                  {convo.unreadCount}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  const ChatWindow = () => (
    <div className={`flex-1 flex-col bg-background ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
      {selectedConvo ? (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowMobileChat(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                {selectedConvo.otherUser?.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-medium text-sm text-card-foreground">{selectedConvo.otherUser?.full_name || 'Unknown'}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">Send a message to start the conversation</p>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                    msg.sender_id === user.id
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-card text-card-foreground border border-border rounded-bl-md'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender_id === user.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border bg-card">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 h-11"
              />
              <Button size="icon" className="h-11 w-11 shrink-0" onClick={handleSend} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquarePlus className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Select a conversation or start a new one</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-60px)] md:h-screen">
      <ContactsList />
      <ChatWindow />
    </div>
  );
};

export default ChatPage;
