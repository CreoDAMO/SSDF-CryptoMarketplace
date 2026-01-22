# SSDF Crypto Marketplace

## Overview
SSDF Crypto Marketplace is a full-stack digital commerce platform that enforces atomic fulfillment for crypto transactions. Built on Base chain with Coinbase integrations, it combines onchain escrow for secure holds with NFT receipts for provable delivery.

**Version:** 1.2 (MVP Locked + AI Modules)
**Stack:** Next.js 14+ (TypeScript), MongoDB, Clerk Auth, viem/ethers, Coinbase OnchainKit

## Project Structure
```
├── app/                    # Next.js App Router
│   ├── api/               # API routes (escrow, ai, onboarding)
│   ├── onboarding/        # User onboarding flows
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── contracts/             # Solidity smart contracts
│   ├── MarketplaceEscrow.sol
│   └── MarketplaceNFT.sol
├── lib/                   # Shared utilities
│   ├── mongoose.ts        # Database connection
│   ├── models.ts          # MongoDB schemas
│   ├── viem.ts           # Blockchain client setup
│   └── hle-phrases.ts    # HLE (Human Layer Enforcement) content
├── hooks/                 # React hooks
│   └── useRegretBuffer.ts # Confirmation delay hook
├── src/components/        # React components
│   ├── AIAgentChat.tsx
│   ├── CheckoutForm.tsx
│   ├── EscrowActions.tsx
│   └── NFTGenerator.tsx
├── abis/                  # Contract ABIs
│   └── EscrowABI.ts
└── docs/                  # Documentation
```

## Running the App
The development server runs on port 5000:
```bash
npm run dev
```

## Environment Variables Required
See `.env.example` for all required variables:
- `MONGODB_URI` - MongoDB connection string
- `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication
- `BASE_RPC_URL` - Base chain RPC endpoint
- `ESCROW_CONTRACT_ADDRESS` - Deployed escrow contract
- `PLATFORM_PRIVATE_KEY` - Backend wallet for server operations
- `IPFS_API_KEY` / `IPFS_SECRET_KEY` - Pinata for NFT metadata

## Key Features
- **Escrow System:** Smart contract holds funds until buyer confirms receipt
- **NFT Receipts:** Atomic minting on payment release (ERC-721/ERC-2981)
- **HLE (Human Layer Enforcement):** Pre-checkout education for user comprehension
- **Regret Buffer:** 5-second confirmation delay for irreversible actions
- **AI Modules (v1.2):** Optional AgentKit integration for automation

## Deployment
For production deployment to Base mainnet:
1. Deploy smart contracts via Hardhat
2. Set production environment variables
3. Deploy to Vercel or use `npm run build && npm start`

## Recent Changes
- Initial Replit environment setup
- Configured Next.js on port 5000 with proper host settings
- Created missing package.json, tsconfig.json, next.config.js
- Added ABI files for smart contracts
- Simplified middleware for development mode
