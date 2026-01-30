// HLE Phrases - Mandatory enforcement. Changes require multisig review.
// Forbidden phrases blocked via ESLint custom rule (e.g., no "we release").
export const HLE_PHRASES = {
  TRUTH_1: 'Funds and assets move only when explicit, onchain conditions are met. SSDF does not control or intervene; the contract enforces rules automatically.',
  TRUTH_1_EXAMPLE: 'The contract holds your USDC until you confirm receipt—no one else can access it.',
  TRUTH_2: 'Disputes are resolved by fixed time delays plus evidence review, not negotiation or instant decisions. Auto-refunds occur if unresolved.',
  TRUTH_2_EXAMPLE: 'After flagging, a 1-day lock begins before admin review—use this time to submit evidence.',
  TRUTH_3: 'Once an action (release, refund, mint) is confirmed onchain, it is irreversible—no appeals, reversals, or undos are possible.',
  TRUTH_3_EXAMPLE: 'Confirming receipt triggers an atomic transaction: Funds to seller + NFT to you. Irreversible.',
  AFFIRM_ESCROW: 'I understand escrow is deterministic and SSDF cannot intervene.',
  AFFIRM_DISPUTES: 'I understand disputes use time delays, not instant fixes.',
  AFFIRM_FINALITY: 'I understand releases are final and irreversible.',
  REGRET_CONFIRM: 'I confirm this action is final and cannot be undone by anyone.',
  QUIZ_Q1: 'Can SSDF reverse a release?',
  QUIZ_A1_CORRECT: 'False',
  // Add role-specific, e.g., SELLER_AFFIRM_PAYOUT: '...'
} as const;

// Type-safety: Use keyof typeof HLE_PHRASES for imports.
