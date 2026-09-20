"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function QuotationPage() {
  const router = useRouter();
  const [quotationNumber, setQuotationNumber] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [currentRate, setCurrentRate] = useState<CurrentRate>(null);
  const [saving, setSaving] = useState(false);
  const [less, setLess] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [category, setCategory] = useState<"" | "Gold" | "Silver">("");
  const [productId, setProductId] = useState("");
  const [weight, setWeight] = useState("");
  const [wastagePercent, setWastagePercent] = useState("");
  const [wastageWeight, setWastageWeight] = useState("");
  const [rate, setRate] = useState("");
  const [mc, setMc] = useState("");

  useEffect(() => {
    fetch("/api/quotations/next-number")
      .then((res) => res.json())
      .then((data) => setQuotationNumber(data.quotationNumber));

    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data));

    fetch("/api/rates")
      .then((res) => res.json())
      .then((data) => setCurrentRate(data.current));
  }, []);

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

  const itemsExcludingEdit = items.filter((_, i) => i !== editingIndex);
  const totalWeightSum =
    itemsExcludingEdit.reduce((sum, i) => sum + i.weight + i.wastageWeight, 0) +
    pendingWeight;
  const gstSum =
    itemsExcludingEdit.reduce((sum, i) => sum + i.gst, 0) + pendingGst;
  const totalSum =
    itemsExcludingEdit.reduce((sum, i) => sum + i.amount, 0) + pendingAmount;
  const netTotal = totalSum - parseNum(less);

  const pendingItem = buildItemFromEntry();
  const finalItems = pendingItem ? [...itemsExcludingEdit, pendingItem] : items;

  async function handleSave() {
    if (finalItems.length === 0) return;
    setSaving(true);
    try {
      await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: finalItems,
          gst: gstSum,
          total: totalSum,
          less: parseNum(less),
          netTotal,
        }),
      });
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
