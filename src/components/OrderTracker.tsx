'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export default function OrderTracker({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeError, setDisputeError] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`);
      return res.json();
    },
  });

  const disputeMutation = useMutation({
    mutationFn: async ({ orderId, buyerClaim }: { orderId: string; buyerClaim: string }) => {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, buyerClaim }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create dispute');
      }
      return res.json();
    },
    onSuccess: () => {
      setShowDisputeModal(false);
      setDisputeReason('');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: (err: Error) => {
      setDisputeError(err.message);
    },
  });

  if (isLoading) return <div>Loading order...</div>;
  if (!order) return <div>Order not found</div>;

  const steps = ['Pending', 'Deposited', 'Shipped', 'Delivered', 'Released'];
  const currentIndex = steps.indexOf(order.status);
  const canDispute = order.status === 'deposited' || order.status === 'Deposited';

  const handleDispute = () => {
    if (!disputeReason.trim()) {
      setDisputeError('Please provide a reason for the dispute');
      return;
    }
    setDisputeError('');
    disputeMutation.mutate({ 
      orderId: order.onchain?.orderId || id, 
      buyerClaim: disputeReason 
    });
  };

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
      
      <div className="flex gap-4 mt-4">
        {order.status === 'deposited' && (
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Confirm Receipt
          </button>
        )}
        
        {canDispute && (
          <button 
            onClick={() => setShowDisputeModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Open Dispute
          </button>
        )}
      </div>

      <p className="mt-4">Total: {order.total} {order.currency}</p>

      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4 text-white">Open a Dispute</h3>
            <p className="text-gray-300 mb-4">
              Please explain why you are disputing this order. Be specific about the issue.
            </p>
            
            {disputeError && (
              <div className="bg-red-900/50 border border-red-600 text-red-200 px-3 py-2 rounded mb-4 text-sm">
                {disputeError}
              </div>
            )}

            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Describe the issue with your order..."
              className="w-full h-32 bg-gray-700 text-white rounded p-3 mb-4 resize-none"
            />

            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  setShowDisputeModal(false);
                  setDisputeReason('');
                  setDisputeError('');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDispute}
                disabled={disputeMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-600"
              >
                {disputeMutation.isPending ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
