import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase, Product, ProductImage, Inventory } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function ProductPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    if (slug) {
      loadProduct();
      loadCart();
    }
  }, [slug]);

  async function loadProduct() {
    if (!slug || typeof slug !== 'string') return;

    setLoading(true);
    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .single();

      if (productError) throw productError;
      if (!productData) {
        router.push('/');
        return;
      }

      setProduct(productData);

      const [imagesResult, inventoryResult] = await Promise.all([
        supabase
          .from('product_images')
          .select('*')
          .eq('product_id', productData.id)
          .order('position', { ascending: true }),
        supabase
          .from('inventory')
          .select('*')
          .eq('product_id', productData.id)
          .single(),
      ]);

      if (imagesResult.data) setImages(imagesResult.data);
      if (inventoryResult.data) setInventory(inventoryResult.data);

      // Track page view
      await supabase.from('events').insert({
        event_type: 'page_view',
        payload: { product_id: productData.id, slug },
      });
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  }

  function loadCart() {
    const cartData = localStorage.getItem('cart');
    if (cartData) {
      setCart(JSON.parse(cartData));
    }
  }

  function addToCart() {
    if (!product || !inventory || inventory.qty < quantity) {
      alert('Not enough stock');
      return;
    }

    const cartItem = {
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      price_cents: product.price_cents,
      qty: quantity,
      image: images[0]?.url,
    };

    const updatedCart = [...cart, cartItem];
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setCart(updatedCart);

    // Track event
    supabase.from('events').insert({
      event_type: 'add_to_cart',
      payload: { product_id: product.id, quantity },
    });

    alert('Added to cart!');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const price = (product.price_cents / 100).toFixed(2);
  const inStock = inventory ? inventory.qty > 0 : false;
  const maxQty = inventory ? Math.min(inventory.qty, 10) : 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-3xl font-bold text-primary-600">
              SOYL Cosmetics
            </Link>
            <nav className="space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">Home</Link>
              <Link href="/checkout" className="text-gray-600 hover:text-gray-900">
                Cart ({cart.length})
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/2">
              {images.length > 0 ? (
                <img
                  src={images[0].url}
                  alt={images[0].alt || product.name}
                  className="w-full h-96 object-cover"
                />
              ) : (
                <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                  No Image
                </div>
              )}
            </div>
            <div className="md:w-1/2 p-8">
              <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
              <p className="text-2xl font-bold text-primary-600 mb-4">₹{price}</p>
              <p className="text-gray-600 mb-6">{product.description || 'No description available'}</p>

              {product.attributes && (
                <div className="mb-6">
                  <h2 className="font-semibold mb-2">Product Details</h2>
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(product.attributes, null, 2)}
                  </pre>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1 border border-gray-300 rounded"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1)))}
                    min="1"
                    max={maxQty}
                    className="w-20 px-3 py-1 border border-gray-300 rounded text-center"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                    className="px-3 py-1 border border-gray-300 rounded"
                  >
                    +
                  </button>
                </div>
                {inventory && (
                  <p className="text-sm text-gray-600 mt-2">
                    {inventory.qty} available
                  </p>
                )}
              </div>

              <button
                onClick={addToCart}
                disabled={!inStock || quantity > maxQty}
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

