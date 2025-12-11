import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/AdminLayout';
import { supabase, Product } from '@/lib/supabaseClient';

export default function AdminProductEdit() {
  const router = useRouter();
  const { id } = router.query;
  const isNew = id === 'new';
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    slug: '',
    description: '',
    price_cents: '',
    currency: 'INR',
    active: true,
    attributes: '{}',
  });

  useEffect(() => {
    if (!isNew && id) {
      loadProduct();
    }
  }, [id, isNew]);

  async function loadProduct() {
    if (!id || typeof id !== 'string') return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          sku: data.sku,
          name: data.name,
          slug: data.slug,
          description: data.description || '',
          price_cents: data.price_cents.toString(),
          currency: data.currency,
          active: data.active,
          attributes: JSON.stringify(data.attributes || {}, null, 2),
        });
      }
    } catch (error) {
      console.error('Error loading product:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        sku: formData.sku,
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        price_cents: parseInt(formData.price_cents),
        currency: formData.currency,
        active: formData.active,
        attributes: JSON.parse(formData.attributes),
      };

      if (isNew) {
        const { error } = await supabase.from('products').insert(productData);
        if (error) throw error;
        router.push('/admin/products');
      } else {
        if (!id || typeof id !== 'string') return;
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id);
        if (error) throw error;
        router.push('/admin/products');
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert('Error saving product: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-8">{isNew ? 'Add Product' : 'Edit Product'}</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">SKU</label>
          <input
            type="text"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Slug</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Price (cents)</label>
          <input
            type="number"
            value={formData.price_cents}
            onChange={(e) => setFormData({ ...formData, price_cents: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Attributes (JSON)</label>
          <textarea
            value={formData.attributes}
            onChange={(e) => setFormData({ ...formData, attributes: e.target.value })}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.active}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            className="mr-2"
          />
          <label className="text-sm font-medium">Active</label>
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/products')}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}

