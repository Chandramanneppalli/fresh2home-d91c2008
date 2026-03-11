import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, CheckCircle, Clock, Truck, Warehouse, XCircle, Eye, QrCode, Loader2, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const statusConfig: Record<string, { color: string; icon: typeof Clock; step: number }> = {
  pending: { color: 'bg-farm-warning/15 text-farm-warning', icon: Clock, step: 1 },
  confirmed: { color: 'bg-accent text-accent-foreground', icon: Warehouse, step: 2 },
  packed: { color: 'bg-accent text-accent-foreground', icon: Warehouse, step: 3 },
  shipped: { color: 'bg-farm-sky/15 text-farm-sky', icon: Truck, step: 4 },
  delivered: { color: 'bg-farm-success/15 text-farm-success', icon: CheckCircle, step: 5 },
  cancelled: { color: 'bg-destructive/15 text-destructive', icon: XCircle, step: 0 },
};

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  items: any;
  created_at: string;
  farmer_id: string;
}

const ConsumerOrders = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);

  const fetchOrders = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('consumer_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    if (!user) return;
    const channel = supabase
      .channel('consumer-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `consumer_id=eq.${user.id}` }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-bold font-display text-foreground">No orders yet</h2>
        <p className="text-muted-foreground mt-1">Start shopping to see your orders here</p>
        <Button className="mt-4" onClick={() => navigate('/consumer')}>Browse Products</Button>
      </div>
    );
  }

  const getSteps = (status: string) => {
    const allSteps = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];
    const currentStep = statusConfig[status]?.step || 0;
    return allSteps.map((label, i) => ({ label, completed: i < currentStep }));
  };

  const formatItems = (items: any) => {
    if (Array.isArray(items)) {
      return items.map((i: any) => `${i.name} x${i.qty}`).join(', ');
    }
    return 'Order items';
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold font-display text-foreground">My Orders</h1>

      <div className="space-y-3">
        {orders.map((order, i) => {
          const config = statusConfig[order.status] || statusConfig.pending;
          const steps = getSteps(order.status);
          const progress = steps.filter(s => s.completed).length;

          return (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-card-foreground">{order.order_number}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'MMM d, yyyy • h:mm a')}</p>
                </div>
                <Badge className={`${config.color} gap-1 capitalize`}>
                  <config.icon className="h-3 w-3" />
                  {order.status}
                </Badge>
              </div>
              <p className="text-sm text-card-foreground">{formatItems(order.items)}</p>
              <p className="text-sm font-bold text-card-foreground mt-1">₹{order.total_amount}</p>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{progress}/{steps.length} steps complete</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(progress / steps.length) * 100}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-end mt-3 pt-3 border-t border-border">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setSelectedOrder(order)}>
                  <Eye className="h-3 w-3" /> View Details
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedOrder.order_number}</span>
                  <Badge className={statusConfig[selectedOrder.status]?.color + ' capitalize'}>{selectedOrder.status}</Badge>
                </DialogTitle>
                <DialogDescription>Order placed on {format(new Date(selectedOrder.created_at), 'MMM d, yyyy')}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="text-sm space-y-1">
                  <p className="text-card-foreground font-medium">{formatItems(selectedOrder.items)}</p>
                  <p className="font-bold text-card-foreground">Total: ₹{selectedOrder.total_amount}</p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-card-foreground">Order Progress</h3>
                  {getSteps(selectedOrder.status).map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-4 w-4 rounded-full border-2 ${step.completed ? 'bg-primary border-primary' : 'bg-card border-muted-foreground/30'}`} />
                        {i < 4 && <div className={`w-0.5 h-6 ${step.completed ? 'bg-primary/30' : 'bg-border'}`} />}
                      </div>
                      <p className={`text-sm ${step.completed ? 'text-card-foreground font-medium' : 'text-muted-foreground'}`}>{step.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsumerOrders;
