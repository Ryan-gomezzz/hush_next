import { useState, useEffect } from 'react';
import { supabase, Product, ProductImage, Inventory } from '@/lib/supabaseClient';
import ProductCard from '@/components/ProductCard';

export default function Home() {
  const [products, setProducts] = useState<(Product & { image?: ProductImage | null; inventory?: Inventory | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 12;

  useEffect(() => {
    loadProducts();
  }, [page, searchQuery]);

  async function loadProducts() {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data: productsData, error } = await query;

      if (error) throw error;

      if (!productsData || productsData.length === 0) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      // Fetch images and inventory for each product
      const productsWithDetails = await Promise.all(
        productsData.map(async (product) => {
          const [imageResult, inventoryResult] = await Promise.all([
            supabase
              .from('product_images')
              .select('*')
              .eq('product_id', product.id)
              .order('position', { ascending: true })
              .limit(1)
              .single(),
            supabase
              .from('inventory')
              .select('qty')
              .eq('product_id', product.id)
              .single(),
          ]);

          return {
            ...product,
            image: imageResult.data,
            inventory: inventoryResult.data,
          };
        })
      );

      if (page === 1) {
        setProducts(productsWithDetails);
      } else {
        setProducts((prev) => [...prev, ...productsWithDetails]);
      }

      setHasMore(productsData.length === limit);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setProducts([]);
    loadProducts();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-primary-600">SOYL Cosmetics</h1>
            <nav className="space-x-4">
              <a href="/admin" className="text-gray-600 hover:text-gray-900">Admin</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {loading && products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">Loading products...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">No products found</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  image={product.image}
                  inventory={product.inventory}
                />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

