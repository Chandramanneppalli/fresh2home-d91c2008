import { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { StatCard, SectionHeader } from '@/components/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAdminStats, useOrders, formatCurrency } from '@/hooks/useAdminStats';
import { supabase } from '@/integrations/supabase/client';

const AdminRevenue = () => {
  const stats = useAdminStats();
  const { orders, loading } = useOrders();
  const [farmerNames, setFarmerNames] = useState<Record<string, string>>({});

  // Fetch farmer names
  useEffect(() => {
    const farmerIds = [...new Set(orders.map(o => o.farmer_id))];
    if (farmerIds.length === 0) return;
    supabase.from('profiles').select('user_id, full_name').in('user_id', farmerIds).then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(p => { map[p.user_id] = p.full_name || 'Unknown'; });
        setFarmerNames(map);
      }
    });
  }, [orders]);

  // Monthly revenue (last 6 months)
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthOrders = orders.filter(o => {
        const od = new Date(o.created_at);
        return od >= d && od < end;
      });
      months.push({
        month: d.toLocaleString('default', { month: 'short' }),
        revenue: monthOrders.reduce((s, o) => s + Number(o.total_amount), 0),
        commission: monthOrders.reduce((s, o) => s + Number(o.commission_amount), 0),
      });
    }
    return months;
  }, [orders]);

  // Daily revenue (this week)
  const dailyRevenue = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, i) => {
      const start = new Date(monday);
      start.setDate(monday.getDate() + i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const dayOrders = orders.filter(o => {
        const od = new Date(o.created_at);
        return od >= start && od < end;
      });
      return { day, amount: dayOrders.reduce((s, o) => s + Number(o.total_amount), 0) };
    });
  }, [orders]);

  // Top farmers by revenue
  const topFarmers = useMemo(() => {
    const farmerMap: Record<string, { revenue: number; orders: number }> = {};
    orders.forEach(o => {
      if (!farmerMap[o.farmer_id]) farmerMap[o.farmer_id] = { revenue: 0, orders: 0 };
      farmerMap[o.farmer_id].revenue += Number(o.total_amount);
      farmerMap[o.farmer_id].orders += 1;
    });
    return Object.entries(farmerMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([id, data]) => ({
        id,
        name: farmerNames[id] || 'Loading...',
        revenue: formatCurrency(data.revenue),
        orders: data.orders,
      }));
  }, [orders, farmerNames]);

  if (loading || stats.loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Revenue Analytics</h1>
        <p className="text-muted-foreground mt-1">Track platform earnings and financial performance</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={IndianRupee} label="Total Revenue" value={formatCurrency(stats.totalRevenue)} variant="primary" />
        <StatCard icon={IndianRupee} label="This Month" value={formatCurrency(stats.monthRevenue)} variant="gold" />
        <StatCard icon={TrendingUp} label="Commission" value={formatCurrency(stats.totalCommission)} variant="sky" />
        <StatCard icon={TrendingUp} label="Avg Order" value={formatCurrency(stats.avgOrderValue)} variant="default" />
      </div>

      {/* Monthly Revenue Chart */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <SectionHeader title="Monthly Revenue & Commission" subtitle="Last 6 months" />
        {orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No order data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Revenue" />
              <Area type="monotone" dataKey="commission" stroke="hsl(var(--farm-gold))" fill="hsl(var(--farm-gold) / 0.15)" strokeWidth={2} name="Commission" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Daily Revenue */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <SectionHeader title="This Week" subtitle="Daily revenue breakdown" />
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No order data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Farmers */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-4">
            <SectionHeader title="Top Earning Farmers" subtitle="All time" />
          </div>
          {topFarmers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No farmer revenue data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Farmer</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Revenue</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {topFarmers.map(f => (
                    <tr key={f.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-card-foreground">{f.name}</td>
                      <td className="px-4 py-2.5 text-card-foreground">{f.revenue}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{f.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRevenue;
