import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalUsers: number;
  farmerCount: number;
  consumerCount: number;
  totalOrders: number;
  totalRevenue: number;
  monthRevenue: number;
  totalCommission: number;
  avgOrderValue: number;
  openDisputes: number;
  loading: boolean;
}

interface Order {
  id: string;
  order_number: string;
  consumer_id: string;
  farmer_id: string;
  status: string;
  total_amount: number;
  commission_amount: number;
  created_at: string;
}

interface Dispute {
  id: string;
  dispute_number: string;
  order_id: string;
  farmer_id: string;
  consumer_id: string;
  type: string;
  status: string;
  amount: number;
  description: string | null;
  resolution: string | null;
  created_at: string;
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0, farmerCount: 0, consumerCount: 0,
    totalOrders: 0, totalRevenue: 0, monthRevenue: 0,
    totalCommission: 0, avgOrderValue: 0, openDisputes: 0,
    loading: true,
  });

  useEffect(() => {
    const fetch = async () => {
      const [rolesRes, ordersRes, disputesRes] = await Promise.all([
        supabase.from('user_roles').select('role'),
        supabase.from('orders').select('*'),
        supabase.from('disputes').select('*'),
      ]);

      const roles = rolesRes.data || [];
      const orders = (ordersRes.data || []) as Order[];
      const disputes = (disputesRes.data || []) as Dispute[];

      const farmerCount = roles.filter(r => r.role === 'farmer').length;
      const consumerCount = roles.filter(r => r.role === 'consumer').length;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthOrders = orders.filter(o => o.created_at >= monthStart);

      const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount), 0);
      const monthRevenue = monthOrders.reduce((s, o) => s + Number(o.total_amount), 0);
      const totalCommission = orders.reduce((s, o) => s + Number(o.commission_amount), 0);
      const avgOrderValue = orders.length ? totalRevenue / orders.length : 0;
      const openDisputes = disputes.filter(d => d.status === 'Open').length;

      setStats({
        totalUsers: roles.length,
        farmerCount, consumerCount,
        totalOrders: orders.length,
        totalRevenue, monthRevenue, totalCommission, avgOrderValue,
        openDisputes, loading: false,
      });
    };
    fetch();
  }, []);

  return stats;
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      setOrders((data || []) as Order[]);
      setLoading(false);
    };
    fetchOrders();

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { orders, loading };
}

export function useDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisputes = async () => {
      const { data } = await supabase.from('disputes').select('*').order('created_at', { ascending: false });
      setDisputes((data || []) as Dispute[]);
      setLoading(false);
    };
    fetchDisputes();

    const channel = supabase
      .channel('disputes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, () => {
        fetchDisputes();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { disputes, loading };
}

export function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}
