# SSDF Crypto Marketplace: System Integrity Guidelines

**Version:** v1.2 | **Date:** January 21, 2026 | **Purpose:** Codify the system's foundational invariants, constraints, and boundaries to ensure long-term coherence, prevent drift, and guide audits/development. This is SSDF's "constitution"—all changes must align here.

## System Invariants
These unbreakable rules define SSDF's core behavior. Violations require shutdown.

1. **Cryptographic Finality:** Once an escrow is released or refunded onchain (via release() or adminRefund()), the outcome is irreversible—no actor (admin, AI, or user) can alter, reverse, or reassign funds/NFTs. Onchain events are the sole immutable record.  
2. **Non-Custodial Enforcement:** The platform never takes discretionary custody of funds; escrows are user-initiated and contract-enforced. Offchain components (DB, APIs) reflect onchain state but cannot override it—desyncs trigger reconciliation, not authority.  
3. **Time-Bound Human Intervention:** Admins can only resolve disputes after explicit delays (dispute + adminRefundDelay); no instant or unilateral actions. Ownership is multisig post-deploy, with transfers logged and auditable.  
4. **Atomic Fulfillment:** Releases are all-or-nothing: Funds transfer + NFT mint/transfer succeed together or fail entirely—no partial states.  
5. **AI Non-Sovereignty:** AI modules (AgentKit/Instamint) suggest or execute user-authorized actions but cannot initiate fund movements, mints, or resolutions independently. All AI calls enforce user role/ownership/state guards.  
6. **Compliance Boundaries:** KYC/AML is delegated (Coinbase); data handling follows GDPR (no onchain PII). AI content is sanitized and quota-limited to prevent infringement/abuse.  
7. **Audit Transparency:** All actions (txs, disputes, AI logs) produce verifiable trails (onchain events + DB/AgentLog). System halts (e.g., fee=100%) preserve state during incidents.

## Admin Constraints
- Admins are "timeout resolvers," not judges—interventions limited to post-delay refunds.  
- No "god mode"—multisig required for ownership/fee changes.  
- All actions logged (adminNote in EscrowSchema) and auditable.

## AI Non-Authority Clause
- AI is an optional UX layer—toggleable via ENABLE_AI_MODULES.  
- Agents wrap APIs/contracts but enforce "user-only" rules (Clerk auth, role/ownership checks).  
- Instamint generates metadata URIs pre-listing—no onchain impact until escrow release.

## Enforcement & Review
- **Alignment Check:** All PRs/features (e.g., v1.3) reviewed against this doc.  
- **Amendments:** Additions only, via multisig + rationale. No removals/relaxations.  
- **Cadence:** Quarterly review; tie to audits.

This ensures SSDF remains secure, fair, and defensible. Reference in SECURITY.md for threat mappings.
