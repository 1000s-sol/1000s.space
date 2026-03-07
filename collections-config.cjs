/**
 * Archive collections: Magic Eden slugs for KBDS and BUXDAO.
 * @see https://magiceden.io/marketplace/<slug>
 * Optional: add collectionMint (on-chain collection address) for /api/holders NFT counts.
 * Set HELIUS_API_KEY and TOKEN_MINT in .env for live holder data.
 */
module.exports = [
  // KBDS (Knuckle Bunny Death Squad)
  { slug: "kbds_og", name: "Knuckle Bunny Death Squad", group: "KBDS" },
  { slug: "kbds_art", name: "KBDS Art", group: "KBDS" },
  { slug: "kbds_rmx", name: "Knuckle Bunny Death Squad RMX", group: "KBDS" },
  { slug: "kbds_yotr", name: "Knuckle Bunny Death Squad: Year of the Rabbit", group: "KBDS" },
  { slug: "kbds_pinups", name: "KBDS Pinups", group: "KBDS" },
  { slug: "grim_sweepers", name: "Grim Sweepers", group: "KBDS" },

  // BUXDAO
  { slug: "fcked_catz", name: "Fcked Catz", group: "BUXDAO" },
  { slug: "celebcatz", name: "Celebrity Catz", group: "BUXDAO" },
  { slug: "money_monsters", name: "Money Monsters", group: "BUXDAO" },
  { slug: "moneymonsters3d", name: "Money Monsters 3D", group: "BUXDAO" },
  { slug: "ai_bitbots", name: "AI BitBots", group: "BUXDAO" },
];
