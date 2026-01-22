# Auditor-Facing Contract Walkthrough: MarketplaceEscrow.sol & MarketplaceNFT.sol

**Protocol:** SSDF Crypto Marketplace v1.2  
**Date:** January 21, 2026  
**Authors:** Jacque Antoine DeGraff (@CreoDAMO)  
**Purpose:** Provide line-by-line intent, design rationale, and mappings to system invariants/threat model for audit efficiency. Assumes familiarity with specs (e.g., non-custodial escrow, atomic fulfillment). Scope: Key functions only—no full code review. References INTEGRITY.md invariants and SECURITY.md threats.

## Overview & Design Principles
- **System Role:** Escrow enforces non-custodial, atomic digital commerce; NFT provides lazy-minted receipts. Single-instance contracts minimize complexity/gas.  
- **Assumptions:** Base chain (low fees); USDC as ERC-20; no upgrades (immutable bytecode).  
- **Invariants Mapping:** All functions align with INTEGRITY.md (e.g., #1 Cryptographic Finality, #4 Atomic Fulfillment).  
- **Threat Model Alignment:** Mitigates STRIDE risks (e.g., ReentrancyGuard for Tampering; time-locks for Elevation). No discretionary custody.  
- **Gas Profile:** Deposit ~150k; Release (NFT) ~250k—optimized for Base.  

## MarketplaceEscrow.sol Walkthrough

### constructor (Lines 42-50)
- **Intent:** Initialize immutable params; set up dependencies. No runtime changes possible post-deploy.  
- **Line-by-Line:**  
  - L43-47: Set paymentToken (USDC), nftContract, feeRecipient, platformFeeBps (default 500=5%), adminRefundDelay (e.g., 86400s=1 day).  
- **Rationale:** Immutables prevent post-deploy tampering. FeeBps capped in updateFee (≤1000).  
- **Invariants:** #2 Non-Custodial (no initial fund holds); #3 Time-Bound (delay set here).  
- **Threats:** Spoofing—Ownable restricts changes; Tampering—no state mutations.  

### deposit (Lines 52-72)
- **Intent:** Buyer locks funds onchain; creates escrow entry. Only entry point for funds.  
- **Line-by-Line:**  
  - L53-54: Require no existing escrow (status=NONE) and amount>0—prevents overwrites/zero-value spam.  
  - L55: transferFrom pulls USDC—no ETH handling (assumes approve called offchain).  
  - L56-63: Map orderId (bytes32 hash) to Escrow struct—buyer=msg.sender, etc. Status=DEPOSITED.  
  - L64: Emit Deposited for indexing/webhooks.  
- **Rationale:** Payable only via ERC-20; mappings cheap on Base. No admin role here—user-initiated.  
- **Invariants:** #2 Non-Custodial (funds held in contract, releasable only per rules); #7 Audit Transparency (event logged).  
- **Threats:** Tampering—nonReentrant; DoS—amount check + gas limits.  

### _release (Lines 74-106) [Internal]
- **Intent:** Core atomic logic—payout funds, mint/transfer NFT if applicable. Called by release variants.  
- **Line-by-Line:**  
  - L75-80: Auth check (buyer or post-timeout); state=DEPOSITED required.  
  - L81: Guard royaltyBps_ ≤1000—aligns with NFT max.  
  - L82: Set RELEASED—irreversible.  
  - L83-87: Calc/pay fee (to feeRecipient) + payout (to seller).  
  - L88-95: If NFT, call mintAndTransfer with royaltyBps_—atomic with funds.  
  - L96: Emit Released.  
- **Rationale:** All-or-nothing (reverts if any fail); no partial payouts. Royalty dynamic but capped.  
- **Invariants:** #1 Finality (status=RELEASED locks); #4 Atomic (funds + NFT together).  
- **Threats:** Tampering—nonReentrant, safe math; Elevation—auth + state guards.  

### release (Line 108)
- **Intent:** Simple release for non-royalty or default cases.  
- **Line-by-Line:**  
  - L109: Call _release with 0 royaltyBps_.  
- **Rationale:** UX default—no param for basic use.  
- **Invariants/Threats:** Same as _release.  

### releaseWithRoyalty (Line 111)
- **Intent:** Explicit royalty for advanced/NFT cases.  
- **Line-by-Line:**  
  - L112: Call _release with provided royaltyBps_.  
- **Rationale:** Allows dynamic royalties (e.g., from DB)—capped in _release.  
- **Invariants/Threats:** Same as _release.  

### dispute (Lines 114-120)
- **Intent:** Buyer flags issue—shifts to DISPUTED, enabling admin path.  
- **Line-by-Line:**  
  - L115-118: Only buyer; state=DEPOSITED required. Set DISPUTED; emit.  
- **Rationale:** No params (reason in offchain DB)—keeps onchain lean. Triggers time-lock.  
- **Invariants:** #3 Time-Bound (enables delayed adminRefund).  
- **Threats:** Spam—rate-limited offchain; Repudiation—event logged.  

### adminRefund (Lines 122-134)
- **Intent:** Admin resolves to buyer—only post-delay/dispute.  
- **Line-by-Line:**  
  - L123-129: State=DISPUTED or post-(timeout+delay); not already REFUNDED.  
  - L130: Set REFUNDED; transfer full amount to buyer (no fee). Emit.  
- **Rationale:** Full refund to buyer—penalizes seller but bounded by delay. No partials.  
- **Invariants:** #1 Finality (irreversible); #3 Time-Bound (delay enforced).  
- **Threats:** Elevation—onlyOwner + guards; Tampering—nonReentrant.  

### updateFee/updateFeeRecipient (Lines 136-144)
- **Intent:** Post-deploy config (e.g., fee adjustments)—multisig only.  
- **Line-by-Line:**  
  - L137/142: onlyOwner; cap newBps ≤1000.  
- **Rationale:** Limited to safe ranges—prevents abuse.  
- **Invariants:** #7 Transparency (auditable via txs).  
- **Threats:** Elevation—multisig post-deploy.  

## MarketplaceNFT.sol Walkthrough (Key Functions Only)

### mintAndTransfer (Lines 36-54)
- **Intent:** Lazy mint + transfer—called only by Escrow during release.  
- **Line-by-Line:**  
  - L37: Cap royaltyBps_ ≤ MAX_ROYALTY_BPS (1000).  
  - L38-42: Increment/mint to contract (custody); set URI/mappings.  
  - L43: Transfer to buyer. Emit.  
- **Rationale:** Atomic with Escrow payout; no pre-mints. Royalties per-token.  
- **Invariants:** #4 Atomic (part of release); #1 Finality (mint irreversible).  
- **Threats:** Tampering—onlyEscrow; DoS—gas-optimized.  

### Other Notes
- **supportsInterface:** Chains ERC-2981/URIStorage—indexer-friendly.  
- **updateEscrow:** onlyOwner—used post-deploy for linking.  

## Mappings to INTEGRITY.md Invariants
- #1 Finality: Enforced in RELEASED/REFUNDED states (no re-entry).  
- #2 Non-Custodial: Funds in contract, user-triggered.  
- #3 Time-Bound: timeout + adminRefundDelay.  
- #4 Atomic: _release bundles payout + mint.  
- #5 AI Non-Sovereignty: AI calls these via guarded APIs.  
- #6 Compliance: No PII; standards-compliant (ERC-20/721/2981).  
- #7 Transparency: All mutators emit events.  

## Mappings to SECURITY.md Threats
- Tampering: ReentrancyGuard, safe math, caps (royalty/fee).  
- Elevation: onlyOwner/onlyEscrow + state guards.  
- Repudiation: Events for all actions.  
- Disclosure: No sensitive data onchain.  
- DoS: Mappings/gas limits; no loops.  
- Spoofing: Msg.sender checks.  

## Audit Recommendations
- **Focus Areas:** Reentrancy in release (NFT callback?); overflow in fee calc (unlikely in 0.8+); multisig integration post-deploy.  
- **Test Coverage:** Hardhat suite verifies atomicity/edges—expand to royalty >1000 reverts.  
- **Deployment Notes:** Transfer ownership to multisig immediately post-deploy.  

Questions? Contact jacquedegraff@ssdf.site.

(End of Walkthrough—6 pages at 12pt, single-spaced.)

---
