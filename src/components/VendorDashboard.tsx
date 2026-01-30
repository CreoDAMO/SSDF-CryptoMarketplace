'use client';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function VendorDashboard() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['vendorProducts'],
    queryFn: async () => {
      const res = await fetch('/api/products?vendorId=' + user?.id);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      await fetch(`/api/products/${id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates) 
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendorProducts'] }),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendorProducts'] }),
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
          {products?.map((product: any) => (
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
      <button>Add New Product</button>
    </div>
  );
}
