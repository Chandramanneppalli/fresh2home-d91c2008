import { motion } from 'framer-motion';
import { Users, IndianRupee, ShoppingCart, TrendingUp, AlertTriangle, CheckCircle, Clock, ArrowUpRight, Loader2 } from 'lucide-react';
import { StatCard, SectionHeader } from '@/components/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useAdminStats, useOrders, useDisputes, formatCurrency } from '@/hooks/useAdminStats';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

const AdminDashboard = () => {
  const stats = useAdminStats();
  const { orders } = useOrders();
  const { disputes } = useDisputes();
  const [farmerNames, setFarmerNames] = useState<Record<string, string>>({});
  const [consumerNames, setConsumerNames] = useState<Record<string, string>>({});

  // Fetch profile names for disputes
  useEffect(() => {
    const ids = new Set([...disputes.map(d => d.farmer_id), ...disputes.map(d => d.consumer_id)]);
    if (ids.size === 0) return;
    supabase.from('profiles').select('user_id, full_name').in('user_id', Array.from(ids)).then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(p => { map[p.user_id] = p.full_name || 'Unknown'; });
        setFarmerNames(map);
        setConsumerNames(map);
      }
    });
  }, [disputes]);

  // Weekly revenue from orders (last 4 weeks)
  const weeklyRevenue = useMemo(() => {
    const now = new Date();
    const weeks = [4, 3, 2, 1].map(w => {
      const start = new Date(now);
      start.setDate(start.getDate() - w * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const weekOrders = orders.filter(o => {
        const d = new Date(o.created_at);
        return d >= start && d < end;
      });
      return { week: `W${5 - w}`, revenue: weekOrders.reduce((s, o) => s + Number(o.total_amount), 0) };
    });
    return weeks;
  }, [orders]);

  // User distribution
  const userDistribution = useMemo(() => [
    { name: 'Farmers', value: stats.farmerCount, color: 'hsl(142, 52%, 36%)' },
    { name: 'Consumers', value: stats.consumerCount, color: 'hsl(36, 72%, 55%)' },
  ], [stats.farmerCount, stats.consumerCount]);

  // Monthly growth from orders
  const monthlyGrowth = useMemo(() => {
    const months: { month: string; users: number; orders: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthOrders = orders.filter(o => {
        const od = new Date(o.created_at);
        return od >= d && od < end;
      });
      months.push({
        month: d.toLocaleString('default', { month: 'short' }),
        users: stats.totalUsers,
        orders: monthOrders.length,
      });
    }
    return months;
  }, [orders, stats.totalUsers]);

  // Recent disputes (top 3)
  const recentDisputes = disputes.slice(0, 3);

  if (stats.loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">FarmLink Connect Admin Dashboard</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers.toLocaleString()} variant="primary" />
        <StatCard icon={ShoppingCart} label="Total Orders" value={stats.totalOrders.toLocaleString()} variant="gold" />
        <StatCard icon={IndianRupee} label="This Month Revenue" value={formatCurrency(stats.monthRevenue)} variant="sky" />
        <StatCard icon={AlertTriangle} label="Open Disputes" value={stats.openDisputes} variant="default" />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        <div className="md:col-span-2 rounded-xl border border-border bg-card p-4 shadow-card">
          <SectionHeader title="Weekly Revenue" subtitle="Last 4 weeks" />
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No order data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <SectionHeader title="User Distribution" />
          {stats.totalUsers === 0 ? (
            <p className="text-center text-muted-foreground py-16">No users yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={userDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={4}>
                    {userDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-sm">
                {userDistribution.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Monthly Orders */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <SectionHeader title="Monthly Orders" subtitle="Last 6 months" />
        {orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No order data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="hsl(var(--farm-gold))" strokeWidth={2} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Disputes */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-4">
          <SectionHeader title="Recent Disputes" action={<button className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">View All <ArrowUpRight className="h-3 w-3" /></button>} />
        </div>
        {recentDisputes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No disputes yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Farmer</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Consumer</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentDisputes.map((d) => (
                  <tr key={d.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-card-foreground">{d.dispute_number}</td>
                    <td className="px-4 py-3 text-card-foreground">{d.type}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{farmerNames[d.farmer_id] || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{consumerNames[d.consumer_id] || '—'}</td>
                    <td className="px-4 py-3 font-medium text-card-foreground">₹{Number(d.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        d.status === 'Open' ? 'bg-destructive/15 text-destructive' : 'bg-farm-success/15 text-farm-success'
                      }`}>
                        {d.status === 'Open' ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
