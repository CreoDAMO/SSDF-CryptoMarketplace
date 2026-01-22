# SSDF Crypto Marketplace - Local Setup Guide

This guide gets the full stack running locally in <15 min. Assumes Node v18+, pnpm, MongoDB Atlas, Coinbase Dev keys.

## Prerequisites

1. Clone: `git clone https://github.com/CreoDAMO/SSDF-CryptoMarketplace && cd SSDF-CryptoMarketplace`
2. Install: `pnpm install`
3. Env: Copy `.env.example` to `.env.local`—fill all (MONGODB_URI, CLERK_KEYS, COINBASE_KEYS, etc.)
4. DB: Atlas cluster; run `pnpm db:migrate` if schema changes (add if needed)
5. Contracts: `pnpm hardhat node` (local chain) or testnet deploy: `pnpm hardhat deploy --network baseTestnet`
   - Update .env with addresses

## Run

1. DB Connect: Ensure connectToDB() in lib/mongoose.ts
2. Dev Server: `pnpm dev`—localhost:3000
3. Test: `pnpm test` (all suites)
4. Onboarding: Sign up → Role select → HLE flow
5. Full Flow: List product (seller) → Buy/deposit (buyer) → Release
6. AI (if enabled): ENABLE_AI_MODULES=true; test NFTGenerator

## Troubleshooting (Vercel-Aligned)

- DB Errors: Check readyState in connectToDB
- Wallet: Coinbase OnchainKit must connect
- Tests: Hardhat needs local node

For production: Vercel deploy + mainnet migration.
