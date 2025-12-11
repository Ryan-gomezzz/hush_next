import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/supabaseClient';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminAnalytics() {
  const [dailyEvents, setDailyEvents] = useState<any[]>([]);
  const [conversion, setConversion] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const [eventsResult, conversionResult, productsResult] = await Promise.all([
        supabase.from('daily_events').select('*').order('day', { ascending: true }).limit(30),
        supabase.from('daily_conversion').select('*').order('day', { ascending: true }).limit(30),
        supabase.from('top_products_last_30d').select('*'),
      ]);

      if (eventsResult.data) setDailyEvents(eventsResult.data);
      if (conversionResult.data) setConversion(conversionResult.data);
      if (productsResult.data) setTopProducts(productsResult.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
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
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>

      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Daily Events</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyEvents}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="event_count" stroke="#8884d8" name="Events" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Conversion Rate</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={conversion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="conversion_pct" stroke="#82ca9d" name="Conversion %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top Products (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sold_qty" fill="#8884d8" name="Quantity Sold" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AdminLayout>
  );
}

