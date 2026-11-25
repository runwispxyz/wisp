// Site constants for the public marketing pages.
// Placeholders: fill the socials before launch. No swap tax is claimed: none exists on-chain. Contract is set in /admin; supply is read from it on-chain.
export const SITE = {
  name: "Wisp",
  ticker: "$WISP",
  gateway: "the Wisp gateway",
  contract: process.env.NEXT_PUBLIC_CONTRACT || "[CONTRACT ADDRESS]",
  chain: "Robinhood Chain",
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 4663),
  // Shown until the contract is set in /admin; after that the live totalSupply() is read from the chain.
  initialSupply: "1,000,000,000",
  holderMinUsd: 20,
  socials: { x: "[X LINK]", github: "https://github.com/runwispxyz/wisp" },
};

export const NAV = [
  { href: "/pricing", label: "Pricing" },
  { href: "/token", label: "Token" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/status", label: "Status" },
];
