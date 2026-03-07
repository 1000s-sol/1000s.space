/** Shape matches xapes /api/collections response (Magic Eden stats + metadata). */
export interface CollectionItem {
  symbol: string;
  name: string;
  description: string | null;
  image: string | null;
  animationUrl: string | null;
  supply: number | null;
  listedCount: number | null;
  floorPrice: number | null;
  floorPriceSol: string | null;
  volumeAll: number | null;
  volumeAllSol: string | null;
  avgPrice24hr: number | null;
  avgPrice24hrSol: string | null;
  marketplaceUrl: string;
  /** Optional: group for display (e.g. "KBDS", "BUXDAO") */
  group?: string;
}

export interface CollectionsResponse {
  collections: CollectionItem[];
}
