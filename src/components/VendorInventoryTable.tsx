'use client';

import { useEffect, useState } from 'react';

type Product = {
  _id: string;
  title: string;
  price: number;
  currency: string;
  inventory: number;
  status: 'draft' | 'active';
};

export default function VendorInventoryTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchProducts() {
    const res = await fetch('/api/products?vendorId=me');
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  async function updateProduct(id: string, updates: Partial<Product>) {
    await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    fetchProducts();
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchProducts();
  }

  if (loading) return <div>Loading inventory…</div>;

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b">
          <th className="text-left p-2">Title</th>
          <th className="text-left p-2">Price</th>
          <th className="text-left p-2">Inventory</th>
          <th className="text-left p-2">Status</th>
          <th className="p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.map(p => (
          <tr key={p._id} className="border-b">
            <td className="p-2">{p.title}</td>
            <td className="p-2">
              {p.price} {p.currency}
            </td>
            <td className="p-2">
              <input
                type="number"
                defaultValue={p.inventory}
                min={0}
                className="border px-2 w-20"
                onBlur={e =>
                  updateProduct(p._id, {
                    inventory: Number(e.target.value),
                  })
                }
              />
            </td>
            <td className="p-2">
              <select
                value={p.status}
                onChange={e =>
                  updateProduct(p._id, {
                    status: e.target.value as 'draft' | 'active',
                  })
                }
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </td>
            <td className="p-2">
              <button
                className="text-red-600"
                onClick={() => deleteProduct(p._id)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
