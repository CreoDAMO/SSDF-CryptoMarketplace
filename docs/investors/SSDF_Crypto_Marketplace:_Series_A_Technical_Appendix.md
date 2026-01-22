# SSDF Crypto Marketplace: Series A Technical Appendix

**Version:** v1.2 | **Date:** January 21, 2026 | **Prepared By:** Jacque Antoine DeGraff (@CreoDAMO) | **Confidential: For Accredited Investors Only**

This appendix provides a technical deep-dive into SSDF Crypto Marketplace, supplementing the Investment Memorandum. It covers architecture, security, compliance, and scalability—demonstrating why SSDF is defensible infrastructure for digital commerce. All claims verifiable via repo (github.com/CreoDAMO/SSDF-CryptoMarketplace). Audits pending (OpenZeppelin/Trail of Bits budgeted).

## 1. System Overview
SSDF is a cryptographically enforced digital escrow marketplace enabling secure, non-custodial transactions for standard and NFT products, with optional AI assistance for creation and automation.

- **Core Primitive:** Onchain escrow contract holds funds until buyer confirmation or timeout—atomic with NFT mint/transfer. No platform custody.  
- **Differentiation:** Deterministic finality (irreversible releases); time-bound disputes; AI as UX layer only (non-authoritative).  
- **Metrics Targets:** <5% dispute rate; <30s tx confirms; 100+ users at launch.  
- **Revenue:** 5% fees on releases (configurable ≤10%, multisig-gated).  

## 2. Architecture
Hybrid stack: Onchain enforcement + offchain UX.

### 2.1 Onchain Layer (Base Chain)
- **Contracts:**  
  - **MarketplaceEscrow.sol:** Single-instance (mappings by orderId); handles deposits, atomic releases (funds + optional NFT), disputes, time-locked admin refunds. Gas: Deposit ~150k; Release (NFT) ~250k.  
  - **MarketplaceNFT.sol:** Shared ERC-721; lazy mintAndTransfer (custody then buyer transfer); ERC-2981 royalties (≤10%).  
- **Key Flows:**  
  - Deposit: Buyer locks USDC; status=DEPOSITED.  
  - Release: Buyer/timeout triggers payout (minus fee) + mint (atomic). Variants: release (default royalty=0), releaseWithRoyalty (dynamic ≤1000).  
  - Dispute: Buyer flags; enables admin path post-delay.  
- **Invariants (from INTEGRITY.md):** Cryptographic finality; non-custodial; atomicity. No upgrades—immutable.  

### 2.2 Offchain Layer (Next.js/Vercel)
- **API Routes:** /api/escrow (viem calls); /api/ai/generate (Instamint IPFS); /api/agent/execute (AgentKit wrappers with guards).  
- **DB (MongoDB):** Mirrors onchain (e.g., Escrow docs with txHash); never overrides. Schemas: Users (HLE flags), Products (royaltyBps), Orders, Escrows (dispute fields).  
- **Auth/Guards:** Clerk middleware; role/HLE gating (quiz + regret buffer); AI actions enforce "user-only" rules.  
- **Event Sync:** Webhooks + cron worker (lib/event-indexer.ts) reconcile DB with onchain events—handles misses.  

### 2.3 AI Modules (Optional, Toggleable)
- **AgentKit:** Natural language wrappers (e.g., releaseEscrow)—guards prevent overreach (role/ownership/state checks). Logged in AgentLog.  
- **Instamint:** Text-to-image → IPFS metadata pre-listing; no onchain until release.  
- **Clause:** AI non-sovereign—cannot control funds/mints.  

## 3. Security & Threat Model
STRIDE-based (from SECURITY.md). Low-medium residuals post-mitigations.

- **Tampering:** ReentrancyGuard; caps (fees/royalties ≤1000); safe math.  
- **Elevation:** Multisig ownership; time-locks (adminRefundDelay); AI guards.  
- **Repudiation:** Onchain events + DB logs immutable.  
- **Disclosure:** No PII onchain; HTTPS/GDPR.  
- **DoS:** Rate limits; Base fees.  
- **Spoofing:** Clerk JWT; msg.sender checks.  

**Bounty:** $80-100K on HackerOne—criticals $50K. Disclosure: security@ssdf.site.  
**Audits:** Contracts/app scoped; reports public post-launch.  

## 4. Compliance Posture
- **Non-Custodial:** Escrows user-controlled—no MSB risks (funds not platform-held). Legal opinion pending.  
- **KYC/AML:** Delegated to Coinbase (MSB-compliant).  
- **Data:** GDPR (Mongo encryption); no onchain sensitive info.  
- **AI:** Content sanitized; no infringement (Replicate terms).  
- **"Never List" (from docs):** No offchain resolutions; no AI fund control; no upgrades.  

## 5. Scalability & Operations
- **Performance:** <2s API; <30s tx; event-driven (no polling). Vercel auto-scale; Mongo sharding-ready.  
- **Monitoring:** Sentry (errors); Vercel Analytics; Base explorer alerts; cron reconciliation.  
- **Ops:** Playbooks for compromise/outage/abuse (e.g., fee=100% halt). Multisig for changes.  
- **v1.3 Prep:** Batching (multi-releases); reputation (onchain scores)—invariant-compliant.  

## 6. Risks & Mitigations
- **Admin Compromise:** Multisig (3/5); delays.  
- **Desyncs:** Auto-reconcile; onchain supremacy.  
- **AI Abuse:** Quotas/guards; toggleable.  
- **Overall:** Audit-mitigated; bounty active.  

## Appendix: Key References
- Repo: github.com/CreoDAMO/SSDF-CryptoMarketplace  
- INTEGRITY.md: Invariants/Never List.  
- SECURITY.md: Threats/bounty.  
- Hardhat Tests: 95%+ coverage (atomicity/edges).  

Contact for diligence: jacquedegraff@ssdf.site. This positions SSDF as sovereign infrastructure—ready for scale.

(End of Appendix—fits ~4 pages PDF; expand with diagrams if needed.)
