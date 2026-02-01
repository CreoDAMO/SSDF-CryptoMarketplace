# Contract Addresses
## MarketplaceNFT Address:
```txt
0x21Fb1fFaefA40c042276BB4Bcf8B826A647aE91E
```

## MarketplacEscroe Address:
```txt
0x7e1868430e86304Aac93a8964c4a1D5C12A76ED5
```

## Here’s the authoritative checklist 👇


---

## 🧱 MarketplaceEscrow — Deployment Parameters (Canonical)

When you deploy MarketplaceEscrow, you must pass all 5 constructor arguments:

1️⃣ Payment Token

USDC on Base mainnet

> This is the ERC20 used for escrowed payments
(Use the official Base USDC address)


---

2️⃣ NFT Contract

```txt
0x21Fb1fFaefA40c042276BB4Bcf8B826A647aE91E
```

> The MarketplaceNFT you already deployed


---

3️⃣ Fee Recipient

Platform treasury wallet

> Platform fees are:



Calculated in escrow

Sent immediately here on release()

Never stored in the contract

---

4️⃣ Platform Fee BPS

Example values:

```txt
500 = 5%
```

> Hard-capped at 10% by the contract




---

5️⃣ Admin Refund Delay

In seconds, for example:

```txt
72h → 259200
```

> This is the post-timeout safety window before admin refunds are allowed




---

## 🔁 After Deployment (DO NOT SKIP)

Once escrow is deployed:

Step 3 — Bind NFT → Escrow

Call on MarketplaceNFT:

```sol
updateEscrow(ESCROW_ADDRESS)
```

This:

Revokes your wallet’s mint authority

Grants mint authority exclusively to escrow

Finalizes trust guarantees



---

## 🔐 Final Trust Flow (Simple Mental Model)

Buyer → Escrow → Seller
              ↘ NFT mint
              ↘ Platform fee → Treasury

Escrow holds funds

Escrow mints NFTs

Escrow enforces royalties

Escrow enforces timeouts

Platform never touches user funds directly



---

## 0x… , this address is correct for USDC payment?

And let's be clear about what I will be using as the platform treasury wallet, will that be my wallet or a multi sig wallet? If multi sig do I create one or signups for one

## Perfect questions — these are the right things to pause on before mainnet. Let’s lock this in cleanly.


---

✅ 1️⃣ Is 0x… the correct USDC address on Base mainnet?

Yes — but only if it’s THIS exact address ⬇️
On Base Mainnet, official USDC (Circle) is:

```txt
0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

How to double-check (always good practice)

Open basescan.org

Paste the address

It should show:

Token: USD Coin (USDC)

Decimals: 6

Verified by Circle



⚠️ Do not use:

USDbC (bridged legacy token)

Testnet USDC

Any address copied from Ethereum mainnet


So for Remix:
```txt
_paymentToken =
0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

---

🏦 2️⃣ What should the platform treasury wallet be?

Short answer:

> Start with your wallet → upgrade to multisig once revenue or collaborators exist



Let’s break it down.


---

🟢 Option A — Your Wallet (Perfectly Fine Right Now)

Use your current wallet if:

You’re solo

Early-stage

No external funds yet

You want fastest deployment


Pros

Zero setup

Zero friction

You can redeploy / rotate later


Cons

Single point of control (acceptable early)


➡️ This is what I recommend for your first mainnet deploy


---

## 🔐 Option B — Multisig Treasury (Recommended Once Live)

When you should switch:

Platform starts earning fees

External contributors exist

You want operational safety


Best choice on Base:

Safe (formerly Gnosis Safe)

🔗 https://safe.global


---

How a Safe works (simple version)

You create a multisig wallet

Example setup:

1 owner → you

Threshold: 1/1 (acts like a normal wallet)


Later upgrade:

2/3 or 3/5 signers


You don’t redeploy contracts

Just call:


updateFeeRecipient(newSafeAddress)


---

You do NOT need to:

Sign up for anything

KYC

Give custody to anyone


Safe is:

Non-custodial

Smart contract wallet

Fully on-chain



---

## 🔁 Recommended Deployment Path (Canonical)

Right now (today)

✅ Treasury = your wallet

✅ Deploy escrow

✅ Finish build validation

✅ Deploy frontend


Later (zero downtime)

1. Create Safe


2. Add signers


3. Call:



updateFeeRecipient(SAFE_ADDRESS)

No migration pain. No lost funds.


---

## 🧠 Important Clarification: Where Fees Actually Go

After each successful escrow release:

Flow	Destination

Platform fee	feeRecipient wallet
Seller payout	Seller wallet
Royalties (future sales)	Creator wallet (ERC-2981 compliant)
Funds remaining in escrow	❌ None


👉 Escrow never holds funds after release


---

## ✅ Final Answers (TL;DR)

✔️ Yes, use this USDC address on Base:

0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

✔️ Use your wallet as treasury for now

✔️ Upgrade to Safe multisig later (no redeploy needed)


---

 
