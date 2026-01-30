'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ProductCard from '@/components/ProductCard';

export default function Home() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all'); // Assume categories from DB or enum

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', search, category],
    queryFn: async () => {
      const res = await fetch(`/api/products?search=${search}&category=${category}`);
      return res.json();
    }
  });

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

      <section style={{ textAlign: 'center' }} className="modal">
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

      {/* Merged Global Product Feed Section */}
      <section style={{ marginTop: '3rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', textAlign: 'center' }}>Browse Products</h2>
        <div className="home-feed">
          <input 
            placeholder="Search products..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} // Dynamic search
            style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem' }}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem' }}>
            <option value="all">All Categories</option>
            <option value="nft">NFTs</option>
            <option value="standard">Standard</option>
            {/* Dynamic from DB if needed */}
          </select>
          {productsLoading ? (
            <p>Loading products...</p>
          ) : (
            <div className="product-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1.5rem'
            }}>
              {products?.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <footer style={{ textAlign: 'center', marginTop: '3rem', opacity: 0.6 }}>
        <p>Built on Base chain with Coinbase integrations</p>
        <p style={{ marginTop: '0.5rem' }}>Version 1.2 - MVP</p>
      </footer>
    </main>
  );
}
