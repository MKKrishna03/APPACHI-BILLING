"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type QuotationItem = {
  product_name: string | null;
  weight: string | null;
};

type QuotationScrap = {
  status: "pending" | "estimated" | "locked";
  total: string | null;
};

type Quotation = {
  id: string;
  quotation_number: string;
  revision: number;
  items: QuotationItem[];
  scraps: QuotationScrap[];
  total: string | null;
  less: string | null;
  net_total: string | null;
};

function productSummary(items: QuotationItem[]) {
  if (items.length === 0) return "-";
  if (items.length === 1) return items[0].product_name || "-";
  return `${items[0].product_name} +${items.length - 1} more`;
}

function weightSummary(items: QuotationItem[]) {
  const sum = items.reduce((total, i) => total + Number(i.weight || 0), 0);
  return sum.toFixed(3);
}

function scrapValue(scraps: QuotationScrap[]) {
  return scraps
    .filter((s) => s.status === "locked")
    .reduce((sum, s) => sum + Number(s.total ?? 0), 0);
}

// True when a linked scrap was locked after this quotation was last
// saved, so its stored net total doesn't reflect the scrap deduction yet.
function needsScrapRefresh(q: Quotation) {
  if (q.items.length === 0 || q.total == null) return false;
  const scrapTotal = scrapValue(q.scraps);
  if (scrapTotal <= 0) return false;
  const expectedNet = Number(q.total) - Number(q.less ?? 0) - scrapTotal;
  const storedNet = Number(q.net_total ?? 0);
  return Math.abs(expectedNet - storedNet) > 0.01;
}

export default function QuotationMenuPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moveTarget, setMoveTarget] = useState<Quotation | null>(null);

  async function loadQuotations() {
    const res = await fetch("/api/quotations");
    const data = await res.json();
    setQuotations(data);
    setLoading(false);
  }

  useEffect(() => {
    loadQuotations();
  }, []);

  const refreshCount = quotations.filter(needsScrapRefresh).length;

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/quotations/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      await loadQuotations();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Link href="/quotation/new" className="btn-primary text-center w-fit">
          Create Quotation
        </Link>
        <Link href="/quotation/scrap-first" className="btn-secondary text-center w-fit">
          Add Scrap First
        </Link>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <h1 className="heading text-2xl font-semibold">Saved Quotations</h1>
        {refreshCount > 0 && (
          <span
            className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap"
            style={{
              background: "color-mix(in srgb, var(--accent) 15%, transparent)",
              color: "var(--accent)",
            }}
          >
            {refreshCount} scrap{refreshCount > 1 ? "s" : ""} locked — needs update
          </span>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead
            className="text-left"
            style={{ background: "var(--background)" }}
          >
            <tr>
              <th className="px-4 py-2">Quotation No.</th>
              <th className="px-4 py-2">Count</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Weight</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && quotations.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center"
                  style={{ color: "var(--muted)" }}
                >
                  No saved quotations yet.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center"
                  style={{ color: "var(--muted)" }}
                >
                  Loading...
                </td>
              </tr>
            )}
            {quotations.map((q) => (
              <tr
                key={q.id}
                className="border-t table-row-hover cursor-pointer transition-colors"
                style={{ borderColor: "var(--border)" }}
                onClick={() => setMoveTarget(q)}
              >
                <td
                  className="px-4 py-2 font-medium"
                  style={{ color: "var(--primary)" }}
                >
                  <div className="flex items-center gap-2">
                    {q.quotation_number}
                    {needsScrapRefresh(q) && (
                      <span
                        title="Scrap locked after this quotation was saved — reopen and save to update the net total"
                        className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{
                          background:
                            "color-mix(in srgb, var(--accent) 15%, transparent)",
                          color: "var(--accent)",
                        }}
                      >
                        Scrap Locked
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  {String(q.revision).padStart(2, "0")}
                </td>
                <td className="px-4 py-2">{productSummary(q.items)}</td>
                <td className="px-4 py-2">{weightSummary(q.items)} g</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(q);
                    }}
                    className="link-danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {moveTarget && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-fade-in"
          onClick={() => setMoveTarget(null)}
        >
          <div
            className="card w-full max-w-sm p-5 flex flex-col gap-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="heading text-lg font-semibold">
              {moveTarget.quotation_number}
            </h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              What do you want to do with this quotation?
            </p>
            {needsScrapRefresh(moveTarget) && (
              <p
                className="text-sm px-3 py-2 rounded-lg"
                style={{
                  background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                  color: "var(--accent)",
                }}
              >
                Its scrap's final estimate was locked after this quotation was last saved — reopen and save to update the net total.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {moveTarget.items.length === 0 ? (
                <button
                  onClick={() =>
                    router.push(
                      `/quotation/new?quotationId=${moveTarget.id}&quotationNumber=${encodeURIComponent(moveTarget.quotation_number)}`
                    )
                  }
                  className="btn-primary"
                >
                  Add Products to Quotation
                </button>
              ) : (
                <>
                  <button
                    onClick={() =>
                      router.push(`/quotation/${moveTarget.id}?mode=edit`)
                    }
                    className="btn-secondary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => router.push(`/quotation/${moveTarget.id}`)}
                    className="btn-primary"
                  >
                    Move to Next Quotation
                  </button>
                </>
              )}
              {moveTarget.items.length > 0 && (
                <button
                  onClick={() => router.push(`/quotation/${moveTarget.id}/print`)}
                  className="btn-secondary"
                >
                  Print
                </button>
              )}
              <button
                onClick={() =>
                  router.push(
                    `/scrap/quotation?quotationId=${moveTarget.id}&quotationNumber=${encodeURIComponent(moveTarget.quotation_number)}`
                  )
                }
                className="btn-secondary"
              >
                Link the Scrap
              </button>
              <button
                onClick={() => setMoveTarget(null)}
                className="text-sm font-medium mt-1 transition-colors hover:opacity-70"
                style={{ color: "var(--muted)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-fade-in"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="card w-full max-w-sm p-5 flex flex-col gap-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="heading text-lg font-semibold">
              Delete quotation?
            </h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              This will permanently delete{" "}
              <span
                className="font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {deleteTarget.quotation_number}
              </span>
              . This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger-solid"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
