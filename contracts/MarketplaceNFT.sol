// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface INFTMarketplace {
    function mintAndTransfer(
        bytes32 orderId,
        address creator,
        address to,
        string calldata tokenURI,
        uint256 royaltyBps_  // Dynamic royaltyBps parameter
    ) external returns (uint256);
}

contract MarketplaceEscrow is ReentrancyGuard, Ownable {
    enum EscrowStatus { NONE, DEPOSITED, DISPUTED, RELEASED, REFUNDED }
    struct Escrow {
        address buyer;
        address seller;
        uint256 amount;
        uint256 timeout;  // Unix timestamp after which release or adminRefund is allowed (not a duration)
        EscrowStatus status;
        bool isNFT;
        string tokenURI;
    }
    IERC20 public immutable paymentToken; // e.g. USDC
    INFTMarketplace public nftContract;
    uint256 public immutable adminRefundDelay; // seconds
    uint256 public platformFeeBps; // e.g. 500 = 5%
    address public feeRecipient;
    mapping(bytes32 => Escrow) public escrows;
    uint256 private constant BPS_DENOM = 10_000;

    event Deposited(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event Released(bytes32 indexed orderId, address indexed seller, uint256 payout);
    event Refunded(bytes32 indexed orderId, address indexed buyer, uint256 amount);
    event Disputed(bytes32 indexed orderId);

    constructor(
        address _paymentToken,
        address _nftContract,
        address _feeRecipient,
        uint256 _platformFeeBps,
        uint256 _adminRefundDelay
    ) Ownable(msg.sender) {
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
        string calldata tokenURI
    ) external nonReentrant {
        require(escrows[orderId].status == EscrowStatus.NONE, "Escrow exists");
        require(amount > 0, "Amount zero");
        require(timeout > block.timestamp, "Invalid timeout");  // Prevent instant release
        require(paymentToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        escrows[orderId] = Escrow({
            buyer: msg.sender,
            seller: seller,
            amount: amount,
            timeout: timeout,
            status: EscrowStatus.DEPOSITED,
            isNFT: isNFT,
            tokenURI: tokenURI
        });
        emit Deposited(orderId, msg.sender, amount);
    }

    // Internal release logic
    function _release(bytes32 orderId, uint256 royaltyBps_) internal {
        Escrow storage e = escrows[orderId];
        require(
            msg.sender == e.buyer || block.timestamp >= e.timeout,
            "Not authorized"
        );
        require(e.status == EscrowStatus.DEPOSITED, "Invalid state");
        require(royaltyBps_ <= 1000, "Royalty too high");  // Guard to match NFT MAX_ROYALTY_BPS
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
                e.seller,  // creator
                e.buyer,
                e.tokenURI,
                royaltyBps_  // Pass dynamic royaltyBps
            );
        }
        emit Released(orderId, e.seller, payout);
    }

    // Simple release (default royalty 0)
    function release(bytes32 orderId) external nonReentrant {
        _release(orderId, 0);
    }

    // Release with explicit royalty
    function releaseWithRoyalty(bytes32 orderId, uint256 royaltyBps_) external nonReentrant {
        _release(orderId, royaltyBps_);
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
        feeRecipient = newRecipient;
    }
    // Gas Estimate: Deposit ~150k gas; Release (with NFT) ~250k gas - Optimized for Base's low fees.
}
