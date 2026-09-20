"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Scrap = {
  id: string;
  category: "Gold" | "Silver";
  scrap_name: string;
  scrap_weight: string;
  scrap_weight_after_less: string;
  rate: string;
  total: string;
};

export default function ScrapPage() {
  const [scraps, setScraps] = useState<Scrap[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Scrap | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadScraps() {
    const res = await fetch("/api/scraps");
    const data = await res.json();
    setScraps(data);
    setLoading(false);
  }

  useEffect(() => {
    loadScraps();
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/scraps/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadScraps();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/scrap/quotation" className="btn-primary text-center">
          Scrap for the Quotation
        </Link>
        <Link href="/scrap/new" className="btn-secondary text-center">
          New Scrap
        </Link>
      </div>

      <h1 className="heading text-2xl font-semibold mt-4">Saved Scrap</h1>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead
            className="text-left"
            style={{ background: "var(--background)" }}
          >
            <tr>
              <th className="px-4 py-2">Ornament Type</th>
              <th className="px-4 py-2">Scrap Name</th>
              <th className="px-4 py-2">Weight</th>
              <th className="px-4 py-2">After Less</th>
              <th className="px-4 py-2">Rate</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && scraps.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center"
                  style={{ color: "var(--muted)" }}
                >
                  No saved scrap yet.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center"
                  style={{ color: "var(--muted)" }}
                >
                  Loading...
                </td>
              </tr>
            )}
            {scraps.map((s) => (
              <tr
                key={s.id}
                className="border-t table-row-hover transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                <td className="px-4 py-2">{s.category}</td>
                <td className="px-4 py-2">{s.scrap_name}</td>
                <td className="px-4 py-2">
                  {Number(s.scrap_weight).toFixed(3)} g
                </td>
                <td className="px-4 py-2">
                  {Number(s.scrap_weight_after_less).toFixed(3)} g
                </td>
                <td className="px-4 py-2">₹{Number(s.rate).toFixed(2)}</td>
                <td className="px-4 py-2">₹{Number(s.total).toFixed(2)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <Link
                    href={`/scrap/${s.id}`}
                    className="link-accent mr-3"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(s)}
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

      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 animate-fade-in"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="card w-full max-w-sm p-5 flex flex-col gap-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="heading text-lg font-semibold">Delete scrap?</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              This will permanently delete{" "}
              <span
                className="font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {deleteTarget.scrap_name}
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
