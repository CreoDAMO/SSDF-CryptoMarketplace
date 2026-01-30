import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { Product } from '@/lib/models';
import mongoose from 'mongoose';

// GET: List products (global or vendor-filtered; with search/category)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'all';
  const vendorId = searchParams.get('vendorId');
  const availability = searchParams.get('availability') === 'true';

  const query: any = { status: 'active' };
  if (search) query.$text = { $search: search };
  if (category !== 'all') query.type = category;
  if (vendorId) query.vendorId = new mongoose.Types.ObjectId(vendorId);
  if (availability) query.inventory = { $gt: 0 };

  try {
    const products = await Product.find(query).sort({ createdAt: -1 });
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST: Create product (seller only)
export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  try {
    const product = await Product.create({ ...body, vendorId: userId });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
