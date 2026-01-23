import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { Product } from '@/lib/models'; // From models.ts
import mongoose from 'mongoose'; // If not connected, add connectToDB

// GET: List products (global or vendor-filtered; with search/category)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'all'; // e.g., 'nft'
  const vendorId = searchParams.get('vendorId'); // Optional filter
  const availability = searchParams.get('availability') === 'true'; // inventory > 0

  const query: any = { status: 'active' }; // Default active only
  if (search) query.$text = { $search: search }; // Mongo text search (index title/desc)
  if (category !== 'all') query.type = category;
  if (vendorId) query.vendorId = new mongoose.Types.ObjectId(vendorId);
  if (availability) query.inventory = { $gt: 0 };

  try {
    const products = await Product.find(query).sort({ createdAt: -1 }); // Recent first
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST: Create product (seller only)
export async function POST(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  // Validate (zod if integrated)
  try {
    const product = await Product.create({ ...body, vendorId: userId });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
