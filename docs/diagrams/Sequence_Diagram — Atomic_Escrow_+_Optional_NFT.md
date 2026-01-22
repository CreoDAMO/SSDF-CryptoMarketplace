# Sequence Diagram — Atomic Escrow + Optional NFT

  ## Purpose:
Shows who can do what, when, and proves atomicity (funds + NFT) and non-custodial flow

  ```mermaid
  sequenceDiagram
    autonumber
    participant Buyer
    participant Seller
    participant Frontend
    participant Escrow as MarketplaceEscrow.sol
    participant NFT as MarketplaceNFT.sol
    participant USDC as ERC20 (USDC)

    Buyer->>Frontend: Create Order (offchain)
    Frontend->>Buyer: Approve USDC spending
    Buyer->>USDC: approve(Escrow, amount)

    Buyer->>Escrow: deposit(orderId, seller, amount, timeout, isNFT, uri)
    Escrow->>USDC: transferFrom(Buyer → Escrow)
    Escrow-->>Frontend: Deposited(orderId)

    alt Happy Path (Buyer confirms)
        Buyer->>Escrow: release(orderId)
    else Timeout Elapsed
        Seller->>Escrow: release(orderId)
    end

    Escrow->>Escrow: state = RELEASED
    Escrow->>USDC: transfer(fee → platform)
    Escrow->>USDC: transfer(payout → seller)

    alt isNFT == true
        Escrow->>NFT: mintAndTransfer(orderId, seller, buyer, uri, royaltyBps)
        NFT-->>Buyer: ERC721 Transfer
    end

    Escrow-->>Frontend: Released(orderId)
      ```
      ---
