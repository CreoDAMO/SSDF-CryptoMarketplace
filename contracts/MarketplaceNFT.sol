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
