import { useState, useEffect } from "react";
import type { CollectionItem, CollectionsResponse } from "../types/collections";

const TENSOR_URL = "https://www.tensor.trade";

/** Collection image URLs (by display order) when API image is missing or fails. */
const COLLECTION_IMAGE_URLS: string[] = [
  "https://img-cdn.magiceden.dev/rs:fill:400:0:0/plain/https%3A%2F%2Farweave.net%2F83ab9EFr9tzpVJzSEQ2pxC1osU-d7Yf88IWjmoO2Acw%3Fext%3Dpng",
  "https://img-cdn.magiceden.dev/rs:fill:400:0:0/plain/https%3A%2F%2Farweave.net%2FhEzOiu7KkWHHtDfvCSVh7_YrH3c5rCnUEFV3AviHdM8%3Fext%3Dpng",
  "https://img-cdn.magiceden.dev/rs:fill:400:0:0/plain/https%3A%2F%2Fcreator-hub-prod.s3.us-east-2.amazonaws.com%2Fkbds_rmx_pfp_1663984850760.png",
  "https://img-cdn.magiceden.dev/rs:fill:400:0:0/plain/https%3A%2F%2Fcreator-hub-prod.s3.us-east-2.amazonaws.com%2Fkbds_yotr_pfp_1683145001665.png",
  "https://img-cdn.magiceden.dev/rs:fill:400:0:0/plain/https%3A%2F%2Fcreator-hub-prod.s3.us-east-2.amazonaws.com%2Fkbds_pinups_pfp_1695688711350.png",
  "https://img-cdn.magiceden.dev/rs:fill:400:0:0/plain/https%3A%2F%2Fcreator-hub-prod.s3.us-east-2.amazonaws.com%2Fgrim_sweepers_pfp_1681174844171.png",
  "https://img-cdn.magiceden.dev/rs:fill:400:0:0/plain/https%3A%2F%2Fcreator-hub-prod.s3.us-east-2.amazonaws.com%2Ffcked_catz_pfp_1710027613226.gif",
  "https://img-cdn.magiceden.dev/rs:fill:400:0:0/plain/https%3A%2F%2Fcreator-hub-prod.s3.us-east-2.amazonaws.com%2Fcelebcatz_pfp_1764849644018.gif",
  "https://img-cdn.magiceden.dev/rs:fill:400:0:0/plain/https%3A%2F%2Fcreator-hub-prod.s3.us-east-2.amazonaws.com%2Fmoney_monsters_pfp_1710031780548.gif",
  "https://img-cdn.magiceden.dev/rs:fill:400:0:0/plain/https%3A%2F%2Fcreator-hub-prod.s3.us-east-2.amazonaws.com%2Fmoneymonsters3d_pfp_1680322659615.gif",
  "https://img-cdn.magiceden.dev/rs:fill:400:0:0/plain/https%3A%2F%2Fcreator-hub-prod.s3.us-east-2.amazonaws.com%2Fai_bitbots_pfp_1700035102093.gif",
];

function formatNum(n: number | null | undefined): string {
  if (n == null) return "—";
  if (typeof n !== "number") return String(n);
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

export function ArchivesSection() {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/collections", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CollectionsResponse | null) => {
        if (data?.collections?.length) {
          setCollections(data.collections);
        }
        setError(null);
      })
      .catch(() => setError("Could not load collections."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8 text-[var(--dashboard-muted)]">
        Loading collections…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-[var(--dashboard-muted)]">
        {error}
      </div>
    );
  }

  if (!collections.length) {
    return (
      <div className="text-center py-8 text-[var(--dashboard-muted)]">
        No collections configured. Run the API server and set collection slugs.
      </div>
    );
  }

  const byGroup = collections.reduce<Record<string, CollectionItem[]>>((acc, c) => {
    const key = c.group || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});
  const groupOrder = ["KBDS", "BUXDAO", "Other"];
  const displayOrder = groupOrder.filter((g) => byGroup[g]?.length).flatMap((g) => byGroup[g]);

  return (
    <div className="w-full space-y-8">
      {groupOrder.filter((g) => byGroup[g]?.length).map((group) => (
        <section key={group}>
          <h2 className="text-lg font-semibold text-white mb-4">{group}</h2>
          <div className="grid gap-4 sm:grid-cols-2 min-[1000px]:grid-cols-3">
            {byGroup[group].map((c) => {
              const idx = displayOrder.findIndex((x) => x.symbol === c.symbol);
              const imageOverride = idx >= 0 && idx < COLLECTION_IMAGE_URLS.length ? COLLECTION_IMAGE_URLS[idx] : undefined;
              return (
                <CollectionCard
                  key={c.symbol}
                  collection={c}
                  formatNum={formatNum}
                  imageOverride={imageOverride}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function CollectionCard({
  collection: c,
  formatNum,
  imageOverride,
}: {
  collection: CollectionItem;
  formatNum: (n: number | null | undefined) => string;
  imageOverride?: string;
}) {
  const mediaSrc = imageOverride ?? c.animationUrl ?? c.image;
  const desc = (c.description || "").slice(0, 280);
  const descTruncated = (c.description || "").length > 280 ? desc + "…" : desc;
  const meUrl = c.marketplaceUrl || `https://magiceden.io/marketplace/${encodeURIComponent(c.symbol)}`;
  const tensorUrl = `${TENSOR_URL}/trade/${encodeURIComponent(c.symbol)}`;

  const stats: { label: string; value: string }[] = [];
  if (c.supply != null && Number(c.supply) > 1) stats.push({ label: "Supply", value: formatNum(c.supply) });
  if (c.listedCount != null) stats.push({ label: "Listed", value: formatNum(c.listedCount) });
  if (c.floorPriceSol != null) stats.push({ label: "Floor", value: c.floorPriceSol + " SOL" });
  if (c.volumeAllSol != null) stats.push({ label: "Volume", value: c.volumeAllSol + " SOL" });
  if (c.avgPrice24hrSol != null) stats.push({ label: "24h avg", value: c.avgPrice24hrSol + " SOL" });

  return (
    <article className="rounded-2xl border-2 border-[var(--dashboard-border)] overflow-hidden bg-[var(--dashboard-surface)]">
      <div className="aspect-square bg-[var(--dashboard-border)] overflow-hidden">
        {mediaSrc ? (
          <img
            src={mediaSrc}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--dashboard-muted)] text-sm" style={{ background: 'var(--dashboard-card)' }}>
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-1">{c.name || c.symbol}</h3>
        {descTruncated ? (
          <p className="text-sm text-[var(--dashboard-muted)] leading-snug mb-3 line-clamp-3">
            {descTruncated}
          </p>
        ) : null}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-2 mb-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5">
                <span className="text-xs uppercase tracking-wide text-[var(--dashboard-muted)]">{s.label}</span>
                <span className="text-sm font-medium text-white">{s.value}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={meUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 w-20 rounded-full border-2 border-[var(--dashboard-border)] text-[var(--dashboard-text)] hover:border-[var(--dashboard-accent)]/50 transition-colors overflow-hidden flex-shrink-0"
            aria-label="View on Magic Eden"
          >
            <img src="/images/magic_eden.png" alt="Magic Eden" className="w-full h-full object-cover object-center" loading="lazy" />
          </a>
          <a
            href={tensorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 w-20 rounded-full border-2 border-[var(--dashboard-border)] text-[var(--dashboard-text)] hover:border-[var(--dashboard-accent)]/50 transition-colors overflow-hidden flex-shrink-0"
            aria-label="View on Tensor"
          >
            <img src="/images/tensor.png" alt="Tensor" className="w-full h-full object-cover object-center" loading="lazy" />
          </a>
        </div>
      </div>
    </article>
  );
}
