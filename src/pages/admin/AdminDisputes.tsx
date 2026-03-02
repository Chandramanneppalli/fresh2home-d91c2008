import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Clock, MessageCircle, Filter, Loader2 } from 'lucide-react';
import { StatCard, SectionHeader } from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDisputes } from '@/hooks/useAdminStats';
import { supabase } from '@/integrations/supabase/client';

const statusConfig: Record<string, { icon: typeof Clock; color: string }> = {
  Open: { icon: Clock, color: 'bg-destructive/15 text-destructive' },
  'In Review': { icon: MessageCircle, color: 'bg-farm-gold/15 text-farm-gold' },
  Resolved: { icon: CheckCircle, color: 'bg-farm-success/15 text-farm-success' },
  Closed: { icon: CheckCircle, color: 'bg-muted text-muted-foreground' },
};

const AdminDisputes = () => {
  const { disputes, loading } = useDisputes();
  const [filter, setFilter] = useState<string>('All');
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = new Set([...disputes.map(d => d.farmer_id), ...disputes.map(d => d.consumer_id)]);
    if (ids.size === 0) return;
    supabase.from('profiles').select('user_id, full_name').in('user_id', Array.from(ids)).then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(p => { map[p.user_id] = p.full_name || 'Unknown'; });
        setNames(map);
      }
    });
  }, [disputes]);

  const filtered = filter === 'All' ? disputes : disputes.filter(d => d.status === filter);
  const openCount = disputes.filter(d => d.status === 'Open').length;
  const reviewCount = disputes.filter(d => d.status === 'In Review').length;
  const resolvedCount = disputes.filter(d => d.status === 'Resolved').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Dispute Management</h1>
        <p className="text-muted-foreground mt-1">Review and resolve platform disputes</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Clock} label="Open" value={openCount} variant="default" />
        <StatCard icon={MessageCircle} label="In Review" value={reviewCount} variant="gold" />
        <StatCard icon={CheckCircle} label="Resolved" value={resolvedCount} variant="primary" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {['All', 'Open', 'In Review', 'Resolved'].map(s => (
          <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)} className="h-8 text-xs">
            {s}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No disputes found</p>
        ) : (
          filtered.map(d => {
            const sc = statusConfig[d.status] || statusConfig.Open;
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-elevated transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{d.dispute_number}</span>
                      <Badge variant="outline" className="text-xs">{d.type}</Badge>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${sc.color}`}>
                        <sc.icon className="h-3 w-3" />
                        {d.status}
                      </span>
                    </div>
                    <p className="text-sm text-card-foreground mb-1">{d.description || 'No description'}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Farmer: <span className="text-card-foreground font-medium">{names[d.farmer_id] || '—'}</span></span>
                      <span>Consumer: <span className="text-card-foreground font-medium">{names[d.consumer_id] || '—'}</span></span>
                      <span>{new Date(d.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-card-foreground whitespace-nowrap">₹{Number(d.amount).toLocaleString()}</span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminDisputes;
