export const SEED_PRODUCTS = [
  {
    _id: "prod_genesis_001",
    title: "Genesis Test Product",
    description: "Official SSDF test asset for end-to-end escrow validation.",
    price: 1, // 1 USDC
    currency: "USDC",
    images: ["https://placehold.co/600x400/1a1a2e/white?text=Genesis+Product"],
    type: "standard",
    status: "active",
    sellerAddress: "0x7e1868430e86304Aac93a8964c4a1D5C12A76ED5", // Using deployed escrow as placeholder seller or use own wallet
    tokenURI: "ipfs://QmTest",
    royaltyBps: 500
  },
  {
    _id: "prod_ai_nft_002",
    title: "AI Instamint Receipt",
    description: "Atomic NFT receipt generated via AI upon fulfillment.",
    price: 5,
    currency: "USDC",
    images: ["https://placehold.co/600x400/4a90d9/white?text=AI+Instamint"],
    type: "ai-generated-nft",
    status: "active",
    sellerAddress: "0x7e1868430e86304Aac93a8964c4a1D5C12A76ED5",
    tokenURI: "ipfs://QmAINFT",
    royaltyBps: 1000
  }
];
