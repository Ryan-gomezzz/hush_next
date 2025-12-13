import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface CartItem {
  product_id: string;
  sku: string;
  name: string;
  price_cents: number;
  qty: number;
  image?: string;
}

export default function Checkout() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
  });

  useEffect(() => {
    loadCart();
  }, []);

  function loadCart() {
    const cartData = localStorage.getItem('cart');
    if (cartData) {
      setCart(JSON.parse(cartData));
    } else {
      router.push('/');
    }
  }

  async function validateCoupon() {
    if (!couponCode) return;

    try {
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          code: couponCode,
          cart: cart,
        }),
      });

      const data = await response.json();
      if (data.valid) {
        setCoupon(data.coupon);
      } else {
        alert(data.error || 'Invalid coupon code');
        setCoupon(null);
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
    }
  }

  function calculateTotal() {
    const subtotal = cart.reduce((sum, item) => sum + item.price_cents * item.qty, 0);
    let discount = 0;

    if (coupon) {
      if (coupon.discount_type === 'PERCENT' && coupon.discount_pct) {
        discount = Math.floor((subtotal * coupon.discount_pct) / 100);
      } else if (coupon.discount_type === 'FIXED' && coupon.discount_cents) {
        discount = coupon.discount_cents;
      }
    }

    return {
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
    };
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      const totals = calculateTotal();

      // Create order via API
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          items: cart,
          total_cents: totals.total,
          coupon_id: coupon?.id || null,
          shipping: formData,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Track event
      await supabase.from('events').insert({
        event_type: 'order_completed',
        payload: { order_id: data.order.id },
      });

      // Clear cart
      localStorage.removeItem('cart');
      setCart([]);

      alert('Order placed successfully! Order ID: ' + data.order.id);
      router.push('/');
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert('Error placing order: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const totals = calculateTotal();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <Link href="/" className="text-primary-600 hover:underline">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-3xl font-bold text-primary-600">
            SOYL Cosmetics
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Shipping Information</h2>
            <form onSubmit={handleCheckout} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="ZIP Code"
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="mt-6">
                <h3 className="font-semibold mb-2">Coupon Code</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={validateCoupon}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Apply
                  </button>
                </div>
                {coupon && (
                  <p className="text-green-600 mt-2">Coupon applied: {coupon.code}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
            <div className="bg-white rounded-lg shadow-md p-6">
              {cart.map((item) => (
                <div key={item.product_id} className="flex justify-between mb-4 pb-4 border-b">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-600">Qty: {item.qty}</p>
                  </div>
                  <p className="font-semibold">₹{((item.price_cents * item.qty) / 100).toFixed(2)}</p>
                </div>
              ))}
              <div className="space-y-2 mt-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{(totals.subtotal / 100).toFixed(2)}</span>
                </div>
                {coupon && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({coupon.code})</span>
                    <span>-₹{(totals.discount / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl pt-4 border-t">
                  <span>Total</span>
                  <span>₹{(totals.total / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

