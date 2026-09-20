"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type QuotationItem = {
  product_name: string | null;
  weight: string | null;
};

type Quotation = {
  id: string;
  quotation_number: string;
  revision: number;
  items: QuotationItem[];
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
      <Link href="/quotation/new" className="btn-primary text-center w-fit">
        Create Quotation
      </Link>

      <h1 className="heading text-2xl font-semibold mt-4">
        Saved Quotations
      </h1>

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
                  {q.quotation_number}
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
            <div className="flex flex-col gap-2">
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
