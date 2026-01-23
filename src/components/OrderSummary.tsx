// src/components/OrderSummary.tsx (Read-only summary before confirm)
'use client';
import { useQuery } from '@tanstack/react-query';

export default function OrderSummary({ orderId }: { orderId: string }) {
  const { data: order, isLoading } = useQuery(['order', orderId], async () => {
    const res = await fetch(`/api/orders/${orderId}`);
    return res.json();
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="order-summary mb-4">
      <p>Status: {order.status}</p>
      <ul>
        {order.items.map((item: any) => (
          <li key={item.productId}>
            {item.quantity} x {item.title} - {item.price} {order.currency}
          </li>
        ))}
      </ul>
      <p>Total: {order.total} {order.currency}</p>
      <p>Escrow ID: {order.escrowId}</p>
      {/* Delivery proof: e.g., NFT preview if applicable */}
      {order.isNFT && <p>NFT URI: {order.tokenURI}</p>}
    </div>
  );
}
