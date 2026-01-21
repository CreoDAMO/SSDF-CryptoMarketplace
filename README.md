# SSDF Crypto Marketplace

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/CreoDAMO/ssdf-crypto-marketplace/blob/main/LICENSE)

**Version:** 1.2 (MVP Locked + AI Modules)  
**Date:** January 21, 2026  
**Author:** Jacque Antoine DeGraff (@CreoDAMO)  
**Location:** Miami, Florida  

SSDF Crypto Marketplace is a full-stack digital commerce platform that enforces atomic fulfillment for crypto transactions. Built on Base chain with Coinbase integrations, it combines onchain escrow for secure holds with NFT receipts for provable delivery. No platform custody, no discretionary control—trust is code, not assumption.

This repo contains the core codebase, smart contracts, and documentation for the MVP. It's designed for developers, contributors, and auditors to explore, test, and extend the system. For investor details, see the [Pitch Deck](docs/pitch-deck.md) and [Due Diligence FAQ](docs/due-diligence-faq.md).

## Table of Contents

- [Problem](#problem)
- [Solution](#solution)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Smart Contracts](#smart-contracts)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Problem

Digital commerce has payment finality but no delivery guarantees. Sellers can take payment and ghost. Platforms hold funds in custody without enforceable controls. Chargebacks protect buyers but penalize honest sellers. Trust is assumed, not enforced.

Result: Fraud, regulatory ambiguity, and institutional hesitation in crypto commerce.

## Solution

SSDF uses smart contract escrow to enforce atomic fulfillment—payments and delivery happen together, or not at all:

- Funds held onchain until buyer confirms receipt (no platform custody).
- NFTs minted and transferred atomically in the same transaction as payment.
- Admin intervention is time-locked and logged (no discretionary control).
- All actions are deterministic and auditable onchain.

Core Value: We don't just process payments—we enforce completion.

### Regulatory Differentiation

Built for compliance scrutiny, not to avoid it:
- ✅ Non-custodial (users control funds via smart contracts).
- ✅ No yield, staking, or pooled funds (pure escrow).
- ✅ No token issuance (revenue from transaction fees).
- ✅ Minimal audit surface (single escrow contract, no upgrades).
- ✅ KYC/AML delegated to Coinbase (registered MSB).

Positioning: Infrastructure for enforceable digital commerce, not speculative DeFi.

## Key Features

### User Roles
- **Buyer**: Browse/search listings, add to cart, onramp fiat (if low balance), pay into escrow, confirm receipt (releases funds/NFT), track orders.
- **Seller/Vendor**: Register with wallet creation, list products (standard/NFT with metadata), generate invoices, view escrows/payouts, receive post-release. v1.2: Optional AI-assisted listing (e.g., generate NFT via text prompt).
- **Admin**: 5% fee splits, transaction tracking, basic disputes (time-locked refunds), analytics.

### Core Functionality
- **Payments**: Fiat-to-crypto (Onramp), crypto processing (Commerce), invoicing/transfers (SuperPay), escrow holds (contract).
- **Escrow**: Cryptographic holds; atomic releases (funds + NFT if applicable); timeouts/auto-releases; disputes. v1.2: AI agents can automate releases/disputes via natural language.
- **NFTs**: Lazy minting on release; shared ERC-721 with royalties (up to 10% via ERC-2981); metadata via IPFS. v1.2: Optional AI generation for images/metadata before listing.
- **Human Layer Enforcement (HLE)**: Pre-checkout education to ensure comprehension (4.2% drop-off, 93% comprehension validated).
- **Platform Ops**: Real-time updates via webhooks, no polling; analytics; <5% dispute rate target.

### v1.2 Enhancements
- Optional AI modules: AgentKit for natural language automation (escrow/invoicing/disputes) and Instamint-inspired AI NFT generation (text-to-image for listings). Toggleable via env flags (e.g., `ENABLE_AI_MODULES=true`).

### v1.3 Extensions (Planned)
- Batch releases (up to 5 orders, atomic).
- Reputation weighting (onchain scores for UI display).
- Paymaster bundles (gas optimization).
- AI-enhanced evidence (user-approved dispute summaries).

## Tech Stack

- **Frontend/Backend**: Next.js 14+ (TypeScript), API routes for CRUD/escrow/webhooks.
- **Database**: MongoDB (Atlas) with schemas for Users, Products, Orders, Invoices, Escrows (onchain anchors like txHash).
- **Auth**: Clerk.
- **Emails**: AWS SES.
- **Blockchain**: Base chain (testnet/dev, mainnet/prod); viem for interactions; Solidity 0.8.20 with OpenZeppelin (ReentrancyGuard, Ownable).
- **Integrations**: Coinbase CDP/OnchainKit/Commerce/Onramp/SuperPay; @pinata/sdk for IPFS; replicate-js for AI image gen; @coinbase/agent-kit for agents.
- **Deployment**: Vercel (auto-scaling), Hardhat for contracts, Gnosis Safe for multisig.
- **Monitoring**: Sentry (errors), Vercel Analytics (traffic), Base explorer (events).
- **Assumptions**: USDC primary; ERC-721/ERC-2981 standards; basic audits pre-launch; external APIs with rate limiting.

## Installation

### Prerequisites
- Node.js 18+
- Yarn or npm
- MongoDB Atlas account
- Coinbase Developer Platform API keys
- AWS SES credentials
- Base testnet RPC (e.g., via Alchemy)

### Steps
1. Clone the repo:
   ```
   git clone https://github.com/CreoDAMO/SSDF-CryptoMarketplace.git
   cd ssdf-cryptomarketplace
   ```

2. Install dependencies:
   ```
   yarn install
   ```

3. Set up environment variables (copy `.env.example` to `.env.local`):
   - `MONGODB_URI`
   - `CLERK_SECRET_KEY`
   - `AWS_SES_*` (access key, secret, region)
   - `COINBASE_API_KEY`
   - `BASE_RPC_URL`
   - `ENABLE_AI_MODULES=true` (optional)

4. Deploy smart contracts (via Hardhat):
   ```
   yarn hardhat deploy --network baseTestnet
   ```

5. Run locally:
   ```
   yarn dev
   ```
   Access at `http://localhost:3000`.

For production: Deploy to Vercel via Git integration; migrate contracts to Base mainnet post-audit.

## Usage

### Buyer Journey
1. Sign up/login via Clerk (wallet creation if needed).
2. Browse products, add to cart.
3. Checkout: Onramp fiat if low USDC, pay into escrow.
4. Receive delivery, confirm to release (with HLE acknowledgment).

### Seller Journey
1. Register and list product (standard or NFT; optional AI gen via text prompt).
2. Generate invoice, deliver files.
3. Funds auto-released post-confirmation.

### Admin
- Dashboard for disputes: Time-locked refunds via multisig.

For disputes: Buyer initiates; admin reviews after lock; contract handles refund.

Demo: See [1:30 Cold Demo](docs/demo-90s.mp4) or [2:45 Deep-Dive](docs/demo-165s.mp4).

## Smart Contracts

- **Escrow.sol**: Single contract with order mappings; deposits, atomic releases, timeouts, admin refunds (time-locked).
- **NFT.sol**: Shared ERC-721 for lazy minting/royalties; IPFS metadata.
- Assumptions: Base chain, USDC primary, no upgrades.
- Deployment: Hardhat scripts in `/contracts`.
- Audits: Prep-ready; dual audits planned (OpenZeppelin + Trail of Bits).

View on Base explorer post-deploy.

## Testing

- **Coverage**: 95%+ (Hardhat for contracts, Jest for unit/integration, Cypress for E2E).
- **Suites**: Atomicity, reentrancy, edges, gas limits, integrations.
- Run: `yarn test`.

Bug bounty: $80-100K reserve; report via GitHub issues.

## Roadmap

- **Month 1-6 (Trust Establishment)**: Audits published, mainnet launch via multisig, 100 transactions, external validation.
- **Month 7-12 (Market Validation)**: 50+ sellers, 500+ transactions, $100K ARR run rate, Base grant, 2+ white-labels.
- **Month 13-18 (Series A Setup)**: $500K ARR, 1,000+ transactions (<5% disputes), v1.3 live (batch, reputation).
- Future: B2B expansion, license-based assets.

Current Status: Audit-ready, pre-revenue; 6-8 weeks to MVP post-funding.

## Contributing

We welcome contributions! Focus on:
- Bug fixes
- Test expansions
- AI module enhancements (if enabled)

1. Fork the repo.
2. Create a branch: `git checkout -b feature/your-feature`.
3. Commit changes: `git commit -m 'Add feature'`.
4. Push: `git push origin feature/your-feature`.
5. Open a PR.

Follow the "Never List": No tokens, no upgrades, no speculative elements.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

- **Founder**: Jacque Antoine DeGraff
- **Email**: jacquedegraff@ssdf.site | support@ssdf.site
- **GitHub**: [@CreoDAMO](https://github.com/CreoDAMO)
- **Website**: [ssdf.site](https://ssdf.site) (coming soon)

For fundraising: Institutional seed at $1.8M SAFE ($12M cap, 20% discount). Reach out if interested.

---
