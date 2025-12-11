import Link from 'next/link';
import { Product, ProductImage } from '@/lib/supabaseClient';

interface ProductCardProps {
  product: Product;
  image?: ProductImage | null;
  inventory?: { qty: number } | null;
}

export default function ProductCard({ product, image, inventory }: ProductCardProps) {
  const price = (product.price_cents / 100).toFixed(2);
  const inStock = inventory ? inventory.qty > 0 : false;

  return (
    <Link href={`/product/${product.slug}`} className="block group">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {image ? (
            <img
              src={image.url}
              alt={image.alt || product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          {!inStock && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
              Out of Stock
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary-600 transition-colors">
            {product.name}
          </h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {product.description || 'No description available'}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary-600">
              ₹{price}
            </span>
            {inStock && (
              <span className="text-sm text-green-600 font-medium">
                In Stock
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

