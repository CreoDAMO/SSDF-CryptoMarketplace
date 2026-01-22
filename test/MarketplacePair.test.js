const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace Escrow + NFT Pair", function () {
  let Escrow, NFT, escrow, nft, usdc;
  let owner, buyer, seller, feeRecipient;
  const ORDER_ID = ethers.utils.formatBytes32String("test-order-1");
  const AMOUNT = ethers.utils.parseUnits("100", 6); // USDC decimals
  const TIMEOUT = Math.floor(Date.now() / 1000) + 86400; // 1 day
  const ADMIN_DELAY = 86400; // 1 day
  const FEE_BPS = 500; // 5%
  const ROYALTY_BPS = 1000; // 10%
  const TOKEN_URI = "ipfs://test-uri";

  beforeEach(async function () {
    [owner, buyer, seller, feeRecipient] = await ethers.getSigners();
    // Mock USDC (ERC20)
    const ERC20 = await ethers.getContractFactory("ERC20PresetFixedSupply");
    usdc = await ERC20.deploy("USDC", "USDC", ethers.utils.parseUnits("10000", 6), owner.address);
    await usdc.transfer(buyer.address, AMOUNT);
    // Deploy NFT
    NFT = await ethers.getContractFactory("MarketplaceNFT");
    nft = await NFT.deploy(owner.address); // Temp escrow; update post-deploy
    // Deploy Escrow
    Escrow = await ethers.getContractFactory("MarketplaceEscrow");
    escrow = await Escrow.deploy(usdc.address, nft.address, feeRecipient.address, FEE_BPS, ADMIN_DELAY);
    // Update NFT escrow to real address
    await nft.updateEscrow(escrow.address);
    // Approve USDC for buyer
    await usdc.connect(buyer).approve(escrow.address, AMOUNT);
  });

  it("Deposits and releases standard (non-NFT) successfully", async function () {
    const tx = await escrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, false, "");
    const receipt = await tx.wait();
    expect(receipt.gasUsed).to.be.lt(200000); // Gas sanity
    await expect(escrow.connect(buyer).release(ORDER_ID))
      .to.emit(escrow, "Released")
      .withArgs(ORDER_ID);
    const payout = AMOUNT.mul(10000 - FEE_BPS).div(10000);
    expect(await usdc.balanceOf(seller.address)).to.equal(payout);
    expect(await usdc.balanceOf(feeRecipient.address)).to.equal(AMOUNT.sub(payout));
  });

  it("Deposits and releases NFT atomically", async function () {
    await escrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, true, TOKEN_URI);
    await expect(escrow.connect(buyer).releaseWithRoyalty(ORDER_ID, ROYALTY_BPS))
      .to.emit(escrow, "Released")
      .withArgs(ORDER_ID)
      .and.to.emit(nft, "Minted");
    const tokenId = 0; // First increment
    expect(await nft.ownerOf(tokenId)).to.equal(buyer.address);
    expect(await nft.creatorOf(tokenId)).to.equal(seller.address);
    expect(await nft.royaltyBps(tokenId)).to.equal(ROYALTY_BPS);
    const [receiver, royalty] = await nft.royaltyInfo(tokenId, ethers.utils.parseUnits("100", 6));
    expect(receiver).to.equal(seller.address);
    expect(royalty).to.equal(ethers.utils.parseUnits("10", 6)); // 10%
  });

  it("Handles disputes and time-locked admin refunds", async function () {
    await escrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, false, "");
    await escrow.connect(buyer).dispute(ORDER_ID);
    await expect(escrow.connect(buyer).release(ORDER_ID)).to.be.revertedWith("Invalid state");
    // Try early refund
    await expect(escrow.adminRefund(ORDER_ID)).to.be.revertedWith("Refund locked");
    // Time travel (Hardhat only)
    await ethers.provider.send("evm_increaseTime", [ADMIN_DELAY + 1]);
    await ethers.provider.send("evm_mine");
    await expect(escrow.adminRefund(ORDER_ID))
      .to.emit(escrow, "Refunded")
      .withArgs(ORDER_ID);
    expect(await usdc.balanceOf(buyer.address)).to.equal(AMOUNT); // Full refund
  });

  it("Auto-releases after timeout without buyer action", async function () {
    await escrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, false, "");
    // Time travel past timeout
    await ethers.provider.send("evm_increaseTime", [86400 + 1]);
    await ethers.provider.send("evm_mine");
    await expect(escrow.connect(seller).release(ORDER_ID)) // Anyone can call post-timeout, but test with seller
      .to.emit(escrow, "Released")
      .withArgs(ORDER_ID);
  });

  it("Reverts unauthorized releases and mints", async function () {
    await escrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, true, TOKEN_URI);
    await expect(escrow.connect(seller).release(ORDER_ID)).to.be.revertedWith("Not authorized"); // Before timeout
    // Direct mint attempt
    await expect(nft.connect(buyer).mintAndTransfer(ORDER_ID, seller.address, buyer.address, TOKEN_URI, ROYALTY_BPS))
      .to.be.revertedWith("Only escrow");
  });

  it("Gas sanity: Release with NFT < 300k gas", async function () {
    await escrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, true, TOKEN_URI);
    const tx = await escrow.connect(buyer).releaseWithRoyalty(ORDER_ID, ROYALTY_BPS);
    const receipt = await tx.wait();
    expect(receipt.gasUsed).to.be.lt(300000); // Reasonable for Base
  });

  it("Supports interfaces correctly", async function () {
    expect(await nft.supportsInterface("0x2a55205a")).to.be.true; // ERC-2981
    expect(await nft.supportsInterface("0x49064906")).to.be.true; // ERC721URIStorage (implicit via override)
  });

  // Expanded Edge + Adversarial Cases

  it("Reverts releaseWithRoyalty if royaltyBps > 1000", async function () {
    await escrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, true, TOKEN_URI);
    await expect(escrow.connect(buyer).releaseWithRoyalty(ORDER_ID, 1001))
      .to.be.revertedWith("Royalty too high");
  });

  it("Reverts admin refund before delay", async function () {
    await escrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, false, "");
    await escrow.connect(buyer).dispute(ORDER_ID);
    // No time travel—attempt early
    await expect(escrow.adminRefund(ORDER_ID)).to.be.revertedWith("Refund locked");
    // Time travel to just before delay end
    await ethers.provider.send("evm_increaseTime", [ADMIN_DELAY - 1]);
    await ethers.provider.send("evm_mine");
    await expect(escrow.adminRefund(ORDER_ID)).to.be.revertedWith("Refund locked");
  });

  it("Reverts double release attempt", async function () {
    await escrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, false, "");
    await escrow.connect(buyer).release(ORDER_ID);
    await expect(escrow.connect(buyer).release(ORDER_ID)).to.be.revertedWith("Invalid state");
    // Also test post-timeout double
    await ethers.provider.send("evm_increaseTime", [86400 + 1]);
    await ethers.provider.send("evm_mine");
    await expect(escrow.connect(seller).release(ORDER_ID)).to.be.revertedWith("Invalid state");
  });

  it("Allows timeout-based release by non-buyer (anyone)", async function () {
    await escrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, false, "");
    // Time travel past timeout
    await ethers.provider.send("evm_increaseTime", [86400 + 1]);
    await ethers.provider.send("evm_mine");
    // Non-buyer (e.g., feeRecipient or anyone) can release
    await expect(escrow.connect(feeRecipient).release(ORDER_ID))
      .to.emit(escrow, "Released")
      .withArgs(ORDER_ID);
    // Verify payout happened
    const payout = AMOUNT.mul(10000 - FEE_BPS).div(10000);
    expect(await usdc.balanceOf(seller.address)).to.equal(payout);
  });

  it("Ensures NFT mint atomicity: Reverts if mint fails (simulated)", async function () {
    // Simulate mint failure by deploying a failing NFT mock
    const FailingNFT = await ethers.getContractFactory("FailingMarketplaceNFT"); // Assume a mock contract that reverts on mint
    const failingNft = await FailingNFT.deploy(escrow.address);
    await failingNft.deployed();

    // Temporarily point escrow to failing NFT (in test only)
    const FailingEscrow = await Escrow.deploy(usdc.address, failingNft.address, feeRecipient.address, FEE_BPS, ADMIN_DELAY);

    await usdc.connect(buyer).approve(FailingEscrow.address, AMOUNT);
    await FailingEscrow.connect(buyer).deposit(ORDER_ID, seller.address, AMOUNT, TIMEOUT, true, TOKEN_URI);

    // Attempt release—should revert entire tx if mint fails
    await expect(FailingEscrow.connect(buyer).releaseWithRoyalty(ORDER_ID, ROYALTY_BPS)).to.be.revertedWith("Mint failed"); // Assume mock reverts with this

    // Verify no partial state: Funds not released, status still DEPOSITED
    const e = await FailingEscrow.escrows(ORDER_ID);
    expect(e.status).to.equal(1); // DEPOSITED (enum index)
    expect(await usdc.balanceOf(seller.address)).to.equal(0);
  });
});

// Mock for atomicity test (add to contracts or test helpers)
contract FailingMarketplaceNFT {
  function mintAndTransfer(bytes32, address, address, string calldata, uint256) external returns (uint256) {
    revert("Mint failed"); // Simulate failure
  }
}
