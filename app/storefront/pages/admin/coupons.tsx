import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase, Coupon } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'PERCENT' as 'PERCENT' | 'FIXED',
    discount_pct: '',
    discount_cents: '',
    active: true,
    starts_at: '',
    ends_at: '',
    usage_limit: '',
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  async function loadCoupons() {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error loading coupons:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const couponData = {
        code: formData.code,
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_pct: formData.discount_type === 'PERCENT' ? parseInt(formData.discount_pct) : null,
        discount_cents: formData.discount_type === 'FIXED' ? parseInt(formData.discount_cents) : null,
        active: formData.active,
        starts_at: formData.starts_at || null,
        ends_at: formData.ends_at || null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      };

      const { error } = await supabase.from('coupons').insert(couponData);
      if (error) throw error;

      setShowForm(false);
      setFormData({
        code: '',
        description: '',
        discount_type: 'PERCENT',
        discount_pct: '',
        discount_cents: '',
        active: true,
        starts_at: '',
        ends_at: '',
        usage_limit: '',
      });
      loadCoupons();
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      alert('Error creating coupon: ' + error.message);
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Coupons</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          {showForm ? 'Cancel' : 'Add Coupon'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Discount Type</label>
            <select
              value={formData.discount_type}
              onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'PERCENT' | 'FIXED' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="PERCENT">Percentage</option>
              <option value="FIXED">Fixed Amount</option>
            </select>
          </div>
          {formData.discount_type === 'PERCENT' ? (
            <div>
              <label className="block text-sm font-medium mb-2">Discount %</label>
              <input
                type="number"
                value={formData.discount_pct}
                onChange={(e) => setFormData({ ...formData, discount_pct: e.target.value })}
                required
                min="1"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">Discount (cents)</label>
              <input
                type="number"
                value={formData.discount_cents}
                onChange={(e) => setFormData({ ...formData, discount_cents: e.target.value })}
                required
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          )}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            <label className="text-sm font-medium">Active</label>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Coupon
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uses</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {coupons.map((coupon) => (
              <tr key={coupon.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{coupon.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{coupon.discount_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {coupon.discount_type === 'PERCENT'
                    ? `${coupon.discount_pct}%`
                    : `₹${((coupon.discount_cents || 0) / 100).toFixed(2)}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {coupon.uses} / {coupon.usage_limit || '∞'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded ${coupon.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {coupon.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

