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
