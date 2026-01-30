'use client';
import { useQuery } from '@tanstack/react-query';

export default function OrderSummary({ orderId }: { orderId: string }) {
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      return res.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div className="order-summary mb-4">
      <p>Status: {order.status}</p>
      <ul>
        {order.items?.map((item: any) => (
          <li key={item.productId}>
            {item.quantity} x {item.title} - {item.price} {order.currency}
          </li>
        ))}
      </ul>
      <p>Total: {order.total} {order.currency}</p>
      <p>Escrow ID: {order.escrowId}</p>
      {order.isNFT && <p>NFT URI: {order.tokenURI}</p>}
    </div>
  );
}
