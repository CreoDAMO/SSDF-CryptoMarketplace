// src/components/VendorDashboard.tsx (extend for inventory)
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Add dep if needed: yarn add @tanstack/react-query
import Product from '@/lib/models'; // From models.ts

export function VendorDashboard() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Fetch vendor products
  const { data: products, isLoading } = useQuery(['vendorProducts'], async () => {
    const res = await fetch('/api/products?vendorId=' + user?.id); // Assume API filters by vendor
    return res.json();
  });

  // Mutation for update/delete
  const updateProduct = useMutation(async ({ id, updates }) => {
    await fetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  }, {
    onSuccess: () => queryClient.invalidateQueries(['vendorProducts']),
  });

  const deleteProduct = useMutation(async (id) => {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
  }, {
    onSuccess: () => queryClient.invalidateQueries(['vendorProducts']),
  });

  if (isLoading) return <div>Loading inventory...</div>;

  return (
    <div className="vendor-dashboard">
      <h2>Your Inventory</h2>
      <table>
        <thead>
          <tr><th>Title</th><th>Price</th><th>Inventory</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {products?.map(product => (
            <tr key={product._id}>
              <td>{product.title}</td>
              <td>{product.price} {product.currency}</td>
              <td>
                <input 
                  type="number" 
                  defaultValue={product.inventory} 
                  onBlur={(e) => updateProduct.mutate({ id: product._id, updates: { inventory: parseInt(e.target.value) } })}
                />
              </td>
              <td>{product.status}</td>
              <td>
                <button onClick={() => {/* Edit modal */}}>Edit</button>
                <button onClick={() => deleteProduct.mutate(product._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Add new listing button linking to creation form */}
      <button>Add New Product</button>
    </div>
  );
}
