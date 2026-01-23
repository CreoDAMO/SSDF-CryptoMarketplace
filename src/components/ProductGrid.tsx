// src/components/ProductGrid.tsx
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query'; // Assumes installed
import ProductCard from './ProductCard';

export default function ProductGrid() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [availability, setAvailability] = useState(true); // inventory > 0

  const { data: products, isLoading } = useQuery(
    ['products', search, category, availability],
    async () => {
      const params = new URLSearchParams({
        search,
        category,
        availability: availability.toString(),
      });
      const res = await fetch(`/api/products?${params}`);
      return res.json();
    }
  );

  if (isLoading) return <div>Loading products...</div>;

  return (
    <div>
      <div className="filters mb-4 flex gap-4">
        <input
          className="border p-2 flex-1"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border p-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All</option>
          <option value="standard">Standard</option>
          <option value="nft">NFT</option>
          <option value="ai-generated-nft">AI NFT</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={availability}
            onChange={(e) => setAvailability(e.target.checked)}
          />
          Available Only
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products?.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
      {products?.length === 0 && <p>No products found.</p>}
    </div>
  );
}
