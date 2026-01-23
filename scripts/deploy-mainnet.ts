// scripts/deploy-mainnet.ts (Extend deploy.js for prod)
async function main() {
  // Existing deploy NFT/Escrow
  // Add: Transfer ownership to multisig
  await escrow.transferOwnership(multisigAddress);
  // Verify on Basescan
}
