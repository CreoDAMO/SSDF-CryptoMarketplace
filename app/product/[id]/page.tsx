import { publicClient } from '@/lib/viem';
import { escrowAbi } from '@/abis/EscrowABI';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetail({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await fetchProduct(id);

  const onchainStatus = await getOnchainStatus(product);

  return (
    <div className="product-detail">
      <h1>{product.title}</h1>
      <img src={product.images?.[0]} alt={product.title} />
      <p>{product.description}</p>
      <p>Price: {product.price} {product.currency}</p>
      <p>Status: {onchainStatus}</p>
      <button>Add to Cart</button>
    </div>
  );
}

async function fetchProduct(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
  const res = await fetch(`${baseUrl}/api/products/${id}`, { cache: 'no-store' });
  return res.json();
}

async function getOnchainStatus(product: any) {
  if (product.onchain?.txHash) {
    return 'Sold (Onchain Verified)';
  }
  return product.status;
}
