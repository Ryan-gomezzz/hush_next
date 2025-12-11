import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase, Inventory, Product } from '@/lib/supabaseClient';

export default function AdminInventory() {
  const [inventory, setInventory] = useState<(Inventory & { product?: Product })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          product:products(*)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(productId: string, newQty: number) {
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ qty: newQty })
        .eq('product_id', productId);

      if (error) throw error;

      // Log event
      await supabase.from('events').insert({
        event_type: 'inventory_update',
        payload: { product_id: productId, qty: newQty },
      });

      loadInventory();
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('Error updating inventory');
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
      <h1 className="text-3xl font-bold mb-8">Inventory Management</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reserved</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.map((item) => {
              const product = item.product as Product | undefined;
              const available = item.qty - item.reserved;
              return (
                <tr key={item.product_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product?.name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product?.sku || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.qty}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.reserved}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${available > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {available}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <input
                      type="number"
                      defaultValue={item.qty}
                      onBlur={(e) => {
                        const newQty = parseInt(e.target.value);
                        if (!isNaN(newQty) && newQty >= 0) {
                          handleUpdate(item.product_id, newQty);
                        }
                      }}
                      className="w-20 px-2 py-1 border border-gray-300 rounded"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

