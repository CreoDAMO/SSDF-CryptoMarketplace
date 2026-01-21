import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
  walletAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const ProductSchema = new Schema({
  vendorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  currency: { type: String, enum: ['USDC', 'ETH', 'BTC'], default: 'USDC' },
  images: [{ type: String }],
  inventory: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'sold', 'draft'], default: 'active' },
  type: { type: String, enum: ['standard', 'nft', 'ai-generated-nft'], default: 'standard' }, // v1.2 enum extension
  nftMetadataUri: { type: String },
  aiPrompt: { type: String }, // v1.2 optional
  onchain: {
    chainId: { type: Number },
    contract: { type: String },
    txHash: { type: String },
    blockNumber: { type: Number },
  },
});

const OrderSchema = new Schema({
  buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number },
    price: { type: Number },
  }],
  total: { type: Number, required: true },
  currency: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'refunded'], default: 'pending' },
  transactionHash: { type: String },
  vendorPayments: [{
    vendorId: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number },
    status: { type: String },
  }],
  escrowId: { type: Schema.Types.ObjectId, ref: 'Escrow' },
  onchain: {
    chainId: { type: Number },
    contract: { type: String },
    txHash: { type: String },
    blockNumber: { type: Number },
  },
  createdAt: { type: Date, default: Date.now },
});

const InvoiceSchema = new Schema({
  vendorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['unpaid', 'paid', 'cancelled'], default: 'unpaid' },
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const EscrowSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  status: { type: String, enum: ['deposited', 'released', 'refunded', 'disputed'], default: 'deposited' },
  timeoutDate: { type: Date },
  onchain: {
    chainId: { type: Number },
    contract: { type: String },
    txHash: { type: String },
    blockNumber: { type: Number },
  },
  createdAt: { type: Date, default: Date.now },
});

const AgentLogSchema = new Schema({ // v1.2 optional for AI audits
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String },
  input: { type: String },
  output: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const User = model('User', UserSchema);
export const Product = model('Product', ProductSchema);
export const Order = model('Order', OrderSchema);
export const Invoice = model('Invoice', InvoiceSchema);
export const Escrow = model('Escrow', EscrowSchema);
export const AgentLog = model('AgentLog', AgentLogSchema); // v1.2
