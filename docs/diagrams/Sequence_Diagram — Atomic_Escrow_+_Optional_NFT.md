# 1️⃣ Sequence Diagram — Atomic Escrow + Optional NFT
 
**Purpose:** Shows *who can do what, when*, and proves **atomicity** (funds + NFT) and **non-custodial flow**.
 `sequenceDiagram     autonumber     participant Buyer     participant Seller     participant Frontend     participant Escrow as MarketplaceEscrow.sol     participant NFT as MarketplaceNFT.sol     participant USDC as ERC20 (USDC)      Buyer->>Frontend: Create Order (offchain)     Frontend->>Buyer: Approve USDC spending     Buyer->>USDC: approve(Escrow, amount)      Buyer->>Escrow: deposit(orderId, seller, amount, timeout, isNFT, uri)     Escrow->>USDC: transferFrom(Buyer → Escrow)     Escrow-->>Frontend: Deposited(orderId)      alt Happy Path (Buyer confirms)         Buyer->>Escrow: release(orderId)     else Timeout Elapsed         Seller->>Escrow: release(orderId)     end      Escrow->>Escrow: state = RELEASED     Escrow->>USDC: transfer(fee → platform)     Escrow->>USDC: transfer(payout → seller)      alt isNFT == true         Escrow->>NFT: mintAndTransfer(orderId, seller, buyer, uri, royaltyBps)         NFT-->>Buyer: ERC721 Transfer     end      Escrow-->>Frontend: Released(orderId) ` 
### Auditor Notes
 
 
- **Atomicity:** If `mintAndTransfer()` reverts → entire transaction reverts
 
- **No custody:** Funds only move at `release()`
 
- **Timeout safety:** Anyone may trigger post-timeout release
 
- **AI excluded:** No AI actor appears in flow
 

  
# 2️⃣ Sequence Diagram — Dispute → Time-Locked Admin Refund
 
**Purpose:** Proves **bounded admin authority** and **time-locked intervention**.
 `sequenceDiagram     autonumber     participant Buyer     participant Admin (Multisig)     participant Escrow as MarketplaceEscrow.sol     participant USDC as ERC20 (USDC)      Buyer->>Escrow: dispute(orderId)     Escrow->>Escrow: state = DISPUTED     Escrow-->>Buyer: Disputed(orderId)      Note over Escrow: adminRefundDelay enforced      Admin->>Escrow: adminRefund(orderId)     alt Before delay         Escrow-->>Admin: revert("Refund locked")     else After delay         Escrow->>Escrow: state = REFUNDED         Escrow->>USDC: transfer(amount → buyer)         Escrow-->>Buyer: Refunded(orderId)     end ` 
### Auditor Notes
 
 
- **No partial refunds**
 
- **No seller payout in disputes**
 
- **Admin power is delayed + irreversible**
 
- **Multisig assumed post-deploy**
 

  
# 3️⃣ State Machine Diagram — Escrow Lifecycle
 
**Purpose:** This is the **single most important auditor diagram**. It proves **finality**, **no re-entry**, and **legal state closure**.
 `stateDiagram-v2     [*] --> NONE      NONE --> DEPOSITED: deposit()      DEPOSITED --> RELEASED: release()\n(by buyer OR after timeout)     DEPOSITED --> DISPUTED: dispute()\n(buyer only)      DISPUTED --> REFUNDED: adminRefund()\n(after delay)      RELEASED --> [*]     REFUNDED --> [*]      note right of RELEASED         Final state         • Funds paid         • NFT minted (if applicable)         • No reversal     end note      note right of REFUNDED         Final state         • Buyer refunded         • No seller payout         • No NFT mint     end note ` 
### Invariant Coverage
 
  
 
Invariant
 
Diagram Proof
 
   
 
Finality
 
RELEASED / REFUNDED are terminal
 
 
 
Atomicity
 
RELEASED includes payout + NFT
 
 
 
Non-custodial
 
No state allows admin seizure
 
 
 
Time-bound
 
Only DISPUTED → REFUNDED via delay
 
  
  
# 4️⃣ Authority Boundary Diagram (Who Can Act)
 
**Purpose:** Preempts *“who controls funds?”* questions.
 `flowchart LR     Buyer -->|deposit| Escrow     Buyer -->|release (pre-timeout)| Escrow     Buyer -->|dispute| Escrow      Seller -->|release (post-timeout)| Escrow      Admin -->|adminRefund (delayed)| Escrow      AI[AI / AgentKit] -.->|API wrapper only| Frontend     AI -.->|NO DIRECT ACCESS| Escrow      Escrow --> USDC     Escrow --> NFT ` 
### Key Takeaway
 
 
**No actor can bypass escrow rules. AI is non-sovereign. Admin is delayed. Buyer is primary authority.**
