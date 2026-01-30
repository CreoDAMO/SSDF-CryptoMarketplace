'use client';
import { useQuery } from '@tanstack/react-query';

export default function DisputeLog({ orderId }: { orderId: string }) {
  const { data: log, isLoading } = useQuery({
    queryKey: ['disputeLog', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/disputes/${orderId}`);
      return res.json();
    },
  });

  if (isLoading) return <div>Loading log...</div>;
  if (!log) return <div>No data</div>;

  return (
    <div>
      <p>Buyer Rep: {log.buyerRep} | Seller Rep: {log.sellerRep}</p>
      <ul>
        {log.events?.map((event: any) => (
          <li key={event.timestamp}>
            {event.type}: {event.detail} at {new Date(event.timestamp).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
