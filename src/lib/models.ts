import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
  walletAddress: { type: String, lowercase: true, match: /^0x[a-fA-F0-9]{40}$/ },
  createdAt: { type: Date, default: Date.now },
  onboardingQuizLog: [{
    qId: { type: String },
    selectedAnswer: { type: String },
    correct: { type: Boolean },
    timestamp: { type: Date, default: Date.now },
  }],
  onboardingAttempts: { type: Number, default: 0 },
  buyerOnboardingComplete: { type: Boolean, default: false },
  sellerOnboardingComplete: { type: Boolean, default: false },
});

const ProductSchema = new Schema({
  slug: { type: String, unique: true, sparse: true, trim: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  priceUSDC: { type: String, required: true, match: /^\d+$/ },
  sellerAddress: { type: String, required: true, lowercase: true, match: /^0x[a-fA-F0-9]{40}$/ },
  isNFT: { type: Boolean, default: true },
  tokenURI: { type: String, trim: true },
  royaltyBps: { type: Number, default: 0, min: 0, max: 1000 },
  deliveryType: { type: String, enum: ['instant', 'manual'], default: 'manual' },
  categories: [{ type: String, trim: true }],
  status: { type: String, enum: ['active', 'paused', 'sold_out'], default: 'active' },
  stock: { type: Number, min: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ProductSchema.index({ sellerAddress: 1 });
ProductSchema.index({ categories: 1 });
ProductSchema.index({ status: 1 });

ProductSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  try {
    const priceNum = BigInt(this.priceUSDC);
    if (priceNum <= 0n) {
      return next(new Error('priceUSDC must be greater than 0'));
    }
  } catch (e) {
    return next(new Error('Invalid priceUSDC format'));
  }
  
  if (this.isNFT) {
    if (!this.tokenURI) {
      return next(new Error('tokenURI required for NFTs'));
    }
    if (!this.tokenURI.startsWith('ipfs://')) {
      return next(new Error('tokenURI must be an ipfs:// URI'));
    }
    if (this.royaltyBps > 1000) {
      return next(new Error('royaltyBps exceeds max (1000)'));
    }
  }
  next();
});

const OrderSchema = new Schema({
  buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number },
    price: { type: String },
  }],
  total: { type: String, required: true },
  currency: { type: String, default: 'USDC' },
  status: { type: String, enum: ['pending', 'completed', 'refunded'], default: 'pending' },
  transactionHash: { type: String },
  escrowId: { type: Schema.Types.ObjectId, ref: 'Escrow' },
  onchain: {
    chainId: { type: Number },
    contract: { type: String },
    txHash: { type: String },
    blockNumber: { type: Number },
  },
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

const AgentLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String },
  input: { type: String },
  output: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const Escrow = mongoose.models.Escrow || mongoose.model('Escrow', EscrowSchema);
export const AgentLog = mongoose.models.AgentLog || mongoose.model('AgentLog', AgentLogSchema);
