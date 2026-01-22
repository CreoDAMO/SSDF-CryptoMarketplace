# SSDF Crypto Marketplace: Security Guidelines

**Version:** v1.2 | **Date:** January 21, 2026 | **Purpose:** Outline security posture, threat model, bounty process, and disclosure to demonstrate maturity and invite scrutiny. Aligns with INTEGRITY.md invariants.

## Threat Model Summary (STRIDE-Based)
Key assets: Funds (escrow), NFTs, user data. Adversaries: Malicious users, compromised admins, external attackers.

- **Spoofing (Auth Bypass):** Mitigated by Clerk JWT/middleware; role gates in APIs. Residual: User education on phishing.  
- **Tampering (e.g., Reentrancy):** OZ ReentrancyGuard; atomic txs; Hardhat tests cover edges. Residual: Audit verifies.  
- **Repudiation (Dispute Denial):** Onchain events + DB/AgentLog immutable. Residual: Low.  
- **Information Disclosure:** HTTPS; no PII onchain; GDPR Mongo handling. Residual: Inherent blockchain visibility—advise privacy.  
- **Denial of Service:** Vercel auto-scale; rate limits; Base low fees. Residual: Monitor spam.  
- **Elevation of Privilege (Admin Abuse):** Time-locks/multisig; AI guards. Residual: Multisig compromise—3/5 threshold.  

Full model in docs/technical-whitepaper. Risks: Low-medium post-mitigations.

## Audit Scope
- **Contracts:** Full review (Escrow.sol, NFT.sol)—focus on reentrancy, access control, economic attacks. Planned: OpenZeppelin + Trail of Bits ($80-100K budget).  
- **App:** API/DB syncs, auth flows, AI wrappers. Scope: Clerk integrations, viem calls, webhook validation.  
- **Exclusions:** External deps (Coinbase APIs, Base chain)—rely on their audits.  
- **Timeline:** Pre-mainnet; reports public.

## Bug Bounty Process
- **Program:** Hosted on [HackerOne/Immunefi]—$80-100K reserve.  
- **Scope:** Contracts, APIs, AI modules (if enabled). Excludes docs/tests.  
- **Rewards:** Critical (fund drain): $50K; High (bypass guards): $10K; Medium/Low: $1-5K.  
- **Rules:** No DoS/spam; ethical disclosure only. Payout in USDC.  
- **Launch:** Post-audit; announce on X.

## Responsible Disclosure
- **Report Bugs:** Email security@ssdf.site (PGP: [your key]) or GitHub issues (private).  
- **Response Time:** Ack <24h; triage <72h; fix timeline based on severity.  
- **Policy:** No legal action for good-faith reports. Credits in changelogs.  
- **Coordination:** If critical, coordinate with Base/Coinbase.

Reference INTEGRITY.md for invariants—security builds on them. Questions? Contact jacquedegraff@ssdf.site.
