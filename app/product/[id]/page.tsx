// app/product/[id]/page.tsx (Dynamic route)
import { publicClient } from '@/lib/viem';
import { escrowAbi } from '@/abis/EscrowABI'; // If needed for onchain check

export default async function ProductDetail({ params }: { params: { id: string } }) {
  const product = await fetchProduct(params.id); // Server fetch from API/DB

  // Onchain status (e.g., if sold via escrow)
  const onchainStatus = await getOnchainStatus(product); // Helper: Check if active/sold

  return (
    <div className="product-detail">
      <h1>{product.title}</h1>
      <img src={product.images[0]} alt={product.title} />
      <p>{product.description}</p>
      <p>Price: {product.price} {product.currency}</p>
      <p>Status: {onchainStatus} {/* e.g., 'Active' or 'Sold' with tx link */}</p>
      <button>Add to Cart</button> {/* Integrate with checkout */}
    </div>
  );
}

// Helpers (server-side)
async function fetchProduct(id) {
  const res = await fetch(`/api/products/${id}`);
  return res.json();
}

async function getOnchainStatus(product) {
  if (product.onchain?.txHash) {
    // Example: Query escrow if linked
    return 'Sold (Onchain Verified)'; // Or fetch via viem
  }
  return product.status;
}
