# Auditor-Facing Contract Walkthrough: MarketplaceEscrow.sol & MarketplaceNFT.sol

**Version:** 1.2  
**Date:** January 22, 2026  
**Author:** Jacque Antoine DeGraff (@CreoDAMO)  
**Contact:** jacquedegraff@ssdf.site  

This document provides a technical walkthrough of SSDF's core smart contracts for auditors. It maps code to invariants, explains key functions line-by-line, and ties to system claims. For full context, see [whitepaper](https://github.com/CreoDAMO/SSDF-CryptoMarketplace/blob/main/docs/technical-whitepaper/SSDF_Crypto_Marketplace:_A_Technical_Whitepaper_(v1.2).md) and [build specs](https://github.com/CreoDAMO/SSDF-CryptoMarketplace/blob/main/docs/build-specs/SSDF_Crypto_Marketplace_Build_Specs.md).

## The Problem

Digital commerce has payment finality but no delivery guarantees. Sellers can take payment and ghost. Platforms hold funds in custody without enforceable controls. Chargebacks protect buyers but penalize honest sellers.

Result: Fraud, regulatory ambiguity, and institutional hesitation in crypto commerce.

## The Solution

SSDF uses smart contract escrow to enforce atomic fulfillment—payments and delivery happen together, or not at all:

- Funds held onchain until buyer confirms receipt (no platform custody).
- NFTs minted and transferred atomically in the same transaction as payment.
- Admin intervention is time-locked and logged (no discretionary control).
- All actions are deterministic and auditable onchain.

Core Value: We don't just process payments—we enforce completion.

## Regulatory Differentiation

Built for compliance scrutiny, not to avoid it:
- ✅ Non-custodial (users control funds via smart contracts).
- ✅ No yield, staking, or pooled funds (pure escrow).
- ✅ No token issuance (revenue from transaction fees).
- ✅ Minimal audit surface (single escrow contract, no upgrades).
- ✅ KYC/AML delegated to Coinbase (registered MSB).

Positioning: Infrastructure for enforceable digital commerce, not speculative DeFi.

## Traction & Readiness

Milestone | Status
--- | ---
Smart contract architecture | ✅ Finalized (escrow + ERC-721 NFT)
OpenZeppelin libraries | ✅ Integrated (ReentrancyGuard, Ownable)
Base chain deployment target | ✅ Configured (Coinbase ecosystem)
Platform stack | ✅ Specified (Next.js, MongoDB, Clerk)
Test Coverage | ✅ 95%+ (Hardhat, Jest, Cypress suites) - [test dir](https://github.com/CreoDAMO/SSDF-CryptoMarketplace/tree/main/test)
Human Layer Enforcement (HLE) | ✅ Validated (4.2% drop-off, 93% comprehension)
Audit preparation | ✅ Ready (contracts + test suites)
MVP timeline | ○ 6-8 weeks post-funding

Current Phase: Institutional seed fundraising.

## Business Model

Revenue Streams:
- 5% transaction fee on escrow releases.
- NFT minting fees (lazy minting on delivery).
- Optional premium seller features (future).

No Token. No Emissions. No Liquidity Games.

Revenue from real transactions solving real problems.

## Market Opportunity

Initial Focus:
- Digital tools & software licenses.

## Code Walkthrough: MarketplaceEscrow.sol

This contract manages fund logic and escrow states. Key invariants: #1 Finality (irreversible post-release), #2 Non-Custodial (user-initiated), #3 Time-Bound Admin (delayed refunds), #4 Atomicity (release all-or-nothing).

### State & Storage (Lines 12-28)
- `Escrow` struct: Buyer/seller, amount, timeout (auto-release), status enum, NFT fields, royaltyBps (stored at deposit).
- `escrows` mapping: bytes32 orderId → Escrow (efficient, single contract).
- Immutables: paymentToken (USDC), adminRefundDelay (24h default).
- Variables: platformFeeBps (capped 10%), feeRecipient (multisig).

Security: No arrays/loops (DoS resistant); uint256 safe (0.8+).

### Core Functions

**deposit() (Lines 57-74):**
- Caller: Buyer (transferFrom msg.sender).
- Checks: Escrow doesn't exist, amount >0.
- Action: Transfer funds to contract, create Escrow struct.
- Event: Deposited.
- Security: nonReentrant; user-signed (via frontend wallet).
- Invariant Tie: #2 Non-Custodial (funds held in contract, not platform wallet).

**release() (Lines 76-102):**
- Caller: Buyer or anyone post-timeout.
- Checks: Authorized, state DEPOSITED.
- Action: Calc fee/payout, transfer to seller/feeRecipient, mint/transfer NFT if applicable (atomic call).
- Event: Released.
- Security: nonReentrant; all-or-nothing (reverts if mint fails).
- Invariant Tie: #1 Finality (status → RELEASED irreversible), #4 Atomicity.

**dispute() (Lines 104-110):**
- Caller: Buyer only.
- Checks: State DEPOSITED.
- Action: Set status DISPUTED (pauses release).
- Event: Disputed.
- Security: Simple state change.
- Invariant Tie: #3 Time-Bound (starts delay clock).

**adminRefund() (Lines 112-123):**
- Caller: Owner (multisig).
- Checks: DISPUTED or timeout + delay passed.
- Action: Transfer full amount to buyer, set REFUNDED.
- Event: Refunded.
- Security: nonReentrant; only to original buyer.
- Invariant Tie: #3 Time-Bound (block.timestamp enforced).

**updateFee() / updateFeeRecipient() (Lines 125-132):**
- Caller: Owner only.
- Checks: newBps <=1000 (10%).
- Action: Update variables.
- Security: Capped to prevent abuse.
- Invariant Tie: #7 Transparency (onchain visible).

Gas Estimates: Deposit ~150k; Release ~250k (optimized for Base).

## Code Walkthrough: MarketplaceNFT.sol

This contract handles lazy NFT minting. Key invariants: #4 Atomicity (mint only via escrow), #7 Transparency (royalties onchain).

### State & Storage (Lines 12-21)
- `_tokenIdCounter`: Counters lib (safe increment).
- `escrowContract`: Only caller for mint.
- Mappings: creatorOf, royaltyBps (per token).
- Constant: MAX_ROYALTY_BPS (10%).

Security: No storage bloat; access restricted.

### Core Functions

**mintAndTransfer() (Lines 38-57):**
- Caller: onlyEscrow modifier.
- Checks: royaltyBps_ <= MAX.
- Action: Increment ID, mint to contract (custody), set URI/creator/royalty, transfer to buyer.
- Event: Minted.
- Security: Safe mint/transfer; escrow-only.
- Invariant Tie: #4 Atomicity (part of release tx).

**royaltyInfo() (Lines 59-64):**
- View: Returns receiver/amount per ERC-2981.
- Security: Pure calculation.

**supportsInterface() (Lines 66-69):**
- Override: ERC-721 + ERC-2981.

**updateEscrow() (Lines 71-74):**
- Caller: Owner only.
- Action: Set new escrow (post-deploy update).

Gas Estimate: MintAndTransfer ~120k.

## Security Considerations

- **Reentrancy:** Guarded in all external functions.
- **Access Control:** Ownable + modifiers; multisig post-deploy.
- **Gas Limits:** Tested <300k; batch limits prevent DoS.
- **Upgrades:** None—immutable bytecode.
- **Fee Abuse:** Capped onchain.
- **NFT Integrity:** Lazy mint prevents pre-sale exploits.

## Audit Prep

- Tests: [test/MarketplacePair.test.js](https://github.com/CreoDAMO/SSDF-CryptoMarketplace/blob/main/test/MarketplacePair.test.js) (atomicity, timeouts, gas).
- Metrics: HLE drop-off 4.2%, comprehension 93% (scripts in repo).
- Invariant Mapping: See whitepaper sections 2.1-2.2.

Questions? security@ssdf.site
