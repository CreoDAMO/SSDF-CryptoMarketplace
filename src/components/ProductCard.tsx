// src/components/ProductCard.tsx
import Link from 'next/link';

type ProductProps = {
  product: {
    _id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    images: string[];
    type: string;
    status: string;
  };
};

export default function ProductCard({ product }: ProductProps) {
  return (
    <div className="border p-4 rounded">
      {product.images[0] && <img src={product.images[0]} alt={product.title} className="w-full h-48 object-cover mb-2" />}
      <h3 className="font-semibold">{product.title}</h3>
      <p className="text-sm">{product.description.slice(0, 100)}...</p>
      <p>{(Number(BigInt(product.priceUSDC)) / 1000000).toFixed(2)} {product.currency}</p>
      <p className="text-xs capitalize">Type: {product.type.replace('-', ' ')}</p>
      <p className="text-xs">Status: {product.status}</p>
      <Link href={`/product/${product._id}`} className="block mt-2 text-blue-600">
        View Details
      </Link>
    </div>
  );
}
