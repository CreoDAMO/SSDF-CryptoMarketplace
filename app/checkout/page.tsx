// app/checkout/page.tsx
import CheckoutForm from '@/components/CheckoutForm';

export default function CheckoutPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
      <CheckoutForm />
    </main>
  );
}
