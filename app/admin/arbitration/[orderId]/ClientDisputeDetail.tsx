'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface EscrowData {
  buyer: string;
  seller: string;
  amount: string;
  timeout: string;
  status: number;
  isNFT: boolean;
  tokenURI: string;
  royaltyBps: string;
}

interface AIAnalysis {
  recommendation: string;
  confidence: number;
  reasoning: string[];
  model: string;
  createdAt: string;
}

interface AdminAction {
  action: string;
  adminAddress: string;
  txHash: string;
  actedAt: string;
}

interface DisputeData {
  orderId: string;
  buyerAddress: string;
  sellerAddress: string;
  buyerClaim: string;
  sellerResponse: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  aiAnalysis: AIAnalysis | null;
  adminAction: AdminAction | null;
}

interface Props {
  dispute: DisputeData;
  escrowData: EscrowData | null;
}

const ESCROW_STATUS = ['NONE', 'DEPOSITED', 'DISPUTED', 'RELEASED', 'REFUNDED'];

export default function ClientDisputeDetail({ dispute, escrowData }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'REFUND' | 'RELEASE' | null>(null);
  const [error, setError] = useState('');

  const canResolve = ['OPEN', 'AI_REVIEWED'].includes(dispute.status);
  const escrowStatus = escrowData ? ESCROW_STATUS[escrowData.status] : 'Unknown';

  async function runAIAnalysis() {
    setAiLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: dispute.orderId }),
      });
      if (!res.ok) throw new Error('AI analysis failed');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleResolve() {
    if (!selectedAction) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/disputes/${dispute.orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: selectedAction }),
      });
      if (!res.ok) throw new Error('Resolution failed');
      setShowConfirm(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin/arbitration" className="text-blue-400 hover:text-blue-300 mb-6 inline-block">
          Back to Queue
        </Link>

        <h1 className="text-3xl font-bold mb-2">Dispute Review</h1>
        <p className="text-gray-400 font-mono text-sm mb-6">{dispute.orderId}</p>

        {error && (
          <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Order Details</h2>
            {escrowData ? (
              <dl className="space-y-3">
                <div>
                  <dt className="text-gray-400 text-sm">Amount</dt>
                  <dd className="font-mono">{(Number(escrowData.amount) / 1e6).toFixed(2)} USDC</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-sm">Buyer</dt>
                  <dd className="font-mono text-sm">{escrowData.buyer}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-sm">Seller</dt>
                  <dd className="font-mono text-sm">{escrowData.seller}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-sm">Timeout</dt>
                  <dd>{new Date(Number(escrowData.timeout) * 1000).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-sm">Escrow Status</dt>
                  <dd>
                    <span className={`px-2 py-1 rounded text-xs ${
                      escrowStatus === 'DISPUTED' ? 'bg-yellow-600' :
                      escrowStatus === 'RELEASED' ? 'bg-green-600' :
                      escrowStatus === 'REFUNDED' ? 'bg-red-600' :
                      'bg-gray-600'
                    }`}>
                      {escrowStatus}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400 text-sm">Product Type</dt>
                  <dd>{escrowData.isNFT ? 'NFT-backed' : 'Standard Digital'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-gray-400">Unable to fetch onchain data</p>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Dispute Status</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-gray-400 text-sm">Status</dt>
                <dd>
                  <span className={`px-2 py-1 rounded text-xs ${
                    dispute.status === 'OPEN' ? 'bg-yellow-600' :
                    dispute.status === 'AI_REVIEWED' ? 'bg-purple-600' :
                    dispute.status === 'RESOLVED' ? 'bg-green-600' :
                    'bg-gray-600'
                  }`}>
                    {dispute.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 text-sm">Created</dt>
                <dd>{new Date(dispute.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-sm">Updated</dt>
                <dd>{new Date(dispute.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Buyer Claim</h2>
          <p className="text-gray-200 whitespace-pre-wrap">{dispute.buyerClaim}</p>
        </div>

        {dispute.sellerResponse && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Seller Response</h2>
            <p className="text-gray-200 whitespace-pre-wrap">{dispute.sellerResponse}</p>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">AI Analysis</h2>
            {!dispute.aiAnalysis && canResolve && (
              <button
                onClick={runAIAnalysis}
                disabled={aiLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded"
              >
                {aiLoading ? 'Analyzing...' : 'Run AI Analysis'}
              </button>
            )}
          </div>
          
          {dispute.aiAnalysis ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded font-semibold ${
                  dispute.aiAnalysis.recommendation === 'REFUND' ? 'bg-red-600' :
                  dispute.aiAnalysis.recommendation === 'RELEASE' ? 'bg-green-600' :
                  'bg-gray-600'
                }`}>
                  {dispute.aiAnalysis.recommendation}
                </span>
                <span className={`text-lg ${
                  dispute.aiAnalysis.confidence >= 70 ? 'text-green-400' :
                  dispute.aiAnalysis.confidence >= 40 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {dispute.aiAnalysis.confidence}% confidence
                </span>
              </div>
              
              <div>
                <h3 className="text-gray-400 text-sm mb-2">Reasoning</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-200">
                  {dispute.aiAnalysis.reasoning.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <p className="text-gray-500 text-sm">
                Model: {dispute.aiAnalysis.model} | 
                Analyzed: {new Date(dispute.aiAnalysis.createdAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-gray-400">No AI analysis yet</p>
          )}
        </div>

        {dispute.adminAction && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Resolution</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-gray-400 text-sm">Action</dt>
                <dd>
                  <span className={`px-2 py-1 rounded ${
                    dispute.adminAction.action === 'REFUND' ? 'bg-red-600' : 'bg-green-600'
                  }`}>
                    {dispute.adminAction.action}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 text-sm">Admin</dt>
                <dd className="font-mono text-sm">{dispute.adminAction.adminAddress}</dd>
              </div>
              {dispute.adminAction.txHash && (
                <div>
                  <dt className="text-gray-400 text-sm">Transaction</dt>
                  <dd className="font-mono text-sm">{dispute.adminAction.txHash}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-400 text-sm">Resolved At</dt>
                <dd>{new Date(dispute.adminAction.actedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        )}

        {canResolve && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Admin Actions</h2>
            <p className="text-yellow-400 text-sm mb-4">
              Warning: These actions will update the dispute record. Onchain transactions must be executed separately via wallet.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => { setSelectedAction('REFUND'); setShowConfirm(true); }}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded font-semibold"
              >
                Mark as REFUND
              </button>
              <button
                onClick={() => { setSelectedAction('RELEASE'); setShowConfirm(true); }}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-semibold"
              >
                Mark as RELEASE
              </button>
            </div>
          </div>
        )}

        {showConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Confirm {selectedAction}</h3>
              <p className="text-gray-300 mb-6">
                This will mark the dispute as resolved with action: <strong>{selectedAction}</strong>. 
                Ensure you have executed the corresponding onchain transaction.
              </p>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={loading}
                  className={`px-4 py-2 rounded font-semibold ${
                    selectedAction === 'REFUND' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  } disabled:bg-gray-600`}
                >
                  {loading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
