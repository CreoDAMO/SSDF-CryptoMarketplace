'use client';
import { useQuery } from '@tanstack/react-query';

export default function OrderTracker({ id }: { id: string }) {
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`);
      return res.json();
    },
  });

  if (isLoading) return <div>Loading order...</div>;
  if (!order) return <div>Order not found</div>;

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
        {order.items?.map((item: any) => (
          <li key={item.productId}>{item.quantity} x {item.title} - {item.price} {order.currency}</li>
        ))}
      </ul>
      {order.status === 'deposited' && <button>Confirm Receipt</button>}
      <p>Total: {order.total} {order.currency}</p>
    </div>
  );
}
