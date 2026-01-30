import { auth } from '@clerk/nextjs/server';
import VendorInventoryTable from '@/components/VendorInventoryTable';

export default async function VendorDashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return <div className="p-6">Unauthorized</div>;
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Your Inventory</h1>
      <VendorInventoryTable />
    </main>
  );
}
