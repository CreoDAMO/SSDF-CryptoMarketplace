'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          SSDF Crypto Marketplace
        </h1>
        <p style={{ fontSize: '1.25rem', opacity: 0.8 }}>
          Atomic fulfillment for crypto transactions. Trust is code, not assumption.
        </p>
      </header>

      <section style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        <div className="modal">
          <h2 style={{ marginBottom: '1rem' }}>For Buyers</h2>
          <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
            Browse products, pay into escrow, and receive NFT receipts for provable delivery.
            Funds are released only when you confirm receipt.
          </p>
          <Link href="/onboarding/buyer">
            <button>Get Started as Buyer</button>
          </Link>
        </div>

        <div className="modal">
          <h2 style={{ marginBottom: '1rem' }}>For Sellers</h2>
          <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
            List products, receive secure payments through escrow, and get paid automatically
            when buyers confirm delivery.
          </p>
          <Link href="/onboarding/seller">
            <button>Get Started as Seller</button>
          </Link>
        </div>
      </section>

      <section className="modal" style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem' }}>How It Works</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1.5rem',
          textAlign: 'left'
        }}>
          <div>
            <h3 style={{ color: '#4a90d9', marginBottom: '0.5rem' }}>1. Escrow Deposit</h3>
            <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
              Buyer pays into smart contract escrow. No platform custody.
            </p>
          </div>
          <div>
            <h3 style={{ color: '#4a90d9', marginBottom: '0.5rem' }}>2. Delivery</h3>
            <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
              Seller delivers the product or digital asset.
            </p>
          </div>
          <div>
            <h3 style={{ color: '#4a90d9', marginBottom: '0.5rem' }}>3. Atomic Release</h3>
            <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
              Buyer confirms receipt. Funds + NFT transfer atomically.
            </p>
          </div>
        </div>
      </section>

      <footer style={{ textAlign: 'center', marginTop: '3rem', opacity: 0.6 }}>
        <p>Built on Base chain with Coinbase integrations</p>
        <p style={{ marginTop: '0.5rem' }}>Version 1.2 - MVP</p>
      </footer>
    </main>
  );
}
