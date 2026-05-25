import type { ContractAddresses } from "./types.js";

export const MAINNET_WS = "wss://mainnet.portaldot.io";
export const LOCAL_WS = "ws://127.0.0.1:9944";

export const SS58_FORMAT = 42;

// 14 decimals: 1 POT = 10^14 plancks
export const POT_DECIMALS = 14;
export const PLANCK = 1n;
export const POT = 10n ** BigInt(POT_DECIMALS);

// Registration price: 1 POT
export const REGISTRATION_PRICE = POT;

// Registration period: ~30 days at 6s block time ≈ 432000 blocks
export const REGISTRATION_PERIOD_BLOCKS = 432_000;

// Well-known text record keys
export const TEXT_KEYS = {
  TWITTER: "com.twitter",
  GITHUB: "com.github",
  URL: "url",
  AVATAR: "avatar",
  DESCRIPTION: "description",
  EMAIL: "email",
  DISCORD: "com.discord",
} as const;

// Well-known attestation schemas
export const SCHEMAS = {
  ENDORSEMENT_SKILL: "endorsement.skill",
  ENDORSEMENT_CONTRIBUTION: "endorsement.contribution",
  VERIFIED_KYC: "verified.kyc",
  VERIFIED_EMAIL: "verified.email",
} as const;

// Role → proxy type mapping (section 6.3 of CLAUDE.md)
export const ROLE_TO_PROXY_TYPE: Record<string, string> = {
  admin: "Any",
  treasurer: "NonTransfer",
  voter: "Governance",
  staker: "Staking",
  judge: "IdentityJudgement",
} as const;

// Placeholder — overwritten by deploy.ts at deploy time
export const MAINNET_ADDRESSES: ContractAddresses = {
  registry: "",
  resolver: "",
  reverseRegistrar: "",
  registrar: "",
  attestation: "",
};

export { LOCAL_ADDRESSES } from "./constants/local.js";
