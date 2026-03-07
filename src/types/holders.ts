/** Shape compatible with xapes /api/holders (token + NFT counts, optional per-collection). */
export interface HolderRow {
  wallet: string;
  tokenBalance: number;
  tokenBalanceFormatted: string;
  totalNfts: number;
  /** Per-collection counts (symbol -> count). Optional; xapes uses mnk3ysCount/zmb3ysCount. */
  collectionCounts?: Record<string, number>;
  // xapes-style (optional, for backward compat)
  mnk3ysCount?: number;
  zmb3ysCount?: number;
}

export interface HoldersResponse {
  holders: HolderRow[];
  sort: string;
}

export interface PricesResponse {
  solUsd?: number | null;
  buxUsd?: number | null;
  knuklUsd?: number | null;
}
