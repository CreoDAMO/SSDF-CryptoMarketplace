import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { Product, Order } from '@/lib/models';

// GET: Single product detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const product = await Product.findById(id);
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT: Update product (seller only; guard invariants)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  try {
    const product = await Product.findById(id);
    if (!product || product.vendorId.toString() !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Guards: No price edit if sold (check orders)
    if (body.price && await hasCompletedOrders(id)) {
      return NextResponse.json({ error: 'Cannot edit price after sales' }, { status: 400 });
    }

    const updated = await Product.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE: Remove product (seller only; guard if escrowed)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const product = await Product.findById(id);
    if (!product || product.vendorId.toString() !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Guard: No delete if active escrow/orders
    if (await hasActiveEscrow(id) || await hasCompletedOrders(id)) {
      return NextResponse.json({ error: 'Cannot delete with active/completed orders' }, { status: 400 });
    }

    await Product.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

// Helpers
async function hasActiveEscrow(productId: string) {
  const orders = await Order.find({ 'items.productId': productId, status: { $in: ['pending', 'deposited'] } });
  return orders.length > 0;
}

async function hasCompletedOrders(productId: string) {
  const orders = await Order.find({ 'items.productId': productId, status: 'completed' });
  return orders.length > 0;
}
