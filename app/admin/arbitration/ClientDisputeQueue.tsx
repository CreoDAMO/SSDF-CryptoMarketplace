'use client';

import Link from 'next/link';
import { useState } from 'react';

interface DisputeItem {
  orderId: string;
  buyerAddress: string;
  sellerAddress: string;
  buyerClaim: string;
  status: string;
  createdAt: string;
  aiAnalysis: {
    recommendation: string;
    confidence: number;
  } | null;
}

interface Props {
  disputes: DisputeItem[];
}

export default function ClientDisputeQueue({ disputes }: Props) {
  const [filter, setFilter] = useState<'all' | 'OPEN' | 'AI_REVIEWED'>('all');

  const filteredDisputes = disputes.filter(d => 
    filter === 'all' || d.status === filter
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Arbitration</h1>
        
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            All ({disputes.length})
          </button>
          <button
            onClick={() => setFilter('OPEN')}
            className={`px-4 py-2 rounded ${filter === 'OPEN' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            Open ({disputes.filter(d => d.status === 'OPEN').length})
          </button>
          <button
            onClick={() => setFilter('AI_REVIEWED')}
            className={`px-4 py-2 rounded ${filter === 'AI_REVIEWED' ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            AI Reviewed ({disputes.filter(d => d.status === 'AI_REVIEWED').length})
          </button>
        </div>

        {filteredDisputes.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400">No disputes to review</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Order ID</th>
                  <th className="px-4 py-3 text-left">Buyer</th>
                  <th className="px-4 py-3 text-left">Seller</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">AI Rec</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDisputes.map((dispute) => (
                  <tr key={dispute.orderId} className="border-t border-gray-700 hover:bg-gray-750">
                    <td className="px-4 py-3 font-mono text-sm">
                      {dispute.orderId.slice(0, 10)}...
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {dispute.buyerAddress?.slice(0, 6)}...{dispute.buyerAddress?.slice(-4)}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {dispute.sellerAddress?.slice(0, 6)}...{dispute.sellerAddress?.slice(-4)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        dispute.status === 'OPEN' ? 'bg-yellow-600' : 'bg-purple-600'
                      }`}>
                        {dispute.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {dispute.aiAnalysis ? (
                        <span className={`px-2 py-1 rounded text-xs ${
                          dispute.aiAnalysis.recommendation === 'REFUND' ? 'bg-red-600' :
                          dispute.aiAnalysis.recommendation === 'RELEASE' ? 'bg-green-600' :
                          'bg-gray-600'
                        }`}>
                          {dispute.aiAnalysis.recommendation} ({dispute.aiAnalysis.confidence}%)
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link 
                        href={`/admin/arbitration/${dispute.orderId}`}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
