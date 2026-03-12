import { motion } from 'framer-motion';
import { IndianRupee, ShoppingCart, TrendingUp, Package, CloudSun, ArrowUpRight, Star, Truck } from 'lucide-react';
import { StatCard, SectionHeader } from '@/components/StatCard';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const earningsData = [
  { day: 'Mon', amount: 2400 },
  { day: 'Tue', amount: 1800 },
  { day: 'Wed', amount: 3200 },
  { day: 'Thu', amount: 2800 },
  { day: 'Fri', amount: 4100 },
  { day: 'Sat', amount: 3600 },
  { day: 'Sun', amount: 2900 },
];

const recentOrders = [
  { id: 'ORD-1234', consumer: 'Priya S.', items: 'Tomatoes, Spinach', total: '₹340', status: 'Pending' },
  { id: 'ORD-1230', consumer: 'Amit K.', items: 'Rice (5kg)', total: '₹450', status: 'Shipped' },
  { id: 'ORD-1228', consumer: 'Neha R.', items: 'Mangoes (2kg)', total: '₹280', status: 'Delivered' },
];

const statusColors: Record<string, string> = {
  Pending: 'bg-farm-warning/15 text-farm-warning',
  Shipped: 'bg-farm-sky/15 text-farm-sky',
  Delivered: 'bg-farm-success/15 text-farm-success',
};

const FarmerDashboard = () => {
  const { userName } = useApp();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
          {t.goodMorning}, {userName} 🌾
        </h1>
        <p className="text-muted-foreground mt-1">{t.farmOverview}</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={IndianRupee} label={t.todaysEarnings} value="₹4,120" change="+12%" positive variant="primary" />
        <StatCard icon={ShoppingCart} label={t.activeOrders} value={8} change="+3" positive variant="gold" />
        <StatCard icon={Package} label={t.products} value={24} variant="default" />
        <StatCard icon={TrendingUp} label={t.aiPriceScore} value="92%" change="+5%" positive variant="sky" />
      </div>

      {/* Chart + Weather */}
      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        <div className="md:col-span-2 rounded-xl border border-border bg-card p-4 shadow-card">
          <SectionHeader title={t.weeklyEarnings} />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={earningsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <SectionHeader title={t.climate} />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CloudSun className="h-10 w-10 text-farm-gold" />
              <div>
                <p className="text-3xl font-bold font-display text-card-foreground">32°C</p>
                <p className="text-sm text-muted-foreground">Partly Cloudy</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Humidity</span><span className="font-medium text-card-foreground">68%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rainfall</span><span className="font-medium text-card-foreground">12mm</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Wind</span><span className="font-medium text-card-foreground">15 km/h</span></div>
            </div>
            <div className="rounded-lg bg-accent p-3">
              <p className="text-xs font-medium text-accent-foreground">🌧️ Rain expected Thursday. Consider early harvest for tomatoes.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-4">
          <SectionHeader title={t.recentOrders} action={<button onClick={() => navigate('/farmer/orders')} className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">{t.viewAll} <ArrowUpRight className="h-3 w-3" /></button>} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Consumer</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Items</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-card-foreground">{order.id}</td>
                  <td className="px-4 py-3 text-card-foreground">{order.consumer}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{order.items}</td>
                  <td className="px-4 py-3 font-medium text-card-foreground">{order.total}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="rounded-xl border border-primary/20 bg-accent p-4 shadow-card">
        <SectionHeader title={t.aiInsights} subtitle="Smart recommendations for today" />
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { icon: TrendingUp, text: 'Tomato prices up 8% this week. Consider listing more.', color: 'text-farm-success' },
            { icon: Star, text: 'Your organic spinach has a 4.9★ rating. Highlight it!', color: 'text-farm-gold' },
            { icon: Truck, text: '3 orders ready for dispatch. Ship before 2 PM for same-day.', color: 'text-farm-sky' },
          ].map((tip, i) => (
            <div key={i} className="rounded-lg bg-card border border-border p-3 flex items-start gap-3">
              <tip.icon className={`h-5 w-5 shrink-0 mt-0.5 ${tip.color}`} />
              <p className="text-sm text-card-foreground">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;
