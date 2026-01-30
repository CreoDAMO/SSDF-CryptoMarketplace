// app/orders/[id]/page.tsx
import OrderTracker from '@/components/OrderTracker';

export default function OrderPage({ params }: { params: { id: string } }) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Order #{params.id}</h1>
      <OrderTracker id={params.id} />
    </main>
  );
}
