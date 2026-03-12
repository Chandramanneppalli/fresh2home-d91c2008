import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, CheckCircle, Clock, Truck, Warehouse, XCircle, Eye, QrCode, Loader2, ShoppingBag, User, Package, IndianRupee, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
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
  commission_amount: number;
  items: any;
  created_at: string;
  updated_at: string;
  farmer_id: string;
  delivery_address: string | null;
}

interface FarmerProfile {
  full_name: string;
  farm_name: string | null;
  farm_location: string | null;
  phone: string | null;
}

const ConsumerOrders = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [farmerProfiles, setFarmerProfiles] = useState<Record<string, FarmerProfile>>({});

  const fetchOrders = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('consumer_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
      // Fetch farmer profiles for all unique farmer_ids
      const farmerIds = [...new Set(data.map(o => o.farmer_id))];
      if (farmerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, farm_name, farm_location, phone')
          .in('user_id', farmerIds);
        if (profiles) {
          const map: Record<string, FarmerProfile> = {};
          profiles.forEach(p => { map[p.user_id] = p; });
          setFarmerProfiles(map);
        }
      }
    }
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
    const allSteps = [
      { label: 'Placed', desc: 'Order received' },
      { label: 'Confirmed', desc: 'Farmer accepted' },
      { label: 'Packed', desc: 'Ready for dispatch' },
      { label: 'Shipped', desc: 'On the way' },
      { label: 'Delivered', desc: 'At your doorstep' },
    ];
    const currentStep = statusConfig[status]?.step || 0;
    return allSteps.map((s, i) => ({ ...s, completed: i < currentStep, active: i === currentStep - 1 }));
  };

  const formatItems = (items: any) => {
    if (Array.isArray(items)) {
      return items.map((i: any) => `${i.name} x${i.qty}`).join(', ');
    }
    return 'Order items';
  };

  const getItemsArray = (items: any): { name: string; qty: number; price: number; product_id?: string }[] => {
    if (Array.isArray(items)) return items;
    return [];
  };

  const farmerName = (farmerId: string) => {
    const p = farmerProfiles[farmerId];
    return p?.farm_name || p?.full_name || 'Farm';
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
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3" /> {farmerName(order.farmer_id)}
                  </p>
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

              <div className="flex items-center justify-end mt-3 pt-3 border-t border-border gap-2">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setSelectedOrder(order)}>
                  <Eye className="h-3 w-3" /> View Details
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detail Dialog with full transparency */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedOrder && (() => {
            const farmer = farmerProfiles[selectedOrder.farmer_id];
            const items = getItemsArray(selectedOrder.items);
            const subtotal = items.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 1), 0);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>{selectedOrder.order_number}</span>
                    <Badge className={statusConfig[selectedOrder.status]?.color + ' capitalize'}>{selectedOrder.status}</Badge>
                  </DialogTitle>
                  <DialogDescription>
                    Placed on {format(new Date(selectedOrder.created_at), 'MMM d, yyyy • h:mm a')}
                    {selectedOrder.updated_at !== selectedOrder.created_at && (
                      <span className="block text-xs mt-0.5">Last updated: {format(new Date(selectedOrder.updated_at), 'MMM d, yyyy • h:mm a')}</span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                  {/* Farmer Info */}
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Seller Details</h3>
                    <p className="text-sm font-medium text-card-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      {farmer?.farm_name || farmer?.full_name || 'Farmer'}
                    </p>
                    {farmer?.farm_location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" /> {farmer.farm_location}
                      </p>
                    )}
                  </div>

                  {/* Delivery Address */}
                  {selectedOrder.delivery_address && (
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Delivery Address</h3>
                      <p className="text-sm text-card-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {selectedOrder.delivery_address}
                      </p>
                    </div>
                  )}

                  {/* Item Breakdown */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Items Ordered</h3>
                    <div className="rounded-lg border border-border overflow-hidden">
                      {items.length > 0 ? items.map((item, idx) => (
                        <div key={idx} className={`flex items-center justify-between px-3 py-2.5 text-sm ${idx > 0 ? 'border-t border-border' : ''}`}>
                          <div className="flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-card-foreground">{item.name}</span>
                            <span className="text-muted-foreground">×{item.qty}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-card-foreground">₹{(item.price * item.qty).toFixed(2)}</span>
                            {item.product_id && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => navigate(`/trace/${item.product_id}`)}>
                                <QrCode className="h-3.5 w-3.5 text-primary" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )) : (
                        <p className="px-3 py-2 text-sm text-muted-foreground">Items details unavailable</p>
                      )}
                    </div>
                  </div>

                  {/* Pricing Transparency */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Price Breakdown</h3>
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between text-card-foreground">
                        <span>Subtotal</span>
                        <span>₹{subtotal > 0 ? subtotal.toFixed(2) : selectedOrder.total_amount.toFixed(2)}</span>
                      </div>
                      {selectedOrder.commission_amount > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Platform fee</span>
                          <span>₹{selectedOrder.commission_amount.toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-card-foreground">
                        <span>Total Paid</span>
                        <span className="flex items-center gap-0.5">
                          <IndianRupee className="h-3.5 w-3.5" />
                          {selectedOrder.total_amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Progress Timeline */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order Progress</h3>
                    {getSteps(selectedOrder.status).map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            step.completed ? 'bg-primary border-primary' : step.active ? 'bg-primary/20 border-primary animate-pulse' : 'bg-card border-muted-foreground/30'
                          }`}>
                            {step.completed && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          {i < 4 && <div className={`w-0.5 h-6 ${step.completed ? 'bg-primary/30' : 'bg-border'}`} />}
                        </div>
                        <div>
                          <p className={`text-sm ${step.completed || step.active ? 'text-card-foreground font-medium' : 'text-muted-foreground'}`}>{step.label}</p>
                          <p className="text-xs text-muted-foreground">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order ID for reference */}
                  <div className="text-center pt-2">
                    <p className="text-[10px] text-muted-foreground/60 font-mono">Order ID: {selectedOrder.id}</p>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsumerOrders;
