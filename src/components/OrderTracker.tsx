// src/components/OrderTracker.tsx
'use client';
import { useQuery } from '@tanstack/react-query';

export default function OrderTracker({ id }: { id: string }) {
  const { data: order, isLoading } = useQuery(['order', id], async () => {
    const res = await fetch(`/api/orders/${id}`);
    return res.json(); // { status, items, total, escrowId }
  });

  if (isLoading) return <div>Loading order...</div>;
  if (!order) return <div>Order not found</div>;

  // Status steps (visual progress bar)
  const steps = ['Pending', 'Deposited', 'Shipped', 'Delivered', 'Released'];
  const currentIndex = steps.indexOf(order.status);

  return (
    <div className="order-tracker">
      <h2>Status: {order.status}</h2>
      <div className="progress-bar flex justify-between">
        {steps.map((step, i) => (
          <div key={step} className={`step ${i <= currentIndex ? 'active' : ''}`}>
            {step}
          </div>
        ))}
      </div>
      <ul className="items mt-4">
        {order.items.map(item => (
          <li key={item.productId}>{item.quantity} x {item.title} - {item.price} {order.currency}</li>
        ))}
      </ul>
      {order.status === 'deposited' && <button>Confirm Receipt</button>} {/* Tie to escrow release */}
      <p>Total: {order.total} {order.currency}</p>
    </div>
  );
}
