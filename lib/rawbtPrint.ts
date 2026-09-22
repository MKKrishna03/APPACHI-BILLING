import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";

// 57mm thermal paper (matches the existing on-screen slip's `width: 57mm`)
// prints about 32 characters per line at the printer's default font.
const COLUMNS = 32;

function n(value: string | number | null | undefined): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

// Left/right justified line, e.g. "Rate                    1234.56".
// Falls back to two lines instead of overlapping if it can't fit.
function row(left: string, right: string, columns = COLUMNS): string {
  if (left.length + right.length + 1 > columns) {
    return left + "\n" + " ".repeat(Math.max(0, columns - right.length)) + right;
  }
  return left + " ".repeat(columns - left.length - right.length) + right;
}

function dashLine(columns = COLUMNS): string {
  return "-".repeat(columns);
}

// Uint8Array -> base64, byte-safe (btoa() needs a binary string, so this
// must NOT go through TextDecoder/UTF-8 — ESC/POS bytes aren't valid UTF-8).
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Hands ESC/POS bytes off to the RawBT app via its `rawbt:base64,` URL
 * scheme (https://rawbt.ru/intents.html). RawBT must be installed and the
 * Amigos Technology pocket printer must already be paired/selected inside
 * RawBT's own Bluetooth printer settings — this only triggers the print
 * job, it doesn't manage the Bluetooth connection itself.
 */
export function sendToRawBT(bytes: Uint8Array) {
  window.location.href = "rawbt:base64," + uint8ToBase64(bytes);
}

type QuotationReceiptItem = {
  product_name: string;
  weight: string;
  wastage_weight: string;
  rate: string;
  mc: string;
};

type QuotationReceiptScrap = {
  scrap_name: string;
  scrap_weight: string;
  scrap_less: string;
  scrap_weight_after_less: string;
  rate: string;
  total: string;
  status: "pending" | "estimated" | "locked";
};

export type QuotationReceiptData = {
  quotation_number: string;
  created_at: string;
  gst: string;
  total: string;
  less: string | null;
  items: QuotationReceiptItem[];
  scraps: QuotationReceiptScrap[];
};

// Mirrors app/quotation/[id]/print/page.tsx's on-screen thermal slip layout.
export function buildQuotationReceipt(data: QuotationReceiptData): Uint8Array {
  const createdAt = new Date(data.created_at);
  const date = createdAt.toLocaleDateString("en-IN");
  const time = createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const items = data.items;
  const totalWeight = items.reduce((sum, i) => sum + n(i.weight) + n(i.wastage_weight), 0);
  const rate = n(items[0]?.rate);
  const value = totalWeight * rate;
  const mcSum = items.reduce((sum, i) => sum + n(i.mc), 0);
  const gst = n(data.gst);
  const totalAfterGst = n(data.total);
  const less = n(data.less);
  const newProductTotal = totalAfterGst - less;

  const lockedScraps = data.scraps.filter((s) => s.status === "locked");
  const oldScrapTotal = lockedScraps.reduce((sum, s) => sum + n(s.total), 0);
  const amount = newProductTotal - oldScrapTotal;

  let e = new ReceiptPrinterEncoder({ columns: COLUMNS })
    .initialize()
    .align("center")
    .bold(true)
    .line("APPACHI JEWELLERY")
    .bold(false)
    .align("left")
    .line(row("QUOTATION NUM", "DATE"))
    .line(row(data.quotation_number, date))
    .line(row("", time))
    .line(dashLine());

  for (const item of items) {
    e = e
      .line(row(item.product_name, n(item.weight).toFixed(3)))
      .line(row("Wastage", n(item.wastage_weight).toFixed(3)));
  }

  e = e
    .line(dashLine())
    .line(row("", totalWeight.toFixed(3)))
    .line(row("Rate", rate.toFixed(2)))
    .line(row("", value.toFixed(2)))
    .line(row("MC", mcSum.toFixed(2)))
    .line(row("GST 3%", gst.toFixed(2)))
    .line(dashLine())
    .line(row("", totalAfterGst.toFixed(2)))
    .line(row("Less If", less.toFixed(2)))
    .line(dashLine())
    .line(row("", newProductTotal.toFixed(2)));

  if (lockedScraps.length > 0) {
    e = e.align("center").line("SCRAP").align("left");
    for (const scrap of lockedScraps) {
      e = e
        .line(row(scrap.scrap_name, n(scrap.scrap_weight).toFixed(3)))
        .line(row("Less", n(scrap.scrap_less).toFixed(3)))
        .line(dashLine())
        .line(row("", n(scrap.scrap_weight_after_less).toFixed(3)))
        .line(row("", n(scrap.rate).toFixed(2)))
        .line(row("", n(scrap.total).toFixed(2)));
    }
  }

  e = e
    .line(dashLine())
    .bold(true)
    .line(row("NEW PRODUCT TOTAL", newProductTotal.toFixed(2)))
    .line(row("OLD SCRAP TOTAL", oldScrapTotal.toFixed(2)))
    .bold(false)
    .line(dashLine())
    .bold(true)
    .line(row("AMOUNT", amount.toFixed(2)))
    .bold(false)
    .newline(3)
    .cut();

  return e.encode();
}

export type ScrapReceiptData = {
  scrap_number: string;
  category: string;
  scrap_name: string;
  scrap_weight: string;
  scrap_less: string;
  scrap_weight_after_less: string;
  rate: string;
  total: string;
  quotation_number: string | null;
};

// Mirrors app/scrap/[id]/print/page.tsx's on-screen slip layout.
export function buildScrapReceipt(data: ScrapReceiptData): Uint8Array {
  let e = new ReceiptPrinterEncoder({ columns: COLUMNS })
    .initialize()
    .align("center")
    .bold(true)
    .line("APPACHI JEWELLERY")
    .bold(false)
    .line("Scrap Estimation Slip")
    .align("left")
    .line(dashLine())
    .line(row("Scrap No.", data.scrap_number));

  if (data.quotation_number) {
    e = e.line(row("Quotation No.", data.quotation_number));
  }

  e = e
    .line(row("Ornament Type", data.category))
    .line(row("Scrap Name", data.scrap_name))
    .line(row("Scrap Weight", n(data.scrap_weight).toFixed(3) + " g"))
    .line(row("Less", n(data.scrap_less).toFixed(3) + " g"))
    .line(row("Wt After Less", n(data.scrap_weight_after_less).toFixed(3) + " g"))
    .line(row("Rate", n(data.rate).toFixed(2)))
    .line(dashLine())
    .bold(true)
    .line(row("Total", n(data.total).toFixed(2)))
    .bold(false)
    .newline(3)
    .cut();

  return e.encode();
}
