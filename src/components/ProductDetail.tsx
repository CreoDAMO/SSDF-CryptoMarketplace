'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export default function ProductDetail({ id }: { id: string }) {
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}`);
      return res.json();
    },
  });

  if (isLoading) return <div>Loading product...</div>;
  if (!product) return <div>Product not found</div>;

  const onchainStatus = product.onchain?.txHash ? 'Sold (Verified on Base)' : product.status;
  const statusBadge = product.onchain?.txHash ? (
    <a href={`https://basescan.org/tx/${product.onchain.txHash}`} target="_blank" className="text-blue-600">
      View Transaction
    </a>
  ) : null;

  return (
    <div className="product-detail max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
      {product.images?.[0] && <img src={product.images[0]} alt={product.title} className="w-full h-96 object-cover mb-4 rounded" />}
      <p className="mb-4">{product.description}</p>
      <p className="text-xl font-semibold mb-2">{product.price} {product.currency}</p>
      <p className="mb-2 capitalize">Type: {product.type?.replace('-', ' ')}</p>
      <p className="mb-4">Status: {onchainStatus} {statusBadge}</p>
      <Link href="/checkout" className="bg-blue-600 text-white px-4 py-2 rounded">
        Add to Cart
      </Link>
    </div>
  );
}
