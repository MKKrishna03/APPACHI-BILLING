"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Product = {
  id: string;
  name: string;
  category: "Gold" | "Silver";
  purity: string | null;
  wastage_tier_1: string | null;
  wastage_tier_2: string | null;
  wastage_tier_3: string | null;
};

type CurrentRate = {
  gold_rate: string;
  silver_rate: string;
} | null;

type ScrapEntry = {
  category: "" | "Gold" | "Silver";
  scrapName: string;
  scrapWeight: string;
};

type LinkedScrap = {
  id: string;
  category: string;
  scrap_name: string;
  scrap_weight: string;
  status: "pending" | "estimated" | "locked";
  total: string | null;
};

const SCRAP_STATUS_LABEL: Record<LinkedScrap["status"], string> = {
  pending: "Pending",
  estimated: "Estimated",
  locked: "Locked",
};

const SCRAP_STATUS_STYLE: Record<LinkedScrap["status"], { background: string; color: string }> = {
  pending: {
    background: "color-mix(in srgb, var(--accent) 15%, transparent)",
    color: "var(--accent)",
  },
  estimated: {
    background: "color-mix(in srgb, #2f9e44 15%, transparent)",
    color: "#2f9e44",
  },
  locked: {
    background: "color-mix(in srgb, var(--primary) 15%, transparent)",
    color: "var(--primary)",
  },
};

type Item = {
  category: string;
  productId: string;
  productName: string;
  purity: string | null;
  weight: number;
  wastagePercent: number;
  wastageWeight: number;
  rate: number;
  mc: number;
  gst: number;
  amount: number;
};

function parseNum(value: string) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

function convertExistingItem(item: {
  category: string;
  product_id: string | null;
  product_name: string;
  purity: string | null;
  weight: string;
  wastage_percent: string;
  wastage_weight: string;
  rate: string;
  mc: string;
}): Item {
  const w = Number(item.weight);
  const wastageWt = Number(item.wastage_weight);
  const r = Number(item.rate);
  const mcNum = Number(item.mc);
  const totalWeight = w + wastageWt;
  const value = totalWeight * r;
  const gstBase = value + mcNum;
  const gst = gstBase * 0.03;
  const amount = gstBase + gst;
  return {
    category: item.category,
    productId: item.product_id ?? "",
    productName: item.product_name,
    purity: item.purity,
    weight: w,
    wastagePercent: Number(item.wastage_percent),
    wastageWeight: wastageWt,
    rate: r,
    mc: mcNum,
    gst,
    amount,
  };
}

export default function QuotationPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto w-full px-4 py-8" style={{ color: "var(--muted)" }}>
          Loading...
        </div>
      }
    >
      <QuotationPageContent />
    </Suspense>
  );
}

function QuotationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingQuotationId = searchParams.get("quotationId");

  const [quotationNumber, setQuotationNumber] = useState(
    searchParams.get("quotationNumber") ?? ""
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [currentRate, setCurrentRate] = useState<CurrentRate>(null);
  const [saving, setSaving] = useState(false);
  const [less, setLess] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [linkedScraps, setLinkedScraps] = useState<LinkedScrap[]>([]);

  const [category, setCategory] = useState<"" | "Gold" | "Silver">("");
  const [productId, setProductId] = useState("");
  const [weight, setWeight] = useState("");
  const [wastagePercent, setWastagePercent] = useState("");
  const [wastageWeight, setWastageWeight] = useState("");
  const [rate, setRate] = useState("");
  const [mc, setMc] = useState("");

  const [showScraps, setShowScraps] = useState(false);
  const [scraps, setScraps] = useState<ScrapEntry[]>([]);

  useEffect(() => {
    if (existingQuotationId) {
      fetch(`/api/quotations/${existingQuotationId}`)
        .then((res) => res.json())
        .then((data) => {
          setQuotationNumber(data.quotation_number);
          setLess(data.less ?? "");
          setItems((data.items ?? []).map(convertExistingItem));
          setLinkedScraps(data.scraps ?? []);
        });
    } else {
      fetch("/api/quotations/next-number")
        .then((res) => res.json())
        .then((data) => setQuotationNumber(data.quotationNumber));
    }

    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data));

    fetch("/api/rates")
      .then((res) => res.json())
      .then((data) => setCurrentRate(data.current));
  }, [existingQuotationId]);

  useEffect(() => {
    if (!category) {
      setRate("");
      return;
    }
    if (!currentRate) return;
    setRate(
      category === "Gold" ? currentRate.gold_rate : currentRate.silver_rate
    );
  }, [category, currentRate]);

  const filteredProducts = products.filter((p) => p.category === category);
  const selectedProduct = products.find((p) => p.id === productId);

  function handleCategoryChange(value: "" | "Gold" | "Silver") {
    setCategory(value);
    setProductId("");
    setWeight("");
    setWastagePercent("");
    setWastageWeight("");
    setMc("");
  }

  function handleProductChange(id: string) {
    setProductId(id);
    const product = products.find((p) => p.id === id);
    setWastagePercent(product?.wastage_tier_1 ?? "");
    setWeight("");
    setWastageWeight("");
    setMc("");
  }

  function handleWeightChange(value: string) {
    setWeight(value);
    const w = parseNum(value);
    const pct = parseNum(wastagePercent);
    setWastageWeight(((w * pct) / 100).toFixed(3));
  }

  function handleWastagePercentChange(value: string) {
    setWastagePercent(value);
    const w = parseNum(weight);
    const pct = parseNum(value);
    setWastageWeight(((w * pct) / 100).toFixed(3));
  }

  const entryTotalWeight = parseNum(weight) + parseNum(wastageWeight);
  const entryValue = entryTotalWeight * parseNum(rate);

  const pendingGstBase = entryValue + parseNum(mc);
  const pendingGst = productId && weight ? pendingGstBase * 0.03 : 0;
  const pendingAmount = productId && weight ? pendingGstBase + pendingGst : 0;
  const pendingWeight = productId && weight ? entryTotalWeight : 0;

  function buildItemFromEntry(): Item | null {
    if (!productId || !weight) return null;
    const w = parseNum(weight);
    const wastageWt = parseNum(wastageWeight);
    const r = parseNum(rate);
    const mcNum = parseNum(mc);
    const totalWeight = w + wastageWt;
    const value = totalWeight * r;
    const gstBase = value + mcNum;
    const itemGst = gstBase * 0.03;
    const amount = gstBase + itemGst;

    return {
      category,
      productId,
      productName: selectedProduct?.name ?? "",
      purity: selectedProduct?.purity ?? null,
      weight: w,
      wastagePercent: parseNum(wastagePercent),
      wastageWeight: wastageWt,
      rate: r,
      mc: mcNum,
      gst: itemGst,
      amount,
    };
  }

  function handleAddItem() {
    const newItem = buildItemFromEntry();
    if (!newItem) return;

    if (editingIndex !== null) {
      setItems((prev) =>
        prev.map((item, i) => (i === editingIndex ? newItem : item))
      );
      setEditingIndex(null);
    } else {
      setItems((prev) => [...prev, newItem]);
    }

    setCategory("");
    setProductId("");
    setWeight("");
    setWastagePercent("");
    setWastageWeight("");
    setMc("");
  }

  function handleEditItem(index: number) {
    const item = items[index];
    setCategory(item.category as "Gold" | "Silver");
    setProductId(item.productId);
    setWeight(String(item.weight));
    setWastagePercent(String(item.wastagePercent));
    setWastageWeight(String(item.wastageWeight));
    setRate(String(item.rate));
    setMc(String(item.mc));
    setEditingIndex(index);
  }

  function handleRemoveItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function handleShowScraps() {
    setShowScraps(true);
    if (scraps.length === 0) {
      setScraps([{ category: "", scrapName: "", scrapWeight: "" }]);
    }
  }

  function handleAddScrapRow() {
    setScraps((prev) => [...prev, { category: "", scrapName: "", scrapWeight: "" }]);
  }

  function updateScrap(index: number, patch: Partial<ScrapEntry>) {
    setScraps((prev) =>
      prev.map((scrap, i) => (i === index ? { ...scrap, ...patch } : scrap))
    );
  }

  function handleRemoveScrap(index: number) {
    setScraps((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setShowScraps(false);
      return next;
    });
  }

  const itemsExcludingEdit = items.filter((_, i) => i !== editingIndex);
  const totalWeightSum =
    itemsExcludingEdit.reduce((sum, i) => sum + i.weight + i.wastageWeight, 0) +
    pendingWeight;
  const gstSum =
    itemsExcludingEdit.reduce((sum, i) => sum + i.gst, 0) + pendingGst;
  const totalSum =
    itemsExcludingEdit.reduce((sum, i) => sum + i.amount, 0) + pendingAmount;
  const scrapTotal = linkedScraps
    .filter((s) => s.status === "locked")
    .reduce((sum, s) => sum + Number(s.total ?? 0), 0);
  const netTotal = totalSum - parseNum(less) - scrapTotal;

  const pendingItem = buildItemFromEntry();
  const finalItems = pendingItem ? [...itemsExcludingEdit, pendingItem] : items;

  async function handleSave() {
    if (finalItems.length === 0) return;
    setSaving(true);
    try {
      const validScraps = scraps
        .filter((s) => s.category && s.scrapName && s.scrapWeight)
        .map((s) => ({
          category: s.category,
          scrapName: s.scrapName,
          scrapWeight: parseNum(s.scrapWeight),
        }));

      const payload = {
        items: finalItems,
        gst: gstSum,
        total: totalSum,
        less: parseNum(less),
        netTotal,
        scraps: validScraps,
      };

      if (existingQuotationId) {
        await fetch(`/api/quotations/${existingQuotationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/quotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      router.push("/");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md mx-auto w-full px-4 py-8 flex flex-col gap-5">
      <div>
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          Quotation No.
        </div>
        <div className="heading text-2xl font-semibold">
          {quotationNumber || "..."}
        </div>
      </div>

      {linkedScraps.length > 0 && (
        <div className="card p-4 flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Linked Scrap</h3>
          {linkedScraps.map((s) => (
            <div key={s.id} className="flex justify-between items-center text-sm">
              <span>
                {s.category} · {s.scrap_name} · {Number(s.scrap_weight).toFixed(3)} g
                {s.status !== "pending" && ` · ₹${Number(s.total).toFixed(2)}`}
              </span>
              <span
                className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap"
                style={SCRAP_STATUS_STYLE[s.status]}
              >
                {SCRAP_STATUS_LABEL[s.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span style={{ color: "var(--muted)" }}>Total weight</span>
          <span className="font-medium">{totalWeightSum.toFixed(3)} g</span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: "var(--muted)" }}>GST (3%)</span>
          <span className="font-medium">₹{gstSum.toFixed(2)}</span>
        </div>
        <div
          className="flex justify-between text-base font-semibold border-t pt-2"
          style={{ borderColor: "var(--border)" }}
        >
          <span>Total</span>
          <span>₹{totalSum.toFixed(2)}</span>
        </div>
        {scrapTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--muted)" }}>Scrap Value (Less)</span>
            <span className="font-medium">-₹{scrapTotal.toFixed(2)}</span>
          </div>
        )}
        <div className="flex flex-col gap-1 pt-1">
          <label className="text-sm font-medium">Less</label>
          <input
            className="input-field"
            value={less}
            onChange={(e) => setLess(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
          />
        </div>
        <div
          className="flex justify-between text-lg font-semibold border-t pt-2"
          style={{ borderColor: "var(--border)", color: "var(--primary)" }}
        >
          <span>Net Total</span>
          <span>₹{netTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="card p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Add Product</h3>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Ornament Type</label>
          <select
            className="input-field"
            value={category}
            onChange={(e) =>
              handleCategoryChange(e.target.value as "" | "Gold" | "Silver")
            }
          >
            <option value="">Select category</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Product</label>
          <select
            className="input-field"
            value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            disabled={!category}
          >
            <option value="">Select product</option>
            {filteredProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.purity ? `(${p.purity})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Weight (g)</label>
          <input
            className="input-field"
            value={weight}
            onChange={(e) => handleWeightChange(e.target.value)}
            placeholder="0.000"
            inputMode="decimal"
            disabled={!productId}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Wastage</label>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input-field"
              value={wastagePercent}
              onChange={(e) => handleWastagePercentChange(e.target.value)}
              placeholder="%"
              inputMode="decimal"
              disabled={!productId}
            />
            <input
              className="input-field"
              value={wastageWeight}
              onChange={(e) => setWastageWeight(e.target.value)}
              placeholder="0.000"
              inputMode="decimal"
              disabled={!productId}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Rate (₹/g)</label>
          <input
            className="input-field"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            inputMode="decimal"
            disabled={!category}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">MC</label>
          <input
            className="input-field"
            value={mc}
            onChange={(e) => setMc(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
          />
        </div>

        <div
          className="flex justify-between text-xs"
          style={{ color: "var(--muted)" }}
        >
          <span>Weight × Rate</span>
          <span>₹{entryValue.toFixed(2)}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAddItem}
            disabled={!productId || !weight}
            className="btn-secondary flex-1"
          >
            {editingIndex !== null ? "Update Product" : "Add Product"}
          </button>
          {editingIndex !== null && (
            <button
              onClick={() => {
                setEditingIndex(null);
                setCategory("");
                setProductId("");
                setWeight("");
                setWastagePercent("");
                setWastageWeight("");
                setMc("");
              }}
              className="px-4 py-2 text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: "var(--muted)" }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="card overflow-x-auto animate-scale-in">
          <table className="w-full text-sm">
            <thead
              className="text-left"
              style={{ background: "var(--background)" }}
            >
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Weight</th>
                <th className="px-3 py-2">WS%</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={index}
                  className="border-t table-row-hover transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    background:
                      editingIndex === index
                        ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                        : undefined,
                  }}
                >
                  <td className="px-3 py-2">{item.productName}</td>
                  <td className="px-3 py-2">{item.weight.toFixed(3)}</td>
                  <td className="px-3 py-2">{item.wastagePercent}</td>
                  <td className="px-3 py-2">₹{item.amount.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleEditItem(index)}
                      className="link-accent mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="link-danger"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!showScraps && (
        <button
          onClick={handleShowScraps}
          className="btn-secondary flex items-center justify-center gap-1"
        >
          <span className="text-lg leading-none">+</span> Add Scrap
        </button>
      )}

      {showScraps && (
        <div className="card p-4 flex flex-col gap-4 animate-scale-in">
          <h3 className="text-sm font-semibold">Old Scrap</h3>

          {scraps.map((scrap, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 border-t pt-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Scrap Type</label>
                <select
                  className="input-field"
                  value={scrap.category}
                  onChange={(e) =>
                    updateScrap(index, {
                      category: e.target.value as "" | "Gold" | "Silver",
                    })
                  }
                >
                  <option value="">Select type</option>
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Scrap Name</label>
                <input
                  className="input-field"
                  value={scrap.scrapName}
                  onChange={(e) =>
                    updateScrap(index, { scrapName: e.target.value })
                  }
                  placeholder="e.g. Old Chain"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Scrap Weight (g)</label>
                <input
                  className="input-field"
                  value={scrap.scrapWeight}
                  onChange={(e) =>
                    updateScrap(index, { scrapWeight: e.target.value })
                  }
                  placeholder="0.000"
                  inputMode="decimal"
                />
              </div>

              <button
                onClick={() => handleRemoveScrap(index)}
                className="link-danger self-end text-sm"
              >
                Remove
              </button>
            </div>
          ))}

          <button onClick={handleAddScrapRow} className="btn-secondary">
            + Add More Scrap
          </button>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || finalItems.length === 0}
        className="btn-primary"
      >
        {saving ? "Saving..." : "Save Quotation"}
      </button>
    </div>
  );
}
