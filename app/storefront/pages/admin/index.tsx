import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/supabaseClient';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [productsResult, ordersResult, revenueResult] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('orders').select('id, status', { count: 'exact' }),
        supabase.from('orders').select('total_cents').eq('status', 'PAID'),
      ]);

      const totalProducts = productsResult.count || 0;
      const totalOrders = ordersResult.count || 0;
      const pendingOrders = (ordersResult.data || []).filter(o => o.status === 'PENDING').length;
      const totalRevenue = (revenueResult.data || []).reduce((sum, o) => sum + o.total_cents, 0);

      setStats({
        totalProducts,
        totalOrders,
        pendingOrders,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Products</h3>
          <p className="text-3xl font-bold text-primary-600">{stats.totalProducts}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Orders</h3>
          <p className="text-3xl font-bold text-primary-600">{stats.totalOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Pending Orders</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-green-600">₹{(stats.totalRevenue / 100).toFixed(2)}</p>
        </div>
      </div>
    </AdminLayout>
  );
}

