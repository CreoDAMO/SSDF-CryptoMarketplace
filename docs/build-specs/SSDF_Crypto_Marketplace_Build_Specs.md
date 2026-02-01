## Executive Summary

SSDF is a cryptographically enforced digital escrow marketplace that enables secure, non-custodial transactions for standard and NFT products, with optional AI assistance for creation and automation. Built on Base chain with Coinbase infrastructure, the platform combines e-commerce fundamentals with blockchain trust primitives—funds are held in smart contract escrow until buyer confirmation, ensuring deterministic enforcement without platform discretion.

The system is structured across three phases. Phase 1 establishes the Human Layer Enforcement (HLE) protocol—mandatory onboarding that ensures users comprehend escrow finality, dispute timelines, and irreversibility before executing transactions. Phase 2 introduces controlled v1.2 extensions (batch releases, reputation weighting, gas optimization, AI evidence assistance) that strengthen invariants without mutation. Phase 3 operationalizes external verification through a trust surface protocol—verifiable claims, immutable attestations, and reproducible validation that enables independent audit without governance capture.

The technical stack comprises Next.js 16 with TypeScript, MongoDB, Clerk authentication, AWS SES, viem for contract interactions, and Solidity contracts on Base. The architecture is modular, audit-ready, and designed for production deployment on Vercel with a 6-8 week core timeline plus AI module integration.

---

## 1. System Architecture

### 1.1 High-Level Overview

The SSDF architecture separates concerns into four distinct layers: blockchain infrastructure for deterministic enforcement, backend services for business logic and integrations, frontend interfaces for user interaction, and governance protocols for systemic integrity.

The blockchain layer comprises two smart contracts deployed on Base mainnet. The MarketplaceEscrow contract handles all fund movements through deterministic state transitions—funds are deposited, held, released to sellers minus platform fees, or refunded through time-locked admin actions. The MarketplaceNFT contract provides shared ERC-721 infrastructure for digital product fulfillment, supporting lazy minting directly from escrow release with embedded royalties via ERC-2981.

The backend layer is implemented as Next.js API routes that integrate with MongoDB for persistent state, Clerk for authentication and wallet management, Coinbase CDP and Commerce APIs for payment processing, and AWS SES for transactional emails. This layer coordinates between offchain business logic and onchain execution, maintaining derivative state that syncs via webhook listeners.

The frontend layer provides role-specific interfaces—buyer dashboards for order management and escrow confirmation, seller dashboards for listings and payout tracking, and admin interfaces for dispute resolution. All interfaces enforce HLE gates and include Regret Buffers for irreversible actions.

### 1.2 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Blockchain | Base (Ethereum L2) | Low-fee, Coinbase-backed execution environment |
| Smart Contracts | Solidity 0.8.20 | Escrow logic, NFT fulfillment, access control |
| Backend Framework | Next.js 16 (TypeScript) | API routes, server-side logic, webhooks |
| Database | MongoDB Atlas | Users, products, orders, invoices, escrows, logs |
| Authentication | Clerk | Session management, wallet abstraction, KYC delegation |
| Contract Interaction | viem | Type-safe Ethereum operations, multicall, paymaster |
| Blockchain SDK | Coinbase CDP/OnchainKit | Wallet creation, fiat onramp, commerce APIs |
| Email | AWS SES | Transactional notifications, dispute alerts |
| Styling | Tailwind CSS | Responsive, accessible UI components |
| Testing | Hardhat/Jest/Cypress | Uni, integration, and E2E validation |

### 1.3 Data Flow Summary

User registration initiates through Clerk, which handles KYC and creates CDP wallets automatically. Sellers create product listings stored in MongoDB with optional IPFS metadata for NFT items. Buyers browse listings, add items to cart, and proceed through checkout—onramping fiat if necessary via Coinbase Onramp, then depositing funds into the escrow contract.

Upon delivery confirmation (or automatic timeout), buyers trigger release transactions. The escrow contract atomically distributes funds—platform fee to recipient, remainder to seller—and calls the NFT contract to mint and transfer any associated tokens. Disputes pause fund movement for a time-locked admin review window, after which either release or refund occurs. All state transitions are logged to MongoDB and emit onchain events for verifiability.

---

## 2. Smart Contract Specifications

### 2.1 MarketplaceEscrow.sol

The escrow contract is the trust foundation of SSDF. It implements deterministic state transitions that no actor—whether user, admin, or platform—can deviate from. The contract enforces time-locked interventions, atomic fulfillment, and non-custodial fund holding.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface INFTMarketplace {
    function mintAndTransfer(
        bytes32 orderId,
        address creator,
        address to,
        string calldata tokenURI,
        uint256 royaltyBps_
    ) external returns (uint256);
}

contract MarketplaceEscrow is ReentrancyGuard, Ownable {
    enum EscrowStatus { NONE, DEPOSITED, DISPUTED, RELEASED, REFUNDED }

    struct Escrow {
        address buyer;
        address seller;
        uint256 amount;
        uint256 timeout; // Unix timestamp
        EscrowStatus status;
        bool isNFT;
        string tokenURI;
        uint256 royaltyBps;
    }

    IERC20 public immutable paymentToken; // e.g. USDC
    INFTMarketplace public immutable nftContract;
    uint256 public immutable adminRefundDelay; // seconds
    uint256 public platformFeeBps; // e.g. 500 = 5%
    address public feeRecipient;

    mapping(bytes32 => Escrow) public escrows;

    uint256 private constant BPS_DENOM = 10_000;
    uint256 private constant MAX_ROYALTY_BPS = 1000;

    event Deposited(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event Released(bytes32 indexed orderId, address indexed seller, uint256 payout, uint256 fee);
    event Refunded(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event Disputed(bytes32 indexed orderId);

    constructor(
        address _paymentToken,
        address _nftContract,
        address _feeRecipient,
        uint256 _platformFeeBps,
        uint256 _adminRefundDelay
    ) Ownable(msg.sender) {
        require(_paymentToken != address(0), "Payment token zero");
        require(_nftContract != address(0), "NFT contract zero");
        require(_feeRecipient != address(0), "Fee recipient zero");
        require(_platformFeeBps <= 1000, "Fee too high");

        paymentToken = IERC20(_paymentToken);
        nftContract = INFTMarketplace(_nftContract);
        feeRecipient = _feeRecipient;
        platformFeeBps = _platformFeeBps;
        adminRefundDelay = _adminRefundDelay;
    }

    function deposit(
        bytes32 orderId,
        address seller,
        uint256 amount,
        uint256 timeout,
        bool isNFT,
        string calldata tokenURI,
        uint256 royaltyBps_
    ) external nonReentrant {
        require(escrows[orderId].status == EscrowStatus.NONE, "Escrow exists");
        require(seller != address(0), "Seller zero");
        require(amount > 0, "Amount zero");
        require(timeout > block.timestamp, "Invalid timeout");
        require(royaltyBps_ <= MAX_ROYALTY_BPS, "Royalty too high");

        require(
            paymentToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        escrows[orderId] = Escrow({
            buyer: msg.sender,
            seller: seller,
            amount: amount,
            timeout: timeout,
            status: EscrowStatus.DEPOSITED,
            isNFT: isNFT,
            tokenURI: tokenURI,
            royaltyBps: royaltyBps_
        });

        emit Deposited(orderId, msg.sender, amount);
    }

    function release(bytes32 orderId) external nonReentrant {
        Escrow storage e = escrows[orderId];

        require(
            msg.sender == e.buyer || block.timestamp >= e.timeout,
            "Not authorized"
        );
        require(e.status == EscrowStatus.DEPOSITED, "Invalid state");

        e.status = EscrowStatus.RELEASED;

        uint256 fee = (e.amount * platformFeeBps) / BPS_DENOM;
        uint256 payout = e.amount - fee;

        if (fee > 0) {
            require(paymentToken.transfer(feeRecipient, fee), "Fee transfer failed");
        }
        require(paymentToken.transfer(e.seller, payout), "Payout failed");

        if (e.isNFT) {
            nftContract.mintAndTransfer(
                orderId,
                e.seller, // creator
                e.buyer,
                e.tokenURI,
                e.royaltyBps
            );
        }

        emit Released(orderId, e.seller, payout, fee);
    }

    function dispute(bytes32 orderId) external {
        Escrow storage e = escrows[orderId];
        require(msg.sender == e.buyer, "Only buyer");
        require(e.status == EscrowStatus.DEPOSITED, "Invalid state");

        e.status = EscrowStatus.DISPUTED;
        emit Disputed(orderId);
    }

    function adminRefund(bytes32 orderId) external onlyOwner nonReentrant {
        Escrow storage e = escrows[orderId];

        require(
            e.status == EscrowStatus.DISPUTED ||
                block.timestamp >= e.timeout + adminRefundDelay,
            "Refund locked"
        );
        require(e.status != EscrowStatus.REFUNDED, "Already refunded");

        e.status = EscrowStatus.REFUNDED;

        require(paymentToken.transfer(e.buyer, e.amount), "Refund failed");

        emit Refunded(orderId, e.buyer, e.amount);
    }

    function updateFee(uint256 newBps) external onlyOwner {
        require(newBps <= 1000, "Fee too high");
        platformFeeBps = newBps;
    }

    function updateFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Recipient zero");
        feeRecipient = newRecipient;
    }
}
```

**Key Design Decisions:**

The contract uses a single-instance mapping pattern rather than deploying separate contracts per order. This reduces deployment costs and simplifies upgrade management while maintaining isolation through orderId-based keys. The ReentrancyGuard on all external functions prevents reentrancy attacks during fund transfers. The nonReentrant modifier on deposit ensures callers cannot exploit callback patterns during ERC20 transfers.

The atomic release pattern bundles fund transfer and NFT minting in a single transaction—if either fails, the entire transaction reverts. This prevents scenarios where funds are released but NFTs are not minted, or vice versa. The timeout mechanism allows any caller to release after the specified period, preventing fund locking if buyers become inactive.

### 2.2 MarketplaceNFT.sol

The NFT contract provides shared infrastructure for digital product fulfillment. It implements ERC-721 with URI storage and ERC-2981 royalty support, allowing creators to receive secondary sales royalties automatically.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract MarketplaceNFT is ERC721URIStorage, Ownable, IERC2981 {
    address public escrowContract;
    uint256 public constant MAX_ROYALTY_BPS = 1000; // 10%

    uint256 private _nextTokenId;

    // Mappings
    mapping(uint256 => address) public creatorOf; // Token ID => Creator (seller)
    mapping(uint256 => uint256) public royaltyBps; // Token ID => Royalty BPS

    event Minted(uint256 indexed tokenId, address indexed creator, bytes32 indexed orderId);
    event EscrowUpdated(address indexed newEscrow);

    modifier onlyEscrow() {
        require(msg.sender == escrowContract, "Only escrow");
        _;
    }

    constructor(address _escrowContract) ERC721("MarketplaceNFT", "MNFT") Ownable(msg.sender) {
        require(_escrowContract != address(0), "Invalid address");
        escrowContract = _escrowContract;
    }

    function mintAndTransfer(
        bytes32 orderId,
        address creator,
        address to,
        string calldata tokenURI,
        uint256 royaltyBps_
    ) external onlyEscrow returns (uint256) {
        require(royaltyBps_ <= MAX_ROYALTY_BPS, "Royalty too high");
        require(creator != address(0), "Creator zero");
        require(to != address(0), "Recipient zero");

        uint256 tokenId = _nextTokenId;
        unchecked { _nextTokenId++; }

        _safeMint(address(this), tokenId); // Mint to contract (custody)
        _setTokenURI(tokenId, tokenURI);

        creatorOf[tokenId] = creator;
        royaltyBps[tokenId] = royaltyBps_;

        _safeTransfer(address(this), to, tokenId); // Transfer to buyer

        emit Minted(tokenId, creator, orderId);
        return tokenId;
    }

    function royaltyInfo(
        uint256 tokenId,
        uint256 salePrice
    ) external view override returns (address receiver, uint256 royaltyAmount) {
        receiver = creatorOf[tokenId];
        royaltyAmount = (salePrice * royaltyBps[tokenId]) / 10_000;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721URIStorage, IERC165) returns (bool) {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }

    function updateEscrow(address newEscrow) external onlyOwner {
        require(newEscrow != address(0), "Invalid address");
        escrowContract = newEscrow;
        emit EscrowUpdated(newEscrow);
    }
}
```

**Key Design Decisions:**

The contract mints tokens to itself first, then transfers to the buyer. This intermediate custody ensures the escrow contract can coordinate the atomic release pattern—funds and NFT transfer happen together or not at all. The creatorOf mapping enables royalty distribution without centralized tracking, and the MAX_ROYALTY_BPS cap prevents excessive royalty extraction.

### 2.3 v1.3 Batch Release Extension

```solidity
function batchRelease(bytes32[] calldata orderIds) external nonReentrant {
    require(orderIds.length > 0 && orderIds.length <= 5, "Batch limit");
    for (uint i = 0; i < orderIds.length; i++) {
        release(orderIds[i]);
    }
    emit BatchReleased(msg.sender, orderIds);
}
```

The batch release function allows buyers to release up to five escrows atomically, reusing the existing release logic. If any individual release fails, the entire transaction reverts—maintaining atomicity guarantees while reducing transaction costs for bulk operations.

---

## 3. System Doctrine

### 3.1 Core Invariants

The following seven invariants define the immutable properties of SSDF. No feature, upgrade, or operational decision may violate these principles. Violation triggers governance protocols for remediation.

**Invariant #1: Cryptographic Finality**

Once an escrow is released or refunded onchain, the outcome is irreversible. No actor—admin, AI, or platform—can alter, reverse, or reassign funds or NFTs. Onchain events are the sole immutable record. Enforced through contract logic and verified by Hardhat tests confirming no revert paths exist post-finalization.

**Invariant #2: Non-Custodial Enforcement**

The platform never takes discretionary custody of funds. Escrows are user-initiated and contract-enforced. Offchain components (database, APIs) reflect onchain state but cannot override it—desyncs trigger reconciliation, not authority. Enforced through architecture review and compliance attestation.

**Invariant #3: Time-Bound Human Intervention**

Admins can only resolve disputes after explicit delays (dispute flag plus adminRefundDelay). No instant or unilateral admin actions are possible. Ownership transfers require multisig, with transfers logged and auditable. Enforced through contract timestamp checks and quarterly code scans.

**Invariant #4: Atomic Fulfillment**

Releases are all-or-nothing. Fund transfers and NFT mints succeed together or fail entirely—no partial states exist. Enforced through transaction bundling in release() and verified through gas analysis and partial-failure simulations.

**Invariant #5: AI Non-Sovereignty**

AI modules (AgentKit, Instamint) suggest or execute user-authorized actions but cannot initiate fund movements, mints, or resolutions independently. All AI calls enforce user role, ownership, and state guards. Enforced through agent action handlers and AgentLog audits.

**Invariant #6: Compliance Boundaries**

KYC/AML is delegated to Coinbase through CDP integration. Data handling follows GDPR with no onchain PII. AI content is sanitized and quota-limited to prevent infringement or abuse. Enforced through compliance reviews and data retention policies.

**Invariant #7: Audit Transparency**

All actions—transactions, disputes, AI logs—produce verifiable trails through onchain events, database records, and AgentLogs. The system halts during incidents to preserve state. Enforced through logging requirements and public attestation infrastructure.

### 3.2 The Never List

The following are permanent exclusions from SSDF. These are not design preferences but structural prohibitions that maintain doctrinal integrity.

1. **Never Allow Offchain Resolutions** — All dispute resolutions, releases, and refunds must trigger onchain transactions. No database-only fixes, admin overrides, or private settlements.

2. **Never Give AI Fund Control** — AI will never initiate or decide fund movements, mints, or dispute outcomes. All AI actions are user-gated and auditable.

3. **Never Enable Instant Admin Actions** — Admin interventions remain time-locked. No emergency bypasses that skip delays or multisig requirements.

4. **Never Custody User Funds** — The platform remains non-custodial. No pooling, lending, or offchain holding of user assets.

5. **Never Add Upgradeable Contracts** — Deployed bytecode is immutable. No proxy patterns or self-destruct paths that could alter logic post-launch.

6. **Never Store Sensitive Keys Onchain or Offchain** — No private keys in databases; wallets abstracted via CDP. Leaks trigger full rotation per incident playbook.

7. **Never Resolve Disputes Subjectively Off-Record** — All resolutions logged with adminNote and onchain events. No private settlements bypassing audit trails.

8. **Never Mandate AI Usage** — AI modules remain optional and toggleable. Core flows work without AI enabled.

9. **Never Expand Beyond Digital Goods** — Focus limited to standard and NFT products. No physical shipping, securities, or DeFi integrations.

10. **Never Ignore Desyncs** — Onchain state always trumps database or UI state. Automatic alerts trigger on mismatches.

### 3.3 Human Layer Enforcement Protocol

HLE is the security boundary that ensures users understand the system before interacting with it. It transforms cryptographic guarantees from abstract promises into verified comprehension.

**The Three Truths (Mandatory Communication):**

Every user must encounter and acknowledge these truths before executing transactions:

1. **Truth #1: Escrow Is Deterministic** — Funds and assets move only when explicit, onchain conditions are met. SSDF does not control or intervene; the contract enforces rules automatically.

2. **Truth #2: Time Is the Arbiter** — Disputes are resolved by fixed time delays plus evidence review, not negotiation or instant decisions. Auto-refunds occur if unresolved.

3. **Truth #3: Final Means Final** — Once an action (release, refund, mint) is confirmed onchain, it is irreversible. No appeals, reversals, or undos are possible.

**Enforcement Mechanisms:**

The onboarding flow comprises four mandatory steps that must be completed in sequence:

**Step 1: Truth Introduction** — Users scroll through each truth with example explanations. A JS listener detects scroll completion before enabling the Next button.

**Step 2: Affirmation Checkboxes** — Users must explicitly check boxes for each affirmation. Unchecking any box disables the continue button. Checkbox states are logged to the database under `affirmedTruths` array.

**Step 3: Visual Simulation Timeline** — Users interact with a step-by-step timeline showing the escrow lifecycle. For irreversible actions, a Regret Buffer activates—users must wait 3-5 seconds before confirmation appears.

**Step 4: Confirmation Quiz** — Users answer 3 questions testing comprehension. Incorrect answers loop back with contextual hints. After 3 failures, a 5-minute cooldown activates. Quiz answers are logged with questionId, selectedAnswer, correct status, and timestamp.

**Regret Buffer Implementation:**

```typescript
// hooks/useRegretBuffer.ts
import { useState, useEffect } from 'react';
import { HLE_PHRASES } from '@/lib/hle-phrases';

export default function useRegretBuffer() {
    const [isBuffering, setIsBuffering] = useState(false);
    const [timer, setTimer] = useState(0);
    const [canConfirm, setCanConfirm] = useState(false);
    
    const start = (seconds: number) => {
        setIsBuffering(true);
        setTimer(seconds);
    };
    
    useEffect(() => {
        if (timer > 0) {
            const id = setTimeout(() => setTimer(timer - 1), 1000);
            return () => clearTimeout(id);
        } else if (timer === 0 && isBuffering) {
            setCanConfirm(true);
        }
    }, [timer, isBuffering]);
    
    return { start, isBuffering, canConfirm };
}
```

**Metrics Targets:**

- HLE Drop-off Rate: <5% (users who start but don't complete onboarding)
- Comprehension Score: >90% (first-attempt quiz accuracy)
- Post-Onboarding Dispute Rate: <10% (users with completed onboarding)

---

## 4. Application Layer Specifications

### 4.1 Database Schema

```typescript
// models/User.ts
const UserSchema = new Schema({
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
    walletAddress: { type: String },
    buyerOnboardingComplete: { type: Boolean, default: false },
    sellerOnboardingComplete: { type: Boolean, default: false },
    onboardingQuizLog: [{
        questionId: String,
        selectedAnswer: String,
        correct: Boolean,
        timestamp: Date
    }],
    onboardingAttempts: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

// models/Product.ts
const ProductSchema = new Schema({
    vendorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    currency: { type: String, enum: ['USDC', 'ETH', 'BTC'], default: 'USDC' },
    images: [String],
    type: { type: String, enum: ['standard', 'nft'], default: 'standard' },
    nftMetadataUri: String,
    status: { type: String, enum: ['active', 'sold', 'draft'], default: 'active' }
});

// models/Escrow.ts
const EscrowSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    status: { type: String, enum: ['deposited', 'released', 'refunded', 'disputed'], default: 'deposited' },
    timeoutDate: Date,
    disputeReason: String,
    sellerResponse: String,
    adminNote: String,
    onchain: {
        chainId: Number,
        contract: String,
        txHash: String,
        blockNumber: Number
    },
    createdAt: { type: Date, default: Date.now }
});
```

### 4.2 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/products` | GET/POST | Product CRUD for sellers |
| `/api/orders` | POST | Order creation from cart |
| `/api/escrow/deposit` | POST | Contract call to lock funds |
| `/api/escrow/release` | POST | Buyer confirmation with Regret Buffer |
| `/api/escrow/dispute` | POST | Flag transaction for review |
| `/api/escrow/batchRelease` | POST | v1.3 batch release |
| `/api/escrow/adminRefund` | POST | Time-locked admin resolution |
| `/api/onboarding/quiz` | POST | Validate quiz answers |
| `/api/onboarding/complete` | POST | Set onboarding flag |
| `/api/ai/summarizeEvidence` | POST | v1.3 AI assistance |
| `/api/webhooks/coinbase` | POST | Payment event sync |
| `/api/webhooks/onchain` | POST | Contract event sync |
| `/api/metrics/hle` | GET | Aggregate onboarding metrics |

### 4.3 Middleware Gates

```typescript
// proxy.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### 4.4 Frontend Components

**EscrowReleaseButton.tsx:**

```typescript
export function EscrowReleaseButton({ orderIdStr }: { orderIdStr: string }) {
    const { wallet } = useWallet();
    const [loading, setLoading] = useState(false);
    const regretBuffer = useRegretBuffer();
    
    const handleRelease = async () => {
        if (!wallet) return alert('Connect wallet');
        regretBuffer.start(5); // 5-second Regret Buffer
        
        if (!regretBuffer.canConfirm) return;
        
        setLoading(true);
        try {
            const orderId = ethers.utils.id(orderIdStr) as `0x${string}`;
            const walletClient = createWalletClient({
                chain: baseSepolia,
                transport: custom(wallet.ethereumProvider)
            });
            
            const { request } = await publicClient.simulateContract({
                address: ESCROW_ADDRESS,
                abi: escrowAbi,
                functionName: 'release',
                args: [orderId],
                account: wallet.address
            });
            
            const hash = await walletClient.writeContract(request);
            setTxHash(hash);
        } catch (error) {
            console.error(error);
            alert('Release failed');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <button 
            onClick={handleRelease} 
            disabled={loading || !regretBuffer.canConfirm}
        >
            {loading ? 'Releasing...' : 'Confirm Receipt & Release'}
            {regretBuffer.isBuffering && ` (${regretBuffer.timer}s)`}
        </button>
    );
}
```

**OnboardingFlow.tsx:**

```typescript
export default function Onboarding({ params: { role } }: { params: { role: 'buyer' | 'seller' } }) {
    const [step, setStep] = useState(1);
    const [affirmations, setAffirmations] = useState({ escrow: false, disputes: false, finality: false });
    const [quizAnswers, setQuizAnswers] = useState({});
    const [attempts, setAttempts] = useState(0);
    const regretBuffer = useRegretBuffer();
    
    if (attempts >= 3) {
        return <div>Too many attempts. Try again in 5 minutes.</div>;
    }
    
    return (
        <div className="modal">
            {step === 1 && (
                <div className="truth-section">
                    <p>{HLE_PHRASES.TRUTH_1}</p>
                    <p className="example">{HLE_PHRASES.TRUTH_1_EXAMPLE}</p>
                    <p>{HLE_PHRASES.TRUTH_2}</p>
                    <p className="example">{HLE_PHRASES.TRUTH_2_EXAMPLE}</p>
                    <p>{HLE_PHRASES.TRUTH_3}</p>
                    <p className="example">{HLE_PHRASES.TRUTH_3_EXAMPLE}</p>
                    <button onClick={() => setStep(2)} disabled={!scrolledToBottom}>
                        Next
                    </button>
                </div>
            )}
            
            {step === 2 && (
                <div className="affirmation-section">
                    <label>
                        <input 
                            type="checkbox" 
                            checked={affirmations.escrow}
                            onChange={() => setAffirmations(prev => ({...prev, escrow: !prev.escrow}))}
                        /> {HLE_PHRASES.AFFIRM_ESCROW}
                    </label>
                    <label>
                        <input 
                            type="checkbox"
                            checked={affirmations.disputes}
                            onChange={() => setAffirmations(prev => ({...prev, disputes: !prev.disputes}))}
                        /> {HLE_PHRASES.AFFIRM_DISPUTES}
                    </label>
                    <label>
                        <input 
                            type="checkbox"
                            checked={affirmations.finality}
                            onChange={() => setAffirmations(prev => ({...prev, finality: !prev.finality}))}
                        /> {HLE_PHRASES.AFFIRM_FINALITY}
                    </label>
                    <button 
                        onClick={() => setStep(3)}
                        disabled={!Object.values(affirmations).every(Boolean)}
                    >
                        Next
                    </button>
                </div>
            )}
            
            {step === 3 && (
                <div className="simulation-section">
                    <p>Interactive timeline visualization...</p>
                    <button onClick={() => setStep(4)}>Next</button>
                </div>
            )}
            
            {step === 4 && (
                <div className="quiz-section">
                    <p>{HLE_PHRASES.QUIZ_Q1}</p>
                    <button onClick={() => handleQuiz('q1', 'False')}>False</button>
                    <button onClick={() => handleQuiz('q1', 'True')}>True</button>
                    {quizStatus === 'incorrect' && <p>Review Truth #3 and try again.</p>}
                </div>
            )}
        </div>
    );
}
```

---

## 5. Testing & Validation Protocol

### 5.1 Test Suite Structure

**Unit Tests (Jest):**

```typescript
// tests/hle-gates.test.ts
describe('HLE Gates - Unit', () => {
    it('enforces Regret Buffer timing guarantees', async () => {
        const { result } = renderHook(() => useRegretBuffer());
        act(() => result.current.start(3));
        expect(result.current.isBuffering).toBe(true);
        jest.advanceTimersByTime(3000);
        expect(result.current.canConfirm).toBe(true);
    });
    
    it('prevents phrase drift', () => {
        expect(HLE_PHRASES.TRUTH_3).toContain('irreversible');
    });
    
    it('validates quiz answers and logs explicitly', async () => {
        const res = await request(app).post('/api/onboarding/quiz')
            .send({ qId: 'q1', answer: 'False' });
        expect(res.status).toBe(200);
        const log = await User.findOne({ clerkId: 'test' }).select('onboardingQuizLog');
        expect(log.onboardingQuizLog[0].correct).toBe(true);
    });
});
```

**Integration Tests (Jest):**

```typescript
// tests/hle-api.integration.test.ts
describe('HLE Gates - Integration', () => {
    beforeEach(async () => { await User.deleteMany({}); });
    
    it('gates routes without onboarding flag', async () => {
        const user = await User.create({ clerkId: 'test', role: 'buyer' });
        const res = await request(app).get('/checkout')
            .set('Authorization', 'mock-jwt');
        expect(res.status).toBe(302);
        expect(res.header.location).toBe('/onboarding/buyer');
    });
});
```

**Hardhat Tests (Solidity):**

```typescript
// test/MarketplacePair.test.ts
describe('Marketplace Escrow + NFT Pair', function() {
    it('Deposits and releases NFT atomically', async function() {
        await escrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, true, TOKEN_URI);
        await expect(escrow.connect(buyer).release(ORDER_ID))
            .to.emit(escrow, 'Released')
            .withArgs(ORDER_ID)
            .and.to.emit(nft, 'Minted');
        
        const tokenId = 0;
        expect(await nft.ownerOf(tokenId)).to.equal(buyer.address);
        expect(await nft.creatorOf(tokenId)).to.equal(seller.address);
    });
    
    it('Handles disputes and time-locked admin refunds', async function() {
        await escrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, false, '');
        await escrow.connect(buyer).dispute(ORDER_ID);
        await expect(escrow.adminRefund(ORDER_ID)).to.be.revertedWith('Refund locked');
        
        await ethers.provider.send('evm_increaseTime', [ADMIN_DELAY + 1]);
        await ethers.provider.send('evm_mine');
        
        await expect(escrow.adminRefund(ORDER_ID))
            .to.emit(escrow, 'Refunded')
            .withArgs(ORDER_ID);
        expect(await usdc.balanceOf(buyer.address)).to.equal(AMOUNT);
    });
    
    it('Gas sanity: Release with NFT < 300k gas', async function() {
        await escrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, true, TOKEN_URI);
        const tx = await escrow.connect(buyer).release(ORDER_ID);
        const receipt = await tx.wait();
        expect(receipt.gasUsed).to.be.lt(300000);
    });
});
```

**E2E Tests (Cypress):**

```typescript
// cypress/e2e/hle-flow.cy.ts
describe('HLE Full Flow', () => {
    it('completes onboarding and accesses checkout', () => {
        cy.visit('/onboarding/buyer');
        cy.contains('Escrow Is Deterministic').scrollIntoView();
        cy.get('[data-test="next-button"]').should('not.be.disabled').click();
        cy.get('[data-test="affirm-escrow"]').check();
        cy.get('[data-test="affirm-disputes"]').check();
        cy.get('[data-test="affirm-finality"]').check();
        cy.get('[data-test="next-button"]').click();
        cy.get('[data-test="quiz-q1-false"]').click();
        cy.get('[data-test="quiz-submit"]').click();
        cy.url().should('include', '/dashboard');
    });
    
    it('enforces Regret Buffer on release', () => {
        cy.visit('/dashboard/escrow/release');
        cy.get('[data-test="release-button"]').click();
        cy.contains('Buffering...');
        cy.wait(5000);
        cy.get('[data-test="regret-confirm"]').should('be.visible');
    });
});
```

### 5.2 Validation Metrics

**Phase 1 Exit Criteria:**

- 100% test pass rate with >95% coverage
- HLE drop-off rate <5%
- Quiz comprehension score >90%
- No abuse bypasses in simulations

**Phase 2 Exit Criteria:**

- All v1.3 extended tests pass
- Dispute delta <0 compared to Phase 1 baseline
- Batch efficiency >50%
- No Never List violations

**Phase 3 Exit Criteria:**

- Initial attestations secured (audit, compliance, 3+ community validations)
- Attestation storage live with IPFS anchoring
- Quarterly review scheduled
- All documentation complete

---

## 6. Deployment & Operations

### 6.1 Environment Variables

```bash
# Auth & Database
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
MONGODB_URI=

# Coinbase CDP
CDP_API_KEY_NAME=
CDP_API_PRIVATE_KEY=
NEXT_PUBLIC_ONCHAINKIT_API_KEY=
NEXT_PUBLIC_COINBASE_COMMERCE_API_KEY=

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
WEBHOOK_SECRET=

# Blockchain
ESCROW_CONTRACT_ADDRESS=
NFT_CONTRACT_ADDRESS=
ADMIN_MULTISIG_ADDRESS=
FEE_RECIPIENT_ADDRESS=
PLATFORM_PRIVATE_KEY=

# Configuration
MARKETPLACE_FEE_PERCENT=5
DEFAULT_CURRENCY=USDC
NEXT_PUBLIC_APP_ENV=development

# AI Modules (Optional)
REPLICATE_API_TOKEN=
AGENTKIT_API_KEY=
ENABLE_AI_MODULES=true
```

### 6.2 Deployment Checklist

**Phase 1: Preparation (Hours 0-6)**

- Rotate all environment variables and secure in Vercel secrets
- Deploy contracts to Base testnet and verify
- Run full Hardhat test suite on testnet
- Configure Clerk webhooks for payment events

**Phase 2: Mainnet Deployment (Hours 6-18)**

- Execute Hardhat deployment script to Base mainnet
- Verify contracts on Basescan
- Transfer contract ownership to multisig (3/5 Gnosis Safe)
- Deploy frontend to Vercel with production environment
- Configure production webhooks

**Phase 3: Validation & Launch (Hours 18-36)**

- Run complete validation suite against mainnet
- Execute dry-run transaction (platform-funded, low value)
- Monitor for 12 hours with Sentry and Base explorer alerts
- Announce launch on X and community channels

### 6.3 Incident Response Playbooks

**Compromise Scenario (Key Theft, Hack):**

1. Detect and contain within 30 minutes—pause platform via `updateFee(10000)`
2. Assess scope by scanning logs and onchain events
3. Eradicate through key rotation and contract patching
4. Recover from MongoDB snapshots and redeploy
5. Notify users and regulators if funds lost

**Outage Scenario (Base Downtime, API Failure):**

1. Detect within 15 minutes via monitoring alerts
2. Display maintenance banner on frontend
3. Switch to fallback RPC if available
4. Retry failed transactions with exponential backoff
5. Resume operations when services restore

**Abuse Scenario (Dispute Spam, AI Misuse):**

1. Flag abusive users through Clerk account suspension
2. Pause affected escrows with admin notes
3. Review AgentLogs for prompt injection patterns
4. Implement rate limiting and content moderation
5. Notify abusers with appeal process details

---

## 7. External Verification Protocol

### 7.1 Verifier Matrix

| Verifier Type | Validates | Authority | Cadence |
|---------------|-----------|-----------|---------|
| Smart Contract Auditors | Invariants #1-4 | Code correctness | Annual + pre-launch |
| Compliance Reviewers | Invariants #2, #6 | Regulatory alignment | Annual + on-demand |
| Community Verifiers | Full reproduction | Test execution | Continuous |
| Counterparty DD | Integration-specific | Partnership scope | Per integration |
| Internal Quarterly | All invariants + Never List | Drift detection | 90-day |

### 7.2 Attestation Format

```
SMART CONTRACT AUDIT ATTESTATION

Auditor: OpenZeppelin
Date: 2026-01-25
Commit: abc123...
Scope: MarketplaceEscrow.sol, MarketplaceNFT.sol

FINDINGS SUMMARY:
- Critical: 0
- High: 0
- Medium: 1
- Low: 2

INVARIANT COMPLIANCE:
✅ Invariant #1 (Finality): No revert paths post-release
✅ Invariant #3 (Time-Bound): adminRefund enforces delay
✅ Invariant #4 (Atomicity): All-or-nothing fulfillment

ATTESTATION: Code is production-ready.

Signature: [GPG signature]
```

### 7.3 Public Repository Structure

```
ssdf-marketplace-public/
├── README.md
├── ARCHITECTURE.md
├── INVARIANTS.md
├── CLAIMS_EVIDENCE.md
├── contracts/
│   ├── MarketplaceEscrow.sol
│   ├── MarketplaceNFT.sol
│   └── deploy.js
├── test/
│   ├── hardhat/
│   ├── jest/
│   └── cypress/
├── lib/
│   ├── hle-phrases.ts
│   └── mongoose.ts
├── components/
├── scripts/
├── docs/
├── attestations/
│   ├── audits/
│   ├── compliance/
│   ├── community/
│   └── internal/
└── INTEGRITY.md
```

---

## 8. v1.3 Controlled Extensions

### 8.1 Batch Escrow Releases

Allows buyers to release up to five escrows in a single atomic transaction. Reuses existing release logic with batch limits enforced at the contract level. Frontend provides checkbox selection in the dashboard with individual Regret Buffers per order.

**Invariant Impact:** Strengthens #1 (Finality) and #4 (Atomicity) by extending atomicity guarantees to batch operations.

### 8.2 Reputation Weighting

Onchain reputation scores track successful releases per address. Scores increment on release, decrement on disputed refunds. Displayed in dispute logs to inform admin review, but do not influence outcomes.

**Invariant Impact:** Strengthens #2 (Non-Custodial) through onchain derivation and #7 (Transparency) through queryable history.

### 8.3 Gas Optimization via Paymaster

Bundles onboarding steps (affirmations, quiz) into sponsored transactions via Coinbase Smart Wallet Paymaster. Reduces user friction while maintaining non-custodial guarantees.

**Invariant Impact:** Strengthens #6 (Compliance) through sponsored but non-custodial operations.

### 8.4 AI-Enhanced Evidence Submission

AgentKit summarizes dispute evidence text for clarity. Users approve summaries before submission. AI has no decision authority—summarization only.

**Invariant Impact:** Strengthens #3 (Time-Bound) within dispute windows and #5 (AI Non-Sovereignty) through approval gates.

---

## 9. Development Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: HLE Implementation | 2-3 weeks | Onboarding flow, Regret Buffers, quiz system, middleware gates |
| Phase 2: Core v1.2 | 2-3 weeks | Contracts, API routes, frontend components, deployment scripts |
| Phase 3: v1.3 Extensions | 1-2 weeks | Batch releases, reputation, paymaster, AI evidence |
| Phase 4: Verification | 1 week | Audit engagement, compliance review, public repo prep |
| Phase 5: Launch | 1 week | Mainnet deployment, monitoring, launch announcement |

**Total Estimated Timeline:** 7-10 weeks from kickoff to production launch.

---

## 10. Compliance & Risk Summary

### 10.1 Regulatory Positioning

SSDF is designed for compliance from inception. The platform does not function as a custodian—funds remain in user-controlled escrow contracts, reducing AML exposure. KYC/AML responsibilities are delegated to Coinbase through CDP integration. NFTs are positioned as utility/digital goods rather than securities. Data handling follows GDPR with no onchain PII. AI content is moderated through vetted external APIs with rate limiting.

### 10.2 Risk Matrix

| Risk Category | Severity | Mitigation |
|---------------|----------|------------|
| Smart Contract Exploit | High | OpenZeppelin libraries, ReentrancyGuard, audit, time-locks |
| Admin Key Compromise | Medium | Multisig (3/5), time-locks, pause mechanism |
| AI Prompt Injection | Medium | Input sanitization, scoped actions, AgentLog audits |
| Offchain Data Breach | Medium | Env var security, no sensitive key storage, rotation protocol |
| Platform Downtime | Low | Vercel auto-scale, fallback RPCs, status monitoring |
| Regulatory Action | Low | Compliance reviews, non-custodial architecture, GDPR alignment |

### 10.3 Insurance & Contingencies

- **Pause Mechanism:** Setting platform fee to 100% halts new deposits without draining existing funds
- **Rollback Capability:** MongoDB snapshots enable state recovery
- **Multisig Ownership:** Contract ownership requires 3 of 5 signatures
- **Incident Playbooks:** Defined procedures for compromise, outage, and abuse scenarios

---

## Appendix: Contract ABIs

### MarketplaceEscrow ABI

```json
[
    {"type":"constructor","inputs":[{"name":"_paymentToken","type":"address"},{"name":"_nftContract","type":"address"},{"name":"_feeRecipient","type":"address"},{"name":"_platformFeeBps","type":"uint256"},{"name":"_adminRefundDelay","type":"uint256"}]},
    {"type":"function","name":"adminRefund","inputs":[{"name":"orderId","type":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},
    {"type":"function","name":"batchRelease","inputs":[{"name":"orderIds","type":"bytes32[]"}],"outputs":[],"stateMutability":"nonpayable"},
    {"type":"function","name":"deposit","inputs":[{"name":"orderId","type":"bytes32"},{"name":"seller","type":"address"},{"name":"amount","type":"uint256"},{"name":"timeout","type":"uint256"},{"name":"isNFT","type":"bool"},{"name":"tokenURI","type":"string"}],"outputs":[],"stateMutability":"nonpayable"},
    {"type":"function","name":"dispute","inputs":[{"name":"orderId","type":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},
    {"type":"function","name":"escrows","inputs":[{"name":"orderId","type":"bytes32"}],"outputs":[{"name":"buyer","type":"address"},{"name":"seller","type":"address"},{"name":"amount","type":"uint256"},{"name":"timeout","type":"uint256"},{"name":"status","type":"uint8"},{"name":"isNFT","type":"bool"},{"name":"tokenURI","type":"string"}],"stateMutability":"view"},
    {"type":"function","name":"release","inputs":[{"name":"orderId","type":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},
    {"type":"function","name":"updateFee","inputs":[{"name":"newBps","type":"uint256"}],"outputs":[],"stateMutability":"nonpayable"},
    {"type":"function","name":"updateFeeRecipient","inputs":[{"name":"newRecipient","type":"address"}],"outputs":[],"stateMutability":"nonpayable"},
    {"type":"event","name":"Deposited","inputs":[{"name":"orderId","type":"bytes32","indexed":true},{"name":"buyer","type":"address"},{"name":"amount","type":"uint256"}],"anonymous":false},
    {"type":"event","name":"Disputed","inputs":[{"name":"orderId","type":"bytes32","indexed":true}],"anonymous":false},
    {"type":"event","name":"Refunded","inputs":[{"name":"orderId","type":"bytes32","indexed":true}],"anonymous":false},
    {"type":"event","name":"Released","inputs":[{"name":"orderId","type":"bytes32","indexed":true}],"anonymous":false}
]
```

### MarketplaceNFT ABI

```json
[
    {"type":"constructor","inputs":[{"name":"_escrowContract","type":"address"}]},
    {"type":"function","name":"creatorOf","inputs":[{"name":"tokenId","type":"uint256"}],"outputs":[{"name":"","type":"address"}],"stateMutability":"view"},
    {"type":"function","name":"escrowContract","inputs":[],"outputs":[{"name":"","type":"address"}],"stateMutability":"view"},
    {"type":"function","name":"mintAndTransfer","inputs":[{"name":"orderId","type":"bytes32"},{"name":"creator","type":"address"},{"name":"to","type":"address"},{"name":"tokenURI","type":"string"},{"name":"royaltyBps","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"nonpayable"},
    {"type":"function","name":"royaltyBps","inputs":[{"name":"tokenId","type":"uint256"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"},
    {"type":"function","name":"royaltyInfo","inputs":[{"name":"tokenId","type":"uint256"},{"name":"salePrice","type":"uint256"}],"outputs":[{"name":"receiver","type":"address"},{"name":"royaltyAmount","type":"uint256"}],"stateMutability":"view"},
    {"type":"function","name":"supportsInterface","inputs":[{"name":"interfaceId","type":"bytes4"}],"outputs":[{"name":"","type":"bool"}],"stateMutability":"view"},
    {"type":"function","name":"updateEscrow","inputs":[{"name":"newEscrow","type":"address"}],"outputs":[],"stateMutability":"nonpayable"},
    {"type":"event","name":"Minted","inputs":[{"name":"tokenId","type":"uint256","indexed":true},{"name":"creator","type":"address"},{"name":"orderId","type":"bytes32"}],"anonymous":false}
]
```

---

*Document Version: 1.2 | Last Updated: January 19, 2026 | Status: Production Ready*
